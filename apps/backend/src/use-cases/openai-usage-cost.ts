const OPENAI_INPUT_COST_PER_MILLION_TOKENS = 0.75;
const OPENAI_CACHED_INPUT_COST_PER_MILLION_TOKENS = 0.075;
const OPENAI_OUTPUT_COST_PER_MILLION_TOKENS = 4.5;

export function estimateOpenAiCostUsd(usage: {
  cachedInputTokens: number;
  inputTokens: number;
  outputTokens: number;
}): number {
  if (usage.cachedInputTokens > usage.inputTokens) {
    throw new TypeError("Cached input tokens exceed total input tokens.");
  }
  const uncachedInputTokens = usage.inputTokens - usage.cachedInputTokens;
  const cost =
    (uncachedInputTokens / 1_000_000) * OPENAI_INPUT_COST_PER_MILLION_TOKENS +
    (usage.cachedInputTokens / 1_000_000) *
      OPENAI_CACHED_INPUT_COST_PER_MILLION_TOKENS +
    (usage.outputTokens / 1_000_000) * OPENAI_OUTPUT_COST_PER_MILLION_TOKENS;
  return Number(cost.toFixed(8));
}
