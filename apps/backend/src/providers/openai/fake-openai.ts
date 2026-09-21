import { roleLabelSchema } from "@screenpilot/contracts/interview/demo-context";
import type { NormalizedCv } from "@screenpilot/contracts/interview/normalized-cv";
import { UNDECIDED_ROLE_VALUE } from "@screenpilot/contracts/interview/client-tools";
import {
  SCREENING_SUMMARY_LIMITATIONS,
  screeningSummarySchema,
  type ScreeningSummary,
} from "@screenpilot/contracts/interview/screening-summary";

import type {
  CvAnalyzer,
  CvAnalyzerInput,
  CvAnalyzerResult,
} from "../../use-cases/ports/cv-analyzer.js";
import type {
  InterviewSummarizer,
  InterviewSummaryInput,
  InterviewSummaryProviderResult,
} from "../../use-cases/ports/interview-summarizer.js";

export class FakeOpenAi
  implements CvAnalyzer<NormalizedCv>, InterviewSummarizer
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
    input: InterviewSummaryInput,
    signal?: AbortSignal,
  ): Promise<InterviewSummaryProviderResult> {
    return Promise.resolve().then(() => {
      signal?.throwIfAborted();
      const summary = createFakeInterviewSummary(input);
      return {
        summary,
        usage: {
          cachedInputTokens: 0,
          inputTokens: Math.ceil(JSON.stringify(input).length / 4),
          outputTokens: Math.ceil(JSON.stringify(summary).length / 4),
        },
      };
    });
  }
}

function latestCandidateInsight(
  input: InterviewSummaryInput,
  category: InterviewSummaryInput["insights"][number]["category"],
) {
  return input.insights.reduce<
    InterviewSummaryInput["insights"][number] | undefined
  >((latest, insight) => {
    if (insight.category !== category || insight.source === "CV") {
      return latest;
    }
    return latest === undefined || insight.updatedAt >= latest.updatedAt
      ? insight
      : latest;
  }, undefined);
}

function sentenceWithDetail(prefix: string, value: string): string {
  const normalizedValue = value.trim().replace(/[.!?]+$/u, "");
  const maximumValueCharacters = 600 - prefix.length - 2;
  const boundedValue = Array.from(normalizedValue)
    .slice(0, maximumValueCharacters)
    .join("");
  return `${prefix}: ${boundedValue}.`;
}

function factStatement(
  insight: InterviewSummaryInput["insights"][number],
  includeCandidateDetail: boolean,
): string | null {
  const statements: Partial<
    Record<InterviewSummaryInput["insights"][number]["category"], string>
  > = {
    current_context: includeCandidateDetail
      ? sentenceWithDetail("Current context", insight.value)
      : "Candidate shared current or recent context.",
    relevant_experience: includeCandidateDetail
      ? sentenceWithDetail("Relevant experience", insight.value)
      : "Candidate described broad relevant experience for human review.",
    responsibility: includeCandidateDetail
      ? sentenceWithDetail("Responsibility described", insight.value)
      : "Candidate described broad responsibilities.",
    strongest_areas: includeCandidateDetail
      ? sentenceWithDetail("Candidate-highlighted area", insight.value)
      : "Candidate identified a self-described strongest area.",
    team_work_style: includeCandidateDetail
      ? sentenceWithDetail("Team and work preference", insight.value)
      : "Candidate described a team or work-style preference.",
    motivation: includeCandidateDetail
      ? sentenceWithDetail("Next-role priority", insight.value)
      : "Candidate described a next-role motivation or priority.",
    location_work_arrangement: includeCandidateDetail
      ? sentenceWithDetail("Work-arrangement preference", insight.value)
      : "Candidate described a location or work-arrangement preference.",
    english_use: includeCandidateDetail
      ? sentenceWithDetail("Candidate-described English use", insight.value)
      : "Candidate described where they use English.",
  };
  return statements[insight.category] ?? null;
}

function fakeInterviewSummaryValue(
  input: InterviewSummaryInput,
  includeCandidateDetail: boolean,
): unknown {
  const roleInsight = latestCandidateInsight(input, "role_preference");
  const confirmedFacts = input.insights.flatMap((insight) => {
    if (
      insight.source === "CV" ||
      insight.status === "needs_clarification" ||
      insight.evidenceTurnIds.length === 0
    ) {
      return [];
    }
    const statement = factStatement(insight, includeCandidateDetail);
    return statement === null
      ? []
      : [{ evidenceTurnIds: insight.evidenceTurnIds, statement }];
  });
  const topicsCovered = input.topicProgress
    .filter(
      (progress) =>
        progress.status === "covered" && progress.evidenceTurnIds.length > 0,
    )
    .map((progress) => ({
      evidenceTurnIds: progress.evidenceTurnIds,
      topicKey: progress.topicKey,
    }));
  const coveredKeys = new Set(topicsCovered.map((topic) => topic.topicKey));
  const topicsNotCovered = input.plan.topics
    .map((topic) => topic.key)
    .filter((topicKey) => !coveredKeys.has(topicKey));
  const compensationInsight = latestCandidateInsight(input, "compensation");
  const availabilityInsight = latestCandidateInsight(input, "availability");
  const unresolvedInsights = input.insights.filter(
    (insight) =>
      insight.source !== "CV" &&
      (insight.status === "needs_clarification" ||
        insight.category === "follow_up_needed"),
  );

  return {
    overview:
      "Local interview evidence was organized into cautious notes for human review.",
    ...(roleInsight === undefined
      ? {}
      : {
          rolePreference: {
            evidenceTurnIds: roleInsight.evidenceTurnIds,
            label:
              roleInsight.value.toLocaleLowerCase("en") ===
              UNDECIDED_ROLE_VALUE.toLocaleLowerCase("en")
                ? null
                : roleInsight.value,
            status:
              roleInsight.value.toLocaleLowerCase("en") ===
              UNDECIDED_ROLE_VALUE.toLocaleLowerCase("en")
                ? "undecided"
                : "candidate_stated",
          },
        }),
    confirmedFacts,
    clarifications: input.insights
      .filter(
        (insight) =>
          insight.category !== "follow_up_needed" &&
          insight.source !== "CV" &&
          insight.status === "needs_clarification",
      )
      .map((insight) => ({
        evidenceTurnIds: insight.evidenceTurnIds,
        statement: includeCandidateDetail
          ? sentenceWithDetail("Clarification needed", insight.value)
          : "Candidate context remains unclear and needs human review.",
      })),
    topicsCovered,
    topicsNotCovered,
    ...(compensationInsight === undefined
      ? {}
      : {
          compensation: {
            candidateStatement: includeCandidateDetail
              ? sentenceWithDetail(
                  "Candidate-stated compensation preference",
                  compensationInsight.value,
                )
              : "Candidate provided, declined, or remained uncertain about compensation details.",
            evidenceTurnIds: compensationInsight.evidenceTurnIds,
          },
        }),
    ...(availabilityInsight === undefined
      ? {}
      : {
          availability: {
            candidateStatement: includeCandidateDetail
              ? sentenceWithDetail(
                  "Candidate-stated availability",
                  availabilityInsight.value,
                )
              : "Candidate described availability or uncertainty for human review.",
            evidenceTurnIds: availabilityInsight.evidenceTurnIds,
          },
        }),
    communicationNotes: [],
    candidateQuestions: input.insights
      .filter(
        (insight) =>
          insight.category === "candidate_question" && insight.source !== "CV",
      )
      .map((insight) => ({
        evidenceTurnIds: insight.evidenceTurnIds,
        question: includeCandidateDetail
          ? insight.value
          : "Candidate asked a question for human review.",
      })),
    humanFollowups: input.insights
      .filter(
        (insight) =>
          insight.category === "follow_up_needed" && insight.source !== "CV",
      )
      .map((insight) => ({
        evidenceTurnIds: insight.evidenceTurnIds,
        reason: includeCandidateDetail
          ? insight.value
          : "Human follow-up is needed for an unanswered candidate question or unclear detail.",
      })),
    limitations: [
      SCREENING_SUMMARY_LIMITATIONS[0],
      ...(topicsNotCovered.length === 0
        ? []
        : [SCREENING_SUMMARY_LIMITATIONS[1]]),
      ...(unresolvedInsights.length === 0
        ? []
        : [SCREENING_SUMMARY_LIMITATIONS[2]]),
    ],
  };
}

export function createFakeInterviewSummary(
  input: InterviewSummaryInput,
): ScreeningSummary {
  const detailedSummary = screeningSummarySchema.safeParse(
    fakeInterviewSummaryValue(input, true),
  );
  if (detailedSummary.success) {
    return detailedSummary.data;
  }

  return screeningSummarySchema.parse(fakeInterviewSummaryValue(input, false));
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
