import { z } from "zod";

import { entryModeSchema } from "../interview/entry-mode.ts";
import { insightCardSchema } from "../interview/insight-card.ts";
import { screeningPlanSchema } from "../interview/screening-plan.ts";
import { screeningSummarySchema } from "../interview/screening-summary.ts";
import { topicProgressSchema } from "../interview/topic-progress.ts";
import { transcriptTurnSchema } from "../interview/transcript-turn.ts";
import { providerUsageSchema } from "./cv-analysis.ts";
import { interviewGrantSchema } from "./interview-preparation.ts";

export const summarizeInterviewRequestSchema = z
  .strictObject({
    interviewGrant: interviewGrantSchema,
    turnstileToken: z.string().trim().min(1).max(4_096),
    entryMode: entryModeSchema,
    plan: screeningPlanSchema,
    transcript: z.array(transcriptTurnSchema).min(1).max(160),
    insights: z.array(insightCardSchema).max(24),
    topicProgress: z.array(topicProgressSchema).max(16),
  })
  .superRefine((request, context) => {
    const addIssue = (message: string, path: PropertyKey[]) => {
      context.addIssue({ code: "custom", message, path });
    };

    if (request.plan.entryMode !== request.entryMode) {
      addIssue("The entry mode must match the screening plan.", ["entryMode"]);
    }

    const transcriptCharacters = request.transcript.reduce(
      (total, turn) => total + turn.text.length,
      0,
    );
    if (transcriptCharacters > 30_000) {
      addIssue("Transcript text exceeds the 30,000 character limit.", [
        "transcript",
      ]);
    }

    if (
      request.entryMode === "conversation_first" &&
      request.insights.some((insight) => insight.source !== "Candidate")
    ) {
      addIssue("Conversation-first insights must use Candidate provenance.", [
        "insights",
      ]);
    }

    const transcriptIds = request.transcript.map((turn) => turn.id);
    const transcriptSequences = request.transcript.map((turn) => turn.sequence);
    if (new Set(transcriptIds).size !== transcriptIds.length) {
      addIssue("Transcript turn IDs must be unique.", ["transcript"]);
    }
    if (new Set(transcriptSequences).size !== transcriptSequences.length) {
      addIssue("Transcript sequences must be unique.", ["transcript"]);
    }
    if (request.transcript.some((turn) => turn.status !== "final")) {
      addIssue("Only final transcript turns can be summarized.", [
        "transcript",
      ]);
    }

    const candidateTurnIds = new Set(
      request.transcript
        .filter(
          (turn) => turn.speaker === "candidate" && turn.status === "final",
        )
        .map((turn) => turn.id),
    );
    if (candidateTurnIds.size === 0) {
      addIssue("A summary requires at least one final candidate turn.", [
        "transcript",
      ]);
    }

    const planTopicKeys = new Set(
      request.plan.topics.map((topic) => topic.key),
    );
    const planCvFactIds = new Set([
      ...request.plan.roleClarification.cvFactIds,
      ...request.plan.topics.flatMap((topic) => topic.cvFactIds),
    ]);
    const insightIds = request.insights.map((insight) => insight.id);
    if (new Set(insightIds).size !== insightIds.length) {
      addIssue("Insight IDs must be unique.", ["insights"]);
    }

    request.insights.forEach((insight, insightIndex) => {
      const evidencePath = ["insights", insightIndex, "evidenceTurnIds"];
      const cvEvidencePath = ["insights", insightIndex, "cvFactIds"];
      if (
        insight.evidenceTurnIds.some(
          (evidenceTurnId) => !candidateTurnIds.has(evidenceTurnId),
        )
      ) {
        addIssue(
          "Insight transcript evidence must resolve to final candidate turns.",
          evidencePath,
        );
      }
      if (insight.cvFactIds.some((cvFactId) => !planCvFactIds.has(cvFactId))) {
        addIssue(
          "Insight CV evidence must resolve to facts bound into the plan.",
          cvEvidencePath,
        );
      }
      if (insight.source === "Candidate" && insight.cvFactIds.length > 0) {
        addIssue("Candidate-only insights cannot cite CV evidence.", [
          "insights",
          insightIndex,
          "source",
        ]);
      }
      if (insight.source === "CV" && insight.evidenceTurnIds.length > 0) {
        addIssue("CV-only insights cannot cite transcript evidence.", [
          "insights",
          insightIndex,
          "source",
        ]);
      }
    });

    const progressKeys = request.topicProgress.map(
      (progress) => progress.topicKey,
    );
    if (new Set(progressKeys).size !== progressKeys.length) {
      addIssue("Topic progress keys must be unique.", ["topicProgress"]);
    }
    request.topicProgress.forEach((progress, progressIndex) => {
      if (!planTopicKeys.has(progress.topicKey)) {
        addIssue("Topic progress must reference the supplied plan.", [
          "topicProgress",
          progressIndex,
          "topicKey",
        ]);
      }
      if (
        progress.evidenceTurnIds.some(
          (evidenceTurnId) => !candidateTurnIds.has(evidenceTurnId),
        )
      ) {
        addIssue("Topic evidence must resolve to final candidate turns.", [
          "topicProgress",
          progressIndex,
          "evidenceTurnIds",
        ]);
      }
      if (
        progress.status === "not_started" &&
        progress.evidenceTurnIds.length > 0
      ) {
        addIssue("A not-started topic cannot cite transcript evidence.", [
          "topicProgress",
          progressIndex,
          "evidenceTurnIds",
        ]);
      }
      if (
        progress.status !== "not_started" &&
        progress.evidenceTurnIds.length === 0
      ) {
        addIssue("A progressed topic requires final candidate evidence.", [
          "topicProgress",
          progressIndex,
          "evidenceTurnIds",
        ]);
      }
    });
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
