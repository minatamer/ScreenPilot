export type OpenAiStructuredResponseRequest<TOutput> = Readonly<{
  input: string;
  instructions: string;
  outputSchemaName: string;
  parseOutput: (value: unknown) => TOutput;
  signal?: AbortSignal;
}>;

export type OpenAiStructuredResponse<TOutput> = Readonly<{
  output: TOutput;
  usage: Readonly<{
    cachedInputTokens: number;
    inputTokens: number;
    outputTokens: number;
  }>;
}>;

export interface OpenAiClient {
  createStructuredResponse<TOutput>(
    request: OpenAiStructuredResponseRequest<TOutput>,
  ): Promise<OpenAiStructuredResponse<TOutput>>;
}
