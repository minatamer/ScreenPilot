import { z } from "zod";

import { screeningPlanSchema } from "../interview/screening-plan.ts";

export const interviewGrantSchema = z.string().trim().min(16).max(8_192);

export const prepareInterviewRequestSchema = z.strictObject({
  entryMode: z.literal("conversation_first"),
  clientRequestId: z.uuid(),
});

export const prepareInterviewResponseSchema = z.strictObject({
  plan: screeningPlanSchema,
  interviewGrant: interviewGrantSchema,
  expiresAt: z.iso.datetime({ offset: true }),
});

export type InterviewGrant = z.infer<typeof interviewGrantSchema>;
export type PrepareInterviewRequest = z.infer<
  typeof prepareInterviewRequestSchema
>;
export type PrepareInterviewResponse = z.infer<
  typeof prepareInterviewResponseSchema
>;
