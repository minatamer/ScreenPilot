import { z } from "zod";

import type {
  ChallengeVerificationInput,
  ChallengeVerificationResult,
  ChallengeVerifier,
} from "../../use-cases/ports/challenge-verifier.js";

const MAXIMUM_SITEVERIFY_RESPONSE_BYTES = 16_384;
const MAXIMUM_TURNSTILE_TOKEN_CHARACTERS = 2_048;

type TurnstileVerificationFailureCategory =
  | "fetch_or_abort_failure"
  | "http_non_success"
  | "response_body_empty"
  | "response_body_invalid"
  | "response_body_oversized"
  | "response_json_invalid"
  | "response_schema_mismatch";

type SiteverifyResponseBodyFailureCategory = Extract<
  TurnstileVerificationFailureCategory,
  "response_body_empty" | "response_body_invalid" | "response_body_oversized"
>;

type TurnstileResponseSchemaMismatchCategory =
  | "action"
  | "cdata"
  | "challenge_timestamp"
  | "error_codes"
  | "hostname"
  | "metadata"
  | "success"
  | "unclassified";

class SiteverifyResponseBodyError extends Error {
  readonly category: SiteverifyResponseBodyFailureCategory;

  constructor(category: SiteverifyResponseBodyFailureCategory) {
    super("The Siteverify response body could not be read safely.");
    this.name = "SiteverifyResponseBodyError";
    this.category = category;
  }
}

const turnstileErrorCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/i);

const siteverifyResponseSchema = z.object({
  action: z
    .string()
    .regex(/^[a-z0-9_-]{0,32}$/i)
    .optional(),
  cdata: z.string().max(255).optional(),
  challenge_ts: z.iso.datetime({ offset: true }).optional(),
  "error-codes": z.array(turnstileErrorCodeSchema).max(16).optional(),
  hostname: z.string().trim().min(1).max(253).optional(),
  metadata: z
    .object({
      ephemeral_id: z.string().trim().min(1).max(256).optional(),
    })
    .optional(),
  success: z.boolean(),
});

function classifySchemaMismatch(
  error: z.ZodError,
): TurnstileResponseSchemaMismatchCategory {
  const fields = new Set(error.issues.map((issue) => issue.path[0]));
  const categoryByField = [
    ["success", "success"],
    ["action", "action"],
    ["cdata", "cdata"],
    ["challenge_ts", "challenge_timestamp"],
    ["error-codes", "error_codes"],
    ["hostname", "hostname"],
    ["metadata", "metadata"],
  ] as const satisfies readonly (readonly [
    string,
    TurnstileResponseSchemaMismatchCategory,
  ])[];
  for (const [field, category] of categoryByField) {
    if (fields.has(field)) {
      return category;
    }
  }
  return "unclassified";
}

async function readBoundedSiteverifyResponse(response: Response) {
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    /^\d+$/.test(declaredLength) &&
    Number(declaredLength) > MAXIMUM_SITEVERIFY_RESPONSE_BYTES
  ) {
    await response.body?.cancel();
    throw new SiteverifyResponseBodyError("response_body_oversized");
  }
  if (response.body === null) {
    throw new SiteverifyResponseBodyError("response_body_empty");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;
  try {
    let streamResult = await reader.read();
    while (!streamResult.done) {
      const chunk: unknown = streamResult.value;
      if (!(chunk instanceof Uint8Array)) {
        throw new SiteverifyResponseBodyError("response_body_invalid");
      }
      byteCount += chunk.byteLength;
      if (byteCount > MAXIMUM_SITEVERIFY_RESPONSE_BYTES) {
        await reader.cancel();
        throw new SiteverifyResponseBodyError("response_body_oversized");
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
    throw new SiteverifyResponseBodyError("response_body_empty");
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    throw new SiteverifyResponseBodyError("response_body_invalid");
  }
}

export class TurnstileVerificationError extends Error {
  readonly code = "TURNSTILE_UNAVAILABLE";
  readonly category: TurnstileVerificationFailureCategory;
  readonly durationMs: number;
  readonly httpStatus?: number;
  readonly schemaMismatchCategory?: TurnstileResponseSchemaMismatchCategory;
  readonly retryable = true;

  constructor(input: {
    category: TurnstileVerificationFailureCategory;
    cause?: unknown;
    durationMs: number;
    httpStatus?: number;
    schemaMismatchCategory?: TurnstileResponseSchemaMismatchCategory;
  }) {
    super(
      "Challenge verification is temporarily unavailable. Try again.",
      input.cause === undefined ? undefined : { cause: input.cause },
    );
    this.name = "TurnstileVerificationError";
    this.category = input.category;
    this.durationMs = input.durationMs;
    if (input.httpStatus !== undefined) {
      this.httpStatus = input.httpStatus;
    }
    if (input.schemaMismatchCategory !== undefined) {
      this.schemaMismatchCategory = input.schemaMismatchCategory;
    }
  }
}

export type CloudflareTurnstileVerifierOptions = Readonly<{
  allowedHostnames: readonly string[];
  clockMilliseconds?: () => number;
  fetchImplementation?: typeof fetch;
  secretKey: string;
  timeoutMs: number;
  verificationUrl: string;
}>;

export class CloudflareTurnstileVerifier implements ChallengeVerifier {
  readonly #allowedHostnames: ReadonlySet<string>;
  readonly #clockMilliseconds: () => number;
  readonly #fetchImplementation: typeof fetch;
  readonly #secretKey: string;
  readonly #timeoutMs: number;
  readonly #verificationUrl: string;

  constructor(options: CloudflareTurnstileVerifierOptions) {
    if (
      options.secretKey.length === 0 ||
      options.allowedHostnames.length === 0
    ) {
      throw new TypeError(
        "Live Turnstile verification requires a secret and allowed hostname.",
      );
    }
    this.#allowedHostnames = new Set(
      options.allowedHostnames.map((hostname) => hostname.toLowerCase()),
    );
    this.#clockMilliseconds = options.clockMilliseconds ?? Date.now;
    this.#fetchImplementation = options.fetchImplementation ?? fetch;
    this.#secretKey = options.secretKey;
    this.#timeoutMs = options.timeoutMs;
    this.#verificationUrl = options.verificationUrl;
  }

  #createVerificationError(
    category: TurnstileVerificationFailureCategory,
    startedAt: number,
    input: {
      cause?: unknown;
      httpStatus?: number;
      schemaMismatchCategory?: TurnstileResponseSchemaMismatchCategory;
    } = {},
  ): TurnstileVerificationError {
    const elapsed = this.#clockMilliseconds() - startedAt;
    const durationMs = Number.isFinite(elapsed)
      ? Math.max(0, Math.round(elapsed))
      : 0;
    return new TurnstileVerificationError({
      category,
      durationMs,
      ...(input.cause === undefined ? {} : { cause: input.cause }),
      ...(input.httpStatus === undefined
        ? {}
        : { httpStatus: input.httpStatus }),
      ...(input.schemaMismatchCategory === undefined
        ? {}
        : { schemaMismatchCategory: input.schemaMismatchCategory }),
    });
  }

  async verifyChallenge(
    input: ChallengeVerificationInput,
    signal?: AbortSignal,
  ): Promise<ChallengeVerificationResult> {
    if (
      input.token.length === 0 ||
      input.token.length > MAXIMUM_TURNSTILE_TOKEN_CHARACTERS
    ) {
      return {
        action: null,
        errorCodes: ["invalid-input-response"],
        hostname: null,
        success: false,
      };
    }

    const timeoutSignal = AbortSignal.timeout(this.#timeoutMs);
    const requestSignal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;
    const startedAt = this.#clockMilliseconds();

    try {
      const response = await this.#fetchImplementation(this.#verificationUrl, {
        body: new URLSearchParams({
          response: input.token,
          secret: this.#secretKey,
        }),
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        method: "POST",
        signal: requestSignal,
      });
      if (!response.ok) {
        throw this.#createVerificationError("http_non_success", startedAt, {
          httpStatus: response.status,
        });
      }

      const responseText = await readBoundedSiteverifyResponse(response);
      if (responseText.trim().length === 0) {
        throw this.#createVerificationError("response_body_empty", startedAt);
      }
      let responseJson: unknown;
      try {
        responseJson = JSON.parse(responseText);
      } catch (error: unknown) {
        throw this.#createVerificationError(
          "response_json_invalid",
          startedAt,
          { cause: error },
        );
      }
      const parsedResponseResult =
        siteverifyResponseSchema.safeParse(responseJson);
      if (!parsedResponseResult.success) {
        throw this.#createVerificationError(
          "response_schema_mismatch",
          startedAt,
          {
            schemaMismatchCategory: classifySchemaMismatch(
              parsedResponseResult.error,
            ),
          },
        );
      }
      const parsedResponse = parsedResponseResult.data;
      const action = parsedResponse.action ?? null;
      const hostname = parsedResponse.hostname?.toLowerCase() ?? null;
      const errorCodes = parsedResponse["error-codes"] ?? [];

      if (!parsedResponse.success) {
        return { action, errorCodes, hostname, success: false };
      }
      if (action !== input.expectedAction) {
        return {
          action,
          errorCodes: ["action-mismatch"],
          hostname,
          success: false,
        };
      }
      if (hostname === null || !this.#allowedHostnames.has(hostname)) {
        return {
          action,
          errorCodes: ["hostname-mismatch"],
          hostname,
          success: false,
        };
      }
      return { action, errorCodes, hostname, success: true };
    } catch (error: unknown) {
      if (error instanceof TurnstileVerificationError) {
        throw error;
      }
      if (error instanceof SiteverifyResponseBodyError) {
        throw this.#createVerificationError(error.category, startedAt, {
          cause: error,
        });
      }
      throw this.#createVerificationError("fetch_or_abort_failure", startedAt, {
        cause: error,
      });
    }
  }
}
