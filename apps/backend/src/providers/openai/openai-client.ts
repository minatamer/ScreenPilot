import { z } from "zod";

import { OPENAI_RESPONSES_URL } from "../../config/provider-mode.js";

const MAXIMUM_OPENAI_RESPONSE_BYTES = 1_048_576;
const MAXIMUM_STRUCTURED_OUTPUT_CHARACTERS = 250_000;

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
  output: TOutput;
  usage: OpenAiUsage;
}>;

export class OpenAiRequestError extends Error {
  readonly code = "PROVIDER_UNAVAILABLE";
  readonly retryable = true;

  constructor(cause?: unknown) {
    super(
      "CV analysis is temporarily unavailable. Try again.",
      cause === undefined ? undefined : { cause },
    );
    this.name = "OpenAiRequestError";
  }
}

export class OpenAiStructuredOutputError extends Error {
  readonly usage: OpenAiUsage;

  constructor(usage: OpenAiUsage, cause?: unknown) {
    super(
      "The CV analysis response did not match the required structure.",
      cause === undefined ? undefined : { cause },
    );
    this.name = "OpenAiStructuredOutputError";
    this.usage = usage;
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

async function readBoundedResponse(response: Response): Promise<string> {
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    /^\d+$/.test(declaredLength) &&
    Number(declaredLength) > MAXIMUM_OPENAI_RESPONSE_BYTES
  ) {
    await response.body?.cancel();
    throw new OpenAiRequestError();
  }
  if (response.body === null) {
    throw new OpenAiRequestError();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;
  try {
    let streamResult = await reader.read();
    while (!streamResult.done) {
      const chunk: unknown = streamResult.value;
      if (!(chunk instanceof Uint8Array)) {
        throw new OpenAiRequestError();
      }
      byteCount += chunk.byteLength;
      if (byteCount > MAXIMUM_OPENAI_RESPONSE_BYTES) {
        await reader.cancel();
        throw new OpenAiRequestError();
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
  fetchImplementation?: typeof fetch;
  model: "gpt-5.4-mini";
  reasoning: "none";
  responsesUrl?: string;
  store: false;
  timeoutMs: number;
}>;

export class OpenAiHttpClient implements OpenAiClient {
  readonly #apiKey: string;
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
    this.#fetchImplementation = options.fetchImplementation ?? fetch;
    this.#model = options.model;
    this.#reasoning = options.reasoning;
    this.#responsesUrl = options.responsesUrl ?? OPENAI_RESPONSES_URL;
    this.#store = options.store;
    this.#timeoutMs = options.timeoutMs;
  }

  async createStructuredResponse<TOutput>(
    request: OpenAiStructuredResponseRequest<TOutput>,
  ): Promise<OpenAiStructuredResponse<TOutput>> {
    request.signal?.throwIfAborted();
    const timeoutSignal = AbortSignal.timeout(this.#timeoutMs);
    const requestSignal = request.signal
      ? AbortSignal.any([request.signal, timeoutSignal])
      : timeoutSignal;

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
        throw new OpenAiRequestError();
      }

      const responseText = await readBoundedResponse(response);
      const parsedResponse = openAiResponseSchema.parse(
        JSON.parse(responseText),
      );
      const usage: OpenAiUsage = {
        cachedInputTokens:
          parsedResponse.usage.input_tokens_details.cached_tokens,
        inputTokens: parsedResponse.usage.input_tokens,
        outputTokens: parsedResponse.usage.output_tokens,
      };

      try {
        const outputText = extractOutputText(parsedResponse.output);
        return {
          output: request.parseOutput(JSON.parse(outputText)),
          usage,
        };
      } catch (error: unknown) {
        throw new OpenAiStructuredOutputError(usage, error);
      }
    } catch (error: unknown) {
      if (
        error instanceof OpenAiRequestError ||
        error instanceof OpenAiStructuredOutputError
      ) {
        throw error;
      }
      request.signal?.throwIfAborted();
      throw new OpenAiRequestError(error);
    }
  }
}
