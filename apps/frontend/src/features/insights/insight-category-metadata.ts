import type {
  InsightCard,
  InsightCategory,
} from "@screenpilot/contracts/interview/insight-card";

type InsightCategoryMetadata = Readonly<{
  label: string;
  mark: string;
  order: number;
}>;

export const INSIGHT_CATEGORY_METADATA: Readonly<
  Record<InsightCategory, InsightCategoryMetadata>
> = Object.freeze({
  preferred_name: {
    label: "Preferred name",
    mark: "N",
    order: 0,
  },
  role_preference: {
    label: "Role preference",
    mark: "R",
    order: 1,
  },
  current_context: {
    label: "Current context",
    mark: "C",
    order: 2,
  },
  relevant_experience: {
    label: "Relevant experience",
    mark: "E",
    order: 3,
  },
  responsibility: {
    label: "Broad responsibility",
    mark: "B",
    order: 4,
  },
  strongest_areas: {
    label: "Strongest areas",
    mark: "S",
    order: 5,
  },
  team_work_style: {
    label: "Team / work style",
    mark: "T",
    order: 6,
  },
  availability: {
    label: "Availability",
    mark: "A",
    order: 7,
  },
  location_work_arrangement: {
    label: "Location / work arrangement",
    mark: "L",
    order: 8,
  },
  compensation: {
    label: "Compensation expectation",
    mark: "€",
    order: 9,
  },
  english_use: {
    label: "English-use context",
    mark: "EN",
    order: 10,
  },
  motivation: {
    label: "Motivation / next role",
    mark: "M",
    order: 11,
  },
  candidate_question: {
    label: "Candidate question",
    mark: "?",
    order: 12,
  },
  follow_up_needed: {
    label: "Human follow-up",
    mark: "!",
    order: 13,
  },
});

export function compareInsightBoardCards(
  left: InsightCard,
  right: InsightCard,
): number {
  const categoryOrder =
    INSIGHT_CATEGORY_METADATA[left.category].order -
    INSIGHT_CATEGORY_METADATA[right.category].order;
  if (categoryOrder !== 0) {
    return categoryOrder;
  }
  const occurrenceOrder = left.createdAt.localeCompare(right.createdAt);
  return occurrenceOrder !== 0
    ? occurrenceOrder
    : left.id.localeCompare(right.id);
}
