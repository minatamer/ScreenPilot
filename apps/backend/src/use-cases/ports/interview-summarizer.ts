import type { SummarizeInterviewRequest } from "@screenpilot/contracts/api/interview-summary";
import type { ScreeningSummary } from "@screenpilot/contracts/interview/screening-summary";

export type InterviewSummaryInput = Pick<
  SummarizeInterviewRequest,
  "entryMode" | "insights" | "plan" | "topicProgress" | "transcript"
>;

export type InterviewSummaryProviderResult<TSummary = ScreeningSummary> =
  Readonly<{
    summary: TSummary;
    usage: Readonly<{
      cachedInputTokens: number;
      inputTokens: number;
      outputTokens: number;
    }>;
  }>;

export interface InterviewSummarizer<
  TInput = InterviewSummaryInput,
  TSummary = ScreeningSummary,
> {
  summarizeInterview(
    input: TInput,
    signal?: AbortSignal,
  ): Promise<InterviewSummaryProviderResult<TSummary>>;
}
