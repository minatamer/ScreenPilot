import { roleLabelSchema } from "@screenpilot/contracts/interview/demo-context";
import type { NormalizedCv } from "@screenpilot/contracts/interview/normalized-cv";

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
    CvAnalyzer<NormalizedCv>,
    InterviewSummarizer<unknown, FakeInterviewSummary>
{
  analyzeCv(
    input: CvAnalyzerInput,
    signal?: AbortSignal,
  ): Promise<CvAnalyzerResult<NormalizedCv>> {
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
  const isMatchingEvidence = (candidate: string) =>
    candidate.length >= 20 &&
    candidate.length <= 500 &&
    pattern.test(candidate);
  const paragraph = cvText
    .split(/\n\s*\n/u)
    .map((candidate) => candidate.trim())
    .find(isMatchingEvidence);
  if (paragraph) {
    return paragraph;
  }

  return (
    cvText
      .split("\n")
      .map((line) => line.trim())
      .find(isMatchingEvidence) ?? null
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

function extractSuggestedRole(
  cvText: string,
): Readonly<{ evidence: string; label: string }> | null {
  const explicitDirection = cvText
    .split("\n")
    .map((line) => line.trim())
    .find((line) => /^Suggested role:\s*.+/iu.test(line));
  if (explicitDirection) {
    const parsedLabel = roleLabelSchema.safeParse(
      explicitDirection.replace(/^Suggested role:\s*/iu, ""),
    );
    if (parsedLabel.success) {
      return { evidence: explicitDirection, label: parsedLabel.data };
    }
  }

  const ordinarySignals: readonly Readonly<{
    label: string;
    pattern: RegExp;
  }>[] = [
    {
      label: "Graphic Designer",
      pattern: /\b(?:graphic designer|visual design|brand design)\b/iu,
    },
    {
      label: "Customer Support Representative",
      pattern: /\b(?:customer support representative|customer support)\b/iu,
    },
    {
      label: "Product Manager",
      pattern: /\b(?:product manager|product management)\b/iu,
    },
    {
      label: "Full Stack Developer",
      pattern: /\bfull stack\b/iu,
    },
    {
      label: "Frontend Developer",
      pattern:
        /\b(?:frontend work|interface developer|interface support|customer-facing product UI)\b/iu,
    },
    {
      label: "Backend Developer",
      pattern:
        /\b(?:backend direction|backend-oriented|server-side product|server-side services)\b/iu,
    },
  ];

  for (const signal of ordinarySignals) {
    const evidence = paragraphContaining(cvText, signal.pattern);
    if (evidence !== null) {
      return { evidence, label: signal.label };
    }
  }
  return null;
}

function createFakeCvAnalysis(cvText: string): CvAnalyzerResult<NormalizedCv> {
  const trustedText = trustedFixtureText(cvText);
  const displayName = extractDisplayName(trustedText);
  const experienceEvidence =
    paragraphContaining(
      trustedText,
      /\b(?:experience|graduate|internship|placement|project work|studies)\b/i,
    ) ?? paragraphContaining(trustedText, /\bsoftware\b/i);
  const suggestedRole = extractSuggestedRole(trustedText);
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
          : "The CV describes prior experience in the candidate's stated context.",
    });
  }
  if (suggestedRole !== null) {
    facts.push({
      category: "skill",
      evidenceExcerpt: suggestedRole.evidence,
      id: "role-direction-1",
      statement: `The CV contains a provisional ${suggestedRole.label} direction.`,
    });
  }

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
      suggestedRole:
        suggestedRole === null
          ? null
          : {
              cvFactIds: ["role-direction-1"],
              label: suggestedRole.label,
            },
    },
    usage: {
      cachedInputTokens: 0,
      inputTokens: Math.ceil(cvText.length / 4),
      outputTokens: 700,
    },
  };
}
