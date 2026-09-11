import { FIXED_TOPIC_KEYS } from "@screenpilot/contracts/interview/screening-plan";
import type { NormalizedCv } from "@screenpilot/contracts/interview/normalized-cv";
import type {
  ScreeningPlan,
  ScreeningTopic,
} from "@screenpilot/contracts/interview/screening-plan";

import type {
  CvAnalyzer,
  CvAnalyzerInput,
  CvAnalyzerResult,
} from "../../use-cases/ports/cv-analyzer.js";
import type {
  InterviewSummarizer,
  InterviewSummaryProviderResult,
} from "../../use-cases/ports/interview-summarizer.js";

export type FakeInterviewSummary = Readonly<{
  fixture: true;
  limitations: readonly ["No provider call was made."];
}>;

const fakeInterviewSummary: InterviewSummaryProviderResult<FakeInterviewSummary> =
  Object.freeze({
    summary: Object.freeze({
      fixture: true,
      limitations: Object.freeze(["No provider call was made."] as const),
    }),
    usage: Object.freeze({ inputTokens: 0, outputTokens: 0 }),
  });

export class FakeOpenAi
  implements
    CvAnalyzer<NormalizedCv, ScreeningPlan>,
    InterviewSummarizer<unknown, FakeInterviewSummary>
{
  analyzeCv(
    input: CvAnalyzerInput,
    signal?: AbortSignal,
  ): Promise<CvAnalyzerResult<NormalizedCv, ScreeningPlan>> {
    return Promise.resolve().then(() => {
      signal?.throwIfAborted();
      return createFakeCvAnalysis(input.cvText);
    });
  }

  summarizeInterview(
    _input: unknown,
    signal?: AbortSignal,
  ): Promise<InterviewSummaryProviderResult<FakeInterviewSummary>> {
    return Promise.resolve().then(() => {
      signal?.throwIfAborted();
      return fakeInterviewSummary;
    });
  }
}

function trustedFixtureText(cvText: string): string {
  return cvText.split("UNTRUSTED TEXT EMBEDDED IN THE CV", 1)[0] ?? cvText;
}

function paragraphContaining(cvText: string, pattern: RegExp): string | null {
  return (
    cvText
      .split(/\n\s*\n/u)
      .map((paragraph) => paragraph.trim())
      .find(
        (paragraph) =>
          paragraph.length >= 20 &&
          paragraph.length <= 500 &&
          pattern.test(paragraph),
      ) ?? null
  );
}

function extractDisplayName(cvText: string): string | null {
  return (
    cvText
      .split("\n")
      .map((line) => line.trim())
      .find(
        (line) =>
          line !== line.toUpperCase() &&
          /^[A-Z][A-Za-z'-]+(?: [A-Z][A-Za-z'-]+){1,2}$/.test(line),
      ) ?? null
  );
}

function topicTitle(key: (typeof FIXED_TOPIC_KEYS)[number]): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function createFixedTopic(
  key: (typeof FIXED_TOPIC_KEYS)[number],
  cvFactIds: readonly string[],
): ScreeningTopic {
  const groundedFactIds = [
    "current_context",
    "relevant_experience_summary",
  ].includes(key)
    ? [...cvFactIds]
    : [];
  return {
    applicableVacancyKeys: [],
    coverageCriteria: [
      `Candidate-confirmed evidence covers ${topicTitle(key).toLowerCase()}, or the candidate declines.`,
    ],
    cvFactIds: groundedFactIds,
    followupDirections: [
      "Use CV evidence to avoid repetition, then preserve any candidate correction.",
    ],
    intent: `Confirm the candidate's ${topicTitle(key).toLowerCase()} at a concise recruiter-screening level.`,
    key,
    reason:
      groundedFactIds.length > 0
        ? "The CV supplies provisional context that the candidate may confirm or correct."
        : "This HR field still requires candidate confirmation or an explicit decline.",
    required: true,
    title: topicTitle(key),
  };
}

function createFakeCvAnalysis(
  cvText: string,
): CvAnalyzerResult<NormalizedCv, ScreeningPlan> {
  const trustedText = trustedFixtureText(cvText);
  const displayName = extractDisplayName(trustedText);
  const experienceEvidence =
    paragraphContaining(
      trustedText,
      /\b(?:experience|graduate|internship|placement|project work|studies)\b/i,
    ) ?? paragraphContaining(trustedText, /\bsoftware\b/i);
  const frontendEvidence = paragraphContaining(
    trustedText,
    /\b(?:Frontend work|interface developer|interface support|customer-facing product UI)\b/i,
  );
  const backendEvidence = paragraphContaining(
    trustedText,
    /\b(?:Backend direction|Backend-oriented|server-side product|server-side services)\b/i,
  );
  const suggestedVacancyKey =
    frontendEvidence !== null && backendEvidence === null
      ? "frontend-developer"
      : backendEvidence !== null && frontendEvidence === null
        ? "backend-developer"
        : null;
  const experienceLevel =
    /\b(?:recent graduate|first full-time|studies)\b/i.test(trustedText)
      ? "graduate"
      : /\b(?:five|six) years\b/i.test(trustedText)
        ? "experienced"
        : /\b(?:junior|early-career|eighteen months|two years)\b/i.test(
              trustedText,
            )
          ? "junior"
          : /\bfour years\b/i.test(trustedText)
            ? "experienced"
            : "unclear";
  const facts: NormalizedCv["facts"] = [];

  if (experienceEvidence !== null) {
    facts.push({
      category: "experience",
      evidenceExcerpt: experienceEvidence,
      id: "experience-context-1",
      statement:
        experienceLevel === "graduate"
          ? "The CV describes an early-career study or placement context."
          : "The CV describes prior software product experience.",
    });
  }
  const directionEvidence = frontendEvidence ?? backendEvidence;
  if (directionEvidence !== null && suggestedVacancyKey !== null) {
    facts.push({
      category: "skill",
      evidenceExcerpt: directionEvidence,
      id: "role-direction-1",
      statement:
        suggestedVacancyKey === "frontend-developer"
          ? "The CV contains a provisional Frontend-oriented work signal."
          : "The CV contains a provisional Backend-oriented work signal.",
    });
  }

  const factIds = facts.map((fact) => fact.id);
  const branch =
    experienceLevel === "graduate"
      ? "graduate"
      : experienceLevel === "experienced"
        ? "experienced"
        : "mixed";
  const topics = FIXED_TOPIC_KEYS.map((key) => createFixedTopic(key, factIds));

  return {
    normalizedCv: {
      ambiguities: [
        {
          description:
            "The candidate's requested role and final screening direction require confirmation in conversation.",
        },
      ],
      displayName,
      displayNameEvidence: displayName,
      experienceLevel,
      facts,
      headline: null,
    },
    screeningPlan: {
      branch,
      entryMode: "cv_assisted",
      fixedTopics: [...FIXED_TOPIC_KEYS],
      openingIntent:
        "Confirm the candidate's preferred name and requested role, then clarify only meaningful CV gaps.",
      topics,
      vacancyClarification: {
        confirmedVacancyKeys: [],
        cvFactIds: suggestedVacancyKey === null ? [] : ["role-direction-1"],
        reason:
          suggestedVacancyKey === null
            ? "The CV does not support one clear vacancy hint; ask the candidate to choose the screening direction."
            : "CV evidence provides a non-binding direction that the candidate must confirm or correct.",
        requiresCandidateConfirmation: true,
        suggestedVacancyKey,
      },
    },
    usage: {
      cachedInputTokens: 0,
      inputTokens: Math.ceil(cvText.length / 4),
      outputTokens: 700,
    },
  };
}
