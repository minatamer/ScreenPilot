import {
  insightCardSchema,
  type InsightCard,
  type InsightCategory,
} from "@screenpilot/contracts/interview/insight-card";
import type {
  NormalizedCv,
  NormalizedCvFact,
} from "@screenpilot/contracts/interview/normalized-cv";

import { INSIGHT_CATEGORY_METADATA } from "./insight-category-metadata";

type CvSeedDefinition = Readonly<{
  category: InsightCategory;
  fact: NormalizedCvFact | undefined;
}>;

export function createCvInsightSeeds(
  cv: NormalizedCv,
  occurredAt: string,
): readonly InsightCard[] {
  const suggestedRoleFactIds = new Set(cv.suggestedRole?.cvFactIds ?? []);
  const firstFact = (
    categories: readonly NormalizedCvFact["category"][],
    excludeSuggestedRole = false,
  ) =>
    cv.facts.find(
      (fact) =>
        categories.includes(fact.category) &&
        (!excludeSuggestedRole || !suggestedRoleFactIds.has(fact.id)),
    );
  const seeds: readonly CvSeedDefinition[] = [
    {
      category: "current_context",
      fact: firstFact(["education"]),
    },
    {
      category: "relevant_experience",
      fact: firstFact(["experience", "project"]),
    },
    {
      category: "strongest_areas",
      fact: firstFact(["skill"], true),
    },
  ];

  return seeds.flatMap(({ category, fact }) =>
    fact
      ? [
          insightCardSchema.parse({
            id: `insight-${category}`,
            category,
            label: INSIGHT_CATEGORY_METADATA[category].label,
            value: fact.statement,
            source: "CV",
            status: "confirmed",
            evidenceTurnIds: [],
            cvFactIds: [fact.id],
            createdAt: occurredAt,
            updatedAt: occurredAt,
          }),
        ]
      : [],
  );
}
