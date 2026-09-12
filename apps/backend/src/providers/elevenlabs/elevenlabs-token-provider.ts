import type {
  VoiceTokenProvider,
  VoiceTokenProviderInput,
  VoiceTokenProviderResult,
} from "../../use-cases/ports/voice-token-provider.js";
import type { ElevenLabsClient } from "./elevenlabs-client.js";

export class ElevenLabsVoiceTokenProvider implements VoiceTokenProvider {
  readonly #agentId: string;
  readonly #client: ElevenLabsClient;

  constructor(input: { agentId: string; client: ElevenLabsClient }) {
    this.#agentId = input.agentId;
    this.#client = input.client;
  }

  async createVoiceToken(
    _input: VoiceTokenProviderInput,
    signal?: AbortSignal,
  ): Promise<VoiceTokenProviderResult> {
    return this.#client.createConversationToken({
      agentId: this.#agentId,
      ...(signal ? { signal } : {}),
    });
  }
}
