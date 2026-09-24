import { z } from "zod";

import { rolePreferenceSchema } from "../interview/demo-context.ts";
import {
  screeningSummaryFields,
  screeningSummarySchema,
  summaryCandidateStatementSchema,
  type ScreeningSummary,
} from "../interview/screening-summary.ts";

// OpenAI Structured Outputs accepts `anyOf` but not the `oneOf` emitted by a
// Zod discriminated union. Re-wrap the same validated variants as a plain union
// for the provider-facing schema while retaining the canonical domain parser.
const summaryRolePreferenceModelSchema = z.union(rolePreferenceSchema.options);

export const summaryModelOutputSchema = z.strictObject({
  ...screeningSummaryFields,
  rolePreference: summaryRolePreferenceModelSchema.nullable(),
  compensation: summaryCandidateStatementSchema.nullable(),
  availability: summaryCandidateStatementSchema.nullable(),
});

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
