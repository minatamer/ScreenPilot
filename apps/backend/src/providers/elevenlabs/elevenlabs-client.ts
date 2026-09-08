export type ElevenLabsConversationTokenRequest = Readonly<{
  agentId: string;
  signal?: AbortSignal;
}>;

export type ElevenLabsConversationTokenResponse = Readonly<{
  conversationId: string;
  conversationToken: string;
}>;

export interface ElevenLabsClient {
  createConversationToken(
    request: ElevenLabsConversationTokenRequest,
  ): Promise<ElevenLabsConversationTokenResponse>;
}
