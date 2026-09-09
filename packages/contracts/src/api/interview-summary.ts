import { z } from "zod";

import { interviewGrantSchema } from "./interview-preparation.js";
import { providerUsageSchema } from "./cv-analysis.js";
import { entryModeSchema } from "../interview/entry-mode.js";
import { insightCardSchema } from "../interview/insight-card.js";
import { screeningPlanSchema } from "../interview/screening-plan.js";
import { screeningSummarySchema } from "../interview/screening-summary.js";
import { topicProgressSchema } from "../interview/topic-progress.js";
import { transcriptTurnSchema } from "../interview/transcript-turn.js";

export const summarizeInterviewRequestSchema = z
  .strictObject({
    interviewGrant: interviewGrantSchema,
    turnstileToken: z.string().trim().min(1).max(4_096),
    entryMode: entryModeSchema,
    plan: screeningPlanSchema,
    transcript: z.array(transcriptTurnSchema).max(160),
    insights: z.array(insightCardSchema).max(24),
    topicProgress: z.array(topicProgressSchema).max(16),
  })
  .superRefine((request, context) => {
    if (request.plan.entryMode !== request.entryMode) {
      context.addIssue({
        code: "custom",
        message: "The entry mode must match the screening plan.",
        path: ["plan", "entryMode"],
      });
    }

    const transcriptCharacters = request.transcript.reduce(
      (total, turn) => total + turn.text.length,
      0,
    );
    if (transcriptCharacters > 30_000) {
      context.addIssue({
        code: "custom",
        message: "Transcript text exceeds the 30,000 character limit.",
        path: ["transcript"],
      });
    }

    if (
      request.entryMode === "conversation_first" &&
      request.insights.some((insight) => insight.source !== "Candidate")
    ) {
      context.addIssue({
        code: "custom",
        message: "Conversation-first insights must use Candidate provenance.",
        path: ["insights"],
      });
    }
  });

export const summarizeInterviewResponseSchema = z.strictObject({
  summary: screeningSummarySchema,
  usage: providerUsageSchema,
  limitations: z.array(z.string().trim().min(1).max(600)).max(16),
});

export type SummarizeInterviewRequest = z.infer<
  typeof summarizeInterviewRequestSchema
>;
export type SummarizeInterviewResponse = z.infer<
  typeof summarizeInterviewResponseSchema
>;
