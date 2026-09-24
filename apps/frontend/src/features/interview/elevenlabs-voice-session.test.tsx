import { StrictMode, type ReactNode } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { VOICE_AGENT_POLICY_VERSION } from "@screenpilot/contracts/api/voice-token";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ElevenLabsVoiceSession } from "./elevenlabs-voice-session";
import type {
  VoiceSessionBridgeProps,
  VoiceSessionEvent,
} from "./voice-session-bridge";
import type { VoiceDynamicVariables } from "./voice-session-context";

const sdk = vi.hoisted(() => ({
  endSession: vi.fn(),
  providerProps: undefined as
    Record<string, (...arguments_: never[]) => unknown> | undefined,
  startSession: vi.fn(),
}));

vi.mock("@elevenlabs/react", () => ({
  ConversationProvider: ({
    children,
    ...props
  }: {
    children: ReactNode;
    [key: string]: unknown;
  }) => {
    sdk.providerProps = props as Record<
      string,
      (...arguments_: never[]) => unknown
    >;
    return children;
  },
  useConversationControls: () => ({
    endSession: sdk.endSession,
    startSession: sdk.startSession,
  }),
}));

const dynamicVariables = {
  screenpilot_policy_version: VOICE_AGENT_POLICY_VERSION,
  screenpilot_entry_mode: "conversation_first",
  screenpilot_demo_disclosure: "bounded disclosure",
  screenpilot_screening_plan: "bounded universal plan",
  screenpilot_role_context: "bounded role context",
  screenpilot_cv_context: "bounded empty CV context",
  screenpilot_known_state: "bounded known state",
  screenpilot_remaining_seconds: 480,
} satisfies VoiceDynamicVariables;

const testClientTools = {
  recordInsight: () => "Applied",
  correctInsight: () => "Applied",
  markTopic: () => "Applied",
  recordCandidateQuestion: () => "Applied",
  requestFollowup: () => "Applied",
} as const;

function props(
  overrides: Partial<VoiceSessionBridgeProps> = {},
): VoiceSessionBridgeProps {
  return {
    authorization: {
      conversationId: "conversation-014",
      conversationToken: "short-lived-conversation-token",
    },
    clientTools: testClientTools,
    dynamicVariables,
    endRequested: false,
    expectedConversationId: "conversation-014",
    isMuted: false,
    onAuthorizationConsumed: vi.fn(),
    onEvent: vi.fn(),
    ...overrides,
  };
}

function emitProviderCallback(name: string, payload: unknown) {
  act(() => {
    sdk.providerProps?.[name]?.(payload as never);
  });
}

describe("ElevenLabsVoiceSession", () => {
  beforeEach(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    vi.clearAllMocks();
    sdk.providerProps = undefined;
  });

  it("starts exactly one private WebRTC session and clears the authorization", async () => {
    const sessionProps = props();
    const rendered = render(
      <StrictMode>
        <ElevenLabsVoiceSession {...sessionProps} />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(sdk.startSession).toHaveBeenCalledOnce();
    });
    expect(sdk.startSession).toHaveBeenCalledWith({
      connectionType: "webrtc",
      conversationToken: "short-lived-conversation-token",
      dynamicVariables,
    });
    expect(sessionProps.onAuthorizationConsumed).toHaveBeenCalledOnce();
    expect(sdk.providerProps?.["clientTools"]).toEqual(
      sessionProps.clientTools,
    );
    expect(sdk.providerProps?.["isMuted"]).toBe(false);
    expect(sdk.providerProps?.["libsampleratePath"]).toBe(
      "/worklets/libsamplerate.worklet.js",
    );
    expect(sdk.providerProps?.["workletPaths"]).toEqual({
      rawAudioProcessor: "/worklets/elevenlabs-raw-audio-processor.js",
    });
    expect(sdk.providerProps).not.toHaveProperty("onDebug");
    expect(sdk.providerProps).not.toHaveProperty("onIncomingEvent");
    expect(JSON.stringify(sdk.startSession.mock.calls)).not.toMatch(
      /agentId|voiceId|promptOverride/i,
    );

    rendered.rerender(
      <ElevenLabsVoiceSession {...sessionProps} authorization={undefined} />,
    );
    expect(sdk.endSession).not.toHaveBeenCalled();
    rendered.unmount();
    await waitFor(() => {
      expect(sdk.endSession).toHaveBeenCalledOnce();
    });
  });

  it("rejects a provider conversation identifier that differs from the backend", async () => {
    const onEvent = vi.fn<(event: VoiceSessionEvent) => void>();
    render(<ElevenLabsVoiceSession {...props({ onEvent })} />);
    await waitFor(() => {
      expect(sdk.startSession).toHaveBeenCalledOnce();
    });

    emitProviderCallback("onConnect", {
      conversationId: "different-conversation",
    });

    expect(onEvent).toHaveBeenCalledWith({
      type: "error",
      failure: {
        class: "owner_action",
        message:
          "The secure voice connection could not be verified. The demo owner must check the voice service before another attempt.",
        retryable: false,
      },
    });
    expect(sdk.endSession).toHaveBeenCalledOnce();
  });

  it("maps status, reconnect, mode, message, interruption, and disconnect callbacks", async () => {
    const onEvent = vi.fn<(event: VoiceSessionEvent) => void>();
    render(<ElevenLabsVoiceSession {...props({ onEvent })} />);
    await waitFor(() => {
      expect(sdk.startSession).toHaveBeenCalledOnce();
    });

    emitProviderCallback("onStatusChange", { status: "connecting" });
    emitProviderCallback("onConnect", { conversationId: "conversation-014" });
    emitProviderCallback("onModeChange", { mode: "speaking" });
    emitProviderCallback("onVadScore", { vadScore: 0.49 });
    emitProviderCallback("onVadScore", { vadScore: 0.5 });
    emitProviderCallback("onVadScore", { vadScore: 0.8 });
    emitProviderCallback("onVadScore", { vadScore: 0.2 });
    emitProviderCallback("onAudio", "base64-audio-not-inspected");
    emitProviderCallback("onAudio", "second-audio-chunk");
    emitProviderCallback("onMessage", {
      event_id: 7,
      message: "Mm-hm…",
      role: "agent",
      source: "ai",
    });
    emitProviderCallback("onAudio", "substantive-audio-chunk");
    emitProviderCallback("onMessage", {
      event_id: 8,
      message: "Tell me about your goals.",
      role: "agent",
      source: "ai",
    });
    emitProviderCallback("onInterruption", { event_id: 9 });
    emitProviderCallback("onStatusChange", { status: "connecting" });
    emitProviderCallback("onStatusChange", { status: "connected" });
    emitProviderCallback("onDisconnect", {
      reason: "error",
      message: "Connection lost.",
      context: { type: "close" },
    });

    expect(onEvent.mock.calls.map(([event]) => event)).toEqual([
      { type: "connection_status", status: "connecting" },
      { type: "connected", conversationId: "conversation-014" },
      { type: "mode", mode: "speaking" },
      { type: "candidate_speech_activity", active: true },
      { type: "candidate_speech_activity", active: false },
      { type: "agent_audio_started" },
      { type: "latency_filler" },
      { type: "agent_audio_started" },
      {
        type: "message",
        eventId: 8,
        speaker: "interviewer",
        stability: "final",
        text: "Tell me about your goals.",
      },
      { type: "interruption", eventId: 9 },
      { type: "connection_status", status: "reconnecting" },
      { type: "connection_status", status: "reconnected" },
      {
        type: "disconnected",
        reason: "error",
        failure: {
          class: "unclassified",
          message:
            "The secure voice connection could not start. Check the connection and try again.",
          retryable: true,
        },
      },
    ]);
  });

  it("discards sensitive SDK messages and maps allow-listed owner-action context", async () => {
    const sensitiveMessage =
      "payment_required for acct_secret_candidate@example.invalid key sk-live-secret";
    const onEvent = vi.fn<(event: VoiceSessionEvent) => void>();
    render(<ElevenLabsVoiceSession {...props({ onEvent })} />);
    await waitFor(() => {
      expect(sdk.startSession).toHaveBeenCalledOnce();
    });

    emitProviderCallback("onConnect", {
      conversationId: "conversation-014",
    });

    act(() => {
      sdk.providerProps?.["onError"]?.(
        sensitiveMessage as never,
        {
          code: "payment_required",
          message: sensitiveMessage,
        } as never,
      );
    });
    emitProviderCallback("onDisconnect", {
      message: sensitiveMessage,
      reason: "error",
    });

    expect(onEvent).toHaveBeenCalledWith({
      type: "error",
      failure: {
        class: "owner_action",
        message:
          "The voice interview cannot start right now. The demo owner must check the voice service before another attempt.",
        retryable: false,
      },
    });
    expect(JSON.stringify(onEvent.mock.calls)).not.toContain(sensitiveMessage);
    expect(sdk.endSession).toHaveBeenCalledOnce();
  });

  it("ends the SDK session once when the UI requests completion", async () => {
    const sessionProps = props();
    const rendered = render(<ElevenLabsVoiceSession {...sessionProps} />);
    await waitFor(() => {
      expect(sdk.startSession).toHaveBeenCalledOnce();
    });

    rendered.rerender(
      <ElevenLabsVoiceSession {...sessionProps} endRequested />,
    );
    rendered.rerender(
      <ElevenLabsVoiceSession {...sessionProps} endRequested />,
    );

    expect(sdk.endSession).toHaveBeenCalledOnce();
  });

  it("maps typed streaming agent text to tentative and final Pilot captions", async () => {
    const onEvent = vi.fn<(event: VoiceSessionEvent) => void>();
    render(<ElevenLabsVoiceSession {...props({ onEvent })} />);
    await waitFor(() => {
      expect(sdk.startSession).toHaveBeenCalledOnce();
    });

    emitProviderCallback("onConnect", {
      conversationId: "conversation-014",
    });
    emitProviderCallback("onAgentChatResponsePart", {
      event_id: 12,
      text: "",
      type: "start",
    });
    emitProviderCallback("onAgentChatResponsePart", {
      event_id: 12,
      text: "What work ",
      type: "delta",
    });
    emitProviderCallback("onAgentChatResponsePart", {
      event_id: 12,
      text: "arrangement do you prefer?",
      type: "delta",
    });
    emitProviderCallback("onAgentChatResponsePart", {
      event_id: 12,
      text: "",
      type: "stop",
    });
    emitProviderCallback("onMessage", {
      event_id: 12,
      message: "What work arrangement do you prefer?",
      role: "agent",
      source: "ai",
    });

    expect(onEvent.mock.calls.map(([event]) => event)).toEqual([
      { type: "connected", conversationId: "conversation-014" },
      {
        type: "message",
        eventId: 12,
        speaker: "interviewer",
        stability: "tentative",
        text: "What work ",
      },
      {
        type: "message",
        eventId: 12,
        speaker: "interviewer",
        stability: "tentative",
        text: "What work arrangement do you prefer?",
      },
      {
        type: "message",
        eventId: 12,
        speaker: "interviewer",
        stability: "final",
        text: "What work arrangement do you prefer?",
      },
    ]);
  });
});
