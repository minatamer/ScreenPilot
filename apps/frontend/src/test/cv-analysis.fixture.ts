import type { AnalyzeCvResponse } from "@screenpilot/contracts/api/cv-analysis";
import type { PublicRuntimeConfig } from "@screenpilot/contracts/api/public-runtime-config";
import {
  FIXED_TOPIC_KEYS,
  UNIVERSAL_TOPIC_KEYS,
} from "@screenpilot/contracts/interview/screening-plan";

export const TEST_PUBLIC_RUNTIME_CONFIG: PublicRuntimeConfig = {
  abuseProtection: {
    appearance: "interaction-only",
    provider: "cloudflare_turnstile",
    siteKey: "",
  },
  limits: {
    callSeconds: 300,
    cvCharacters: 40_000,
    pdfBytes: 5_242_880,
    pdfPages: 8,
  },
  effectiveMode: "deterministic_fake",
  paidOperationsEnabled: false,
  privacyNoticeVersion: "2026-09-11",
  providerMode: "fake",
};

type CvAnalysisFixtureOptions = Readonly<{
  displayName?: string;
  experienceEvidence?: string;
  experienceStatement?: string;
  expiresAt?: string;
  planFocus?: string;
  suggestedRole?: string | null;
}>;

export function createCvAnalysisResponseFixture(
  options: CvAnalysisFixtureOptions = {},
): AnalyzeCvResponse {
  const displayName = options.displayName ?? "Morgan Lee";
  const experienceEvidence =
    options.experienceEvidence ??
    "Led discovery and delivery for a subscription onboarding product.";
  const experienceStatement =
    options.experienceStatement ??
    "The CV describes cross-functional product delivery experience.";
  const suggestedRole =
    options.suggestedRole === undefined
      ? "Product Manager"
      : options.suggestedRole;
  const experienceFact = {
    category: "experience" as const,
    evidenceExcerpt: experienceEvidence,
    id: "experience-1",
    statement: experienceStatement,
  };
  const roleFact = {
    category: "skill" as const,
    evidenceExcerpt:
      suggestedRole === null
        ? "Worked across discovery, delivery, and customer research."
        : `Suggested role: ${suggestedRole}`,
    id: "role-direction-1",
    statement:
      suggestedRole === null
        ? "The CV describes broad transferable experience."
        : `The CV contains a provisional ${suggestedRole} direction.`,
  };
  const facts = [experienceFact, roleFact];
  const roleFactIds = suggestedRole === null ? [] : [roleFact.id];

  return {
    cv: {
      ambiguities: [
        {
          description:
            "The requested role must be confirmed during the conversation.",
        },
      ],
      displayName,
      displayNameEvidence: displayName,
      experienceLevel: "experienced",
      facts,
      headline: null,
      suggestedRole:
        suggestedRole === null
          ? null
          : { cvFactIds: roleFactIds, label: suggestedRole },
    },
    expiresAt: options.expiresAt ?? "2030-09-12T12:15:00.000Z",
    interviewGrant: "signed-cv-assisted-interview-grant",
    plan: {
      branch: "experienced",
      entryMode: "cv_assisted",
      fixedTopics: [...FIXED_TOPIC_KEYS],
      openingIntent:
        "Confirm the candidate's preferred name and requested role before exploring relevant context.",
      roleClarification: {
        cvFactIds: roleFactIds,
        reason:
          suggestedRole === null
            ? "The CV does not support one clear role hint; the candidate may name any role or remain undecided."
            : "CV evidence supplies a non-binding direction for the candidate to confirm or correct.",
        requiresCandidateConfirmation: true,
        suggestedRole,
      },
      topics: UNIVERSAL_TOPIC_KEYS.map((key) => {
        const cvFactIds =
          key === "current_context" || key === "relevant_experience_summary"
            ? [experienceFact.id]
            : key === "role_preference"
              ? roleFactIds
              : [];
        return {
          coverageCriteria: ["Candidate evidence covers this HR field."],
          cvFactIds,
          followupDirections:
            options.planFocus &&
            (key === "current_context" || key === "relevant_experience_summary")
              ? [`Explore ${options.planFocus} without assuming fit.`]
              : [],
          intent:
            options.planFocus && key === "current_context"
              ? `Confirm the candidate's current ${options.planFocus} context.`
              : options.planFocus && key === "relevant_experience_summary"
                ? `Explore evidence connected to ${options.planFocus}.`
                : `Learn the candidate's ${key.replaceAll("_", " ")}.`,
          key,
          reason:
            cvFactIds.length > 0
              ? "The CV supplies provisional context to confirm."
              : "This is part of the standard first-round HR screen.",
          required: key !== "clarifications_and_followups",
          title: key
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" "),
        };
      }),
    },
    usage: {
      cachedInputTokens: 0,
      estimatedCostUsd: 0.00315,
      inputTokens: 700,
      outputTokens: 500,
    },
  };
}
