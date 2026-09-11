import { describe, expect, it } from "vitest";

import { providerUsageSchema } from "../api/cv-analysis.js";
import {
  FIXED_TOPIC_KEYS,
  UNIVERSAL_TOPIC_KEYS,
} from "../interview/screening-plan.js";
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
          evidenceExcerpt: "Recent product management graduate",
          id: "education-1",
          statement: "The CV describes a recent product management graduate.",
        },
      ],
      headline: "Recent product management graduate",
      suggestedRole: {
        cvFactIds: ["education-1"],
        label: "Product Manager",
      },
    },
    plan: {
      branch: "graduate",
      entryMode: "cv_assisted",
      fixedTopics: [...FIXED_TOPIC_KEYS],
      openingIntent:
        "Confirm the candidate's preferred name and requested role.",
      topics: UNIVERSAL_TOPIC_KEYS.map((key) => ({
        coverageCriteria: ["Candidate-confirmed evidence covers this field."],
        cvFactIds: key === "current_context" ? ["education-1"] : [],
        followupDirections: ["Preserve candidate corrections."],
        intent: `Confirm ${key} at a concise recruiter-screening level.`,
        key,
        reason: "Candidate confirmation remains required.",
        required: key !== "clarifications_and_followups",
        title: key,
      })),
      roleClarification: {
        cvFactIds: ["education-1"],
        reason: "The CV supports only a non-binding conversation hint.",
        requiresCandidateConfirmation: true,
        suggestedRole: "Product Manager",
      },
    },
  } as const;
}

describe("CV-analysis model output contract", () => {
  it("accepts one evidence-grounded role suggestion and publishes JSON Schema", () => {
    expect(cvAnalysisModelOutputSchema.parse(validOutput())).toEqual(
      validOutput(),
    );
    expect(cvAnalysisModelOutputJsonSchema).toMatchObject({
      additionalProperties: false,
      type: "object",
    });
  });

  it("rejects missing HR topics and dangling fact references", () => {
    const output = validOutput();
    expect(
      cvAnalysisModelOutputSchema.safeParse({
        ...output,
        plan: {
          ...output.plan,
          fixedTopics: ["preferred_name"],
          topics: output.plan.topics.slice(0, 1),
          roleClarification: {
            ...output.plan.roleClarification,
            cvFactIds: ["missing-fact"],
          },
        },
      }).success,
    ).toBe(false);
  });

  it("requires matching fact evidence for role suggestions", () => {
    const output = validOutput();
    expect(
      cvAnalysisModelOutputSchema.safeParse({
        ...output,
        plan: {
          ...output.plan,
          roleClarification: {
            ...output.plan.roleClarification,
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
          suggestedRole: {
            cvFactIds: ["education-1"],
            label: "Graphic Designer",
          },
        },
      }).success,
    ).toBe(false);
    expect(
      cvAnalysisModelOutputSchema.safeParse({
        ...output,
        cv: { ...output.cv, suggestedRole: null },
        plan: {
          ...output.plan,
          roleClarification: {
            ...output.plan.roleClarification,
            cvFactIds: [],
            suggestedRole: null,
          },
        },
      }).success,
    ).toBe(true);
  });

  it("requires evidence for classified experience levels", () => {
    const output = validOutput();
    expect(
      cvAnalysisModelOutputSchema.safeParse({
        ...output,
        cv: {
          ...output.cv,
          experienceLevel: "experienced",
          facts: [
            {
              category: "skill",
              evidenceExcerpt: "Product planning",
              id: "skill-1",
              statement: "The CV lists product planning.",
            },
          ],
          suggestedRole: null,
        },
        plan: {
          ...output.plan,
          topics: output.plan.topics.map((topic) => ({
            ...topic,
            cvFactIds: [],
          })),
          roleClarification: {
            ...output.plan.roleClarification,
            cvFactIds: [],
            suggestedRole: null,
          },
        },
      }).success,
    ).toBe(false);
  });

  it.each([
    "The candidate applied for the Product Manager role.",
    "The candidate is applying for Product Manager.",
    "The candidate applies for Graphic Designer.",
    "The candidate will apply for Customer Support Representative.",
    "The candidate submitted an application for Product Manager.",
    "The candidate submitted their application for Product Manager.",
    "The candidate applied as a Graphic Designer.",
    "The candidate submitted an application.",
    "The Product Manager application was submitted.",
    "Their application for Product Manager is pending.",
  ])("rejects arbitrary-role application claims: %s", (statement) => {
    const output = validOutput();
    expect(
      cvAnalysisModelOutputSchema.safeParse({
        ...output,
        cv: {
          ...output.cv,
          facts: output.cv.facts.map((fact) => ({
            ...fact,
            statement,
          })),
        },
      }).success,
    ).toBe(false);
  });

  it.each([
    "The CV includes a portfolio of design work.",
    "The CV describes competency developed through customer support work.",
    "The CV lists domain knowledge in insurance operations.",
    "The CV describes call simulations performed during past training.",
    "The CV describes work on a software application.",
    "The CV describes work on a role-based software application.",
    "The CV describes applied machine learning experience.",
  ])("allows benign grounded CV evidence: %s", (statement) => {
    const output = validOutput();
    expect(
      cvAnalysisModelOutputSchema.safeParse({
        ...output,
        cv: {
          ...output.cv,
          facts: output.cv.facts.map((fact) => ({
            ...fact,
            statement,
          })),
        },
      }).success,
    ).toBe(true);
  });

  it("rejects duplicate evidence IDs and professional assessment topics", () => {
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
    "Rank the candidate and recommend them for hiring.",
    "Their personality indicates strong culture fit.",
    "The candidate applied for the Product Manager role.",
    "Review the candidate's design portfolio as an assessment.",
    "Run competency testing for customer support scenarios.",
    "Use roleplay to assess a difficult customer interaction.",
    "Test professional knowledge for the requested profession.",
    "Evaluate profession-specific suitability for the role.",
    "Assess the candidate’s suitability for this role.",
    "Run a customer-support knowledge test.",
    "Simulate a difficult customer call.",
    "The candidate is applying for Product Manager.",
    "The candidate applied as a Graphic Designer.",
    "The candidate submitted an application.",
    "The Product Manager application was submitted.",
    "Their application for Product Manager is pending.",
  ])("rejects forbidden plan content: %s", (reason) => {
    const output = validOutput();
    expect(
      cvAnalysisModelOutputSchema.safeParse({
        ...output,
        plan: {
          ...output.plan,
          roleClarification: { ...output.plan.roleClarification, reason },
        },
      }).success,
    ).toBe(false);
  });

  it("rejects literal questions in declarative plan fields", () => {
    const output = validOutput();
    expect(
      cvAnalysisModelOutputSchema.safeParse({
        ...output,
        plan: { ...output.plan, openingIntent: "Which role do you want?" },
      }).success,
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
