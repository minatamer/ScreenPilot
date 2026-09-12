export const MICROPHONE_FAILURE_COPY = Object.freeze({
  in_use: {
    title: "The microphone is busy",
    message:
      "Close other apps or browser tabs using the microphone, then try again.",
  },
  permission_denied: {
    title: "Microphone access is blocked",
    message:
      "Use the site controls beside the address bar to allow microphone access, then retry.",
  },
  removed: {
    title: "The microphone was disconnected",
    message: "Reconnect an input device, then check the microphone again.",
  },
  unavailable: {
    title: "No microphone is available",
    message:
      "Connect or enable a microphone, check the browser's input settings, then retry.",
  },
  unsupported: {
    title: "Microphone setup is not supported",
    message:
      "Use a current browser with microphone and Web Audio support to continue.",
  },
} as const);

export type MicrophoneFailureCode = keyof typeof MICROPHONE_FAILURE_COPY;

export class MicrophoneReadinessError extends Error {
  readonly code: MicrophoneFailureCode;
  readonly retryable: boolean;

  constructor(code: MicrophoneFailureCode, cause?: unknown) {
    super(
      MICROPHONE_FAILURE_COPY[code].message,
      cause === undefined ? undefined : { cause },
    );
    this.name = "MicrophoneReadinessError";
    this.code = code;
    this.retryable = code !== "unsupported";
  }
}

export interface ActiveMicrophoneMonitor {
  readonly deviceLabel: string;
  stop: () => void;
}

export interface OpenMicrophoneMonitorInput {
  onLevel: (level: number) => void;
  onUnavailable: (code: "permission_denied" | "removed") => void;
  signal: AbortSignal;
}

export type OpenMicrophoneMonitor = (
  input: OpenMicrophoneMonitorInput,
) => Promise<ActiveMicrophoneMonitor>;

interface BrowserMediaDevices {
  addEventListener: MediaDevices["addEventListener"];
  getUserMedia: MediaDevices["getUserMedia"];
  removeEventListener: MediaDevices["removeEventListener"];
}

interface BrowserMicrophonePermissionStatus {
  readonly state: "denied" | "granted" | "prompt";
  addEventListener: (type: "change", listener: () => void) => void;
  removeEventListener: (type: "change", listener: () => void) => void;
}

interface BrowserPermissions {
  query: (descriptor: { readonly name: "microphone" }) => Promise<unknown>;
}

type AudioContextConstructor = new () => AudioContext;

function isBrowserMediaDevices(value: unknown): value is BrowserMediaDevices {
  return (
    typeof value === "object" &&
    value !== null &&
    "getUserMedia" in value &&
    typeof value.getUserMedia === "function" &&
    "addEventListener" in value &&
    typeof value.addEventListener === "function" &&
    "removeEventListener" in value &&
    typeof value.removeEventListener === "function"
  );
}

function isAudioContextConstructor(
  value: unknown,
): value is AudioContextConstructor {
  return typeof value === "function";
}

function isBrowserPermissions(value: unknown): value is BrowserPermissions {
  return (
    typeof value === "object" &&
    value !== null &&
    "query" in value &&
    typeof value.query === "function"
  );
}

function isMicrophonePermissionStatus(
  value: unknown,
): value is BrowserMicrophonePermissionStatus {
  if (typeof value !== "object" || value === null || !("state" in value)) {
    return false;
  }
  const state: unknown = value.state;
  return (
    (state === "denied" || state === "granted" || state === "prompt") &&
    "addEventListener" in value &&
    typeof value.addEventListener === "function" &&
    "removeEventListener" in value &&
    typeof value.removeEventListener === "function"
  );
}

async function readMicrophonePermissionStatus(): Promise<
  BrowserMicrophonePermissionStatus | undefined
> {
  const permissionsValue: unknown = Reflect.get(navigator, "permissions");
  if (!isBrowserPermissions(permissionsValue)) {
    return undefined;
  }
  try {
    const permissionStatus = await permissionsValue.query({
      name: "microphone",
    });
    return isMicrophonePermissionStatus(permissionStatus)
      ? permissionStatus
      : undefined;
  } catch {
    // Firefox and older WebKit builds can expose Permissions without
    // supporting microphone queries. Track termination remains the fallback.
    return undefined;
  }
}

function signalIsAborted(signal: AbortSignal): boolean {
  return signal.aborted;
}

function abortError(): DOMException {
  return new DOMException("Microphone setup was stopped.", "AbortError");
}

export function isMicrophoneAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function normalizeMicrophoneError(
  error: unknown,
): MicrophoneReadinessError {
  if (error instanceof MicrophoneReadinessError) {
    return error;
  }
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return new MicrophoneReadinessError("permission_denied", error);
    }
    if (
      error.name === "NotFoundError" ||
      error.name === "DevicesNotFoundError" ||
      error.name === "OverconstrainedError"
    ) {
      return new MicrophoneReadinessError("unavailable", error);
    }
    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return new MicrophoneReadinessError("in_use", error);
    }
  }
  return new MicrophoneReadinessError("unavailable", error);
}

function stopMediaStream(stream: MediaStream | undefined): void {
  stream?.getTracks().forEach((track) => {
    track.stop();
  });
}

function closeAudioContext(audioContext: AudioContext | undefined): void {
  if (!audioContext || audioContext.state === "closed") {
    return;
  }
  // Some browsers reject close during document teardown after tracks stopped.
  void audioContext.close().catch(() => undefined);
}

export const openBrowserMicrophoneMonitor: OpenMicrophoneMonitor = async ({
  onLevel,
  onUnavailable,
  signal,
}) => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    throw new MicrophoneReadinessError("unsupported");
  }
  const mediaDevicesValue: unknown = Reflect.get(navigator, "mediaDevices");
  const audioContextConstructorValue: unknown = Reflect.get(
    window,
    "AudioContext",
  );
  if (
    !isBrowserMediaDevices(mediaDevicesValue) ||
    !isAudioContextConstructor(audioContextConstructorValue)
  ) {
    throw new MicrophoneReadinessError("unsupported");
  }
  const mediaDevices = mediaDevicesValue;
  const AudioContextConstructor = audioContextConstructorValue;
  if (signalIsAborted(signal)) {
    throw abortError();
  }

  let stream: MediaStream | undefined;
  let audioContext: AudioContext | undefined;
  let permissionStatus: BrowserMicrophonePermissionStatus | undefined;

  try {
    stream = await mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false,
    });
    if (signalIsAborted(signal)) {
      stopMediaStream(stream);
      throw abortError();
    }

    const microphoneTrack = stream.getAudioTracks()[0];
    if (!microphoneTrack) {
      throw new MicrophoneReadinessError("unavailable");
    }

    permissionStatus = await readMicrophonePermissionStatus();
    if (signalIsAborted(signal)) {
      stopMediaStream(stream);
      throw abortError();
    }
    if (permissionStatus?.state === "denied") {
      throw new MicrophoneReadinessError("permission_denied");
    }

    audioContext = new AudioContextConstructor();
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    source.connect(analyser);

    const samples = new Uint8Array(analyser.fftSize);
    let animationFrameId: number | undefined;
    let invalidated = false;
    let stopped = false;

    const handleUnavailable = (code: "permission_denied" | "removed") => {
      if (!stopped && !invalidated) {
        invalidated = true;
        onUnavailable(code);
      }
    };
    const handleTrackEnded = () => {
      handleUnavailable(
        permissionStatus?.state === "denied" ? "permission_denied" : "removed",
      );
    };
    const handleDeviceChange = () => {
      if (microphoneTrack.readyState === "ended") {
        handleTrackEnded();
      }
    };
    const handlePermissionChange = () => {
      if (permissionStatus?.state === "denied") {
        handleUnavailable("permission_denied");
      }
    };
    const updateLevel = () => {
      if (stopped) {
        return;
      }
      analyser.getByteTimeDomainData(samples);
      let squaredAmplitude = 0;
      for (const sample of samples) {
        const amplitude = (sample - 128) / 128;
        squaredAmplitude += amplitude * amplitude;
      }
      const rootMeanSquare = Math.sqrt(squaredAmplitude / samples.length);
      onLevel(Math.min(1, rootMeanSquare * 3.2));
      animationFrameId = window.requestAnimationFrame(updateLevel);
    };
    const stop = () => {
      if (stopped) {
        return;
      }
      stopped = true;
      signal.removeEventListener("abort", stop);
      microphoneTrack.removeEventListener("ended", handleTrackEnded);
      mediaDevices.removeEventListener("devicechange", handleDeviceChange);
      permissionStatus?.removeEventListener("change", handlePermissionChange);
      if (animationFrameId !== undefined) {
        window.cancelAnimationFrame(animationFrameId);
      }
      source.disconnect();
      analyser.disconnect();
      stopMediaStream(stream);
      closeAudioContext(audioContext);
    };

    microphoneTrack.addEventListener("ended", handleTrackEnded, { once: true });
    mediaDevices.addEventListener("devicechange", handleDeviceChange);
    permissionStatus?.addEventListener("change", handlePermissionChange);
    signal.addEventListener("abort", stop, { once: true });
    updateLevel();

    return {
      deviceLabel: microphoneTrack.label.trim() || "Default microphone",
      stop,
    };
  } catch (error) {
    stopMediaStream(stream);
    closeAudioContext(audioContext);
    if (signalIsAborted(signal) && isMicrophoneAbortError(error)) {
      throw error;
    }
    throw normalizeMicrophoneError(error);
  }
};
