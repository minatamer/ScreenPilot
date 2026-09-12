import { z } from "zod";

import { ELEVENLABS_CONVERSATION_TOKEN_URL } from "../../config/provider-mode.js";

const MAXIMUM_ELEVENLABS_RESPONSE_BYTES = 16_384;

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

const conversationTokenResponseSchema = z.object({
  conversation_id: z.string().trim().min(1).max(256),
  token: z.string().trim().min(1).max(8_192),
});

export class ElevenLabsRequestError extends Error {
  readonly code = "PROVIDER_UNAVAILABLE";
  readonly retryable = true;

  constructor(cause?: unknown) {
    super(
      "The secure voice connection is temporarily unavailable. Try again.",
      cause === undefined ? undefined : { cause },
    );
    this.name = "ElevenLabsRequestError";
  }
}

async function readBoundedResponse(response: Response): Promise<string> {
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    /^\d+$/.test(declaredLength) &&
    Number(declaredLength) > MAXIMUM_ELEVENLABS_RESPONSE_BYTES
  ) {
    await response.body?.cancel();
    throw new ElevenLabsRequestError();
  }
  if (response.body === null) {
    throw new ElevenLabsRequestError();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;
  try {
    let streamResult = await reader.read();
    while (!streamResult.done) {
      const chunk: unknown = streamResult.value;
      if (!(chunk instanceof Uint8Array)) {
        throw new ElevenLabsRequestError();
      }
      byteCount += chunk.byteLength;
      if (byteCount > MAXIMUM_ELEVENLABS_RESPONSE_BYTES) {
        await reader.cancel();
        throw new ElevenLabsRequestError();
      }
      chunks.push(chunk);
      streamResult = await reader.read();
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(byteCount);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export type ElevenLabsHttpClientOptions = Readonly<{
  agentId: string;
  apiKey: string;
  fetchImplementation?: typeof fetch;
  timeoutMs: number;
  tokenUrl?: string;
}>;

export class ElevenLabsHttpClient implements ElevenLabsClient {
  readonly #agentId: string;
  readonly #apiKey: string;
  readonly #fetchImplementation: typeof fetch;
  readonly #timeoutMs: number;
  readonly #tokenUrl: string;

  constructor(options: ElevenLabsHttpClientOptions) {
    if (options.apiKey.trim().length === 0) {
      throw new TypeError("Live ElevenLabs requests require an API key.");
    }
    if (options.agentId.trim().length === 0) {
      throw new TypeError("Live ElevenLabs requests require an agent ID.");
    }
    this.#agentId = options.agentId;
    this.#apiKey = options.apiKey;
    this.#fetchImplementation = options.fetchImplementation ?? fetch;
    this.#timeoutMs = options.timeoutMs;
    this.#tokenUrl = options.tokenUrl ?? ELEVENLABS_CONVERSATION_TOKEN_URL;
  }

  async createConversationToken(
    request: ElevenLabsConversationTokenRequest,
  ): Promise<ElevenLabsConversationTokenResponse> {
    request.signal?.throwIfAborted();
    if (request.agentId !== this.#agentId) {
      throw new TypeError("The requested ElevenLabs agent is not configured.");
    }
    const timeoutSignal = AbortSignal.timeout(this.#timeoutMs);
    const requestSignal = request.signal
      ? AbortSignal.any([request.signal, timeoutSignal])
      : timeoutSignal;
    const tokenUrl = new URL(this.#tokenUrl);
    tokenUrl.searchParams.set("agent_id", this.#agentId);

    try {
      const response = await this.#fetchImplementation(tokenUrl, {
        headers: {
          accept: "application/json",
          "xi-api-key": this.#apiKey,
        },
        method: "GET",
        signal: requestSignal,
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new ElevenLabsRequestError();
      }
      const parsed = conversationTokenResponseSchema.parse(
        JSON.parse(await readBoundedResponse(response)),
      );
      return {
        conversationId: parsed.conversation_id,
        conversationToken: parsed.token,
      };
    } catch (error: unknown) {
      if (error instanceof ElevenLabsRequestError) {
        throw error;
      }
      request.signal?.throwIfAborted();
      throw new ElevenLabsRequestError(error);
    }
  }
}
