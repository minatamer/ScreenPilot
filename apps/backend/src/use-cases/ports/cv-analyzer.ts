export type CvAnalyzerInput = Readonly<{
  cvText: string;
}>;

export type CvAnalyzerResult<
  TNormalizedCv = unknown,
  TScreeningPlan = unknown,
> = Readonly<{
  normalizedCv: TNormalizedCv;
  screeningPlan: TScreeningPlan;
  usage: Readonly<{
    cachedInputTokens: number;
    inputTokens: number;
    outputTokens: number;
  }>;
}>;

export interface CvAnalyzer<TNormalizedCv = unknown, TScreeningPlan = unknown> {
  analyzeCv(
    input: CvAnalyzerInput,
    signal?: AbortSignal,
  ): Promise<CvAnalyzerResult<TNormalizedCv, TScreeningPlan>>;
}
