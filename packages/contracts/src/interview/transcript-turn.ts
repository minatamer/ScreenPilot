import { z } from "zod";

export const TRANSCRIPT_SPEAKERS = ["candidate", "interviewer"] as const;
export const TRANSCRIPT_STATUSES = ["partial", "final"] as const;

export const transcriptTurnSchema = z.strictObject({
  id: z.string().trim().min(1).max(64),
  sequence: z.number().int().nonnegative().max(10_000),
  speaker: z.enum(TRANSCRIPT_SPEAKERS),
  status: z.enum(TRANSCRIPT_STATUSES),
  text: z.string().trim().min(1).max(4_000),
  occurredAt: z.iso.datetime({ offset: true }),
});

export type TranscriptTurn = z.infer<typeof transcriptTurnSchema>;
