import { StrictMode, type ReactNode } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ElevenLabsVoiceSession } from "./elevenlabs-voice-session";
import type { VoiceSessionBridgeProps } from "./voice-session-bridge";
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
    expectedConversationId: "conversation-014",
    onAuthorizationConsumed: vi.fn(),
    onConnected: vi.fn(),
    onFailure: vi.fn(),
    onInterrupted: vi.fn(),
    ...overrides,
  };
}

describe("ElevenLabsVoiceSession", () => {
  beforeEach(() => {
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

  it("accepts only the provider conversation identifier expected by the backend", async () => {
    const onConnected = vi.fn();
    const onFailure = vi.fn();
    render(<ElevenLabsVoiceSession {...props({ onConnected, onFailure })} />);
    await waitFor(() => {
      expect(sdk.startSession).toHaveBeenCalledOnce();
    });

    act(() => {
      sdk.providerProps?.["onConnect"]?.({
        conversationId: "different-conversation",
      } as never);
    });

    expect(onConnected).not.toHaveBeenCalled();
    expect(onFailure).toHaveBeenCalledWith(
      "The voice-session identifier could not be verified.",
    );
    expect(sdk.endSession).toHaveBeenCalledOnce();
  });

  it("maps pre-connect failures and post-connect errors to different recovery paths", async () => {
    const beforeConnectFailure = vi.fn();
    const first = render(
      <ElevenLabsVoiceSession
        {...props({ onFailure: beforeConnectFailure })}
      />,
    );
    await waitFor(() => {
      expect(sdk.startSession).toHaveBeenCalledOnce();
    });
    act(() => {
      sdk.providerProps?.["onError"]?.("provider rejected" as never);
    });
    expect(beforeConnectFailure).toHaveBeenCalledWith(
      "The voice provider rejected the connection.",
    );
    expect(sdk.endSession).toHaveBeenCalledOnce();
    first.unmount();

    vi.clearAllMocks();
    const onConnected = vi.fn();
    const onFailure = vi.fn();
    const onInterrupted = vi.fn();
    render(
      <ElevenLabsVoiceSession
        {...props({ onConnected, onFailure, onInterrupted })}
      />,
    );
    await waitFor(() => {
      expect(sdk.startSession).toHaveBeenCalledOnce();
    });
    act(() => {
      sdk.providerProps?.["onConnect"]?.({
        conversationId: "conversation-014",
      } as never);
      sdk.providerProps?.["onError"]?.("connection lost" as never);
    });

    expect(onConnected).toHaveBeenCalledWith("conversation-014");
    expect(onInterrupted).toHaveBeenCalledOnce();
    expect(onFailure).not.toHaveBeenCalled();
    expect(sdk.endSession).toHaveBeenCalledOnce();
  });
});
