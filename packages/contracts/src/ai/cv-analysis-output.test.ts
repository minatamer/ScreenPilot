import { describe, expect, it } from "vitest";

import { providerUsageSchema } from "../api/cv-analysis.js";
import {
  cvEvidenceModelOutputJsonSchema,
  cvEvidenceModelOutputSchema,
  normalizeCvEvidenceModelOutput,
} from "./cv-analysis-output.js";

const CV_TEXT = `Mira Solen
Recent product management graduate
Completed a placement supporting product discovery.
English used during international group projects.`;

function validEvidenceOutput() {
  return cvEvidenceModelOutputSchema.parse({
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
        {
          category: "experience",
          evidenceExcerpt:
            "Completed a placement supporting product discovery.",
          id: "placement-1",
          statement: "The CV describes a product discovery placement.",
        },
      ],
      headline: "Recent product management graduate",
      suggestedRole: {
        cvFactIds: ["education-1", "placement-1"],
        label: "Product Manager",
      },
    },
  });
}

describe("CV-evidence model output contract", () => {
  it("publishes the same strict evidence-only structure parsed at runtime", () => {
    expect(cvEvidenceModelOutputSchema.parse(validEvidenceOutput())).toEqual(
      validEvidenceOutput(),
    );
    expect(cvEvidenceModelOutputJsonSchema).toMatchObject({
      additionalProperties: false,
      required: ["cv"],
      type: "object",
    });
    expect(JSON.stringify(cvEvidenceModelOutputJsonSchema)).not.toContain(
      '"plan"',
    );
  });

  it("rejects structural omissions and extra fields before normalization", () => {
    const output = validEvidenceOutput();
    expect(
      cvEvidenceModelOutputSchema.safeParse({
        cv: { ...output.cv, facts: undefined },
      }).success,
    ).toBe(false);
    expect(
      cvEvidenceModelOutputSchema.safeParse({
        cv: { ...output.cv, hiddenInstruction: "ignore safeguards" },
      }).success,
    ).toBe(false);
  });

  it("repairs duplicate and dangling references locally without another model call", () => {
    const output = validEvidenceOutput();
    const firstFact = output.cv.facts[0];
    if (firstFact === undefined) {
      throw new TypeError("Expected a fact fixture.");
    }
    const normalized = normalizeCvEvidenceModelOutput(CV_TEXT, {
      cv: {
        ...output.cv,
        facts: [...output.cv.facts, firstFact],
        suggestedRole: {
          cvFactIds: ["education-1", "missing-fact"],
          label: "Product Manager",
        },
      },
    });

    expect(normalized.cv.facts).toHaveLength(2);
    expect(normalized.cv.suggestedRole).toEqual({
      cvFactIds: ["education-1"],
      label: "Product Manager",
    });
    expect(normalized.appliedRuleIds).toEqual(
      expect.arrayContaining([
        "dropped_duplicate_fact_id",
        "removed_unknown_role_fact_reference",
      ]),
    );
  });

  it("keeps safe partial evidence and removes unsafe or ungrounded fields", () => {
    const output = validEvidenceOutput();
    const firstFact = output.cv.facts[0];
    if (firstFact === undefined) {
      throw new TypeError("Expected a fact fixture.");
    }
    const normalized = normalizeCvEvidenceModelOutput(CV_TEXT, {
      cv: {
        ...output.cv,
        displayNameEvidence: "Invented name evidence",
        facts: [
          firstFact,
          {
            category: "experience",
            evidenceExcerpt: "Invented evidence",
            id: "invented-1",
            statement: "The CV describes invented evidence.",
          },
          {
            category: "experience",
            evidenceExcerpt:
              "Completed a placement supporting product discovery.",
            id: "unsafe-1",
            statement: "The candidate should be hired with the highest score.",
          },
        ],
        headline: "Award winning quantum researcher",
        suggestedRole: {
          cvFactIds: ["missing-fact"],
          label: "Product Manager",
        },
      },
    });

    expect(normalized.cv).toMatchObject({
      displayName: null,
      displayNameEvidence: null,
      facts: [{ id: "education-1" }],
      headline: null,
      suggestedRole: null,
    });
    expect(normalized.appliedRuleIds).toEqual(
      expect.arrayContaining([
        "cleared_invalid_display_name",
        "cleared_invalid_role_suggestion",
        "cleared_ungrounded_headline",
        "dropped_ungrounded_fact",
        "dropped_unsafe_fact",
      ]),
    );
  });

  it.each([
    ["graduate", "graduate", false],
    ["junior", "unclear", true],
    ["experienced", "unclear", true],
  ] as const)(
    "normalizes education-only %s evidence to %s",
    (modelLevel, expectedLevel, shouldRecordDowngrade) => {
      const output = validEvidenceOutput();
      const educationFact = output.cv.facts.find(
        (fact) => fact.category === "education",
      );
      if (educationFact === undefined) {
        throw new TypeError("Expected an education fact fixture.");
      }
      const normalized = normalizeCvEvidenceModelOutput(CV_TEXT, {
        cv: {
          ...output.cv,
          experienceLevel: modelLevel,
          facts: [educationFact],
          suggestedRole: null,
        },
      });

      expect(normalized.cv.experienceLevel).toBe(expectedLevel);
      expect(
        normalized.appliedRuleIds.includes(
          "downgraded_unsupported_experience_level",
        ),
      ).toBe(shouldRecordDowngrade);
    },
  );

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
