import { z } from "zod";

import { OPENAI_RESPONSES_URL } from "../../config/provider-mode.js";

const MAXIMUM_OPENAI_RESPONSE_BYTES = 1_048_576;
const MAXIMUM_STRUCTURED_OUTPUT_CHARACTERS = 250_000;

type OpenAiFailureCategory =
  | "fetch_failure"
  | "http_non_success"
  | "request_timeout"
  | "response_body_empty"
  | "response_body_invalid"
  | "response_body_oversized"
  | "response_failed"
  | "response_incomplete"
  | "response_json_invalid"
  | "response_refusal"
  | "response_schema_mismatch"
  | "response_status_unexpected"
  | "structured_output_invalid";

type OpenAiResponseBodyFailureCategory = Extract<
  OpenAiFailureCategory,
  "response_body_empty" | "response_body_invalid" | "response_body_oversized"
>;

class OpenAiResponseBodyError extends Error {
  readonly category: OpenAiResponseBodyFailureCategory;

  constructor(category: OpenAiResponseBodyFailureCategory) {
    super("The OpenAI response body could not be read safely.");
    this.name = "OpenAiResponseBodyError";
    this.category = category;
  }
}

export type OpenAiUsage = Readonly<{
  cachedInputTokens: number;
  inputTokens: number;
  outputTokens: number;
}>;

export type OpenAiStructuredResponseRequest<TOutput> = Readonly<{
  input: string;
  instructions: string;
  outputJsonSchema: unknown;
  outputSchemaName: string;
  parseOutput: (value: unknown) => TOutput;
  signal?: AbortSignal;
}>;

export type OpenAiStructuredResponse<TOutput> = Readonly<{
  durationMs: number;
  output: TOutput;
  usage: OpenAiUsage;
}>;

export class OpenAiRequestError extends Error {
  readonly code = "PROVIDER_UNAVAILABLE";
  readonly category: Exclude<
    OpenAiFailureCategory,
    "structured_output_invalid"
  >;
  readonly durationMs: number;
  readonly httpStatus?: number;
  readonly retryable = true;

  constructor(input: {
    category: Exclude<OpenAiFailureCategory, "structured_output_invalid">;
    cause?: unknown;
    durationMs: number;
    httpStatus?: number;
  }) {
    super(
      "CV analysis is temporarily unavailable. Try again.",
      input.cause === undefined ? undefined : { cause: input.cause },
    );
    this.name = "OpenAiRequestError";
    this.category = input.category;
    this.durationMs = input.durationMs;
    if (input.httpStatus !== undefined) {
      this.httpStatus = input.httpStatus;
    }
  }
}

export class OpenAiStructuredOutputError extends Error {
  readonly category = "structured_output_invalid";
  readonly durationMs: number;
  readonly usage: OpenAiUsage;
  readonly validationPaths: readonly string[];
  readonly validationRuleIds: readonly string[];

  constructor(input: {
    durationMs: number;
    usage: OpenAiUsage;
    validationPaths?: readonly string[];
    validationRuleIds?: readonly string[];
  }) {
    super("The CV analysis response did not match the required structure.");
    this.name = "OpenAiStructuredOutputError";
    this.durationMs = input.durationMs;
    this.usage = input.usage;
    this.validationPaths = input.validationPaths ?? [];
    this.validationRuleIds = input.validationRuleIds ?? [];
  }
}

export interface OpenAiClient {
  createStructuredResponse<TOutput>(
    request: OpenAiStructuredResponseRequest<TOutput>,
  ): Promise<OpenAiStructuredResponse<TOutput>>;
}

const openAiUsageSchema = z
  .object({
    input_tokens: z.number().int().nonnegative(),
    input_tokens_details: z
      .object({ cached_tokens: z.number().int().nonnegative().default(0) })
      .default({ cached_tokens: 0 }),
    output_tokens: z.number().int().nonnegative(),
  })
  .superRefine((usage, context) => {
    if (usage.input_tokens_details.cached_tokens > usage.input_tokens) {
      context.addIssue({
        code: "custom",
        message: "Cached input tokens exceed total input tokens.",
        path: ["input_tokens_details", "cached_tokens"],
      });
    }
  });

const openAiResponseSchema = z.object({
  output: z.array(z.unknown()).max(32),
  status: z.literal("completed"),
  usage: openAiUsageSchema,
});

const outputMessageSchema = z.object({
  content: z.array(z.unknown()).max(16),
  type: z.literal("message"),
});

const outputTextPartSchema = z.object({
  text: z.string().min(1).max(MAXIMUM_STRUCTURED_OUTPUT_CHARACTERS),
  type: z.literal("output_text"),
});

const outputRefusalPartSchema = z.object({
  refusal: z.string(),
  type: z.literal("refusal"),
});

function containsRefusal(output: readonly unknown[]): boolean {
  return output.some((outputItem) => {
    const message = outputMessageSchema.safeParse(outputItem);
    return (
      message.success &&
      message.data.content.some(
        (contentPart) => outputRefusalPartSchema.safeParse(contentPart).success,
      )
    );
  });
}

function structuredOutputDiagnostic(error: unknown): Readonly<{
  validationPaths: readonly string[];
  validationRuleIds: readonly string[];
}> {
  if (error instanceof SyntaxError) {
    return {
      validationPaths: ["$"],
      validationRuleIds: ["output_json_invalid"],
    };
  }
  if (error instanceof z.ZodError) {
    return {
      validationPaths: [
        ...new Set(
          error.issues.map((issue) =>
            issue.path.length === 0 ? "$" : issue.path.join("."),
          ),
        ),
      ].slice(0, 16),
      validationRuleIds: [
        ...new Set(error.issues.map((issue) => `schema_${issue.code}`)),
      ].slice(0, 16),
    };
  }
  return {
    validationPaths: ["output"],
    validationRuleIds: ["output_text_invalid"],
  };
}

async function readBoundedResponse(response: Response): Promise<string> {
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    /^\d+$/.test(declaredLength) &&
    Number(declaredLength) > MAXIMUM_OPENAI_RESPONSE_BYTES
  ) {
    await response.body?.cancel();
    throw new OpenAiResponseBodyError("response_body_oversized");
  }
  if (response.body === null) {
    throw new OpenAiResponseBodyError("response_body_empty");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;
  try {
    let streamResult = await reader.read();
    while (!streamResult.done) {
      const chunk: unknown = streamResult.value;
      if (!(chunk instanceof Uint8Array)) {
        throw new OpenAiResponseBodyError("response_body_invalid");
      }
      byteCount += chunk.byteLength;
      if (byteCount > MAXIMUM_OPENAI_RESPONSE_BYTES) {
        await reader.cancel();
        throw new OpenAiResponseBodyError("response_body_oversized");
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
    throw new OpenAiResponseBodyError("response_body_empty");
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    throw new OpenAiResponseBodyError("response_body_invalid");
  }
}

function extractOutputText(output: readonly unknown[]): string {
  const outputTexts: string[] = [];
  for (const outputItem of output) {
    const message = outputMessageSchema.safeParse(outputItem);
    if (!message.success) {
      continue;
    }
    for (const contentPart of message.data.content) {
      const outputText = outputTextPartSchema.safeParse(contentPart);
      if (outputText.success) {
        outputTexts.push(outputText.data.text);
      }
    }
  }
  if (outputTexts.length !== 1) {
    throw new TypeError("Expected one structured output text part.");
  }
  const outputText = outputTexts[0];
  if (outputText === undefined) {
    throw new TypeError("Expected a structured output text part.");
  }
  return outputText;
}

export type OpenAiHttpClientOptions = Readonly<{
  apiKey: string;
  clockMilliseconds?: () => number;
  fetchImplementation?: typeof fetch;
  model: "gpt-5.4-mini";
  reasoning: "none";
  responsesUrl?: string;
  store: false;
  timeoutMs: number;
}>;

export class OpenAiHttpClient implements OpenAiClient {
  readonly #apiKey: string;
  readonly #clockMilliseconds: () => number;
  readonly #fetchImplementation: typeof fetch;
  readonly #model: "gpt-5.4-mini";
  readonly #reasoning: "none";
  readonly #responsesUrl: string;
  readonly #store: false;
  readonly #timeoutMs: number;

  constructor(options: OpenAiHttpClientOptions) {
    if (options.apiKey.trim().length === 0) {
      throw new TypeError("Live OpenAI requests require an API key.");
    }
    this.#apiKey = options.apiKey;
    this.#clockMilliseconds = options.clockMilliseconds ?? Date.now;
    this.#fetchImplementation = options.fetchImplementation ?? fetch;
    this.#model = options.model;
    this.#reasoning = options.reasoning;
    this.#responsesUrl = options.responsesUrl ?? OPENAI_RESPONSES_URL;
    this.#store = options.store;
    this.#timeoutMs = options.timeoutMs;
  }

  #durationSince(startedAt: number): number {
    const elapsed = this.#clockMilliseconds() - startedAt;
    return Number.isFinite(elapsed) ? Math.max(0, Math.round(elapsed)) : 0;
  }

  #createRequestError(
    category: Exclude<OpenAiFailureCategory, "structured_output_invalid">,
    startedAt: number,
    input: { cause?: unknown; httpStatus?: number } = {},
  ): OpenAiRequestError {
    return new OpenAiRequestError({
      category,
      durationMs: this.#durationSince(startedAt),
      ...(input.cause === undefined ? {} : { cause: input.cause }),
      ...(input.httpStatus === undefined
        ? {}
        : { httpStatus: input.httpStatus }),
    });
  }

  async createStructuredResponse<TOutput>(
    request: OpenAiStructuredResponseRequest<TOutput>,
  ): Promise<OpenAiStructuredResponse<TOutput>> {
    request.signal?.throwIfAborted();
    const timeoutSignal = AbortSignal.timeout(this.#timeoutMs);
    const requestSignal = request.signal
      ? AbortSignal.any([request.signal, timeoutSignal])
      : timeoutSignal;
    const startedAt = this.#clockMilliseconds();

    try {
      const response = await this.#fetchImplementation(this.#responsesUrl, {
        body: JSON.stringify({
          input: request.input,
          instructions: request.instructions,
          max_output_tokens: 4_096,
          model: this.#model,
          reasoning: { effort: this.#reasoning },
          store: this.#store,
          text: {
            format: {
              name: request.outputSchemaName,
              schema: request.outputJsonSchema,
              strict: true,
              type: "json_schema",
            },
            verbosity: "low",
          },
          truncation: "disabled",
        }),
        headers: {
          authorization: `Bearer ${this.#apiKey}`,
          "content-type": "application/json",
        },
        method: "POST",
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
      const responseStatus = z
        .object({ status: z.string() })
        .safeParse(responseJson);
      if (
        responseStatus.success &&
        responseStatus.data.status !== "completed"
      ) {
        const category =
          responseStatus.data.status === "incomplete"
            ? "response_incomplete"
            : responseStatus.data.status === "failed"
              ? "response_failed"
              : "response_status_unexpected";
        throw this.#createRequestError(category, startedAt);
      }
      const parsedResponseResult = openAiResponseSchema.safeParse(responseJson);
      if (!parsedResponseResult.success) {
        throw this.#createRequestError("response_schema_mismatch", startedAt);
      }
      const parsedResponse = parsedResponseResult.data;
      const usage: OpenAiUsage = {
        cachedInputTokens:
          parsedResponse.usage.input_tokens_details.cached_tokens,
        inputTokens: parsedResponse.usage.input_tokens,
        outputTokens: parsedResponse.usage.output_tokens,
      };

      if (containsRefusal(parsedResponse.output)) {
        throw this.#createRequestError("response_refusal", startedAt);
      }

      try {
        const outputText = extractOutputText(parsedResponse.output);
        return {
          durationMs: this.#durationSince(startedAt),
          output: request.parseOutput(JSON.parse(outputText)),
          usage,
        };
      } catch (error: unknown) {
        const diagnostic = structuredOutputDiagnostic(error);
        throw new OpenAiStructuredOutputError({
          durationMs: this.#durationSince(startedAt),
          usage,
          validationPaths: diagnostic.validationPaths,
          validationRuleIds: diagnostic.validationRuleIds,
        });
      }
    } catch (error: unknown) {
      if (
        error instanceof OpenAiRequestError ||
        error instanceof OpenAiStructuredOutputError
      ) {
        throw error;
      }
      if (error instanceof OpenAiResponseBodyError) {
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
