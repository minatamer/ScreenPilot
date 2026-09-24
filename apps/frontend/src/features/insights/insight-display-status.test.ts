import type { InsightCard } from "@screenpilot/contracts/interview/insight-card";
import { describe, expect, it } from "vitest";

import { resolveInsightDisplayStatus } from "./insight-display-status";

const NOW = "2026-09-24T08:00:00.000Z";

const candidateQuestion: InsightCard = {
  id: "candidate-question-4",
  category: "candidate_question",
  label: "Candidate question",
  value: "What onboarding support is available?",
  source: "Candidate",
  status: "confirmed",
  evidenceTurnIds: ["turn-4"],
  cvFactIds: [],
  createdAt: NOW,
  updatedAt: NOW,
};

const humanFollowup: InsightCard = {
  id: "follow-up-4",
  category: "follow_up_needed",
  label: "Human follow-up",
  value: "A recruiter must confirm the unsupported onboarding details.",
  source: "Candidate",
  status: "needs_clarification",
  evidenceTurnIds: ["turn-4"],
  cvFactIds: [],
  createdAt: NOW,
  updatedAt: NOW,
};

describe("resolveInsightDisplayStatus", () => {
  it("marks a candidate question unresolved when its human follow-up cites the same turn", () => {
    expect(
      resolveInsightDisplayStatus(candidateQuestion, [
        candidateQuestion,
        humanFollowup,
      ]),
    ).toBe("needs_clarification");
  });

  it("keeps an answered or unrelated candidate question confirmed", () => {
    expect(
      resolveInsightDisplayStatus(candidateQuestion, [candidateQuestion]),
    ).toBe("confirmed");
    expect(
      resolveInsightDisplayStatus(candidateQuestion, [
        candidateQuestion,
        { ...humanFollowup, evidenceTurnIds: ["turn-9"] },
      ]),
    ).toBe("confirmed");
  });
});
