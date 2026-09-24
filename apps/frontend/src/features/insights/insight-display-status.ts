import type {
  InsightCard,
  InsightStatus,
} from "@screenpilot/contracts/interview/insight-card";

function hasSameEvidenceTurns(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((turnId) => right.includes(turnId))
  );
}

export function resolveInsightDisplayStatus(
  insight: InsightCard,
  insights: readonly InsightCard[],
): InsightStatus {
  if (insight.category !== "candidate_question") {
    return insight.status;
  }

  const requiresHumanFollowup = insights.some(
    (candidate) =>
      candidate.category === "follow_up_needed" &&
      hasSameEvidenceTurns(candidate.evidenceTurnIds, insight.evidenceTurnIds),
  );

  return requiresHumanFollowup ? "needs_clarification" : insight.status;
}
