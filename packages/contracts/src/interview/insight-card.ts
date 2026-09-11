import { z } from "zod";

import { roleLabelSchema } from "./demo-context.ts";

export const INSIGHT_CATEGORIES = [
  "preferred_name",
  "role_preference",
  "current_context",
  "relevant_experience",
  "responsibility",
  "strongest_areas",
  "team_work_style",
  "availability",
  "location_work_arrangement",
  "compensation",
  "english_use",
  "motivation",
  "candidate_question",
  "follow_up_needed",
] as const;

export const INSIGHT_SOURCES = ["CV", "Candidate", "CV + Candidate"] as const;
export const INSIGHT_STATUSES = [
  "appearing",
  "confirmed",
  "corrected",
  "needs_clarification",
] as const;

const evidenceIdSchema = z.string().trim().min(1).max(64);

export const insightCardSchema = z
  .strictObject({
    id: z.string().trim().min(1).max(64),
    category: z.enum(INSIGHT_CATEGORIES),
    label: z.string().trim().min(1).max(120),
    value: z.string().trim().normalize("NFC").min(1).max(600),
    source: z.enum(INSIGHT_SOURCES),
    status: z.enum(INSIGHT_STATUSES),
    evidenceTurnIds: z.array(evidenceIdSchema).max(16),
    cvFactIds: z.array(evidenceIdSchema).max(16),
    correctionReason: z.string().trim().min(1).max(500).optional(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .superRefine((insight, context) => {
    if (
      insight.category === "role_preference" &&
      !roleLabelSchema.safeParse(insight.value).success
    ) {
      context.addIssue({
        code: "custom",
        message: "Role-preference insights require a valid bounded role label.",
        path: ["value"],
      });
    }
    if (insight.source !== "CV" && insight.evidenceTurnIds.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Candidate-sourced insights require transcript evidence.",
        path: ["evidenceTurnIds"],
      });
    }
    if (insight.source !== "Candidate" && insight.cvFactIds.length === 0) {
      context.addIssue({
        code: "custom",
        message: "CV-sourced insights require a normalized CV fact.",
        path: ["cvFactIds"],
      });
    }
    if (insight.status === "corrected" && !insight.correctionReason) {
      context.addIssue({
        code: "custom",
        message: "Corrected insights require a correction reason.",
        path: ["correctionReason"],
      });
    }
    if (Date.parse(insight.updatedAt) < Date.parse(insight.createdAt)) {
      context.addIssue({
        code: "custom",
        message: "An insight cannot be updated before it was created.",
        path: ["updatedAt"],
      });
    }
  });

export type InsightCard = z.infer<typeof insightCardSchema>;
export type InsightSource = z.infer<typeof insightCardSchema.shape.source>;
