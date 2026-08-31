export type ElevenLabsConversationTokenRequest = Readonly<{
  agentId: string;
  signal?: AbortSignal;
}>;

export type ElevenLabsConversationTokenResponse = Readonly<{
  conversationToken: string;
  expiresAt: string;
}>;

export interface ElevenLabsClient {
  createConversationToken(
    request: ElevenLabsConversationTokenRequest,
  ): Promise<ElevenLabsConversationTokenResponse>;
}
