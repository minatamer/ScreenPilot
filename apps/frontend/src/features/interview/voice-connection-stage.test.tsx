import { StrictMode, useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  VOICE_AGENT_POLICY_VERSION,
  type VoiceMetadata,
} from "@screenpilot/contracts/api/voice-token";
import { UNSUPPORTED_EMPLOYER_QUESTION_FALLBACK } from "@screenpilot/contracts/interview/client-tools";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";

import { createConversationFirstPlanFixture } from "@/test/conversation-first-plan.fixture";
import { ScreenPilotApiError } from "@/shared/api/screenpilot-api";
import type { InterviewCompletion } from "@/features/session/demo-session.types";

import {
  VoiceConnectionStage,
  type VoiceTokenRequester,
} from "./voice-connection-stage";
import type { VoiceSessionBridgeProps } from "./voice-session-bridge";
import { createVoicePerformanceTracker } from "./voice-performance";
import {
  createFakeVoiceToolTrace,
  FAKE_VOICE_EVENT_TRACE,
} from "./fake-voice-session";

const DEMO_CONTEXT = {
  kind: "role_agnostic_first_stage_hr_screen",
  roleAvailability: "candidate_selected_synthetic_session_vacancy",
  employerFactsAvailable: false,
} as const;
const START_REQUEST = {
  interviewGrant: "signed-interview-grant",
  turnstileToken: "single-use-turnstile-token",
} as const;
const connectedBridgeCleanup = vi.fn();

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
      data-known-state={String(dynamicVariables.screenpilot_known_state)}
      data-policy={String(dynamicVariables.screenpilot_policy_version)}
      data-remaining-seconds={String(
        dynamicVariables.screenpilot_remaining_seconds,
      )}
      data-testid="fake-session-bridge"
      data-tools={Object.keys(clientTools).join(",")}
    >
      <button onClick={onAuthorizationConsumed} type="button">
        Consume authorization
      </button>
      <button
        onClick={() => {
          onEvent({
            type: "error",
            failure: {
              class: "unclassified",
              message:
                "The secure voice connection could not start. Check the connection and try again.",
              retryable: true,
            },
          });
        }}
        type="button"
      >
        Trigger SDK failure
      </button>
    </div>
  );
}

function ConnectedSessionBridge({
  expectedConversationId,
  onAuthorizationConsumed,
  onEvent,
}: VoiceSessionBridgeProps) {
  useEffect(() => {
    onAuthorizationConsumed();
    onEvent({
      type: "connected",
      conversationId: expectedConversationId ?? "missing-conversation",
    });
    return connectedBridgeCleanup;
  }, [expectedConversationId, onAuthorizationConsumed, onEvent]);
  return <div data-testid="connected-session-bridge" />;
}

function stageProps(requestToken: VoiceTokenRequester) {
  return {
    demoContext: DEMO_CONTEXT,
    entryMode: "conversation_first" as const,
    insights: [],
    liveSessionBridge: FakeSessionBridge,
    liveVoiceEnabled: true,
    onCancel: vi.fn(),
    onConnected: vi.fn<(voice: VoiceMetadata) => void>(),
    onEnded:
      vi.fn<(voice: VoiceMetadata, completion: InterviewCompletion) => void>(),
    onEnding: vi.fn<(completion: InterviewCompletion) => void>(),
    onFailure: vi.fn(),
    onFinalTranscriptTurn: vi.fn<(turn: TranscriptTurn) => void>(),
    onGrantRejected: vi.fn(),
    onInterrupted: vi.fn(),
    onInsight: vi.fn(),
    onRetry: vi.fn(),
    onSensitiveValuesCleared: vi.fn(),
    onTopicProgress: vi.fn(),
    plan: createConversationFirstPlanFixture(),
    requestToken,
    stage: "connecting" as const,
    startRequest: START_REQUEST,
    topicProgress: [],
    transcript: [],
  };
}

describe("VoiceConnectionStage", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    window.sessionStorage.clear();
    connectedBridgeCleanup.mockClear();
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
    vi.restoreAllMocks();
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
    expect(bridge.getAttribute("data-known-state")).toContain(
      "KNOWN_SCREENING_STATE",
    );
    expect(bridge).toHaveAttribute("data-policy", VOICE_AGENT_POLICY_VERSION);
    expect(bridge).toHaveAttribute("data-remaining-seconds", "300");
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

  it("does not request or mount a provider after the original deadline", async () => {
    vi.spyOn(Date, "now").mockReturnValue(
      Date.parse("2026-09-15T10:05:00.000Z"),
    );
    const requestToken = vi.fn<VoiceTokenRequester>().mockResolvedValue({
      conversationId: "must-not-start",
      conversationToken: "must-not-be-issued",
    });
    const props = {
      ...stageProps(requestToken),
      sessionStartedAt: "2026-09-15T10:00:00.000Z",
    };

    render(<VoiceConnectionStage {...props} />);

    await waitFor(() => {
      expect(props.onInterrupted).toHaveBeenCalledOnce();
    });
    expect(requestToken).not.toHaveBeenCalled();
    expect(props.onSensitiveValuesCleared).toHaveBeenCalledOnce();
    expect(screen.queryByTestId("fake-session-bridge")).not.toBeInTheDocument();
  });

  it("measures Start through the verified provider-ready callback", async () => {
    const requestToken = vi.fn<VoiceTokenRequester>().mockResolvedValue({
      conversationId: "conversation-018",
      conversationToken: "short-lived-conversation-token",
    });
    const clock = [100, 450];
    const performanceTracker = createVoicePerformanceTracker(
      () => clock.shift() ?? 450,
    );
    const props = {
      ...stageProps(requestToken),
      liveSessionBridge: ConnectedSessionBridge,
      performanceTracker,
    };

    render(<VoiceConnectionStage {...props} />);

    await waitFor(() => {
      expect(props.onConnected).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: "conversation-018" }),
      );
    });
    expect(
      performanceTracker
        .getSnapshot()
        .samples.find((sample) => sample.metric === "connect_request_to_ready"),
    ).toMatchObject({ durationMs: 350 });
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
    window.history.replaceState({}, "", "/?diagnostics=timings");
    const requestToken = vi.fn<VoiceTokenRequester>().mockResolvedValue({
      conversationId: "fake-conversation-014",
      conversationToken: "fake-conversation-token",
    });
    const liveSessionBridge = vi.fn(() => null);
    const performanceTracker = createVoicePerformanceTracker();
    const props = {
      ...stageProps(requestToken),
      liveSessionBridge,
      liveVoiceEnabled: false,
      onConnected: vi.fn(),
      performanceTracker,
    };
    const rendered = render(
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
      { timeout: 5_000 },
    );
    expect(
      props.onFinalTranscriptTurn.mock.calls.map(([turn]) => turn.text),
    ).toEqual([
      "Hi. What would you like me to call you, and which role should this synthetic session use?",
      "Riley is fine. Please use Junior Software Developer for this session.",
      "What context and experience would you like to highlight?",
    ]);
    expect(
      props.onFinalTranscriptTurn.mock.calls.map(([turn]) => turn.speaker),
    ).toEqual(["interviewer", "candidate", "interviewer"]);
    expect(
      performanceTracker
        .getSnapshot()
        .samples.some((sample) => sample.metric === "ttfa"),
    ).toBe(true);
    await waitFor(() => {
      expect(props.onInsight).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "role_preference",
          source: "Candidate",
          value: "Junior Software Developer",
        }),
      );
      expect(props.onTopicProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "covered",
          topicKey: "preferred_name",
        }),
      );
    });
    expect(props.onSensitiveValuesCleared).toHaveBeenCalledOnce();
    expect(window.sessionStorage.length).toBe(0);

    rendered.rerender(
      <StrictMode>
        <VoiceConnectionStage {...props} stage="live" />
      </StrictMode>,
    );
    expect(
      JSON.parse(
        screen.getByLabelText<HTMLTextAreaElement>("Raw timing JSON").value,
      ),
    ).toMatchObject({ sampleCount: 2, source: "fake" });
    fireEvent.click(screen.getByRole("button", { name: "End interview" }));
    await waitFor(
      () => {
        expect(props.onEnded).toHaveBeenCalledWith(
          expect.objectContaining({
            endReason: "Interview ended by the candidate.",
            status: "ended",
          }),
          expect.objectContaining({ reason: "candidate_ended" }),
        );
      },
      { timeout: 3_000 },
    );
    const completion = props.onEnded.mock.calls.at(-1)?.[1];
    expect(typeof completion?.elapsedSeconds).toBe("number");
  });

  it("models a rich sample-CV review without pretending CV evidence exists in conversation-first mode", () => {
    const conversationFirstTrace =
      createFakeVoiceToolTrace("conversation_first");
    const cvAssistedTrace = createFakeVoiceToolTrace("cv_assisted");

    expect(
      conversationFirstTrace.find(
        (entry) =>
          entry.name === "recordInsight" &&
          entry.parameters["category"] === "relevant_experience",
      ),
    ).toMatchObject({
      name: "recordInsight",
      parameters: {
        category: "relevant_experience",
        source: "Candidate",
        value:
          "Six-month product internship supporting accessible workflow screens",
      },
    });
    expect(
      conversationFirstTrace.find(
        (entry) =>
          entry.name === "recordInsight" &&
          entry.parameters["category"] === "motivation",
      ),
    ).toMatchObject({
      parameters: {
        value: "Structured onboarding, mentorship, and room to grow",
      },
    });
    expect(
      conversationFirstTrace.find(
        (entry) => entry.name === "recordCandidateQuestion",
      ),
    ).toMatchObject({
      parameters: {
        question:
          "What onboarding and work-arrangement details can a recruiter share?",
      },
    });
    expect(
      conversationFirstTrace.find((entry) => entry.name === "requestFollowup"),
    ).toMatchObject({
      parameters: {
        reason:
          "A human recruiter must confirm the unsupported onboarding and work-arrangement details.",
      },
    });
    expect(
      FAKE_VOICE_EVENT_TRACE.find(
        (entry) =>
          entry.event.type === "message" &&
          entry.event.stability === "final" &&
          entry.event.speaker === "interviewer" &&
          entry.event.text.startsWith(UNSUPPORTED_EMPLOYER_QUESTION_FALLBACK),
      ),
    ).toBeDefined();
    expect(
      cvAssistedTrace.find((entry) => entry.name === "correctInsight"),
    ).toMatchObject({
      parameters: {
        cardId: "insight-relevant_experience",
        value:
          "Six-month product internship supporting accessible workflow screens",
      },
    });
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
      message:
        "The secure voice connection could not start. Check the connection and try again.",
      retryable: true,
      stage: "connecting",
    });
  });

  it("unmounts the provider bridge and clears normal-ending controls immediately", async () => {
    const requestToken = vi.fn<VoiceTokenRequester>().mockResolvedValue({
      conversationId: "conversation-normal-end",
      conversationToken: "short-lived-conversation-token",
    });
    const props = {
      ...stageProps(requestToken),
      liveSessionBridge: ConnectedSessionBridge,
      onConnected: vi.fn(),
    };
    const rendered = render(<VoiceConnectionStage {...props} />);

    await waitFor(() => {
      expect(props.onConnected).toHaveBeenCalledOnce();
    });
    rendered.rerender(<VoiceConnectionStage {...props} stage="live" />);
    expect(screen.getByTestId("connected-session-bridge")).toBeInTheDocument();
    const cleanupCountBeforeEnd = connectedBridgeCleanup.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "End interview" }));

    expect(props.onEnding).toHaveBeenCalledOnce();
    const completion = props.onEnding.mock.calls.at(-1)?.[0];
    expect(completion?.reason).toBe("candidate_ended");
    expect(typeof completion?.elapsedSeconds).toBe("number");
    await waitFor(() => {
      expect(connectedBridgeCleanup.mock.calls.length).toBeGreaterThan(
        cleanupCountBeforeEnd,
      );
      expect(
        screen.queryByTestId("connected-session-bridge"),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Ending interview" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Mute microphone" }),
    ).toBeDisabled();
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

  it("does not offer Retry for an owner-action voice failure", () => {
    const requestToken = vi.fn<VoiceTokenRequester>();
    const props = {
      ...stageProps(requestToken),
      failure: {
        code: "VOICE_PROVIDER_OWNER_ACTION",
        message:
          "The voice interview cannot start right now. The demo owner must check the voice service before another attempt.",
        retryable: false,
        stage: "connecting" as const,
      },
      startRequest: null,
    };

    render(<VoiceConnectionStage {...props} />);

    expect(
      screen.getByText(
        "The voice interview cannot start right now. The demo owner must check the voice service before another attempt.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Retry from preflight" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Return to preflight" }),
    ).toBeVisible();
    expect(requestToken).not.toHaveBeenCalled();
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

    expect(screen.getByText("Step 4 of 5 · Secure connection")).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Connecting your AI interview.",
      }),
    ).toBeVisible();
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
