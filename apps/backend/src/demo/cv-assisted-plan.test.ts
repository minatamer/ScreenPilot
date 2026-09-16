import {
  cvAnalysisOutputSchema,
  cvEvidenceModelOutputSchema,
  normalizeCvEvidenceModelOutput,
} from "@screenpilot/contracts/ai/cv-analysis-output";
import { normalizedCvSchema } from "@screenpilot/contracts/interview/normalized-cv";
import {
  FIXED_TOPIC_KEYS,
  UNIVERSAL_TOPIC_KEYS,
} from "@screenpilot/contracts/interview/screening-plan";
import { describe, expect, it } from "vitest";

import { createCvAssistedPlan } from "./cv-assisted-plan.js";

const cv = normalizedCvSchema.parse({
  ambiguities: [],
  displayName: "Mira Solen",
  displayNameEvidence: "Mira Solen",
  experienceLevel: "graduate",
  facts: [
    {
      category: "education",
      evidenceExcerpt: "Recent graduate",
      id: "education-1",
      statement: "The CV describes recent education.",
    },
    {
      category: "location",
      evidenceExcerpt: "Based in Cairo",
      id: "location-1",
      statement: "The CV states a Cairo location.",
    },
  ],
  headline: "Recent graduate",
  suggestedRole: {
    cvFactIds: ["education-1"],
    label: "Product Manager",
  },
});

describe("createCvAssistedPlan", () => {
  it("builds every universal HR topic locally and synchronizes the role hint", () => {
    const plan = createCvAssistedPlan(cv);

    expect(plan.branch).toBe("graduate");
    expect(plan.fixedTopics).toEqual([...FIXED_TOPIC_KEYS]);
    expect(plan.topics.map((topic) => topic.key)).toEqual([
      ...UNIVERSAL_TOPIC_KEYS,
    ]);
    expect(plan.roleClarification).toMatchObject({
      cvFactIds: ["education-1"],
      suggestedRole: "Product Manager",
    });
    expect(
      plan.topics.find((topic) => topic.key === "location_work_arrangement")
        ?.cvFactIds,
    ).toEqual(["location-1"]);
    expect(cvAnalysisOutputSchema.parse({ cv, plan })).toEqual({ cv, plan });
  });

  it("uses no dangling references and never converts evidence into custom topics", () => {
    const plan = createCvAssistedPlan(cv);
    const knownFactIds = new Set(cv.facts.map((fact) => fact.id));
    const referencedFactIds = [
      ...plan.roleClarification.cvFactIds,
      ...plan.topics.flatMap((topic) => topic.cvFactIds),
    ];

    expect(referencedFactIds.every((factId) => knownFactIds.has(factId))).toBe(
      true,
    );
    expect(JSON.stringify(plan)).not.toMatch(
      /coding challenge|portfolio review|roleplay|professional knowledge|system design|framework trivia/i,
    );
  });

  it.each([
    ["graduate", "graduate", false],
    ["junior", "unclear", true],
    ["experienced", "unclear", true],
  ] as const)(
    "carries education-only %s evidence through the final boundary as %s",
    (modelLevel, expectedLevel, shouldRecordDowngrade) => {
      const cvText = "Mira Solen\nRecent product management graduate";
      const modelOutput = cvEvidenceModelOutputSchema.parse({
        cv: {
          ambiguities: [],
          displayName: "Mira Solen",
          displayNameEvidence: "Mira Solen",
          experienceLevel: modelLevel,
          facts: [
            {
              category: "education",
              evidenceExcerpt: "Recent product management graduate",
              id: "education-1",
              statement:
                "The CV describes a recent product management graduate.",
            },
          ],
          headline: "Recent product management graduate",
          suggestedRole: null,
        },
      });
      const normalized = normalizeCvEvidenceModelOutput(cvText, modelOutput);
      const plan = createCvAssistedPlan(normalized.cv);

      expect(normalized.cv.experienceLevel).toBe(expectedLevel);
      expect(
        normalized.appliedRuleIds.includes(
          "downgraded_unsupported_experience_level",
        ),
      ).toBe(shouldRecordDowngrade);
      expect(
        cvAnalysisOutputSchema.safeParse({ cv: normalized.cv, plan }).success,
      ).toBe(true);
    },
  );
});
