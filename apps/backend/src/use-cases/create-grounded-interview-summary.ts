import { UNDECIDED_ROLE_VALUE } from "@screenpilot/contracts/interview/client-tools";
import {
  SCREENING_SUMMARY_LIMITATIONS,
  SCREENING_SUMMARY_OVERVIEW,
  screeningSummarySchema,
  type ScreeningSummary,
} from "@screenpilot/contracts/interview/screening-summary";

import type { InterviewSummaryInput } from "./ports/interview-summarizer.js";
import { selectLatestCandidateInsight } from "./select-latest-candidate-insight.js";

function sentenceWithDetail(prefix: string, value: string): string {
  const normalizedValue = value.trim().replace(/[.!?]+$/u, "");
  const maximumValueCharacters = 600 - prefix.length - 2;
  const boundedValue = Array.from(normalizedValue)
    .slice(0, maximumValueCharacters)
    .join("");
  return `${prefix}: ${boundedValue}.`;
}

function factStatement(
  insight: InterviewSummaryInput["insights"][number],
  includeCandidateDetail: boolean,
): string | null {
  const statements: Partial<
    Record<InterviewSummaryInput["insights"][number]["category"], string>
  > = {
    current_context: includeCandidateDetail
      ? sentenceWithDetail("Current context", insight.value)
      : "Candidate shared current or recent context.",
    relevant_experience: includeCandidateDetail
      ? sentenceWithDetail("Relevant experience", insight.value)
      : "Candidate described broad relevant experience for human review.",
    responsibility: includeCandidateDetail
      ? sentenceWithDetail("Responsibility described", insight.value)
      : "Candidate described broad responsibilities.",
    strongest_areas: includeCandidateDetail
      ? sentenceWithDetail("Candidate-highlighted area", insight.value)
      : "Candidate identified a self-described strongest area.",
    team_work_style: includeCandidateDetail
      ? sentenceWithDetail("Team and work preference", insight.value)
      : "Candidate described a team or work-style preference.",
    motivation: includeCandidateDetail
      ? sentenceWithDetail("Next-role priority", insight.value)
      : "Candidate described a next-role motivation or priority.",
    location_work_arrangement: includeCandidateDetail
      ? sentenceWithDetail("Work-arrangement preference", insight.value)
      : "Candidate described a location or work-arrangement preference.",
    english_use: includeCandidateDetail
      ? sentenceWithDetail("Candidate-described English use", insight.value)
      : "Candidate described where they use English.",
  };
  return statements[insight.category] ?? null;
}

/**
 * Returns the server-owned fact for the latest candidate-backed team/work-style
 * insight. Live model output may organize the narrative, but it cannot replace
 * this candidate statement with an unrelated fact that happens to cite the
 * same transcript turn.
 */
export function createGroundedTeamWorkStyleFact(
  input: InterviewSummaryInput,
): ScreeningSummary["confirmedFacts"][number] | undefined {
  const insight = selectLatestCandidateInsight(input, "team_work_style");
  if (
    insight === undefined ||
    insight.status === "needs_clarification" ||
    insight.evidenceTurnIds.length === 0
  ) {
    return undefined;
  }

  const statement = factStatement(insight, true);
  return statement === null
    ? undefined
    : { evidenceTurnIds: insight.evidenceTurnIds, statement };
}

function groundedInterviewSummaryValue(
  input: InterviewSummaryInput,
  includeCandidateDetail: boolean,
): unknown {
  const roleInsight = selectLatestCandidateInsight(input, "role_preference");
  const topicsCovered = input.topicProgress
    .filter(
      (progress) =>
        progress.status === "covered" && progress.evidenceTurnIds.length > 0,
    )
    .map((progress) => ({
      evidenceTurnIds: progress.evidenceTurnIds,
      topicKey: progress.topicKey,
    }));
  const coveredKeys = new Set(topicsCovered.map((topic) => topic.topicKey));
  const confirmedFacts = input.insights.flatMap((insight) => {
    if (
      insight.source === "CV" ||
      insight.status === "needs_clarification" ||
      insight.evidenceTurnIds.length === 0 ||
      (insight.category === "team_work_style" &&
        !coveredKeys.has("team_work_style"))
    ) {
      return [];
    }
    const statement = factStatement(insight, includeCandidateDetail);
    return statement === null
      ? []
      : [{ evidenceTurnIds: insight.evidenceTurnIds, statement }];
  });
  const topicsNotCovered = input.plan.topics
    .map((topic) => topic.key)
    .filter((topicKey) => !coveredKeys.has(topicKey));
  const compensationInsight = selectLatestCandidateInsight(
    input,
    "compensation",
  );
  const availabilityInsight = selectLatestCandidateInsight(
    input,
    "availability",
  );
  const unresolvedInsights = input.insights.filter(
    (insight) =>
      insight.source !== "CV" &&
      (insight.status === "needs_clarification" ||
        insight.category === "follow_up_needed"),
  );

  return {
    overview: SCREENING_SUMMARY_OVERVIEW,
    ...(roleInsight === undefined
      ? {}
      : {
          rolePreference: {
            evidenceTurnIds: roleInsight.evidenceTurnIds,
            label:
              roleInsight.value.toLocaleLowerCase("en") ===
              UNDECIDED_ROLE_VALUE.toLocaleLowerCase("en")
                ? null
                : roleInsight.value,
            status:
              roleInsight.value.toLocaleLowerCase("en") ===
              UNDECIDED_ROLE_VALUE.toLocaleLowerCase("en")
                ? "undecided"
                : "candidate_stated",
          },
        }),
    confirmedFacts,
    clarifications: input.insights
      .filter(
        (insight) =>
          insight.category !== "follow_up_needed" &&
          insight.source !== "CV" &&
          insight.status === "needs_clarification",
      )
      .map((insight) => ({
        evidenceTurnIds: insight.evidenceTurnIds,
        statement: includeCandidateDetail
          ? sentenceWithDetail("Clarification needed", insight.value)
          : "Candidate context remains unclear and needs human review.",
      })),
    topicsCovered,
    topicsNotCovered,
    ...(compensationInsight === undefined
      ? {}
      : {
          compensation: {
            candidateStatement: includeCandidateDetail
              ? sentenceWithDetail(
                  "Candidate-stated compensation preference",
                  compensationInsight.value,
                )
              : "Candidate provided, declined, or remained uncertain about compensation details.",
            evidenceTurnIds: compensationInsight.evidenceTurnIds,
          },
        }),
    ...(availabilityInsight === undefined
      ? {}
      : {
          availability: {
            candidateStatement: includeCandidateDetail
              ? sentenceWithDetail(
                  "Candidate-stated availability",
                  availabilityInsight.value,
                )
              : "Candidate described availability or uncertainty for human review.",
            evidenceTurnIds: availabilityInsight.evidenceTurnIds,
          },
        }),
    communicationNotes: [],
    candidateQuestions: input.insights
      .filter(
        (insight) =>
          insight.category === "candidate_question" && insight.source !== "CV",
      )
      .map((insight) => ({
        evidenceTurnIds: insight.evidenceTurnIds,
        question: includeCandidateDetail
          ? insight.value
          : "Candidate asked a question for human review.",
      })),
    humanFollowups: input.insights
      .filter(
        (insight) =>
          insight.category === "follow_up_needed" && insight.source !== "CV",
      )
      .map((insight) => ({
        evidenceTurnIds: insight.evidenceTurnIds,
        reason: includeCandidateDetail
          ? insight.value
          : "Human follow-up is needed for an unanswered candidate question or unclear detail.",
      })),
    limitations: [
      SCREENING_SUMMARY_LIMITATIONS[0],
      ...(topicsNotCovered.length === 0
        ? []
        : [SCREENING_SUMMARY_LIMITATIONS[1]]),
      ...(unresolvedInsights.length === 0
        ? []
        : [SCREENING_SUMMARY_LIMITATIONS[2]]),
    ],
  };
}

/**
 * Builds the server-owned evidence ledger used by fake mode and as the safe
 * reconciliation baseline for live model output. It never calls a provider.
 */
export function createGroundedInterviewSummary(
  input: InterviewSummaryInput,
): ScreeningSummary {
  const detailedSummary = screeningSummarySchema.safeParse(
    groundedInterviewSummaryValue(input, true),
  );
  if (detailedSummary.success) {
    return detailedSummary.data;
  }

  return screeningSummarySchema.parse(
    groundedInterviewSummaryValue(input, false),
  );
}
