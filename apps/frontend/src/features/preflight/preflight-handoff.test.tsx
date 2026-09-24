import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  TurnstileClientError,
  type ExecuteTurnstileChallenge,
} from "@/features/abuse-protection/turnstile-client";

import {
  MicrophoneReadinessError,
  type OpenMicrophoneMonitor,
  type OpenMicrophoneMonitorInput,
} from "./microphone-readiness";
import { PreflightHandoff } from "./preflight-handoff";

type PreflightProps = ComponentProps<typeof PreflightHandoff>;

function futureExpiry(): string {
  return new Date(Date.now() + 15 * 60 * 1_000).toISOString();
}

function microphoneHarness(deviceLabel = "Studio microphone") {
  let callbacks: OpenMicrophoneMonitorInput | undefined;
  const stop = vi.fn();
  const openMicrophoneMonitor = vi.fn<OpenMicrophoneMonitor>((input) => {
    callbacks = input;
    return Promise.resolve({ deviceLabel, stop });
  });

  return {
    emitLevel(level: number) {
      callbacks?.onLevel(level);
    },
    removeDevice() {
      callbacks?.onUnavailable("removed");
    },
    openMicrophoneMonitor,
    revokePermission() {
      callbacks?.onUnavailable("permission_denied");
    },
    stop,
  };
}

function props(overrides: Partial<PreflightProps> = {}): PreflightProps {
  return {
    entryMode: "conversation_first",
    interviewGrant: "signed-test-grant",
    interviewGrantExpiresAt: futureExpiry(),
    onBack: vi.fn(),
    onGrantExpired: vi.fn(),
    onNotReady: vi.fn(),
    onReady: vi.fn(),
    providerOperationsEnabled: true,
    siteKey: "",
    stage: "preflight",
    turnstileClientReady: true,
    ...overrides,
  };
}

function acceptDisclosure(): void {
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: /I understand how AI voice, my microphone, transcription, and notes will be used/iu,
    }),
  );
}

async function prepareMicrophone(): Promise<void> {
  acceptDisclosure();
  fireEvent.click(screen.getByRole("button", { name: "Check microphone" }));
  await screen.findByText("Microphone ready");
}

describe("shared voice preflight", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
  });

  it("fails closed before microphone, Turnstile, or voice authorization", () => {
    const microphone = microphoneHarness();
    const executeChallenge = vi.fn<ExecuteTurnstileChallenge>();
    const onStartAuthorized = vi.fn();
    const onBack = vi.fn();

    render(
      <PreflightHandoff
        {...props({
          executeChallenge,
          microphoneMonitor: microphone.openMicrophoneMonitor,
          onBack,
          onStartAuthorized,
          providerOperationsEnabled: false,
        })}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Voice interview is unavailable right now.",
      }),
    ).toBeVisible();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Check microphone" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start interview" }),
    ).not.toBeInTheDocument();
    expect(microphone.openMicrophoneMonitor).not.toHaveBeenCalled();
    expect(executeChallenge).not.toHaveBeenCalled();
    expect(onStartAuthorized).not.toHaveBeenCalled();
    expect(
      document.querySelector('script[src*="challenges.cloudflare.com"]'),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Change starting option" }),
    );
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("shows two plain-language cards with unchecked consent and requests nothing automatically", () => {
    const microphone = microphoneHarness();
    const browserFetch = vi.fn();
    vi.stubGlobal("fetch", browserFetch);

    render(
      <PreflightHandoff
        {...props({ microphoneMonitor: microphone.openMicrophoneMonitor })}
      />,
    );

    expect(screen.getByText("Conversation-first")).toBeVisible();
    expect(screen.getByText("Step 3 of 5 · Before you begin")).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Get ready for your interview.",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "How the interview works",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Your privacy and consent" }),
    ).toBeVisible();
    expect(screen.getAllByRole("region")).toHaveLength(2);
    expect(screen.queryByText(/ElevenLabs|OpenAI|Cloudflare/iu)).toBeNull();
    expect(
      screen.getByText(/does not record or save your audio/iu),
    ).toBeVisible();
    expect(screen.getByText(/require human review/iu)).toBeVisible();
    expect(screen.getByText(/lasts up to eight minutes/iu)).toBeVisible();
    expect(screen.getByText(/only for this demo session/iu)).toBeVisible();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "Check microphone" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Start interview" }),
    ).toBeDisabled();
    expect(microphone.openMicrophoneMonitor).not.toHaveBeenCalled();
    expect(browserFetch).not.toHaveBeenCalled();
  });

  it("requests permission only after consent and reports the selected input and local level", async () => {
    const microphone = microphoneHarness("USB podcast microphone");
    const onReady = vi.fn();
    render(
      <PreflightHandoff
        {...props({
          microphoneMonitor: microphone.openMicrophoneMonitor,
          onReady,
        })}
      />,
    );

    acceptDisclosure();
    expect(microphone.openMicrophoneMonitor).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Check microphone" }));

    expect(await screen.findByText("USB podcast microphone")).toBeVisible();
    expect(microphone.openMicrophoneMonitor).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(onReady).toHaveBeenCalledOnce();
    });
    expect(
      screen.getByRole("button", { name: "Start interview" }),
    ).toBeEnabled();

    act(() => {
      microphone.emitLevel(0.42);
    });
    expect(
      screen.getByRole("meter", { name: "Microphone input level" }),
    ).toHaveAttribute("aria-valuenow", "42");
  });

  it("executes voice-token Turnstile only from idempotent Start and exposes cancel", async () => {
    const microphone = microphoneHarness();
    const onStartAuthorized = vi.fn();
    const executeChallenge = vi.fn<ExecuteTurnstileChallenge>((input) => {
      expect(input.action).toBe("voice_token");
      return Promise.resolve("memory-only-voice-token");
    });
    const browserFetch = vi.fn();
    vi.stubGlobal("fetch", browserFetch);
    render(
      <PreflightHandoff
        {...props({
          executeChallenge,
          microphoneMonitor: microphone.openMicrophoneMonitor,
          onStartAuthorized,
        })}
      />,
    );
    await prepareMicrophone();

    const startButton = screen.getByRole("button", {
      name: "Start interview",
    });
    fireEvent.click(startButton);
    fireEvent.click(startButton);

    expect(
      await screen.findByText("Preparing the secure voice connection"),
    ).toBeVisible();
    expect(executeChallenge).toHaveBeenCalledOnce();
    expect(onStartAuthorized).toHaveBeenCalledOnce();
    expect(onStartAuthorized).toHaveBeenCalledWith("memory-only-voice-token");
    expect(browserFetch).not.toHaveBeenCalled();
    expect(window.sessionStorage).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Cancel start" }));
    expect(
      screen.getByRole("button", { name: "Start interview" }),
    ).toBeEnabled();
  });

  it.each([
    ["permission_denied", "Microphone access is blocked", /address bar/iu],
    ["unavailable", "No microphone is available", /Connect or enable/iu],
    ["in_use", "The microphone is busy", /other apps or browser tabs/iu],
  ] as const)(
    "offers recovery for %s microphone failures",
    async (code, title, guidance) => {
      const microphone = microphoneHarness();
      const browserFetch = vi.fn();
      vi.stubGlobal("fetch", browserFetch);
      microphone.openMicrophoneMonitor.mockRejectedValueOnce(
        new MicrophoneReadinessError(code),
      );
      render(
        <PreflightHandoff
          {...props({ microphoneMonitor: microphone.openMicrophoneMonitor })}
        />,
      );
      acceptDisclosure();
      fireEvent.click(screen.getByRole("button", { name: "Check microphone" }));

      expect(await screen.findByText(title)).toBeVisible();
      expect(screen.getByText(guidance)).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Start interview" }),
      ).toBeDisabled();
      expect(browserFetch).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "Retry microphone" }));
      expect(await screen.findByText("Studio microphone")).toBeVisible();
      expect(microphone.openMicrophoneMonitor).toHaveBeenCalledTimes(2);
    },
  );

  it("returns a ready stage to preflight when the selected device is removed", async () => {
    const microphone = microphoneHarness();
    const onNotReady = vi.fn();
    const initialProps = props({
      microphoneMonitor: microphone.openMicrophoneMonitor,
      onNotReady,
    });
    const view = render(<PreflightHandoff {...initialProps} />);
    await prepareMicrophone();
    view.rerender(<PreflightHandoff {...initialProps} stage="ready" />);

    act(() => {
      microphone.removeDevice();
    });

    expect(
      await screen.findByText("The microphone was disconnected"),
    ).toBeVisible();
    expect(microphone.stop).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(onNotReady).toHaveBeenCalledOnce();
    });
  });

  it("shows permission guidance when an observable permission is revoked", async () => {
    const microphone = microphoneHarness();
    const onNotReady = vi.fn();
    const initialProps = props({
      microphoneMonitor: microphone.openMicrophoneMonitor,
      onNotReady,
    });
    const view = render(<PreflightHandoff {...initialProps} />);
    await prepareMicrophone();
    view.rerender(<PreflightHandoff {...initialProps} stage="ready" />);

    act(() => {
      microphone.revokePermission();
    });

    expect(
      await screen.findByText("Microphone access is blocked"),
    ).toBeVisible();
    expect(screen.getByText(/address bar/iu)).toBeVisible();
    expect(microphone.stop).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(onNotReady).toHaveBeenCalledOnce();
    });
  });

  it("retries only a failed challenge while preserving consent and microphone readiness", async () => {
    const microphone = microphoneHarness();
    const executeChallenge = vi
      .fn()
      .mockRejectedValueOnce(
        new TurnstileClientError(
          "TURNSTILE_REJECTED",
          "The anti-abuse check expired. Try it again.",
        ),
      )
      .mockResolvedValueOnce("fresh-voice-token");
    const onStartAuthorized = vi.fn();
    const browserFetch = vi.fn();
    vi.stubGlobal("fetch", browserFetch);
    render(
      <PreflightHandoff
        {...props({
          executeChallenge,
          microphoneMonitor: microphone.openMicrophoneMonitor,
          onStartAuthorized,
        })}
      />,
    );
    await prepareMicrophone();
    fireEvent.click(screen.getByRole("button", { name: "Start interview" }));

    expect(
      await screen.findByText("The start check could not finish"),
    ).toBeVisible();
    expect(screen.getByText("Studio microphone")).toBeVisible();
    expect(microphone.openMicrophoneMonitor).toHaveBeenCalledOnce();
    expect(browserFetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Retry start check" }));
    await screen.findByText("Preparing the secure voice connection");
    expect(executeChallenge).toHaveBeenCalledTimes(2);
    expect(onStartAuthorized).toHaveBeenCalledWith("fresh-voice-token");
  });

  it.each([
    [
      "an expired grant",
      { interviewGrantExpiresAt: "2020-01-01T00:00:00.000Z" },
    ],
    ["an unavailable Turnstile client", { turnstileClientReady: false }],
  ] satisfies readonly (readonly [string, Partial<PreflightProps>])[])(
    "keeps Start locked for %s",
    async (_label, blockedProps) => {
      const microphone = microphoneHarness();
      const executeChallenge = vi.fn();
      const browserFetch = vi.fn();
      vi.stubGlobal("fetch", browserFetch);
      render(
        <PreflightHandoff
          {...props({
            ...blockedProps,
            executeChallenge,
            microphoneMonitor: microphone.openMicrophoneMonitor,
          })}
        />,
      );
      await prepareMicrophone();

      expect(
        screen.getByRole("button", { name: "Start interview" }),
      ).toBeDisabled();
      expect(executeChallenge).not.toHaveBeenCalled();
      expect(browserFetch).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["conversation-first preflight", "conversation_first", "preflight"],
    ["conversation-first ready", "conversation_first", "ready"],
    ["CV-assisted preflight", "cv_assisted", "preflight"],
    ["CV-assisted ready", "cv_assisted", "ready"],
  ] as const)(
    "expires the grant and releases local readiness from %s",
    async (_label, entryMode, expiryStage) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-12T12:00:00.000Z"));
      const microphone = microphoneHarness();
      const onGrantExpired = vi.fn();
      const onNotReady = vi.fn();
      const initialProps = props({
        entryMode,
        interviewGrantExpiresAt: new Date(Date.now() + 1_000).toISOString(),
        microphoneMonitor: microphone.openMicrophoneMonitor,
        onGrantExpired,
        onNotReady,
      });
      const view = render(<PreflightHandoff {...initialProps} />);
      acceptDisclosure();
      fireEvent.click(screen.getByRole("button", { name: "Check microphone" }));
      await act(async () => {
        await Promise.resolve();
      });
      expect(screen.getByText("Microphone ready")).toBeVisible();
      if (expiryStage === "ready") {
        view.rerender(<PreflightHandoff {...initialProps} stage="ready" />);
      }

      await act(async () => {
        vi.advanceTimersByTime(1_001);
        await Promise.resolve();
      });

      expect(onGrantExpired).toHaveBeenCalledOnce();
      expect(onNotReady).not.toHaveBeenCalled();
      expect(microphone.stop).toHaveBeenCalledOnce();
      expect(
        screen.getByRole("button", { name: "Start interview" }),
      ).toBeDisabled();
    },
  );

  it("keeps mode-aware Back keyboard-native and stops the local monitor on unmount", async () => {
    const microphone = microphoneHarness();
    const onBack = vi.fn();
    const view = render(
      <PreflightHandoff
        {...props({
          entryMode: "cv_assisted",
          microphoneMonitor: microphone.openMicrophoneMonitor,
          onBack,
        })}
      />,
    );
    await prepareMicrophone();

    const back = screen.getByRole("button", {
      name: "Back to interview plan",
    });
    back.focus();
    fireEvent.keyDown(back, { key: "Enter" });
    fireEvent.click(back);
    expect(onBack).toHaveBeenCalledOnce();

    view.unmount();
    expect(microphone.stop).toHaveBeenCalledOnce();
  });
});
