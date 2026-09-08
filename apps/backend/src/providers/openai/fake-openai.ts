import type {
  CvAnalyzer,
  CvAnalyzerInput,
  CvAnalyzerResult,
} from "../../use-cases/ports/cv-analyzer.js";
import type {
  InterviewSummarizer,
  InterviewSummaryProviderResult,
} from "../../use-cases/ports/interview-summarizer.js";

export type FakeNormalizedCv = Readonly<{
  experienceLevel: "unknown";
  skills: readonly ["TypeScript", "HTTP APIs"];
  source: "synthetic_fixture";
}>;

export type FakeScreeningPlan = Readonly<{
  topics: readonly ["role preference", "availability"];
  version: "fake-v1";
}>;

export type FakeInterviewSummary = Readonly<{
  fixture: true;
  limitations: readonly ["No provider call was made."];
}>;

const fakeCvAnalysis: CvAnalyzerResult<FakeNormalizedCv, FakeScreeningPlan> =
  Object.freeze({
    normalizedCv: Object.freeze({
      experienceLevel: "unknown",
      skills: Object.freeze(["TypeScript", "HTTP APIs"] as const),
      source: "synthetic_fixture",
    }),
    screeningPlan: Object.freeze({
      topics: Object.freeze(["role preference", "availability"] as const),
      version: "fake-v1",
    }),
    usage: Object.freeze({ inputTokens: 0, outputTokens: 0 }),
  });

const fakeInterviewSummary: InterviewSummaryProviderResult<FakeInterviewSummary> =
  Object.freeze({
    summary: Object.freeze({
      fixture: true,
      limitations: Object.freeze(["No provider call was made."] as const),
    }),
    usage: Object.freeze({ inputTokens: 0, outputTokens: 0 }),
  });

export class FakeOpenAi
  implements
    CvAnalyzer<FakeNormalizedCv, FakeScreeningPlan>,
    InterviewSummarizer<unknown, FakeInterviewSummary>
{
  analyzeCv(
    _input: CvAnalyzerInput,
    signal?: AbortSignal,
  ): Promise<CvAnalyzerResult<FakeNormalizedCv, FakeScreeningPlan>> {
    return Promise.resolve().then(() => {
      signal?.throwIfAborted();
      return fakeCvAnalysis;
    });
  }

  summarizeInterview(
    _input: unknown,
    signal?: AbortSignal,
  ): Promise<InterviewSummaryProviderResult<FakeInterviewSummary>> {
    return Promise.resolve().then(() => {
      signal?.throwIfAborted();
      return fakeInterviewSummary;
    });
  }
}
