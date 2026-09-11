import {
  FIXED_TOPIC_KEYS,
  UNIVERSAL_TOPIC_KEYS,
  type ScreeningPlan,
} from "@screenpilot/contracts/interview/screening-plan";

export function createConversationFirstPlanFixture(): ScreeningPlan {
  return {
    entryMode: "conversation_first",
    openingIntent: "Learn the candidate's preferred name in plain language.",
    branch: "discovery",
    roleClarification: {
      suggestedRole: null,
      reason: "Ask openly which role the candidate wants to use.",
      cvFactIds: [],
      requiresCandidateConfirmation: true,
    },
    topics: UNIVERSAL_TOPIC_KEYS.map((key) => ({
      key,
      title: key.replaceAll("_", " "),
      reason: "Learn one universal first-stage HR field.",
      cvFactIds: [],
      intent: "Learn this field without professional assessment.",
      coverageCriteria: ["Candidate evidence covers this field."],
      followupDirections: [],
      required: key !== "clarifications_and_followups",
    })),
    fixedTopics: [...FIXED_TOPIC_KEYS],
  };
}
