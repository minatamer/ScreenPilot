import { z } from "zod";

import { roleLabelSchema } from "./demo-context.js";
import { entryModeSchema } from "./entry-mode.js";

export const SCREENING_BRANCHES = [
  "graduate",
  "experienced",
  "mixed",
  "discovery",
] as const;

export const FIXED_TOPIC_KEYS = [
  "preferred_name",
  "role_preference",
  "current_context",
  "relevant_experience_summary",
  "team_work_style",
  "motivation_and_next_role",
  "location_work_arrangement",
  "availability",
  "compensation_expectation",
  "english_use_context",
  "candidate_questions",
] as const;

export const OPTIONAL_TOPIC_KEYS = ["clarifications_and_followups"] as const;

export const UNIVERSAL_TOPIC_KEYS = [
  ...FIXED_TOPIC_KEYS,
  ...OPTIONAL_TOPIC_KEYS,
] as const;

export const screeningTopicSchema = z.strictObject({
  key: z.enum(UNIVERSAL_TOPIC_KEYS),
  title: z.string().trim().min(1).max(160),
  reason: z.string().trim().min(1).max(500),
  cvFactIds: z.array(z.string().trim().min(1).max(64)).max(16),
  intent: z.string().trim().min(1).max(600),
  coverageCriteria: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
  followupDirections: z.array(z.string().trim().min(1).max(300)).max(12),
  required: z.boolean(),
});

export const screeningPlanSchema = z
  .strictObject({
    entryMode: entryModeSchema,
    openingIntent: z.string().trim().min(1).max(600),
    branch: z.enum(SCREENING_BRANCHES),
    roleClarification: z.strictObject({
      suggestedRole: roleLabelSchema.nullable(),
      reason: z.string().trim().min(1).max(500),
      cvFactIds: z.array(z.string().trim().min(1).max(64)).max(16),
      requiresCandidateConfirmation: z.literal(true),
    }),
    topics: z
      .array(screeningTopicSchema)
      .min(UNIVERSAL_TOPIC_KEYS.length)
      .max(UNIVERSAL_TOPIC_KEYS.length),
    fixedTopics: z
      .array(z.enum(FIXED_TOPIC_KEYS))
      .min(1)
      .max(FIXED_TOPIC_KEYS.length),
  })
  .superRefine((plan, context) => {
    const topicKeys = plan.topics.map((topic) => topic.key);
    if (
      new Set(topicKeys).size !== UNIVERSAL_TOPIC_KEYS.length ||
      UNIVERSAL_TOPIC_KEYS.some((key) => !topicKeys.includes(key))
    ) {
      context.addIssue({
        code: "custom",
        message: "Screening plans must define every universal HR topic once.",
        path: ["topics"],
      });
    }

    if (
      plan.fixedTopics.length !== FIXED_TOPIC_KEYS.length ||
      new Set(plan.fixedTopics).size !== FIXED_TOPIC_KEYS.length ||
      FIXED_TOPIC_KEYS.some((key) => !plan.fixedTopics.includes(key))
    ) {
      context.addIssue({
        code: "custom",
        message: "Screening plans must identify every fixed HR topic once.",
        path: ["fixedTopics"],
      });
    }

    plan.topics.forEach((topic, topicIndex) => {
      const shouldBeRequired = topic.key !== "clarifications_and_followups";
      if (topic.required !== shouldBeRequired) {
        context.addIssue({
          code: "custom",
          message:
            topic.key === "clarifications_and_followups"
              ? "Clarifications and follow-ups must remain optional."
              : "Fixed HR topics must remain required.",
          path: ["topics", topicIndex, "required"],
        });
      }
    });

    if (
      (plan.roleClarification.suggestedRole === null) !==
      (plan.roleClarification.cvFactIds.length === 0)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "A role suggestion and its supporting CV facts must be present or absent together.",
        path: ["roleClarification", "cvFactIds"],
      });
    }

    if (plan.entryMode !== "conversation_first") {
      return;
    }

    if (plan.branch !== "discovery") {
      context.addIssue({
        code: "custom",
        message: "Conversation-first plans must use the discovery branch.",
        path: ["branch"],
      });
    }

    if (plan.roleClarification.suggestedRole !== null) {
      context.addIssue({
        code: "custom",
        message: "Conversation-first plans cannot suggest a role.",
        path: ["roleClarification", "suggestedRole"],
      });
    }

    if (
      plan.roleClarification.cvFactIds.length > 0 ||
      plan.topics.some((topic) => topic.cvFactIds.length > 0)
    ) {
      context.addIssue({
        code: "custom",
        message: "Conversation-first plans cannot reference CV facts.",
        path: ["topics"],
      });
    }
  });

export type ScreeningPlan = z.infer<typeof screeningPlanSchema>;
export type ScreeningTopic = z.infer<typeof screeningTopicSchema>;
