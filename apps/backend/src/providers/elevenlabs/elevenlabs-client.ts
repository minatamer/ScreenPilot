import { z } from "zod";

import { ELEVENLABS_CONVERSATION_TOKEN_URL } from "../../config/provider-mode.js";

const MAXIMUM_ELEVENLABS_RESPONSE_BYTES = 16_384;

type ElevenLabsFailureCategory =
  | "fetch_failure"
  | "http_non_success"
  | "request_timeout"
  | "response_body_empty"
  | "response_body_invalid"
  | "response_body_oversized"
  | "response_json_invalid"
  | "response_schema_mismatch";

type ElevenLabsResponseBodyFailureCategory = Extract<
  ElevenLabsFailureCategory,
  "response_body_empty" | "response_body_invalid" | "response_body_oversized"
>;

class ElevenLabsResponseBodyError extends Error {
  readonly category: ElevenLabsResponseBodyFailureCategory;

  constructor(category: ElevenLabsResponseBodyFailureCategory) {
    super("The ElevenLabs response body could not be read safely.");
    this.name = "ElevenLabsResponseBodyError";
    this.category = category;
  }
}

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
  readonly category: ElevenLabsFailureCategory;
  readonly durationMs: number;
  readonly httpStatus?: number;
  readonly retryable = true;

  constructor(input: {
    category: ElevenLabsFailureCategory;
    cause?: unknown;
    durationMs: number;
    httpStatus?: number;
  }) {
    super(
      "The secure voice connection is temporarily unavailable. Try again.",
      input.cause === undefined ? undefined : { cause: input.cause },
    );
    this.name = "ElevenLabsRequestError";
    this.category = input.category;
    this.durationMs = input.durationMs;
    if (input.httpStatus !== undefined) {
      this.httpStatus = input.httpStatus;
    }
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
    throw new ElevenLabsResponseBodyError("response_body_oversized");
  }
  if (response.body === null) {
    throw new ElevenLabsResponseBodyError("response_body_empty");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;
  try {
    let streamResult = await reader.read();
    while (!streamResult.done) {
      const chunk: unknown = streamResult.value;
      if (!(chunk instanceof Uint8Array)) {
        throw new ElevenLabsResponseBodyError("response_body_invalid");
      }
      byteCount += chunk.byteLength;
      if (byteCount > MAXIMUM_ELEVENLABS_RESPONSE_BYTES) {
        await reader.cancel();
        throw new ElevenLabsResponseBodyError("response_body_oversized");
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
  if (byteCount === 0) {
    throw new ElevenLabsResponseBodyError("response_body_empty");
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    throw new ElevenLabsResponseBodyError("response_body_invalid");
  }
}

export type ElevenLabsHttpClientOptions = Readonly<{
  agentId: string;
  apiKey: string;
  clockMilliseconds?: () => number;
  fetchImplementation?: typeof fetch;
  timeoutMs: number;
  tokenUrl?: string;
}>;

export class ElevenLabsHttpClient implements ElevenLabsClient {
  readonly #agentId: string;
  readonly #apiKey: string;
  readonly #clockMilliseconds: () => number;
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
    this.#clockMilliseconds = options.clockMilliseconds ?? Date.now;
    this.#fetchImplementation = options.fetchImplementation ?? fetch;
    this.#timeoutMs = options.timeoutMs;
    this.#tokenUrl = options.tokenUrl ?? ELEVENLABS_CONVERSATION_TOKEN_URL;
  }

  #createRequestError(
    category: ElevenLabsFailureCategory,
    startedAt: number,
    input: { cause?: unknown; httpStatus?: number } = {},
  ): ElevenLabsRequestError {
    const elapsed = this.#clockMilliseconds() - startedAt;
    const durationMs = Number.isFinite(elapsed)
      ? Math.max(0, Math.round(elapsed))
      : 0;
    return new ElevenLabsRequestError({
      category,
      durationMs,
      ...(input.cause === undefined ? {} : { cause: input.cause }),
      ...(input.httpStatus === undefined
        ? {}
        : { httpStatus: input.httpStatus }),
    });
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
    const startedAt = this.#clockMilliseconds();
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
        throw this.#createRequestError("http_non_success", startedAt, {
          httpStatus: response.status,
        });
      }
      const responseText = await readBoundedResponse(response);
      let responseJson: unknown;
      try {
        responseJson = JSON.parse(responseText);
      } catch (error: unknown) {
        throw this.#createRequestError("response_json_invalid", startedAt, {
          cause: error,
        });
      }
      const parsedResult =
        conversationTokenResponseSchema.safeParse(responseJson);
      if (!parsedResult.success) {
        throw this.#createRequestError("response_schema_mismatch", startedAt);
      }
      const parsed = parsedResult.data;
      return {
        conversationId: parsed.conversation_id,
        conversationToken: parsed.token,
      };
    } catch (error: unknown) {
      if (error instanceof ElevenLabsRequestError) {
        throw error;
      }
      if (error instanceof ElevenLabsResponseBodyError) {
        throw this.#createRequestError(error.category, startedAt, {
          cause: error,
        });
      }
      request.signal?.throwIfAborted();
      if (timeoutSignal.aborted) {
        throw this.#createRequestError("request_timeout", startedAt, {
          cause: error,
        });
      }
      throw this.#createRequestError("fetch_failure", startedAt, {
        cause: error,
      });
    }
  }
}
