import type { ClientTools } from "@elevenlabs/react";

import type { VoiceDynamicVariables } from "./voice-session-context";

export type VoiceSessionAuthorization = Readonly<{
  conversationId: string;
  conversationToken: string;
}>;

export type VoiceSessionSpeaker = "candidate" | "interviewer";

export type VoiceSessionEvent =
  | Readonly<{
      type: "connected";
      conversationId: string;
    }>
  | Readonly<{
      type: "connection_status";
      status: "connecting" | "reconnecting" | "reconnected" | "disconnecting";
    }>
  | Readonly<{
      type: "mode";
      mode: "listening" | "speaking";
    }>
  | Readonly<{
      type: "message";
      eventId?: number | undefined;
      speaker: VoiceSessionSpeaker;
      stability: "tentative" | "final";
      text: string;
    }>
  | Readonly<{
      type: "interruption";
      eventId?: number | undefined;
    }>
  | Readonly<{
      type: "error";
      message: string;
    }>
  | Readonly<{
      type: "disconnected";
      message?: string | undefined;
      reason: "agent" | "error" | "user";
    }>;

export type VoiceSessionBridgeProps = Readonly<{
  authorization?: VoiceSessionAuthorization | undefined;
  clientTools: ClientTools;
  dynamicVariables: VoiceDynamicVariables;
  endRequested: boolean;
  expectedConversationId?: string | undefined;
  isMuted: boolean;
  onAuthorizationConsumed: () => void;
  onEvent: (event: VoiceSessionEvent) => void;
}>;
