export type VoiceTokenProviderInput = Readonly<{
  requestId: string;
}>;

export type VoiceTokenProviderResult = Readonly<{
  conversationToken: string;
  expiresAt: string;
}>;

export interface VoiceTokenProvider {
  createVoiceToken(
    input: VoiceTokenProviderInput,
    signal?: AbortSignal,
  ): Promise<VoiceTokenProviderResult>;
}
