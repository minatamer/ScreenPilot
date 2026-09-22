import { z } from "zod";

import { containsUnsupportedAssessmentOrSensitiveInference } from "./assessment-boundary.ts";
import { rolePreferenceSchema } from "./demo-context.ts";
import { UNIVERSAL_TOPIC_KEYS } from "./screening-plan.ts";

const evidenceIdSchema = z.string().trim().min(1).max(64);
export const SCREENING_SUMMARY_OVERVIEW =
  "Key conversation points, organized for review.";
export const SCREENING_SUMMARY_LIMITATIONS = [
  "These AI-organized notes require human review.",
  "Some planned topics were not covered in the local evidence.",
  "Some local evidence remained unclear and needs human follow-up.",
] as const;
export const summaryEvidenceIdsSchema = z
  .array(evidenceIdSchema)
  .min(1)
  .max(16)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "Summary evidence cannot be duplicated.",
  });

export const summaryEvidenceStatementSchema = z.strictObject({
  statement: z.string().trim().min(1).max(600),
  evidenceTurnIds: summaryEvidenceIdsSchema,
});

export const summaryCandidateStatementSchema = z.strictObject({
  candidateStatement: z.string().trim().min(1).max(600),
  evidenceTurnIds: summaryEvidenceIdsSchema,
});

export const summaryTopicCoverageSchema = z.strictObject({
  topicKey: z.enum(UNIVERSAL_TOPIC_KEYS),
  evidenceTurnIds: summaryEvidenceIdsSchema,
});

export const summaryCommunicationNoteSchema = z.strictObject({
  observation: z.string().trim().min(1).max(600),
  evidenceTurnIds: summaryEvidenceIdsSchema,
});

export const summaryCandidateQuestionSchema = z.strictObject({
  question: z.string().trim().min(1).max(600),
  evidenceTurnIds: summaryEvidenceIdsSchema,
});

export const summaryHumanFollowupSchema = z.strictObject({
  reason: z.string().trim().min(1).max(600),
  evidenceTurnIds: summaryEvidenceIdsSchema,
});

export const screeningSummaryFields = {
  overview: z.literal(SCREENING_SUMMARY_OVERVIEW),
  confirmedFacts: z.array(summaryEvidenceStatementSchema).max(24),
  clarifications: z.array(summaryEvidenceStatementSchema).max(16),
  topicsCovered: z.array(summaryTopicCoverageSchema).max(16),
  topicsNotCovered: z.array(z.enum(UNIVERSAL_TOPIC_KEYS)).max(16),
  communicationNotes: z.array(summaryCommunicationNoteSchema).max(16),
  candidateQuestions: z.array(summaryCandidateQuestionSchema).max(16),
  humanFollowups: z.array(summaryHumanFollowupSchema).max(16),
  limitations: z.array(z.enum(SCREENING_SUMMARY_LIMITATIONS)).min(1).max(3),
} as const;

type SummaryTextInput = Readonly<{
  overview: string;
  confirmedFacts: readonly Readonly<{ statement: string }>[];
  clarifications: readonly Readonly<{ statement: string }>[];
  compensation?: Readonly<{ candidateStatement: string }> | null | undefined;
  availability?: Readonly<{ candidateStatement: string }> | null | undefined;
  communicationNotes: readonly Readonly<{ observation: string }>[];
  candidateQuestions: readonly Readonly<{ question: string }>[];
  humanFollowups: readonly Readonly<{ reason: string }>[];
  limitations: readonly string[];
}>;

export function summaryTextValues(summary: SummaryTextInput): string[] {
  return [
    summary.overview,
    ...summary.confirmedFacts.map((fact) => fact.statement),
    ...summary.clarifications.map((clarification) => clarification.statement),
    ...(summary.compensation === null || summary.compensation === undefined
      ? []
      : [summary.compensation.candidateStatement]),
    ...(summary.availability === null || summary.availability === undefined
      ? []
      : [summary.availability.candidateStatement]),
    ...summary.communicationNotes.map((note) => note.observation),
    ...summary.candidateQuestions.map((question) => question.question),
    ...summary.humanFollowups.map((followup) => followup.reason),
    ...summary.limitations,
  ];
}

function containsUnsupportedEmployerOrApplicationClaim(value: string): boolean {
  const normalized = value.normalize("NFKC");
  return (
    /\b(?:apply|applied|applying|applies)\s+(?:for|to)\b/iu.test(normalized) ||
    /\b(?:real|current|open|available)\s+(?:opening|position|vacancy)\b/iu.test(
      normalized,
    ) ||
    /\b(?:company|employer|position|vacancy)\b[^.!?\n]{0,60}\b(?:has|includes?|offers?|pays?|provides?|reports?|requires?)\b/iu.test(
      normalized,
    ) ||
    /\b(?:job|role)\b[^.!?\n]{0,40}\b(?:includes?|offers?|pays?|requires?)\b/iu.test(
      normalized,
    )
  );
}

export function validateSummarySafety(
  summary: SummaryTextInput,
  context: z.core.$RefinementCtx,
): void {
  if (
    summaryTextValues(summary).some(
      containsUnsupportedAssessmentOrSensitiveInference,
    )
  ) {
    context.addIssue({
      code: "custom",
      message:
        "Screening summaries cannot contain scoring, hiring judgments, personality, sentiment, sensitive inference, or language ratings.",
      path: ["overview"],
    });
  }
  const factualClaims = [
    summary.overview,
    ...summary.confirmedFacts.map((fact) => fact.statement),
    ...summary.clarifications.map((clarification) => clarification.statement),
    ...(summary.compensation === null || summary.compensation === undefined
      ? []
      : [summary.compensation.candidateStatement]),
    ...(summary.availability === null || summary.availability === undefined
      ? []
      : [summary.availability.candidateStatement]),
    ...summary.communicationNotes.map((note) => note.observation),
  ];
  if (factualClaims.some(containsUnsupportedEmployerOrApplicationClaim)) {
    context.addIssue({
      code: "custom",
      message:
        "Screening summaries cannot assert an application, real vacancy, job requirement, or employer fact.",
      path: ["confirmedFacts"],
    });
  }
}

export const screeningSummarySchema = z
  .strictObject({
    ...screeningSummaryFields,
    rolePreference: rolePreferenceSchema.optional(),
    compensation: summaryCandidateStatementSchema.optional(),
    availability: summaryCandidateStatementSchema.optional(),
  })
  .superRefine(validateSummarySafety);

export type ScreeningSummary = z.infer<typeof screeningSummarySchema>;
