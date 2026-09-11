import { z } from "zod";

import { normalizedCvSchema } from "../interview/normalized-cv.ts";
import { screeningPlanSchema } from "../interview/screening-plan.ts";
import { interviewGrantSchema } from "./interview-preparation.ts";

export const analyzeCvRequestSchema = z.strictObject({
  cvText: z.string().trim().min(500).max(40_000),
  clientRequestId: z.uuid(),
  turnstileToken: z.string().trim().min(1).max(4_096),
});

export const providerUsageSchema = z
  .strictObject({
    cachedInputTokens: z.number().int().nonnegative(),
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    estimatedCostUsd: z.number().nonnegative(),
  })
  .superRefine((usage, context) => {
    if (usage.cachedInputTokens > usage.inputTokens) {
      context.addIssue({
        code: "custom",
        message: "Cached input tokens cannot exceed total input tokens.",
        path: ["cachedInputTokens"],
      });
    }
  });

export const analyzeCvResponseSchema = z
  .strictObject({
    cv: normalizedCvSchema,
    plan: screeningPlanSchema,
    interviewGrant: interviewGrantSchema,
    expiresAt: z.iso.datetime({ offset: true }),
    usage: providerUsageSchema,
  })
  .superRefine((response, context) => {
    if (response.plan.entryMode !== "cv_assisted") {
      context.addIssue({
        code: "custom",
        message: "CV analysis must return a CV-assisted plan.",
        path: ["plan", "entryMode"],
      });
    }
  });

export type AnalyzeCvRequest = z.infer<typeof analyzeCvRequestSchema>;
export type AnalyzeCvResponse = z.infer<typeof analyzeCvResponseSchema>;
export type ProviderUsage = z.infer<typeof providerUsageSchema>;
