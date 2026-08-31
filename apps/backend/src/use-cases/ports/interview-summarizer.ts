export type InterviewSummaryProviderResult<TSummary = unknown> = Readonly<{
  summary: TSummary;
  usage: Readonly<{
    inputTokens: number;
    outputTokens: number;
  }>;
}>;

export interface InterviewSummarizer<TInput = unknown, TSummary = unknown> {
  summarizeInterview(
    input: TInput,
    signal?: AbortSignal,
  ): Promise<InterviewSummaryProviderResult<TSummary>>;
}
