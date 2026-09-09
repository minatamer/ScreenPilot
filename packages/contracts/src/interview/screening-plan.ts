import { z } from "zod";

import { entryModeSchema } from "./entry-mode.js";
import { vacancyKeySchema } from "./employer-context.js";

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
  "remote_europe_fit",
  "availability",
  "compensation_expectation",
  "english_use_context",
  "candidate_questions",
] as const;

export const screeningTopicSchema = z.strictObject({
  key: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(160),
  reason: z.string().trim().min(1).max(500),
  cvFactIds: z.array(z.string().trim().min(1).max(64)).max(16),
  applicableVacancyKeys: z.array(vacancyKeySchema).max(2),
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
    vacancyClarification: z.strictObject({
      confirmedVacancyKeys: z.array(vacancyKeySchema).max(2),
      suggestedVacancyKey: vacancyKeySchema.nullable(),
      reason: z.string().trim().min(1).max(500),
      cvFactIds: z.array(z.string().trim().min(1).max(64)).max(16),
      requiresCandidateConfirmation: z.literal(true),
    }),
    topics: z.array(screeningTopicSchema).min(1).max(16),
    fixedTopics: z
      .array(z.enum(FIXED_TOPIC_KEYS))
      .min(1)
      .max(FIXED_TOPIC_KEYS.length),
  })
  .superRefine((plan, context) => {
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

    if (plan.vacancyClarification.suggestedVacancyKey !== null) {
      context.addIssue({
        code: "custom",
        message: "Conversation-first plans cannot suggest a vacancy.",
        path: ["vacancyClarification", "suggestedVacancyKey"],
      });
    }

    if (
      plan.vacancyClarification.cvFactIds.length > 0 ||
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
