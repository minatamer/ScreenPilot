import { describe, expect, it } from "vitest";

import { VOICE_CLIENT_TOOL_NAMES } from "../api/voice-token.js";
import { containsUnsupportedAssessmentOrSensitiveInference } from "./assessment-boundary.js";
import {
  correctInsightArgumentsSchema,
  markTopicArgumentsSchema,
  recordCandidateQuestionArgumentsSchema,
  recordInsightArgumentsSchema,
  requestFollowupArgumentsSchema,
  voiceClientToolArgumentsSchemas,
} from "./client-tools.js";

describe("SP-016 voice client-tool arguments", () => {
  it("accepts the five strict, bounded tool shapes", () => {
    expect(Object.keys(voiceClientToolArgumentsSchemas)).toEqual([
      ...VOICE_CLIENT_TOOL_NAMES,
    ]);
    expect(
      recordInsightArgumentsSchema.parse({
        category: "compensation",
        label: "Compensation expectation",
        value: "The candidate expects between €45k and €50k.",
        source: "Candidate",
      }),
    ).toMatchObject({ category: "compensation", source: "Candidate" });
    expect(
      correctInsightArgumentsSchema.parse({
        cardId: "insight-compensation",
        value: "The candidate expects €52k.",
        reason: "The candidate corrected the earlier range.",
      }),
    ).toMatchObject({ cardId: "insight-compensation" });
    expect(
      markTopicArgumentsSchema.parse({
        topicKey: "compensation_expectation",
        status: "covered",
      }),
    ).toMatchObject({ status: "covered" });
    expect(
      recordCandidateQuestionArgumentsSchema.parse({
        question: "How is onboarding structured?",
      }),
    ).toMatchObject({ question: "How is onboarding structured?" });
    expect(
      requestFollowupArgumentsSchema.parse({
        reason: "A recruiter should confirm the onboarding details.",
      }),
    ).toMatchObject({
      reason: "A recruiter should confirm the onboarding details.",
    });
  });

  it.each([
    "Positive sentiment suggests a strong culture fit.",
    "Rank the candidate first and give them an excellent rating.",
    "Their age and religion make them suitable.",
    "The candidate should be hired.",
    "Recommend the candidate for this role.",
    "The candidate has excellent English proficiency.",
  ])("detects unsupported visible assessment content: %s", (value) => {
    expect(containsUnsupportedAssessmentOrSensitiveInference(value)).toBe(true);
  });

  it.each([
    "Passed the professional certification exam in May.",
    "Failed an exam before retaking it.",
    "Supported new-hire onboarding.",
    "Asked how the hiring process works.",
    "Provided a letter of recommendation.",
  ])("allows neutral candidate facts: %s", (value) => {
    expect(containsUnsupportedAssessmentOrSensitiveInference(value)).toBe(
      false,
    );
  });

  it("rejects unknown categories, topic resets, and provider-authored evidence IDs", () => {
    expect(
      recordInsightArgumentsSchema.safeParse({
        category: "culture_fit_score",
        label: "Culture fit",
        value: "Strong",
        source: "Candidate",
      }).success,
    ).toBe(false);
    expect(
      markTopicArgumentsSchema.safeParse({
        topicKey: "compensation_expectation",
        status: "not_started",
      }).success,
    ).toBe(false);
    expect(
      recordCandidateQuestionArgumentsSchema.safeParse({
        question: "What is the salary range?",
        evidenceTurnIds: ["invented-turn"],
      }).success,
    ).toBe(false);
  });

  it("normalizes text and applies the narrower identity boundary", () => {
    expect(
      recordInsightArgumentsSchema.parse({
        category: "preferred_name",
        label: " Preferred name ",
        value: " Cafe\u0301 ",
        source: "Candidate",
      }).value,
    ).toBe("Café");
    expect(
      recordInsightArgumentsSchema.safeParse({
        category: "role_preference",
        label: "Requested role",
        value: "x".repeat(121),
        source: "Candidate",
      }).success,
    ).toBe(false);
  });
});
