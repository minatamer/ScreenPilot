import { z } from "zod";

import type {
  ChallengeVerificationInput,
  ChallengeVerificationResult,
  ChallengeVerifier,
} from "../../use-cases/ports/challenge-verifier.js";

const MAXIMUM_SITEVERIFY_RESPONSE_BYTES = 16_384;
const MAXIMUM_TURNSTILE_TOKEN_CHARACTERS = 2_048;

const turnstileErrorCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/i);

const siteverifyResponseSchema = z.strictObject({
  action: z
    .string()
    .regex(/^[a-z0-9_-]{0,32}$/i)
    .optional(),
  cdata: z.string().max(255).optional(),
  challenge_ts: z.iso.datetime({ offset: true }).optional(),
  "error-codes": z.array(turnstileErrorCodeSchema).max(16).optional(),
  hostname: z.string().trim().min(1).max(253).optional(),
  metadata: z
    .strictObject({
      ephemeral_id: z.string().trim().min(1).max(256).optional(),
    })
    .optional(),
  success: z.boolean(),
});

async function readBoundedSiteverifyResponse(response: Response) {
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    /^\d+$/.test(declaredLength) &&
    Number(declaredLength) > MAXIMUM_SITEVERIFY_RESPONSE_BYTES
  ) {
    await response.body?.cancel();
    throw new TurnstileVerificationError();
  }
  if (response.body === null) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;
  try {
    let streamResult = await reader.read();
    while (!streamResult.done) {
      const chunk: unknown = streamResult.value;
      if (!(chunk instanceof Uint8Array)) {
        throw new TurnstileVerificationError();
      }
      byteCount += chunk.byteLength;
      if (byteCount > MAXIMUM_SITEVERIFY_RESPONSE_BYTES) {
        await reader.cancel();
        throw new TurnstileVerificationError();
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

export class TurnstileVerificationError extends Error {
  readonly code = "TURNSTILE_UNAVAILABLE";
  readonly retryable = true;

  constructor(cause?: unknown) {
    super(
      "Challenge verification is temporarily unavailable. Try again.",
      cause === undefined ? undefined : { cause },
    );
    this.name = "TurnstileVerificationError";
  }
}

export type CloudflareTurnstileVerifierOptions = Readonly<{
  allowedHostnames: readonly string[];
  fetchImplementation?: typeof fetch;
  secretKey: string;
  timeoutMs: number;
  verificationUrl: string;
}>;

export class CloudflareTurnstileVerifier implements ChallengeVerifier {
  readonly #allowedHostnames: ReadonlySet<string>;
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
    this.#fetchImplementation = options.fetchImplementation ?? fetch;
    this.#secretKey = options.secretKey;
    this.#timeoutMs = options.timeoutMs;
    this.#verificationUrl = options.verificationUrl;
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
        throw new TurnstileVerificationError();
      }

      const responseText = await readBoundedSiteverifyResponse(response);
      const parsedResponse = siteverifyResponseSchema.parse(
        JSON.parse(responseText),
      );
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
      throw new TurnstileVerificationError(error);
    }
  }
}
