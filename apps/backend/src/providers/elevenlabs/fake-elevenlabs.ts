import type {
  VoiceTokenProvider,
  VoiceTokenProviderInput,
  VoiceTokenProviderResult,
} from "../../use-cases/ports/voice-token-provider.js";

const fakeVoiceToken: VoiceTokenProviderResult = Object.freeze({
  conversationToken: "screenpilot-fake-conversation-token",
  expiresAt: "2030-01-01T00:00:00.000Z",
});

export class FakeElevenLabs implements VoiceTokenProvider {
  createVoiceToken(
    _input: VoiceTokenProviderInput,
    signal?: AbortSignal,
  ): Promise<VoiceTokenProviderResult> {
    signal?.throwIfAborted();
    return Promise.resolve(fakeVoiceToken);
  }
}
