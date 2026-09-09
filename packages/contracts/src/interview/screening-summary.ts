import { z } from "zod";

import { vacancyKeySchema } from "./employer-context.js";

const evidenceIdSchema = z.string().trim().min(1).max(64);
const evidenceIdsSchema = z.array(evidenceIdSchema).min(1).max(16);

const evidenceStatementSchema = z.strictObject({
  statement: z.string().trim().min(1).max(600),
  evidenceTurnIds: evidenceIdsSchema,
});

const candidateStatementSchema = z.strictObject({
  candidateStatement: z.string().trim().min(1).max(600),
  evidenceTurnIds: evidenceIdsSchema,
});

export const screeningSummarySchema = z.strictObject({
  overview: z.string().trim().min(1).max(1_500),
  rolePreference: z
    .strictObject({
      requestedLabel: z.string().trim().min(1).max(120),
      screeningVacancyKeys: z.array(vacancyKeySchema).max(2),
      evidenceTurnIds: evidenceIdsSchema,
    })
    .optional(),
  confirmedFacts: z.array(evidenceStatementSchema).max(24),
  clarifications: z.array(evidenceStatementSchema).max(16),
  topicsCovered: z
    .array(
      z.strictObject({
        topicKey: z.string().trim().min(1).max(64),
        evidenceTurnIds: evidenceIdsSchema,
      }),
    )
    .max(16),
  topicsNotCovered: z.array(z.string().trim().min(1).max(160)).max(16),
  compensation: candidateStatementSchema.optional(),
  availability: candidateStatementSchema.optional(),
  communicationNotes: z
    .array(
      z.strictObject({
        observation: z.string().trim().min(1).max(600),
        evidenceTurnIds: evidenceIdsSchema,
      }),
    )
    .max(16),
  candidateQuestions: z
    .array(
      z.strictObject({
        question: z.string().trim().min(1).max(600),
        evidenceTurnIds: evidenceIdsSchema,
      }),
    )
    .max(16),
  humanFollowups: z
    .array(
      z.strictObject({
        reason: z.string().trim().min(1).max(600),
        evidenceTurnIds: evidenceIdsSchema,
      }),
    )
    .max(16),
  limitations: z.array(z.string().trim().min(1).max(600)).max(16),
});

export type ScreeningSummary = z.infer<typeof screeningSummarySchema>;
