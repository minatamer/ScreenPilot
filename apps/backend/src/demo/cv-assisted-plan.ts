import type { NormalizedCv } from "@screenpilot/contracts/interview/normalized-cv";
import {
  FIXED_TOPIC_KEYS,
  screeningPlanSchema,
  type ScreeningPlan,
  type ScreeningTopic,
} from "@screenpilot/contracts/interview/screening-plan";

type TopicKey = ScreeningTopic["key"];

const TOPIC_TITLES: Readonly<Record<TopicKey, string>> = {
  availability: "Availability",
  candidate_questions: "Candidate questions and close",
  clarifications_and_followups: "Clarifications and human follow-up",
  compensation_expectation: "Compensation expectation",
  current_context: "Current context",
  english_use_context: "Candidate-stated English use",
  location_work_arrangement: "Location and work arrangement",
  motivation_and_next_role: "Motivation and next role",
  preferred_name: "Preferred name",
  relevant_experience_summary: "Relevant experience summary",
  role_preference: "Requested role",
  team_work_style: "Team and work style",
};

const TOPIC_KEYS = [
  ...FIXED_TOPIC_KEYS,
  "clarifications_and_followups",
] as const satisfies readonly TopicKey[];

function factIdsForTopic(cv: NormalizedCv, key: TopicKey): string[] {
  if (key === "role_preference") {
    return [...(cv.suggestedRole?.cvFactIds ?? [])];
  }
  const categories =
    key === "current_context"
      ? new Set(["education", "experience", "project"])
      : key === "relevant_experience_summary"
        ? new Set(["education", "experience", "project", "skill"])
        : key === "location_work_arrangement"
          ? new Set(["location"])
          : key === "english_use_context"
            ? new Set(["language"])
            : null;
  return categories === null
    ? []
    : cv.facts
        .filter((fact) => categories.has(fact.category))
        .map((fact) => fact.id)
        .slice(0, 16);
}

function createTopic(cv: NormalizedCv, key: TopicKey): ScreeningTopic {
  const cvFactIds = factIdsForTopic(cv, key);
  if (key === "clarifications_and_followups") {
    return {
      coverageCriteria: [
        "A genuine unresolved item is recorded, or this topic remains not applicable.",
      ],
      cvFactIds,
      followupDirections: [
        "Retain unsupported employer or vacancy questions for human follow-up without inventing an answer.",
        "Do not create a clarification merely to fill this optional topic.",
      ],
      intent:
        "Record only a genuine contradiction, missing logistical detail, or unsupported employer or vacancy question requiring human follow-up.",
      key,
      reason:
        "Human follow-up remains available without forcing another interview question.",
      required: false,
      title: TOPIC_TITLES[key],
    };
  }

  return {
    coverageCriteria: [
      `Candidate-confirmed context covers ${TOPIC_TITLES[key].toLocaleLowerCase("en")}, or the candidate declines.`,
    ],
    cvFactIds,
    followupDirections: [
      "Use available CV context to avoid repetition, then preserve any candidate correction.",
    ],
    intent: `Confirm the candidate's ${TOPIC_TITLES[key].toLocaleLowerCase("en")} at a concise first-stage HR level.`,
    key,
    reason:
      cvFactIds.length > 0
        ? "The CV supplies provisional context that the candidate may confirm or correct."
        : "This HR field still requires candidate confirmation or an explicit decline.",
    required: true,
    title: TOPIC_TITLES[key],
  };
}

export function createCvAssistedPlan(cv: NormalizedCv): ScreeningPlan {
  const suggestedRole = cv.suggestedRole;
  return screeningPlanSchema.parse({
    branch:
      cv.experienceLevel === "graduate"
        ? "graduate"
        : cv.experienceLevel === "experienced"
          ? "experienced"
          : "mixed",
    entryMode: "cv_assisted",
    fixedTopics: [...FIXED_TOPIC_KEYS],
    openingIntent:
      "Confirm the candidate's preferred name and requested role, then clarify only meaningful CV gaps before continuing the universal first-stage HR screen.",
    roleClarification: {
      cvFactIds: [...(suggestedRole?.cvFactIds ?? [])],
      reason:
        suggestedRole === null
          ? "The CV does not support one clear role hint; the candidate may provide a role label or remain undecided."
          : "CV evidence provides a non-binding role direction that the candidate must confirm or correct.",
      requiresCandidateConfirmation: true,
      suggestedRole: suggestedRole?.label ?? null,
    },
    topics: TOPIC_KEYS.map((key) => createTopic(cv, key)),
  });
}
