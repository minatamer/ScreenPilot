import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VoiceMetadata } from "@screenpilot/contracts/api/voice-token";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";

import { createConversationFirstPlanFixture } from "@/test/conversation-first-plan.fixture";
import { ScreenPilotApiError } from "@/shared/api/screenpilot-api";

import {
  VoiceConnectionStage,
  type VoiceTokenRequester,
} from "./voice-connection-stage";
import type { VoiceSessionBridgeProps } from "./voice-session-bridge";

const DEMO_CONTEXT = {
  kind: "role_agnostic_first_stage_hr_screen",
  roleAvailability: "candidate_selected_synthetic_session_vacancy",
  employerFactsAvailable: false,
} as const;
const START_REQUEST = {
  interviewGrant: "signed-interview-grant",
  turnstileToken: "single-use-turnstile-token",
} as const;

function FakeSessionBridge({
  authorization,
  clientTools,
  dynamicVariables,
  expectedConversationId,
  onAuthorizationConsumed,
  onEvent,
}: VoiceSessionBridgeProps) {
  return (
    <div
      data-authorization={authorization ? "present" : "cleared"}
      data-conversation-id={expectedConversationId}
      data-entry-mode={String(dynamicVariables.screenpilot_entry_mode)}
      data-policy={String(dynamicVariables.screenpilot_policy_version)}
      data-testid="fake-session-bridge"
      data-tools={Object.keys(clientTools).join(",")}
    >
      <button onClick={onAuthorizationConsumed} type="button">
        Consume authorization
      </button>
      <button
        onClick={() => {
          onEvent({ type: "error", message: "Synthetic SDK failure." });
        }}
        type="button"
      >
        Trigger SDK failure
      </button>
    </div>
  );
}

function stageProps(requestToken: VoiceTokenRequester) {
  return {
    demoContext: DEMO_CONTEXT,
    entryMode: "conversation_first" as const,
    liveSessionBridge: FakeSessionBridge,
    liveVoiceEnabled: true,
    onCancel: vi.fn(),
    onConnected: vi.fn<(voice: VoiceMetadata) => void>(),
    onEnded: vi.fn<(voice: VoiceMetadata) => void>(),
    onEnding: vi.fn(),
    onFailure: vi.fn(),
    onFinalTranscriptTurn: vi.fn<(turn: TranscriptTurn) => void>(),
    onGrantRejected: vi.fn(),
    onInterrupted: vi.fn(),
    onRetry: vi.fn(),
    onSensitiveValuesCleared: vi.fn(),
    plan: createConversationFirstPlanFixture(),
    requestToken,
    stage: "connecting" as const,
    startRequest: START_REQUEST,
  };
}

describe("VoiceConnectionStage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("requests exactly one token and clears one-time values before SDK start", async () => {
    const requestToken = vi.fn<VoiceTokenRequester>().mockResolvedValue({
      conversationId: "conversation-014",
      conversationToken: "short-lived-conversation-token",
    });
    const props = stageProps(requestToken);
    render(
      <StrictMode>
        <VoiceConnectionStage {...props} />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(requestToken).toHaveBeenCalledOnce();
    });
    expect(requestToken).toHaveBeenCalledWith(
      START_REQUEST,
      expect.any(AbortSignal),
    );
    const bridge = await screen.findByTestId("fake-session-bridge");
    expect(props.onSensitiveValuesCleared).toHaveBeenCalledOnce();
    expect(bridge).toHaveAttribute("data-authorization", "present");
    expect(bridge).toHaveAttribute("data-conversation-id", "conversation-014");
    expect(bridge).toHaveAttribute("data-entry-mode", "conversation_first");
    expect(bridge).toHaveAttribute("data-policy", "sp014-connection-v1");
    expect(bridge).toHaveAttribute(
      "data-tools",
      "recordInsight,correctInsight,markTopic,recordCandidateQuestion,requestFollowup",
    );
    expect(window.sessionStorage.length).toBe(0);

    fireEvent.click(
      screen.getByRole("button", { name: "Consume authorization" }),
    );
    await waitFor(() => {
      expect(screen.getByTestId("fake-session-bridge")).toHaveAttribute(
        "data-authorization",
        "cleared",
      );
    });
  });

  it("routes grant expiry back to preparation without mounting the SDK", async () => {
    const requestToken = vi.fn<VoiceTokenRequester>().mockRejectedValue(
      new ScreenPilotApiError({
        code: "INTERVIEW_GRANT_EXPIRED",
        message: "The interview grant expired.",
        retryable: false,
      }),
    );
    const props = stageProps(requestToken);
    render(
      <StrictMode>
        <VoiceConnectionStage {...props} />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(props.onGrantRejected).toHaveBeenCalledOnce();
    });
    expect(props.onSensitiveValuesCleared).toHaveBeenCalledOnce();
    expect(props.onFailure).not.toHaveBeenCalled();
    expect(screen.queryByTestId("fake-session-bridge")).not.toBeInTheDocument();
  });

  it("uses the deterministic fake bridge when paid live voice is disabled", async () => {
    const requestToken = vi.fn<VoiceTokenRequester>().mockResolvedValue({
      conversationId: "fake-conversation-014",
      conversationToken: "fake-conversation-token",
    });
    const liveSessionBridge = vi.fn(() => null);
    const props = {
      ...stageProps(requestToken),
      liveSessionBridge,
      liveVoiceEnabled: false,
      onConnected: vi.fn(),
    };
    render(
      <StrictMode>
        <VoiceConnectionStage {...props} />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(props.onConnected).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: "fake-conversation-014",
          status: "connected",
        }),
      );
    });
    expect(liveSessionBridge).not.toHaveBeenCalled();
    expect(props.onConnected).toHaveBeenCalledOnce();
    await waitFor(
      () => {
        expect(props.onFinalTranscriptTurn).toHaveBeenCalledTimes(3);
      },
      { timeout: 2_000 },
    );
    expect(
      props.onFinalTranscriptTurn.mock.calls.map(([turn]) => turn.text),
    ).toEqual([
      "Hi. What would you like me to call you?",
      "You can call me Sam.",
      "Thanks, Sam. Tell me what you would like to focus on today.",
    ]);
    expect(props.onSensitiveValuesCleared).toHaveBeenCalledOnce();
    expect(window.sessionStorage.length).toBe(0);
  });

  it("unmounts the selected bridge immediately after a terminal SDK failure", async () => {
    const requestToken = vi.fn<VoiceTokenRequester>().mockResolvedValue({
      conversationId: "conversation-014",
      conversationToken: "short-lived-conversation-token",
    });
    const props = stageProps(requestToken);
    render(<VoiceConnectionStage {...props} />);
    await screen.findByTestId("fake-session-bridge");

    fireEvent.click(
      screen.getByRole("button", { name: "Trigger SDK failure" }),
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId("fake-session-bridge"),
      ).not.toBeInTheDocument();
    });
    expect(props.onFailure).toHaveBeenCalledWith({
      code: "VOICE_PROVIDER_REJECTED",
      message: "Synthetic SDK failure.",
      retryable: true,
      stage: "connecting",
    });
  });

  it("maps provider rejection to a retryable connecting failure", async () => {
    const requestToken = vi.fn<VoiceTokenRequester>().mockRejectedValue(
      new ScreenPilotApiError({
        code: "PROVIDER_UNAVAILABLE",
        message: "Voice is temporarily unavailable.",
        retryable: true,
      }),
    );
    const props = stageProps(requestToken);
    render(<VoiceConnectionStage {...props} />);

    await waitFor(() => {
      expect(props.onFailure).toHaveBeenCalledWith({
        code: "PROVIDER_UNAVAILABLE",
        message: "Voice is temporarily unavailable.",
        retryable: true,
        stage: "connecting",
      });
    });
    expect(props.onSensitiveValuesCleared).toHaveBeenCalledOnce();
    expect(screen.queryByTestId("fake-session-bridge")).not.toBeInTheDocument();
  });

  it("aborts an unfinished request when connection cancellation unmounts the stage", async () => {
    let requestSignal: AbortSignal | undefined;
    const requestToken = vi.fn<VoiceTokenRequester>((_input, signal) => {
      requestSignal = signal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => {
            reject(new DOMException("aborted", "AbortError"));
          },
          { once: true },
        );
      });
    });
    const props = stageProps(requestToken);
    const rendered = render(<VoiceConnectionStage {...props} />);
    await waitFor(() => {
      expect(requestToken).toHaveBeenCalledOnce();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel connection" }));
    expect(props.onCancel).toHaveBeenCalledOnce();
    rendered.unmount();

    await waitFor(() => {
      expect(requestSignal?.aborted).toBe(true);
      expect(props.onSensitiveValuesCleared).toHaveBeenCalledOnce();
    });
    expect(screen.queryByTestId("fake-session-bridge")).not.toBeInTheDocument();
  });
});
