import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MicrophoneReadinessError,
  normalizeMicrophoneError,
  openBrowserMicrophoneMonitor,
} from "./microphone-readiness";

class FakeMicrophoneTrack extends EventTarget {
  readonly label = "Desk microphone";
  readyState: MediaStreamTrackState = "live";
  readonly stop = vi.fn();
}

class FakePermissionStatus extends EventTarget {
  state: "denied" | "granted" | "prompt" = "granted";

  deny(): void {
    this.state = "denied";
    this.dispatchEvent(new Event("change"));
  }
}

function installBrowserMicrophone(permissionStatus?: FakePermissionStatus) {
  const microphoneTrack = new FakeMicrophoneTrack();
  const mediaStream = {
    getAudioTracks: () => [microphoneTrack],
    getTracks: () => [microphoneTrack],
  };
  const mediaDevicesTarget = new EventTarget();
  const getUserMedia = vi.fn(() => Promise.resolve(mediaStream));
  const mediaDevices = {
    addEventListener:
      mediaDevicesTarget.addEventListener.bind(mediaDevicesTarget),
    getUserMedia,
    removeEventListener:
      mediaDevicesTarget.removeEventListener.bind(mediaDevicesTarget),
  };
  const sourceDisconnect = vi.fn();
  const analyserDisconnect = vi.fn();
  const sourceConnect = vi.fn();
  const close = vi.fn(() => Promise.resolve());
  const resume = vi.fn(() => Promise.resolve());
  const analyser = {
    disconnect: analyserDisconnect,
    fftSize: 0,
    getByteTimeDomainData: vi.fn((samples: Uint8Array) => {
      samples.fill(160);
    }),
    smoothingTimeConstant: 0,
  };
  class FakeAudioContext {
    readonly close = close;
    readonly createAnalyser = vi.fn(() => analyser);
    readonly createMediaStreamSource = vi.fn(() => ({
      connect: sourceConnect,
      disconnect: sourceDisconnect,
    }));
    readonly resume = resume;
    readonly state: AudioContextState = "suspended";
  }
  const requestAnimationFrame = vi.fn(() => 37);
  const cancelAnimationFrame = vi.fn();
  vi.stubGlobal("navigator", {
    mediaDevices,
    ...(permissionStatus
      ? {
          permissions: {
            query: vi.fn(() => Promise.resolve(permissionStatus)),
          },
        }
      : {}),
  });
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);
  vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrame);

  return {
    analyser,
    analyserDisconnect,
    cancelAnimationFrame,
    close,
    getUserMedia,
    microphoneTrack,
    requestAnimationFrame,
    resume,
    sourceConnect,
    sourceDisconnect,
  };
}

describe("browser microphone readiness", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ["NotAllowedError", "permission_denied"],
    ["SecurityError", "permission_denied"],
    ["NotFoundError", "unavailable"],
    ["OverconstrainedError", "unavailable"],
    ["NotReadableError", "in_use"],
    ["TrackStartError", "in_use"],
  ] as const)("maps %s to %s guidance", (browserName, expectedCode) => {
    expect(
      normalizeMicrophoneError(new DOMException("browser failure", browserName))
        .code,
    ).toBe(expectedCode);
  });

  it("measures locally and releases the track, graph, frame, and context", async () => {
    const browserMicrophone = installBrowserMicrophone();
    const onLevel = vi.fn();
    const onUnavailable = vi.fn();
    const controller = new AbortController();

    const monitor = await openBrowserMicrophoneMonitor({
      onLevel,
      onUnavailable,
      signal: controller.signal,
    });

    expect(browserMicrophone.getUserMedia).toHaveBeenCalledWith({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: false,
    });
    expect(monitor.deviceLabel).toBe("Desk microphone");
    expect(browserMicrophone.resume).toHaveBeenCalledOnce();
    expect(browserMicrophone.sourceConnect).toHaveBeenCalledWith(
      browserMicrophone.analyser,
    );
    expect(onLevel).toHaveBeenCalledWith(expect.any(Number));
    expect(onLevel.mock.calls[0]?.[0]).toBeGreaterThan(0);
    expect(browserMicrophone.requestAnimationFrame).toHaveBeenCalledOnce();

    browserMicrophone.microphoneTrack.dispatchEvent(new Event("ended"));
    expect(onUnavailable).toHaveBeenCalledWith("removed");

    monitor.stop();
    monitor.stop();
    expect(browserMicrophone.cancelAnimationFrame).toHaveBeenCalledOnce();
    expect(browserMicrophone.cancelAnimationFrame).toHaveBeenCalledWith(37);
    expect(browserMicrophone.sourceDisconnect).toHaveBeenCalledOnce();
    expect(browserMicrophone.analyserDisconnect).toHaveBeenCalledOnce();
    expect(browserMicrophone.microphoneTrack.stop).toHaveBeenCalledOnce();
    expect(browserMicrophone.close).toHaveBeenCalledOnce();
  });

  it("reports permission revocation instead of physical removal when observable", async () => {
    const permissionStatus = new FakePermissionStatus();
    const browserMicrophone = installBrowserMicrophone(permissionStatus);
    const onUnavailable = vi.fn();
    const monitor = await openBrowserMicrophoneMonitor({
      onLevel: vi.fn(),
      onUnavailable,
      signal: new AbortController().signal,
    });

    permissionStatus.deny();
    browserMicrophone.microphoneTrack.readyState = "ended";
    browserMicrophone.microphoneTrack.dispatchEvent(new Event("ended"));

    expect(onUnavailable).toHaveBeenCalledOnce();
    expect(onUnavailable).toHaveBeenCalledWith("permission_denied");
    monitor.stop();
  });

  it("does not request a device after cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    const getUserMedia = vi.fn();
    const eventTarget = new EventTarget();
    vi.stubGlobal("navigator", {
      mediaDevices: {
        addEventListener: eventTarget.addEventListener.bind(eventTarget),
        getUserMedia,
        removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
      },
    });
    vi.stubGlobal(
      "AudioContext",
      class FakeAudioContext {
        readonly state = "running";
      },
    );

    await expect(
      openBrowserMicrophoneMonitor({
        onLevel: vi.fn(),
        onUnavailable: vi.fn(),
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("reports unsupported browser APIs without requesting permission", async () => {
    vi.stubGlobal("navigator", {});

    await expect(
      openBrowserMicrophoneMonitor({
        onLevel: vi.fn(),
        onUnavailable: vi.fn(),
        signal: new AbortController().signal,
      }),
    ).rejects.toEqual(new MicrophoneReadinessError("unsupported"));
  });
});
