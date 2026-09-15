import { z } from "zod";

import { UNIVERSAL_TOPIC_KEYS } from "./screening-plan.ts";

export const TOPIC_PROGRESS_STATUSES = [
  "not_started",
  "in_progress",
  "covered",
  "skipped",
  "needs_clarification",
] as const;

export const topicProgressSchema = z.strictObject({
  topicKey: z.enum(UNIVERSAL_TOPIC_KEYS),
  status: z.enum(TOPIC_PROGRESS_STATUSES),
  evidenceTurnIds: z
    .array(z.string().trim().min(1).max(64))
    .max(16)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Topic evidence cannot be duplicated.",
    }),
  updatedAt: z.iso.datetime({ offset: true }),
});

export type TopicProgress = z.infer<typeof topicProgressSchema>;
