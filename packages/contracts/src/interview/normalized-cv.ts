import { z } from "zod";

import { roleSuggestionSchema } from "./demo-context.ts";

export const CV_FACT_CATEGORIES = [
  "education",
  "experience",
  "project",
  "skill",
  "language",
  "location",
] as const;

export const EXPERIENCE_LEVELS = [
  "graduate",
  "junior",
  "experienced",
  "unclear",
] as const;

export const normalizedCvFactSchema = z.strictObject({
  id: z.string().trim().min(1).max(64),
  category: z.enum(CV_FACT_CATEGORIES),
  statement: z.string().trim().min(1).max(500),
  evidenceExcerpt: z.string().trim().min(1).max(500),
});

export const normalizedCvAmbiguitySchema = z.strictObject({
  description: z.string().trim().min(1).max(500),
  evidenceExcerpt: z.string().trim().min(1).max(500).optional(),
});

export const normalizedCvSchema = z
  .strictObject({
    displayName: z.string().trim().min(1).max(120).nullable(),
    displayNameEvidence: z.string().trim().min(1).max(300).nullable(),
    headline: z.string().trim().min(1).max(240).nullable(),
    experienceLevel: z.enum(EXPERIENCE_LEVELS),
    facts: z.array(normalizedCvFactSchema).max(32),
    ambiguities: z.array(normalizedCvAmbiguitySchema).max(16),
    suggestedRole: roleSuggestionSchema.nullable(),
  })
  .superRefine((cv, context) => {
    if ((cv.displayName === null) !== (cv.displayNameEvidence === null)) {
      context.addIssue({
        code: "custom",
        message:
          "A CV display name and its evidence must be present or absent together.",
        path: ["displayNameEvidence"],
      });
    }
    const factIds = new Set(cv.facts.map((fact) => fact.id));
    if (cv.suggestedRole?.cvFactIds.some((factId) => !factIds.has(factId))) {
      context.addIssue({
        code: "custom",
        message: "A suggested role must reference only known CV facts.",
        path: ["suggestedRole", "cvFactIds"],
      });
    }
  });

export type NormalizedCv = z.infer<typeof normalizedCvSchema>;
export type NormalizedCvFact = z.infer<typeof normalizedCvFactSchema>;
