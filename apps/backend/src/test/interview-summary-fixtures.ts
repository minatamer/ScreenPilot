import type { SummaryModelOutput } from "@screenpilot/contracts/ai/summary-output";
import type { ScreeningSummary } from "@screenpilot/contracts/interview/screening-summary";

import { CONVERSATION_FIRST_PLAN } from "../demo/conversation-first-plan.js";
import { createFakeInterviewSummary } from "../providers/openai/fake-openai.js";
import type { InterviewSummaryInput } from "../use-cases/ports/interview-summarizer.js";

export const SUMMARY_FIXTURE_NOW = "2026-09-21T09:00:00.000Z";

type SummaryFixtureOptions = Readonly<{
  includeCandidateQuestion?: boolean;
  includeFollowup?: boolean;
  missingTopicKeys?: readonly (typeof CONVERSATION_FIRST_PLAN.topics)[number]["key"][];
  roleLabel?: string | null;
}>;

const topicTurnId = (topicKey: string) => `turn-${topicKey}`;

export function createSummaryFixtureInput(
  options: SummaryFixtureOptions = {},
): InterviewSummaryInput {
  const roleLabel =
    options.roleLabel === undefined ? "Graphic Designer" : options.roleLabel;
  const missingTopicKeys = new Set(options.missingTopicKeys ?? []);
  const transcript = CONVERSATION_FIRST_PLAN.topics.map((topic, index) => ({
    id: topicTurnId(topic.key),
    sequence: index + 1,
    speaker: "candidate" as const,
    status: "final" as const,
    text: `Synthetic candidate response for ${topic.key}.`,
    occurredAt: SUMMARY_FIXTURE_NOW,
  }));
  const insight = (
    category: InterviewSummaryInput["insights"][number]["category"],
    topicKey: (typeof CONVERSATION_FIRST_PLAN.topics)[number]["key"],
    value: string,
    status: InterviewSummaryInput["insights"][number]["status"] = "confirmed",
  ) => ({
    id: `insight-${category}`,
    category,
    label: category,
    value,
    source: "Candidate" as const,
    status,
    evidenceTurnIds: [topicTurnId(topicKey)],
    cvFactIds: [],
    createdAt: SUMMARY_FIXTURE_NOW,
    updatedAt: SUMMARY_FIXTURE_NOW,
  });
  const insights: InterviewSummaryInput["insights"] = [
    insight("role_preference", "role_preference", roleLabel ?? "Undecided"),
    insight("current_context", "current_context", "Current context"),
    insight(
      "responsibility",
      "relevant_experience_summary",
      "Broad responsibilities",
    ),
    insight(
      "strongest_areas",
      "relevant_experience_summary",
      "Self-described strongest area",
    ),
    insight("team_work_style", "team_work_style", "Team preference"),
    insight("motivation", "motivation_and_next_role", "Next-role priority"),
    insight(
      "location_work_arrangement",
      "location_work_arrangement",
      "Work-arrangement preference",
    ),
    insight("availability", "availability", "Availability is uncertain"),
    insight(
      "compensation",
      "compensation_expectation",
      "Prefers not to answer",
    ),
    insight("english_use", "english_use_context", "Uses English at work"),
  ];
  if (options.includeCandidateQuestion ?? true) {
    insights.push(
      insight(
        "candidate_question",
        "candidate_questions",
        "Asked about the next step",
      ),
    );
  }
  if (options.includeFollowup ?? false) {
    insights.push(
      insight(
        "follow_up_needed",
        "clarifications_and_followups",
        "An employer detail needs human follow-up",
        "needs_clarification",
      ),
    );
  }

  return {
    entryMode: "conversation_first",
    plan: CONVERSATION_FIRST_PLAN,
    transcript,
    insights,
    topicProgress: CONVERSATION_FIRST_PLAN.topics
      .filter((topic) => !missingTopicKeys.has(topic.key))
      .map((topic) => ({
        topicKey: topic.key,
        status: "covered",
        evidenceTurnIds: [topicTurnId(topic.key)],
        updatedAt: SUMMARY_FIXTURE_NOW,
      })),
  };
}

export function createSummaryFixture(
  input: InterviewSummaryInput,
): ScreeningSummary {
  return createFakeInterviewSummary(input);
}

export function createSummaryModelFixture(
  input: InterviewSummaryInput,
): SummaryModelOutput {
  const summary = createSummaryFixture(input);
  return {
    ...summary,
    rolePreference: summary.rolePreference ?? null,
    compensation: summary.compensation ?? null,
    availability: summary.availability ?? null,
  };
}
