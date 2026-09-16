export type CvAnalyzerInput = Readonly<{
  cvText: string;
}>;

export type CvAnalyzerResult<TNormalizedCv = unknown> = Readonly<{
  normalizedCv: TNormalizedCv;
  appliedRepairRuleIds?: readonly string[];
  usage: Readonly<{
    cachedInputTokens: number;
    inputTokens: number;
    outputTokens: number;
  }>;
}>;

export interface CvAnalyzer<TNormalizedCv = unknown> {
  analyzeCv(
    input: CvAnalyzerInput,
    signal?: AbortSignal,
  ): Promise<CvAnalyzerResult<TNormalizedCv>>;
}
