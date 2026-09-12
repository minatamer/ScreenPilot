import type {
  VoiceTokenProvider,
  VoiceTokenProviderInput,
  VoiceTokenProviderResult,
} from "../../use-cases/ports/voice-token-provider.js";

const fakeVoiceToken: VoiceTokenProviderResult = Object.freeze({
  conversationId: "screenpilot-fake-conversation",
  conversationToken: "screenpilot-fake-conversation-token",
});

export class FakeElevenLabs implements VoiceTokenProvider {
  createVoiceToken(
    _input: VoiceTokenProviderInput,
    signal?: AbortSignal,
  ): Promise<VoiceTokenProviderResult> {
    return Promise.resolve().then(() => {
      signal?.throwIfAborted();
      return fakeVoiceToken;
    });
  }
}
