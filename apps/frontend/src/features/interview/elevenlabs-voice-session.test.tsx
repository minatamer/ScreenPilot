import { StrictMode, type ReactNode } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ElevenLabsVoiceSession } from "./elevenlabs-voice-session";
import type {
  VoiceSessionBridgeProps,
  VoiceSessionEvent,
} from "./voice-session-bridge";
import {
  createDeferredVoiceClientTools,
  type VoiceDynamicVariables,
} from "./voice-session-context";

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
  screenpilot_policy_version: "sp014-connection-v1",
  screenpilot_entry_mode: "conversation_first",
  screenpilot_demo_disclosure: "bounded disclosure",
  screenpilot_screening_plan: "bounded universal plan",
  screenpilot_role_context: "bounded role context",
  screenpilot_cv_context: "bounded empty CV context",
} satisfies VoiceDynamicVariables;

function props(
  overrides: Partial<VoiceSessionBridgeProps> = {},
): VoiceSessionBridgeProps {
  return {
    authorization: {
      conversationId: "conversation-014",
      conversationToken: "short-lived-conversation-token",
    },
    clientTools: createDeferredVoiceClientTools(),
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
      message: "The voice-session identifier could not be verified.",
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
        message: "Connection lost.",
      },
    ]);
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
});
