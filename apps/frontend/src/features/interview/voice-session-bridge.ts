import type { ClientTools } from "@elevenlabs/react";

import type { VoiceDynamicVariables } from "./voice-session-context";

export type VoiceSessionAuthorization = Readonly<{
  conversationId: string;
  conversationToken: string;
}>;

export type VoiceSessionBridgeProps = Readonly<{
  authorization?: VoiceSessionAuthorization | undefined;
  clientTools: ClientTools;
  dynamicVariables: VoiceDynamicVariables;
  expectedConversationId?: string | undefined;
  onAuthorizationConsumed: () => void;
  onConnected: (conversationId: string) => void;
  onFailure: (message: string) => void;
  onInterrupted: () => void;
}>;
