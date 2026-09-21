import {
  summarizeInterviewResponseSchema,
  type SummarizeInterviewRequest,
  type SummarizeInterviewResponse,
} from "@screenpilot/contracts/api/interview-summary";

import { TURNSTILE_ACTIONS } from "../config/provider-mode.js";
import {
  hashInterviewGrantValue,
  InterviewGrantError,
  type InterviewGrantService,
} from "../security/interview-grant.js";
import { estimateOpenAiCostUsd } from "./openai-usage-cost.js";
import type { ChallengeVerifier } from "./ports/challenge-verifier.js";
import type {
  InterviewSummarizer,
  InterviewSummaryInput,
} from "./ports/interview-summarizer.js";
import { UseCaseError } from "./use-case-error.js";
import { validateInterviewSummary } from "./validate-interview-summary.js";

export type InterviewSummaryAdmissionDecision =
  "allowed" | "capacity_reached" | "rate_limited";

export type InterviewSummaryAdmission = (
  anonymousSessionId: string,
) => InterviewSummaryAdmissionDecision;

export function createGenerateInterviewSummary(input: {
  admission: InterviewSummaryAdmission;
  enabled: boolean;
  grantService: InterviewGrantService;
  summarizer: InterviewSummarizer;
  verifier: ChallengeVerifier;
}) {
  return async function generateInterviewSummary(
    request: SummarizeInterviewRequest,
    anonymousSessionId: string,
    signal?: AbortSignal,
  ): Promise<SummarizeInterviewResponse> {
    const claims = input.grantService.verifyForAnonymousSession(
      request.interviewGrant,
      anonymousSessionId,
    );
    if (
      claims.entryMode !== request.entryMode ||
      claims.planHash !== hashInterviewGrantValue(request.plan)
    ) {
      throw new InterviewGrantError("INTERVIEW_GRANT_INVALID");
    }

    if (!input.enabled) {
      throw new UseCaseError(
        "CAPACITY_REACHED",
        "Interview summaries are currently disabled. Try again later.",
        { retryable: true },
      );
    }
    const admission = input.admission(anonymousSessionId);
    if (admission === "rate_limited") {
      throw new UseCaseError(
        "RATE_LIMITED",
        "Too many summary attempts. Wait briefly and try again.",
        { retryable: true, retryAfterSeconds: 60 },
      );
    }
    if (admission === "capacity_reached") {
      throw new UseCaseError(
        "CAPACITY_REACHED",
        "Interview summaries are temporarily at capacity. Try again later.",
        { retryable: true },
      );
    }

    const challenge = await input.verifier.verifyChallenge(
      {
        expectedAction: TURNSTILE_ACTIONS.interviewSummary,
        token: request.turnstileToken,
      },
      signal,
    );
    if (!challenge.success) {
      throw new UseCaseError(
        "TURNSTILE_REJECTED",
        "The anti-abuse check expired or was rejected. Try it again.",
        { retryable: true },
      );
    }

    const summaryInput: InterviewSummaryInput = {
      entryMode: request.entryMode,
      insights: request.insights,
      plan: request.plan,
      topicProgress: request.topicProgress,
      transcript: request.transcript,
    };
    try {
      const providerResult = await input.summarizer.summarizeInterview(
        summaryInput,
        signal,
      );
      const summary = validateInterviewSummary(
        summaryInput,
        providerResult.summary,
      );
      return summarizeInterviewResponseSchema.parse({
        summary,
        usage: {
          ...providerResult.usage,
          estimatedCostUsd: estimateOpenAiCostUsd(providerResult.usage),
        },
        limitations: summary.limitations,
      });
    } catch (error: unknown) {
      signal?.throwIfAborted();
      throw new UseCaseError(
        "SUMMARY_FAILED",
        "The conversation could not be organized. Try the summary again.",
        { cause: error, retryable: true },
      );
    }
  };
}

export type GenerateInterviewSummary = ReturnType<
  typeof createGenerateInterviewSummary
>;
