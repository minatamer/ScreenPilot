import { z } from "zod";

import type { VoiceClientToolName } from "../api/voice-token.ts";
import { INSIGHT_SOURCES } from "./insight-card.ts";
import { UNIVERSAL_TOPIC_KEYS } from "./screening-plan.ts";

export const RECORDABLE_INSIGHT_CATEGORIES = [
  "preferred_name",
  "role_preference",
  "current_context",
  "relevant_experience",
  "responsibility",
  "strongest_areas",
  "team_work_style",
  "availability",
  "location_work_arrangement",
  "compensation",
  "english_use",
  "motivation",
] as const;

export const CLIENT_TOOL_TOPIC_STATUSES = [
  "in_progress",
  "covered",
  "skipped",
  "needs_clarification",
] as const;

export const UNDECIDED_ROLE_VALUE = "Undecided" as const;

export function isUndecidedRoleValue(value: string): boolean {
  return value.trim().toLocaleLowerCase() === "undecided";
}

const normalizedToolTextSchema = (maximumCharacters: number) =>
  z.string().trim().normalize("NFC").min(1).max(maximumCharacters);

export const recordInsightArgumentsSchema = z
  .strictObject({
    category: z.enum(RECORDABLE_INSIGHT_CATEGORIES),
    label: normalizedToolTextSchema(120),
    value: normalizedToolTextSchema(600),
    source: z.enum(INSIGHT_SOURCES),
  })
  .superRefine((arguments_, context) => {
    if (
      (arguments_.category === "preferred_name" ||
        arguments_.category === "role_preference") &&
      Array.from(arguments_.value).length > 120
    ) {
      context.addIssue({
        code: "custom",
        message: "Name and role values cannot exceed 120 characters.",
        path: ["value"],
      });
    }
  });

export const correctInsightArgumentsSchema = z.strictObject({
  cardId: normalizedToolTextSchema(64),
  value: normalizedToolTextSchema(600),
  reason: normalizedToolTextSchema(500),
});

export const markTopicArgumentsSchema = z.strictObject({
  topicKey: z.enum(UNIVERSAL_TOPIC_KEYS),
  status: z.enum(CLIENT_TOOL_TOPIC_STATUSES),
});

export const recordCandidateQuestionArgumentsSchema = z.strictObject({
  question: normalizedToolTextSchema(600),
});

export const requestFollowupArgumentsSchema = z.strictObject({
  reason: normalizedToolTextSchema(500),
});

export const voiceClientToolArgumentsSchemas = Object.freeze({
  recordInsight: recordInsightArgumentsSchema,
  correctInsight: correctInsightArgumentsSchema,
  markTopic: markTopicArgumentsSchema,
  recordCandidateQuestion: recordCandidateQuestionArgumentsSchema,
  requestFollowup: requestFollowupArgumentsSchema,
} satisfies Readonly<Record<VoiceClientToolName, z.ZodType>>);

export type RecordInsightArguments = z.infer<
  typeof recordInsightArgumentsSchema
>;
export type CorrectInsightArguments = z.infer<
  typeof correctInsightArgumentsSchema
>;
export type MarkTopicArguments = z.infer<typeof markTopicArgumentsSchema>;
export type RecordCandidateQuestionArguments = z.infer<
  typeof recordCandidateQuestionArgumentsSchema
>;
export type RequestFollowupArguments = z.infer<
  typeof requestFollowupArgumentsSchema
>;
