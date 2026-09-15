import { describe, expect, it } from "vitest";

import { createCvAnalysisResponseFixture } from "@/test/cv-analysis.fixture";

import { createCvInsightSeeds } from "./seed-cv-insights";

const NOW = "2026-09-15T08:00:00.000Z";

describe("createCvInsightSeeds", () => {
  it("seeds only bounded normalized facts with CV provenance", () => {
    const response = createCvAnalysisResponseFixture({
      suggestedRole: "Product Manager",
    });
    const insights = createCvInsightSeeds(response.cv, NOW);

    expect(insights).toEqual([
      expect.objectContaining({
        category: "relevant_experience",
        source: "CV",
        status: "confirmed",
        evidenceTurnIds: [],
        cvFactIds: ["experience-1"],
      }),
    ]);
    expect(
      insights.some((insight) =>
        insight.cvFactIds.includes("role-direction-1"),
      ),
    ).toBe(false);
  });

  it("maps education, experience, and non-role skills without seeding role preference", () => {
    const response = createCvAnalysisResponseFixture({ suggestedRole: null });
    const cv = {
      ...response.cv,
      facts: [
        {
          id: "education-1",
          category: "education" as const,
          statement: "Recently completed a product-design course.",
          evidenceExcerpt: "Product-design course, 2026",
        },
        ...response.cv.facts,
        {
          id: "skill-2",
          category: "skill" as const,
          statement: "Lists customer research and prototyping.",
          evidenceExcerpt: "Customer research, prototyping",
        },
      ],
    };
    const insights = createCvInsightSeeds(cv, NOW);

    expect(insights.map((insight) => insight.category)).toEqual([
      "current_context",
      "relevant_experience",
      "strongest_areas",
    ]);
    expect(
      insights.some((insight) => insight.category === "role_preference"),
    ).toBe(false);
  });
});
