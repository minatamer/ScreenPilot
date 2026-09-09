import { z } from "zod";

export const TOPIC_PROGRESS_STATUSES = [
  "not_started",
  "in_progress",
  "covered",
  "skipped",
  "needs_clarification",
] as const;

export const topicProgressSchema = z.strictObject({
  topicKey: z.string().trim().min(1).max(64),
  status: z.enum(TOPIC_PROGRESS_STATUSES),
  evidenceTurnIds: z.array(z.string().trim().min(1).max(64)).max(16),
  updatedAt: z.iso.datetime({ offset: true }),
});

export type TopicProgress = z.infer<typeof topicProgressSchema>;
