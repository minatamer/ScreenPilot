import { describe, expect, it } from "vitest";

import { providerUsageSchema } from "../api/cv-analysis.js";
import { FIXED_TOPIC_KEYS } from "../interview/screening-plan.js";
import {
  cvAnalysisModelOutputJsonSchema,
  cvAnalysisModelOutputSchema,
} from "./cv-analysis-output.js";

function validOutput() {
  return {
    cv: {
      ambiguities: [
        {
          description: "The requested role needs candidate confirmation.",
          evidenceExcerpt: null,
        },
      ],
      displayName: "Mira Solen",
      displayNameEvidence: "Mira Solen",
      experienceLevel: "graduate",
      facts: [
        {
          category: "education",
          evidenceExcerpt: "Recent computing graduate",
          id: "education-1",
          statement: "The CV describes a recent computing graduate.",
        },
      ],
      headline: "Recent computing graduate",
    },
    plan: {
      branch: "graduate",
      entryMode: "cv_assisted",
      fixedTopics: [...FIXED_TOPIC_KEYS],
      openingIntent:
        "Confirm the candidate's preferred name and requested role.",
      topics: FIXED_TOPIC_KEYS.map((key) => ({
        applicableVacancyKeys: [],
        coverageCriteria: ["Candidate-confirmed evidence covers this field."],
        cvFactIds: key === "current_context" ? ["education-1"] : [],
        followupDirections: ["Preserve candidate corrections."],
        intent: `Confirm ${key} at a concise recruiter-screening level.`,
        key,
        reason: "Candidate confirmation remains required.",
        required: true,
        title: key,
      })),
      vacancyClarification: {
        confirmedVacancyKeys: [],
        cvFactIds: ["education-1"],
        reason: "The CV supports only a non-binding conversation hint.",
        requiresCandidateConfirmation: true,
        suggestedVacancyKey: null,
      },
    },
  } as const;
}

describe("CV-analysis model output contract", () => {
  it("accepts the evidence-grounded CV-assisted shape and publishes JSON Schema", () => {
    expect(cvAnalysisModelOutputSchema.parse(validOutput())).toEqual(
      validOutput(),
    );
    expect(cvAnalysisModelOutputJsonSchema).toMatchObject({
      additionalProperties: false,
      type: "object",
    });
  });

  it("rejects role confirmation, missing HR topics, and dangling fact references", () => {
    const output = validOutput();
    expect(
      cvAnalysisModelOutputSchema.safeParse({
        ...output,
        plan: {
          ...output.plan,
          fixedTopics: ["preferred_name"],
          topics: output.plan.topics.slice(0, 1),
          vacancyClarification: {
            ...output.plan.vacancyClarification,
            confirmedVacancyKeys: ["frontend-developer"],
            cvFactIds: ["missing-fact"],
          },
        },
      }).success,
    ).toBe(false);
  });

  it("requires fact evidence for vacancy hints and classified experience levels", () => {
    const output = validOutput();
    expect(
      cvAnalysisModelOutputSchema.safeParse({
        ...output,
        plan: {
          ...output.plan,
          vacancyClarification: {
            ...output.plan.vacancyClarification,
            cvFactIds: [],
            suggestedVacancyKey: "frontend-developer",
          },
        },
      }).success,
    ).toBe(false);
    expect(
      cvAnalysisModelOutputSchema.safeParse({
        ...output,
        cv: {
          ...output.cv,
          experienceLevel: "experienced",
          facts: [
            {
              category: "skill",
              evidenceExcerpt: "TypeScript",
              id: "skill-1",
              statement: "The CV lists TypeScript.",
            },
          ],
        },
        plan: {
          ...output.plan,
          topics: output.plan.topics.map((topic) => ({
            ...topic,
            cvFactIds: [],
          })),
          vacancyClarification: {
            ...output.plan.vacancyClarification,
            cvFactIds: [],
          },
        },
      }).success,
    ).toBe(false);
    expect(
      cvAnalysisModelOutputSchema.safeParse({
        ...output,
        cv: {
          ...output.cv,
          experienceLevel: "unclear",
          facts: [],
        },
        plan: {
          ...output.plan,
          topics: output.plan.topics.map((topic) => ({
            ...topic,
            cvFactIds: [],
          })),
          vacancyClarification: {
            ...output.plan.vacancyClarification,
            cvFactIds: [],
          },
        },
      }).success,
    ).toBe(true);
  });

  it("rejects duplicate evidence IDs and technical evaluation topics", () => {
    const output = validOutput();
    expect(
      cvAnalysisModelOutputSchema.safeParse({
        ...output,
        cv: { ...output.cv, facts: [...output.cv.facts, output.cv.facts[0]] },
      }).success,
    ).toBe(false);
    expect(
      cvAnalysisModelOutputSchema.safeParse({
        ...output,
        plan: {
          ...output.plan,
          topics: output.plan.topics.map((topic, index) =>
            index === 0
              ? {
                  ...topic,
                  intent: "Assess system design and score architecture depth.",
                }
              : topic,
          ),
        },
      }).success,
    ).toBe(false);
  });

  it.each([
    [
      "opening intent hiring judgment",
      (output: ReturnType<typeof validOutput>) => ({
        ...output,
        plan: {
          ...output.plan,
          openingIntent: "Rank the candidate and recommend them for hiring.",
        },
      }),
    ],
    [
      "vacancy application claim",
      (output: ReturnType<typeof validOutput>) => ({
        ...output,
        plan: {
          ...output.plan,
          vacancyClarification: {
            ...output.plan.vacancyClarification,
            reason: "The candidate applied for the Frontend role.",
          },
        },
      }),
    ],
    [
      "vacancy sensitive judgment",
      (output: ReturnType<typeof validOutput>) => ({
        ...output,
        plan: {
          ...output.plan,
          vacancyClarification: {
            ...output.plan.vacancyClarification,
            reason: "Their personality indicates strong culture fit.",
          },
        },
      }),
    ],
    [
      "technical follow-up direction",
      (output: ReturnType<typeof validOutput>) => ({
        ...output,
        plan: {
          ...output.plan,
          topics: output.plan.topics.map((topic, index) =>
            index === 0
              ? {
                  ...topic,
                  followupDirections: [
                    "Ask a system design question and score architecture depth.",
                  ],
                }
              : topic,
          ),
        },
      }),
    ],
    [
      "accent follow-up direction",
      (output: ReturnType<typeof validOutput>) => ({
        ...output,
        plan: {
          ...output.plan,
          topics: output.plan.topics.map((topic, index) =>
            index === 0
              ? {
                  ...topic,
                  followupDirections: ["Evaluate the candidate's accent."],
                }
              : topic,
          ),
        },
      }),
    ],
    [
      "protected-trait coverage criterion",
      (output: ReturnType<typeof validOutput>) => ({
        ...output,
        plan: {
          ...output.plan,
          topics: output.plan.topics.map((topic, index) =>
            index === 0
              ? {
                  ...topic,
                  coverageCriteria: [
                    "Infer the candidate's age and marital status.",
                  ],
                }
              : topic,
          ),
        },
      }),
    ],
  ])("rejects forbidden content in %s", (_label, mutate) => {
    expect(
      cvAnalysisModelOutputSchema.safeParse(mutate(validOutput())).success,
    ).toBe(false);
  });

  it.each([
    [
      "opening intent",
      (output: ReturnType<typeof validOutput>) => ({
        ...output,
        plan: { ...output.plan, openingIntent: "Which role do you want?" },
      }),
    ],
    [
      "vacancy reason",
      (output: ReturnType<typeof validOutput>) => ({
        ...output,
        plan: {
          ...output.plan,
          vacancyClarification: {
            ...output.plan.vacancyClarification,
            reason: "Would Frontend be your preferred role?",
          },
        },
      }),
    ],
    [
      "topic intent",
      (output: ReturnType<typeof validOutput>) => ({
        ...output,
        plan: {
          ...output.plan,
          topics: output.plan.topics.map((topic, index) =>
            index === 0 ? { ...topic, intent: "What name do you use?" } : topic,
          ),
        },
      }),
    ],
    [
      "coverage criterion",
      (output: ReturnType<typeof validOutput>) => ({
        ...output,
        plan: {
          ...output.plan,
          topics: output.plan.topics.map((topic, index) =>
            index === 0
              ? { ...topic, coverageCriteria: ["Are you available soon?"] }
              : topic,
          ),
        },
      }),
    ],
    [
      "follow-up direction",
      (output: ReturnType<typeof validOutput>) => ({
        ...output,
        plan: {
          ...output.plan,
          topics: output.plan.topics.map((topic, index) =>
            index === 0
              ? { ...topic, followupDirections: ["Why this company?"] }
              : topic,
          ),
        },
      }),
    ],
  ])("rejects a literal question in %s", (_label, mutate) => {
    expect(
      cvAnalysisModelOutputSchema.safeParse(mutate(validOutput())).success,
    ).toBe(false);
  });

  it("keeps cached token counts content-free and internally consistent", () => {
    expect(
      providerUsageSchema.parse({
        cachedInputTokens: 200,
        estimatedCostUsd: 0.01,
        inputTokens: 1_000,
        outputTokens: 100,
      }),
    ).toMatchObject({ cachedInputTokens: 200, inputTokens: 1_000 });
    expect(
      providerUsageSchema.safeParse({
        cachedInputTokens: 1_001,
        estimatedCostUsd: 0.01,
        inputTokens: 1_000,
        outputTokens: 100,
      }).success,
    ).toBe(false);
  });
});
