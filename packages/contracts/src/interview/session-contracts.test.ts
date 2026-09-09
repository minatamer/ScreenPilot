import { describe, expect, it } from "vitest";

import { analyzeCvRequestSchema } from "../api/cv-analysis.js";
import { voiceTokenRequestSchema } from "../api/voice-token.js";
import { insightCardSchema } from "./insight-card.js";
import { screeningPlanSchema } from "./screening-plan.js";
import { transcriptTurnSchema } from "./transcript-turn.js";

const conversationPlan = {
  entryMode: "conversation_first",
  openingIntent: "Begin a concise recruiter screening conversation.",
  branch: "discovery",
  vacancyClarification: {
    confirmedVacancyKeys: [],
    suggestedVacancyKey: null,
    reason: "The candidate must confirm the screening direction.",
    cvFactIds: [],
    requiresCandidateConfirmation: true,
  },
  topics: [
    {
      key: "current_context",
      title: "Current context",
      reason: "Understand the candidate's current professional context.",
      cvFactIds: [],
      applicableVacancyKeys: [],
      intent: "Learn the candidate's current work or study context.",
      coverageCriteria: ["A concise current-context statement is available."],
      followupDirections: [],
      required: true,
    },
  ],
  fixedTopics: ["current_context"],
} as const;

describe("SP-006 cross-boundary contracts", () => {
  it("accepts the approved conversation-first plan and rejects CV references", () => {
    expect(screeningPlanSchema.safeParse(conversationPlan).success).toBe(true);
    expect(
      screeningPlanSchema.safeParse({
        ...conversationPlan,
        vacancyClarification: {
          ...conversationPlan.vacancyClarification,
          cvFactIds: ["fact-1"],
        },
      }).success,
    ).toBe(false);
  });

  it("keeps CV and voice requests strict, bounded, and token-only", () => {
    const validCvRequest = {
      vacancyCatalogKey: "demo-engineering",
      cvText: "x".repeat(500),
      clientRequestId: "2f495240-b35d-4f87-869b-6334d8397c12",
      turnstileToken: "test-challenge-token",
    };

    expect(analyzeCvRequestSchema.safeParse(validCvRequest).success).toBe(true);
    expect(
      analyzeCvRequestSchema.safeParse({
        ...validCvRequest,
        pdfUrl: "https://example.invalid/cv.pdf",
      }).success,
    ).toBe(false);
    expect(
      voiceTokenRequestSchema.safeParse({
        interviewGrant: "signed-test-grant",
        turnstileToken: "test-challenge-token",
        agentId: "browser-must-not-select-this",
      }).success,
    ).toBe(false);
  });

  it("requires bounded transcript and insight evidence shapes", () => {
    expect(
      transcriptTurnSchema.safeParse({
        id: "turn-1",
        sequence: 1,
        speaker: "candidate",
        status: "final",
        text: "I recently completed a frontend internship.",
        occurredAt: "2026-09-09T09:20:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      insightCardSchema.safeParse({
        id: "insight-1",
        category: "current_context",
        label: "Current context",
        value: "Frontend internship",
        source: "Candidate",
        status: "confirmed",
        evidenceTurnIds: ["turn-1"],
        cvFactIds: [],
        createdAt: "2026-09-09T09:20:00.000Z",
        updatedAt: "2026-09-09T09:20:00.000Z",
      }).success,
    ).toBe(true);
  });
});
