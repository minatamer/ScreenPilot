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

export type ElevenLabsProviderFailureClass =
  | "account_or_authentication"
  | "billing_or_quota"
  | "request_configuration"
  | "transient"
  | "unclassified";

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
  readonly providerCode?: string;
  readonly providerFailureClass: ElevenLabsProviderFailureClass;
  readonly providerType?: string;
  readonly retryAfterSeconds: number | undefined;
  readonly retryable: boolean;

  constructor(input: {
    category: ElevenLabsFailureCategory;
    cause?: unknown;
    durationMs: number;
    httpStatus?: number;
    providerCode?: string;
    providerFailureClass?: ElevenLabsProviderFailureClass;
    providerType?: string;
    retryAfterSeconds?: number;
    retryable?: boolean;
  }) {
    super(
      "The secure voice connection is temporarily unavailable. Try again.",
      input.cause === undefined ? undefined : { cause: input.cause },
    );
    this.name = "ElevenLabsRequestError";
    this.category = input.category;
    this.durationMs = input.durationMs;
    this.providerFailureClass = input.providerFailureClass ?? "unclassified";
    this.retryAfterSeconds = input.retryAfterSeconds;
    this.retryable = input.retryable ?? true;
    if (input.httpStatus !== undefined) {
      this.httpStatus = input.httpStatus;
    }
    if (input.providerCode !== undefined) {
      this.providerCode = input.providerCode;
    }
    if (input.providerType !== undefined) {
      this.providerType = input.providerType;
    }
  }
}

const providerMarkerSchema = z
  .string()
  .trim()
  .max(128)
  .regex(/^[A-Za-z0-9_.-]+$/)
  .transform((value) => value.toLowerCase());

const elevenLabsErrorFieldsSchema = z.object({
  code: providerMarkerSchema.nullish(),
  reason: providerMarkerSchema.nullish(),
  status: providerMarkerSchema.nullish(),
  type: providerMarkerSchema.nullish(),
});

const elevenLabsErrorEnvelopeSchema = z.object({
  code: providerMarkerSchema.nullish(),
  detail: elevenLabsErrorFieldsSchema.nullish(),
  error: elevenLabsErrorFieldsSchema.nullish(),
  reason: providerMarkerSchema.nullish(),
  status: providerMarkerSchema.nullish(),
  type: providerMarkerSchema.nullish(),
});

const BILLING_OR_QUOTA_MARKERS = new Set([
  "billing_hard_limit_reached",
  "billing_not_active",
  "credit_balance_exhausted",
  "insufficient_credit",
  "insufficient_credits",
  "insufficient_quota",
  "payment_required",
  "quota_exceeded",
]);

const ACCOUNT_OR_AUTHENTICATION_MARKERS = new Set([
  "account_deactivated",
  "forbidden",
  "invalid_api_key",
  "organization_deactivated",
  "unauthorized",
]);

function parseRetryAfterSeconds(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) {
    return undefined;
  }
  const seconds = Number(value);
  return Number.isSafeInteger(seconds) && seconds > 0
    ? Math.min(seconds, 86_400)
    : undefined;
}

function classifyHttpFailure(
  response: Response,
  responseText: string | null,
): Readonly<{
  providerCode?: string;
  providerFailureClass: ElevenLabsProviderFailureClass;
  providerType?: string;
  retryAfterSeconds?: number;
  retryable: boolean;
}> {
  let providerCode: string | undefined;
  let providerType: string | undefined;
  let markers: readonly string[] = [];
  if (responseText !== null) {
    try {
      const parsed = elevenLabsErrorEnvelopeSchema.safeParse(
        JSON.parse(responseText),
      );
      if (parsed.success) {
        const envelope = parsed.data;
        const fields = envelope.detail ?? envelope.error ?? envelope;
        providerCode = fields.code ?? fields.status ?? undefined;
        providerType = fields.type ?? fields.reason ?? undefined;
        markers = [
          envelope.code,
          envelope.reason,
          envelope.status,
          envelope.type,
          envelope.detail?.code,
          envelope.detail?.reason,
          envelope.detail?.status,
          envelope.detail?.type,
          envelope.error?.code,
          envelope.error?.reason,
          envelope.error?.status,
          envelope.error?.type,
        ].filter((value): value is string => typeof value === "string");
      }
    } catch {
      // The bounded HTTP status remains sufficient for a safe classification.
    }
  }
  if (markers.some((marker) => BILLING_OR_QUOTA_MARKERS.has(marker))) {
    return {
      ...(providerCode === undefined ? {} : { providerCode }),
      providerFailureClass: "billing_or_quota",
      ...(providerType === undefined ? {} : { providerType }),
      retryable: false,
    };
  }
  if (
    response.status === 401 ||
    response.status === 403 ||
    markers.some((marker) => ACCOUNT_OR_AUTHENTICATION_MARKERS.has(marker))
  ) {
    return {
      ...(providerCode === undefined ? {} : { providerCode }),
      providerFailureClass: "account_or_authentication",
      ...(providerType === undefined ? {} : { providerType }),
      retryable: false,
    };
  }
  if (
    response.status === 408 ||
    response.status === 409 ||
    response.status === 425 ||
    response.status === 429 ||
    response.status >= 500
  ) {
    const retryAfterSeconds = parseRetryAfterSeconds(
      response.headers.get("retry-after"),
    );
    return {
      ...(providerCode === undefined ? {} : { providerCode }),
      providerFailureClass: "transient",
      ...(providerType === undefined ? {} : { providerType }),
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
      retryable: true,
    };
  }
  if (response.status >= 400 && response.status < 500) {
    return {
      ...(providerCode === undefined ? {} : { providerCode }),
      providerFailureClass: "request_configuration",
      ...(providerType === undefined ? {} : { providerType }),
      retryable: false,
    };
  }
  return { providerFailureClass: "unclassified", retryable: false };
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
    input: {
      cause?: unknown;
      httpStatus?: number;
      providerCode?: string;
      providerFailureClass?: ElevenLabsProviderFailureClass;
      providerType?: string;
      retryAfterSeconds?: number;
      retryable?: boolean;
    } = {},
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
      ...(input.providerCode === undefined
        ? {}
        : { providerCode: input.providerCode }),
      ...(input.providerFailureClass === undefined
        ? {}
        : { providerFailureClass: input.providerFailureClass }),
      ...(input.providerType === undefined
        ? {}
        : { providerType: input.providerType }),
      ...(input.retryAfterSeconds === undefined
        ? {}
        : { retryAfterSeconds: input.retryAfterSeconds }),
      ...(input.retryable === undefined ? {} : { retryable: input.retryable }),
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
        let responseText: string | null = null;
        try {
          responseText = await readBoundedResponse(response);
        } catch {
          responseText = null;
        }
        const classification = classifyHttpFailure(response, responseText);
        throw this.#createRequestError("http_non_success", startedAt, {
          httpStatus: response.status,
          ...classification,
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
          providerFailureClass: "transient",
          retryable: true,
        });
      }
      throw this.#createRequestError("fetch_failure", startedAt, {
        cause: error,
        providerFailureClass: "transient",
        retryable: true,
      });
    }
  }
}
