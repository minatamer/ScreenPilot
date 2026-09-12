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

    const returnedCvFactIds = response.cv.facts.map((fact) => fact.id);
    const cvFactIds = new Set(returnedCvFactIds);
    if (cvFactIds.size !== returnedCvFactIds.length) {
      context.addIssue({
        code: "custom",
        message: "Returned CV fact IDs must be unique.",
        path: ["cv", "facts"],
      });
    }
    response.plan.topics.forEach((topic, topicIndex) => {
      topic.cvFactIds.forEach((cvFactId, factIndex) => {
        if (!cvFactIds.has(cvFactId)) {
          context.addIssue({
            code: "custom",
            message: "Plan topics must reference only returned CV facts.",
            path: ["plan", "topics", topicIndex, "cvFactIds", factIndex],
          });
        }
      });
    });
    response.plan.roleClarification.cvFactIds.forEach((cvFactId, factIndex) => {
      if (!cvFactIds.has(cvFactId)) {
        context.addIssue({
          code: "custom",
          message: "Role clarification must reference only returned CV facts.",
          path: ["plan", "roleClarification", "cvFactIds", factIndex],
        });
      }
    });

    const normalizedSuggestion = response.cv.suggestedRole;
    const planSuggestion = response.plan.roleClarification;
    const normalizedSuggestionFactIds =
      normalizedSuggestion === null ? [] : normalizedSuggestion.cvFactIds;
    if (
      (normalizedSuggestion?.label ?? null) !== planSuggestion.suggestedRole ||
      normalizedSuggestionFactIds.length !== planSuggestion.cvFactIds.length ||
      normalizedSuggestionFactIds.some(
        (factId) => !planSuggestion.cvFactIds.includes(factId),
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "The normalized CV and screening plan must expose the same grounded role suggestion.",
        path: ["plan", "roleClarification"],
      });
    }
  });

export type AnalyzeCvRequest = z.infer<typeof analyzeCvRequestSchema>;
export type AnalyzeCvResponse = z.infer<typeof analyzeCvResponseSchema>;
export type ProviderUsage = z.infer<typeof providerUsageSchema>;
