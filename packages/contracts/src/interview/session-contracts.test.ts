import { describe, expect, it } from "vitest";

import { analyzeCvRequestSchema } from "../api/cv-analysis.js";
import { voiceTokenRequestSchema } from "../api/voice-token.js";
import { roleLabelSchema, rolePreferenceSchema } from "./demo-context.js";
import { insightCardSchema } from "./insight-card.js";
import {
  FIXED_TOPIC_KEYS,
  screeningPlanSchema,
  UNIVERSAL_TOPIC_KEYS,
} from "./screening-plan.js";
import { screeningSummarySchema } from "./screening-summary.js";
import { transcriptTurnSchema } from "./transcript-turn.js";

const conversationPlan = {
  entryMode: "conversation_first",
  openingIntent: "Begin a concise recruiter screening conversation.",
  branch: "discovery",
  roleClarification: {
    suggestedRole: null,
    reason: "The candidate must confirm the screening direction.",
    cvFactIds: [],
    requiresCandidateConfirmation: true,
  },
  topics: UNIVERSAL_TOPIC_KEYS.map((key) => ({
    key,
    title: key,
    reason: "Understand one universal HR field.",
    cvFactIds: [],
    intent: "Learn one universal HR field without professional assessment.",
    coverageCriteria: ["Candidate evidence covers this field."],
    followupDirections: [],
    required: key !== "clarifications_and_followups",
  })),
  fixedTopics: [...FIXED_TOPIC_KEYS],
} as const;

describe("SP-006 cross-boundary contracts", () => {
  it("accepts the approved conversation-first plan and rejects CV references", () => {
    expect(screeningPlanSchema.safeParse(conversationPlan).success).toBe(true);
    expect(
      screeningPlanSchema.safeParse({
        ...conversationPlan,
        roleClarification: {
          ...conversationPlan.roleClarification,
          cvFactIds: ["fact-1"],
        },
      }).success,
    ).toBe(false);
    expect(
      screeningPlanSchema.safeParse({
        ...conversationPlan,
        topics: conversationPlan.topics.filter(
          (topic) => topic.key !== "clarifications_and_followups",
        ),
      }).success,
    ).toBe(false);
    expect(
      screeningPlanSchema.safeParse({
        ...conversationPlan,
        topics: conversationPlan.topics.map((topic) =>
          topic.key === "clarifications_and_followups"
            ? { ...topic, required: true }
            : topic,
        ),
      }).success,
    ).toBe(false);
  });

  it("keeps CV and voice requests strict, bounded, and token-only", () => {
    const validCvRequest = {
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

  it("normalizes bounded role labels and preserves one compound label", () => {
    expect(
      roleLabelSchema.parse("  Cafe\u0301 Designer and UX Researcher  "),
    ).toBe("Café Designer and UX Researcher");
    expect(roleLabelSchema.safeParse("Support\u202E Manager").success).toBe(
      false,
    );
    expect(roleLabelSchema.safeParse("x".repeat(121)).success).toBe(false);
    expect(
      rolePreferenceSchema.parse({
        label: "Full Stack Developer",
        status: "candidate_stated",
        evidenceTurnIds: ["turn-2"],
      }),
    ).toMatchObject({ label: "Full Stack Developer" });
    expect(
      rolePreferenceSchema.safeParse({
        label: null,
        status: "candidate_stated",
        evidenceTurnIds: ["turn-2"],
      }).success,
    ).toBe(false);
    expect(
      insightCardSchema.safeParse({
        id: "role-insight",
        category: "role_preference",
        label: "Requested role",
        value: "Support\u202e Manager",
        source: "Candidate",
        status: "confirmed",
        evidenceTurnIds: ["turn-2"],
        cvFactIds: [],
        createdAt: "2026-09-09T09:20:00.000Z",
        updatedAt: "2026-09-09T09:20:00.000Z",
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

  it("reports candidate-stated or undecided role state without vacancy keys", () => {
    const summary = {
      overview: "Key conversation points, organized for review.",
      rolePreference: {
        label: null,
        status: "undecided",
        evidenceTurnIds: ["turn-1"],
      },
      confirmedFacts: [],
      clarifications: [],
      topicsCovered: [],
      topicsNotCovered: [],
      communicationNotes: [],
      candidateQuestions: [],
      humanFollowups: [],
      limitations: ["These AI-organized notes require human review."],
    } as const;

    expect(screeningSummarySchema.parse(summary)).toEqual(summary);
    // Migration guard: the superseded vacancy-key summary envelope is rejected.
    expect(
      screeningSummarySchema.safeParse({
        ...summary,
        rolePreference: {
          requestedLabel: "Graphic Designer",
          screeningVacancyKeys: [],
          evidenceTurnIds: ["turn-1"],
        },
      }).success,
    ).toBe(false);
  });
});
