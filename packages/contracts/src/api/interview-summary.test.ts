import { describe, expect, it } from "vitest";

import {
  FIXED_TOPIC_KEYS,
  UNIVERSAL_TOPIC_KEYS,
} from "../interview/screening-plan.js";
import { summarizeInterviewRequestSchema } from "./interview-summary.js";

const plan = {
  entryMode: "conversation_first",
  openingIntent: "Begin a concise recruiter screening conversation.",
  branch: "discovery",
  roleClarification: {
    suggestedRole: null,
    reason: "The candidate supplies role context or remains undecided.",
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

const occurredAt = "2026-09-21T09:00:00.000Z";

function validRequest() {
  return {
    interviewGrant: "signed-test-grant",
    turnstileToken: "single-use-challenge",
    entryMode: "conversation_first",
    plan,
    transcript: [
      {
        id: "turn-role",
        sequence: 1,
        speaker: "candidate",
        status: "final",
        text: "I would like to discuss Graphic Designer roles.",
        occurredAt,
      },
      {
        id: "turn-interviewer",
        sequence: 2,
        speaker: "interviewer",
        status: "final",
        text: "Tell me about your current context.",
        occurredAt,
      },
      {
        id: "turn-context",
        sequence: 3,
        speaker: "candidate",
        status: "final",
        text: "I currently support a small in-house design team.",
        occurredAt,
      },
    ],
    insights: [
      {
        id: "insight-role",
        category: "role_preference",
        label: "Requested role",
        value: "Graphic Designer",
        source: "Candidate",
        status: "confirmed",
        evidenceTurnIds: ["turn-role"],
        cvFactIds: [],
        createdAt: occurredAt,
        updatedAt: occurredAt,
      },
      {
        id: "insight-context",
        category: "current_context",
        label: "Current context",
        value: "Supports a small in-house design team",
        source: "Candidate",
        status: "confirmed",
        evidenceTurnIds: ["turn-context"],
        cvFactIds: [],
        createdAt: occurredAt,
        updatedAt: occurredAt,
      },
    ],
    topicProgress: [
      {
        topicKey: "role_preference",
        status: "covered",
        evidenceTurnIds: ["turn-role"],
        updatedAt: occurredAt,
      },
    ],
  } as const;
}

describe("summarizeInterviewRequestSchema", () => {
  it("accepts bounded candidate evidence with matching mode and plan", () => {
    expect(
      summarizeInterviewRequestSchema.safeParse(validRequest()).success,
    ).toBe(true);
  });

  it("accepts only plan-bound CV provenance in CV-assisted mode", () => {
    const request = validRequest();
    const cvPlan = {
      ...plan,
      entryMode: "cv_assisted",
      branch: "mixed",
      roleClarification: {
        ...plan.roleClarification,
        suggestedRole: "Graphic Designer",
        cvFactIds: ["cv-fact-role"],
      },
      topics: plan.topics.map((topic) =>
        topic.key === "current_context"
          ? { ...topic, cvFactIds: ["cv-fact-context"] }
          : topic,
      ),
    } as const;
    const cvInsight = {
      ...request.insights[1],
      source: "CV",
      evidenceTurnIds: [],
      cvFactIds: ["cv-fact-context"],
    } as const;
    expect(
      summarizeInterviewRequestSchema.safeParse({
        ...request,
        entryMode: "cv_assisted",
        plan: cvPlan,
        insights: [cvInsight],
      }).success,
    ).toBe(true);
    expect(
      summarizeInterviewRequestSchema.safeParse({
        ...request,
        entryMode: "cv_assisted",
        plan: cvPlan,
        insights: [{ ...cvInsight, cvFactIds: ["unknown-cv-fact"] }],
      }).success,
    ).toBe(false);
  });

  it("rejects conversation-first CV provenance and unresolved evidence", () => {
    const request = validRequest();
    for (const source of ["CV", "CV + Candidate"] as const) {
      expect(
        summarizeInterviewRequestSchema.safeParse({
          ...request,
          insights: [
            {
              ...request.insights[1],
              source,
              evidenceTurnIds: source === "CV" ? [] : ["turn-context"],
              cvFactIds: ["cv-fact-1"],
            },
          ],
        }).success,
      ).toBe(false);
    }
    expect(
      summarizeInterviewRequestSchema.safeParse({
        ...request,
        insights: request.insights.map((insight) =>
          insight.id === "insight-context"
            ? { ...insight, evidenceTurnIds: ["missing-turn"] }
            : insight,
        ),
      }).success,
    ).toBe(false);
    expect(
      summarizeInterviewRequestSchema.safeParse({
        ...request,
        topicProgress: [
          {
            ...request.topicProgress[0],
            evidenceTurnIds: ["turn-interviewer"],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects partial, duplicate, and over-budget transcript input", () => {
    const request = validRequest();
    expect(
      summarizeInterviewRequestSchema.safeParse({
        ...request,
        transcript: request.transcript.map((turn, index) =>
          index === 0 ? { ...turn, status: "partial" } : turn,
        ),
      }).success,
    ).toBe(false);
    expect(
      summarizeInterviewRequestSchema.safeParse({
        ...request,
        transcript: [request.transcript[0], request.transcript[0]],
      }).success,
    ).toBe(false);
    expect(
      summarizeInterviewRequestSchema.safeParse({
        ...request,
        insights: [],
        topicProgress: [],
        transcript: Array.from({ length: 8 }, (_, index) => ({
          id: `turn-${String(index)}`,
          sequence: index,
          speaker: "candidate",
          status: "final",
          text: "x".repeat(4_000),
          occurredAt,
        })),
      }).success,
    ).toBe(false);
  });

  it("requires evidence for every progressed topic", () => {
    const request = validRequest();
    expect(
      summarizeInterviewRequestSchema.safeParse({
        ...request,
        topicProgress: [
          {
            ...request.topicProgress[0],
            evidenceTurnIds: [],
          },
        ],
      }).success,
    ).toBe(false);
  });
});
