import { z } from "zod";

import { rolePreferenceSchema } from "../interview/demo-context.ts";
import {
  screeningSummaryFields,
  screeningSummarySchema,
  summaryCandidateStatementSchema,
  validateSummarySafety,
  type ScreeningSummary,
} from "../interview/screening-summary.ts";

export const summaryModelOutputSchema = z
  .strictObject({
    ...screeningSummaryFields,
    rolePreference: rolePreferenceSchema.nullable(),
    compensation: summaryCandidateStatementSchema.nullable(),
    availability: summaryCandidateStatementSchema.nullable(),
  })
  .superRefine(validateSummarySafety);

export type SummaryModelOutput = z.infer<typeof summaryModelOutputSchema>;

export function normalizeSummaryModelOutput(
  output: SummaryModelOutput,
): ScreeningSummary {
  return screeningSummarySchema.parse({
    ...output,
    ...(output.rolePreference === null
      ? { rolePreference: undefined }
      : { rolePreference: output.rolePreference }),
    ...(output.compensation === null
      ? { compensation: undefined }
      : { compensation: output.compensation }),
    ...(output.availability === null
      ? { availability: undefined }
      : { availability: output.availability }),
  });
}

export const summaryModelOutputJsonSchema = z.toJSONSchema(
  summaryModelOutputSchema,
  { target: "draft-7" },
);
