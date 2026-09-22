import type { InterviewSummaryInput } from "./ports/interview-summarizer.js";

export function selectLatestCandidateInsight(
  input: InterviewSummaryInput,
  category: InterviewSummaryInput["insights"][number]["category"],
) {
  return input.insights.reduce<
    InterviewSummaryInput["insights"][number] | undefined
  >((latest, insight) => {
    if (insight.category !== category || insight.source === "CV") {
      return latest;
    }
    if (
      latest === undefined ||
      Date.parse(insight.updatedAt) >= Date.parse(latest.updatedAt)
    ) {
      return insight;
    }
    return latest;
  }, undefined);
}
