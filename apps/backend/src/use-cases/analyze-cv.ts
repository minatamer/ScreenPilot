import {
  analyzeCvResponseSchema,
  type AnalyzeCvRequest,
  type AnalyzeCvResponse,
  type ProviderUsage,
} from "@screenpilot/contracts/api/cv-analysis";
import { cvAnalysisOutputSchema } from "@screenpilot/contracts/ai/cv-analysis-output";
import { normalizedCvSchema } from "@screenpilot/contracts/interview/normalized-cv";

import { TURNSTILE_ACTIONS } from "../config/provider-mode.js";
import { OpenAiRequestError } from "../providers/openai/openai-client.js";
import { createCvAssistedPlan } from "../demo/cv-assisted-plan.js";
import {
  hashInterviewGrantValue,
  type InterviewGrantService,
} from "../security/interview-grant.js";
import type { ChallengeVerifier } from "./ports/challenge-verifier.js";
import type { CvAnalyzer } from "./ports/cv-analyzer.js";
import { estimateOpenAiCostUsd } from "./openai-usage-cost.js";
import { UseCaseError } from "./use-case-error.js";

const CV_ANALYSIS_PLAN_VERSION = "2026-09-16.1";

export type CvAnalysisAdmissionDecision =
  "allowed" | "capacity_reached" | "rate_limited";

export type CvAnalysisAdmission = (
  anonymousSessionId: string,
) => CvAnalysisAdmissionDecision;

function validateCvText(cvText: string): void {
  const containsForbiddenCharacter = Array.from(cvText).some((character) => {
    const codePoint = character.codePointAt(0);
    return (
      codePoint === undefined ||
      (codePoint >= 0 && codePoint <= 8) ||
      codePoint === 11 ||
      codePoint === 12 ||
      (codePoint >= 14 && codePoint <= 31) ||
      (codePoint >= 127 && codePoint <= 159) ||
      (codePoint >= 0x202a && codePoint <= 0x202e) ||
      (codePoint >= 0x2066 && codePoint <= 0x2069) ||
      codePoint === 0xfffd
    );
  });
  if (containsForbiddenCharacter || cvText.includes("\r")) {
    throw new UseCaseError(
      "INVALID_CV_TEXT",
      "The extracted CV text contains unsupported characters. Choose another text-based PDF.",
    );
  }

  const letterCount = cvText.match(/\p{L}/gu)?.length ?? 0;
  const latinLetterCount = cvText.match(/\p{Script=Latin}/gu)?.length ?? 0;
  if (letterCount < 100 || latinLetterCount / letterCount < 0.6) {
    throw new UseCaseError(
      "INVALID_CV_TEXT",
      "The demo currently accepts CV text written primarily in English.",
    );
  }
}

function validateEvidence(cvText: string, evidence: string): boolean {
  return cvText.includes(evidence);
}

function validateHeadline(cvText: string, headline: string): boolean {
  const cvTokens = new Set(
    cvText.toLocaleLowerCase("en").match(/[a-z0-9]+/g) ?? [],
  );
  const headlineTokens = headline.toLocaleLowerCase("en").match(/[a-z0-9]+/g);
  return (
    headlineTokens !== null &&
    headlineTokens.length > 0 &&
    headlineTokens.every((token) => cvTokens.has(token))
  );
}

function validateProviderOutput(cvText: string, normalizedCv: unknown) {
  const cv = normalizedCvSchema.parse(normalizedCv);
  const screeningPlan = createCvAssistedPlan(cv);
  const output = cvAnalysisOutputSchema.parse({
    cv,
    plan: screeningPlan,
  });

  if (
    output.cv.displayName !== null &&
    output.cv.displayNameEvidence !== null &&
    (!validateEvidence(cvText, output.cv.displayNameEvidence) ||
      !output.cv.displayNameEvidence
        .toLocaleLowerCase("en")
        .includes(output.cv.displayName.toLocaleLowerCase("en")))
  ) {
    throw new TypeError("Display name evidence is not grounded in the CV.");
  }
  if (
    output.cv.headline !== null &&
    !validateHeadline(cvText, output.cv.headline)
  ) {
    throw new TypeError("CV headline is not grounded in the CV.");
  }
  for (const fact of output.cv.facts) {
    if (!validateEvidence(cvText, fact.evidenceExcerpt)) {
      throw new TypeError(`CV fact ${fact.id} is not grounded in the CV.`);
    }
  }
  for (const ambiguity of output.cv.ambiguities) {
    if (
      ambiguity.evidenceExcerpt !== undefined &&
      !validateEvidence(cvText, ambiguity.evidenceExcerpt)
    ) {
      throw new TypeError("CV ambiguity evidence is not grounded in the CV.");
    }
  }
  return output;
}

export function createAnalyzeCv(input: {
  admission: CvAnalysisAdmission;
  analyzer: CvAnalyzer;
  enabled: boolean;
  grantService: InterviewGrantService;
  grantTtlSeconds: number;
  idGenerator: () => string;
  verifier: ChallengeVerifier;
}) {
  return async function analyzeCv(
    request: AnalyzeCvRequest,
    anonymousSessionId: string,
    signal?: AbortSignal,
  ): Promise<AnalyzeCvResponse> {
    validateCvText(request.cvText);

    if (!input.enabled) {
      throw new UseCaseError(
        "CAPACITY_REACHED",
        "CV analysis is currently disabled. Try again later.",
        { retryable: true },
      );
    }
    const admission = input.admission(anonymousSessionId);
    if (admission === "rate_limited") {
      throw new UseCaseError(
        "RATE_LIMITED",
        "Too many CV-analysis attempts. Wait briefly and try again.",
        { retryable: true, retryAfterSeconds: 60 },
      );
    }
    if (admission === "capacity_reached") {
      throw new UseCaseError(
        "CAPACITY_REACHED",
        "CV analysis is temporarily at capacity. Try again later.",
        { retryable: true },
      );
    }

    const challenge = await input.verifier.verifyChallenge(
      {
        expectedAction: TURNSTILE_ACTIONS.cvAnalyze,
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

    let providerResult;
    try {
      providerResult = await input.analyzer.analyzeCv(
        {
          cvText: request.cvText,
        },
        signal,
      );
    } catch (error: unknown) {
      signal?.throwIfAborted();
      const providerRequestError =
        error instanceof OpenAiRequestError ? error : null;
      const retryable = providerRequestError?.retryable ?? true;
      throw new UseCaseError(
        "PROVIDER_UNAVAILABLE",
        retryable
          ? "CV analysis is temporarily unavailable. Try again."
          : "CV analysis is unavailable right now. The demo owner must check the analysis service before another attempt.",
        {
          cause: error,
          ...(providerRequestError?.retryAfterSeconds === undefined
            ? {}
            : { retryAfterSeconds: providerRequestError.retryAfterSeconds }),
          retryable,
        },
      );
    }

    let output: ReturnType<typeof validateProviderOutput>;
    let usage: ProviderUsage;
    try {
      output = validateProviderOutput(
        request.cvText,
        providerResult.normalizedCv,
      );
      usage = {
        ...providerResult.usage,
        estimatedCostUsd: estimateOpenAiCostUsd(providerResult.usage),
      };
    } catch (error: unknown) {
      throw new UseCaseError(
        "PROVIDER_UNAVAILABLE",
        "CV analysis returned an invalid response. Try again.",
        { cause: error, retryable: true },
      );
    }

    try {
      const grant = input.grantService.issue({
        anonymousSessionId,
        cvAnalysisHash: hashInterviewGrantValue(output.cv),
        entryMode: "cv_assisted",
        grantId: input.idGenerator(),
        planHash: hashInterviewGrantValue(output.plan),
        planVersion: CV_ANALYSIS_PLAN_VERSION,
        ttlSeconds: input.grantTtlSeconds,
      });
      return analyzeCvResponseSchema.parse({
        cv: output.cv,
        expiresAt: grant.expiresAt,
        interviewGrant: grant.token,
        plan: output.plan,
        usage,
      });
    } catch (error: unknown) {
      throw new UseCaseError(
        "PREPARATION_FAILED",
        "The CV analysis could not be prepared. Try again.",
        { cause: error, retryable: true },
      );
    }
  };
}

export type AnalyzeCv = ReturnType<typeof createAnalyzeCv>;
