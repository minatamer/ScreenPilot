import type { InsightCard } from "@screenpilot/contracts/interview/insight-card";
import type { ScreeningPlan } from "@screenpilot/contracts/interview/screening-plan";
import type { ScreeningSummary } from "@screenpilot/contracts/interview/screening-summary";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";

export type RelatedSummaryNote = Readonly<{
  evidenceTurnIds: readonly string[];
  id: string;
  label: string;
  text: string;
}>;

export type InsightEvidenceDetail = Readonly<{
  answer: TranscriptTurn | null;
  additionalAnswers: readonly TranscriptTurn[];
  question: TranscriptTurn | null;
  relatedSummaryNotes: readonly RelatedSummaryNote[];
}>;

function orderedFinalTurns(
  transcript: readonly TranscriptTurn[],
): readonly TranscriptTurn[] {
  return transcript
    .filter((turn) => turn.status === "final")
    .toSorted((left, right) => {
      const sequenceDifference = left.sequence - right.sequence;
      return sequenceDifference !== 0
        ? sequenceDifference
        : left.occurredAt.localeCompare(right.occurredAt);
    });
}

function summaryNotes(
  summary: ScreeningSummary | undefined,
  plan: ScreeningPlan,
): readonly RelatedSummaryNote[] {
  if (!summary) {
    return [];
  }

  const topicTitles = new Map(
    plan.topics.map((topic) => [topic.key, topic.title] as const),
  );
  return [
    ...(summary.rolePreference
      ? [
          {
            id: "role-preference",
            label: "Role preference",
            text:
              summary.rolePreference.status === "undecided"
                ? "The candidate remained undecided about a role."
                : summary.rolePreference.label,
            evidenceTurnIds: summary.rolePreference.evidenceTurnIds,
          },
        ]
      : []),
    ...summary.confirmedFacts.map((fact, index) => ({
      id: `fact-${String(index)}`,
      label: "Confirmed fact",
      text: fact.statement,
      evidenceTurnIds: fact.evidenceTurnIds,
    })),
    ...summary.clarifications.map((clarification, index) => ({
      id: `clarification-${String(index)}`,
      label: "Clarification",
      text: clarification.statement,
      evidenceTurnIds: clarification.evidenceTurnIds,
    })),
    ...summary.topicsCovered.map((topic, index) => ({
      id: `topic-${String(index)}`,
      label: "Topic covered",
      text:
        topicTitles.get(topic.topicKey) ?? topic.topicKey.replaceAll("_", " "),
      evidenceTurnIds: topic.evidenceTurnIds,
    })),
    ...(summary.compensation
      ? [
          {
            id: "compensation",
            label: "Compensation",
            text: summary.compensation.candidateStatement,
            evidenceTurnIds: summary.compensation.evidenceTurnIds,
          },
        ]
      : []),
    ...(summary.availability
      ? [
          {
            id: "availability",
            label: "Availability",
            text: summary.availability.candidateStatement,
            evidenceTurnIds: summary.availability.evidenceTurnIds,
          },
        ]
      : []),
    ...summary.communicationNotes.map((note, index) => ({
      id: `communication-${String(index)}`,
      label: "Communication note",
      text: note.observation,
      evidenceTurnIds: note.evidenceTurnIds,
    })),
    ...summary.candidateQuestions.map((question, index) => ({
      id: `candidate-question-${String(index)}`,
      label: "Candidate question",
      text: question.question,
      evidenceTurnIds: question.evidenceTurnIds,
    })),
    ...summary.humanFollowups.map((followup, index) => ({
      id: `followup-${String(index)}`,
      label: "Human follow-up",
      text: followup.reason,
      evidenceTurnIds: followup.evidenceTurnIds,
    })),
  ];
}

export function resolveInsightEvidenceDetail(
  insight: InsightCard,
  transcript: readonly TranscriptTurn[],
  summary: ScreeningSummary | undefined,
  plan: ScreeningPlan,
): InsightEvidenceDetail {
  const turns = orderedFinalTurns(transcript);
  const evidenceTurnIds = new Set(insight.evidenceTurnIds);
  const answers = turns.filter(
    (turn) => turn.speaker === "candidate" && evidenceTurnIds.has(turn.id),
  );
  const answer = answers.at(-1) ?? null;
  const answerIndex = answer
    ? turns.findIndex((turn) => turn.id === answer.id)
    : -1;
  const precedingTurn = answerIndex > 0 ? turns[answerIndex - 1] : undefined;
  const question =
    precedingTurn?.speaker === "interviewer" ? precedingTurn : null;
  const evidenceIds = new Set(answers.map((turn) => turn.id));

  return {
    answer,
    additionalAnswers: answers.slice(0, -1),
    question,
    relatedSummaryNotes: summaryNotes(summary, plan).filter((note) =>
      note.evidenceTurnIds.some((turnId) => evidenceIds.has(turnId)),
    ),
  };
}

function linesForItems(
  heading: string,
  values: readonly string[],
  emptyLabel: string,
): string[] {
  return [
    heading,
    ...(values.length > 0
      ? values.map((value) => `- ${value}`)
      : [`- ${emptyLabel}`]),
  ];
}

export function formatSummaryForCopy(
  summary: ScreeningSummary,
  plan: ScreeningPlan,
): string {
  const topicTitles = new Map(
    plan.topics.map((topic) => [topic.key, topic.title] as const),
  );
  const role =
    summary.rolePreference?.status === "candidate_stated"
      ? summary.rolePreference.label
      : "Undecided";

  return [
    "ScreenPilot interview review",
    "AI-organized notes — human interpretation required.",
    "",
    summary.overview,
    "",
    "Synthetic session role",
    `- ${role}`,
    "",
    ...linesForItems(
      "Confirmed facts",
      summary.confirmedFacts.map((fact) => fact.statement),
      "No confirmed facts available.",
    ),
    "",
    ...linesForItems(
      "Clarifications",
      summary.clarifications.map((item) => item.statement),
      "No clarifications recorded.",
    ),
    "",
    ...linesForItems(
      "Topics covered",
      summary.topicsCovered.map(
        (topic) => topicTitles.get(topic.topicKey) ?? topic.topicKey,
      ),
      "No topics were confirmed as covered.",
    ),
    "",
    ...linesForItems(
      "Topics not covered",
      summary.topicsNotCovered.map(
        (topicKey) => topicTitles.get(topicKey) ?? topicKey,
      ),
      "No topic gaps were reported.",
    ),
    "",
    ...linesForItems(
      "Compensation",
      summary.compensation ? [summary.compensation.candidateStatement] : [],
      "Not covered.",
    ),
    "",
    ...linesForItems(
      "Availability",
      summary.availability ? [summary.availability.candidateStatement] : [],
      "Not covered.",
    ),
    "",
    ...linesForItems(
      "Communication notes",
      summary.communicationNotes.map((note) => note.observation),
      "No evidence-linked notes available.",
    ),
    "",
    ...linesForItems(
      "Candidate questions",
      summary.candidateQuestions.map((question) => question.question),
      "No candidate questions were captured.",
    ),
    "",
    ...linesForItems(
      "Human follow-ups",
      summary.humanFollowups.map((followup) => followup.reason),
      "No human follow-ups were recorded.",
    ),
    "",
    ...linesForItems("Limitations", summary.limitations, "None reported."),
    "",
    "No score or automated hiring decision was created.",
  ].join("\n");
}
