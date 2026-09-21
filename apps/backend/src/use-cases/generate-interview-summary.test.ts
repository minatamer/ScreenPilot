import type { SummarizeInterviewRequest } from "@screenpilot/contracts/api/interview-summary";
import { describe, expect, it, vi } from "vitest";

import { TURNSTILE_ACTIONS } from "../config/provider-mode.js";
import {
  createInterviewGrantService,
  hashInterviewGrantValue,
} from "../security/interview-grant.js";
import {
  createSummaryFixture,
  createSummaryFixtureInput,
} from "../test/interview-summary-fixtures.js";
import type { InterviewSummaryInput } from "./ports/interview-summarizer.js";
import { createGenerateInterviewSummary } from "./generate-interview-summary.js";

const CLOCK = () => new Date("2026-09-21T09:00:00.000Z");
const ANONYMOUS_SESSION_ID = "00000000-0000-4000-8000-000000000020";

function dependencies(
  input = createSummaryFixtureInput(),
  options: {
    admission?: "allowed" | "capacity_reached" | "rate_limited";
    challengeSuccess?: boolean;
    enabled?: boolean;
  } = {},
) {
  const grantService = createInterviewGrantService({
    clock: CLOCK,
    secret: "unit-test-grant-secret-0000000000000",
  });
  const sharedGrantBinding = {
    anonymousSessionId: ANONYMOUS_SESSION_ID,
    grantId: "00000000-0000-4000-8000-000000000021",
    planHash: hashInterviewGrantValue(input.plan),
    planVersion: "summary-test-v1",
    ttlSeconds: 900,
  } as const;
  const grant = grantService.issue(
    input.entryMode === "conversation_first"
      ? { ...sharedGrantBinding, entryMode: "conversation_first" }
      : {
          ...sharedGrantBinding,
          cvAnalysisHash: hashInterviewGrantValue("summary-test-cv"),
          entryMode: "cv_assisted",
        },
  );
  const verifyChallenge = vi.fn(() =>
    Promise.resolve({
      action: options.challengeSuccess === false ? null : "interview_summary",
      errorCodes:
        options.challengeSuccess === false
          ? ["invalid-input-response"]
          : ([] as string[]),
      hostname:
        options.challengeSuccess === false ? null : "test.screenpilot.invalid",
      success: options.challengeSuccess ?? true,
    }),
  );
  const summarizeInterview = vi.fn((summaryInput: InterviewSummaryInput) =>
    Promise.resolve({
      summary: createSummaryFixture(summaryInput),
      usage: {
        cachedInputTokens: 20,
        inputTokens: 200,
        outputTokens: 100,
      },
    }),
  );
  const generate = createGenerateInterviewSummary({
    admission: () => options.admission ?? "allowed",
    enabled: options.enabled ?? true,
    grantService,
    summarizer: { summarizeInterview },
    verifier: { verifyChallenge },
  });
  const request: SummarizeInterviewRequest = {
    interviewGrant: grant.token,
    turnstileToken: "single-use-summary-challenge",
    ...input,
  };
  return { generate, request, summarizeInterview, verifyChallenge };
}

describe("generateInterviewSummary", () => {
  it("validates the grant and challenge before returning grounded usage", async () => {
    const fixture = dependencies();

    const result = await fixture.generate(
      fixture.request,
      ANONYMOUS_SESSION_ID,
    );

    expect(result.summary.rolePreference).toMatchObject({
      label: "Graphic Designer",
    });
    expect(result.usage).toEqual({
      cachedInputTokens: 20,
      estimatedCostUsd: 0.0005865,
      inputTokens: 200,
      outputTokens: 100,
    });
    expect(fixture.verifyChallenge).toHaveBeenCalledWith(
      {
        expectedAction: TURNSTILE_ACTIONS.interviewSummary,
        token: fixture.request.turnstileToken,
      },
      undefined,
    );
    expect(fixture.summarizeInterview).toHaveBeenCalledOnce();
  });

  it.each([
    ["disabled", { enabled: false }, "CAPACITY_REACHED"],
    ["rate limited", { admission: "rate_limited" as const }, "RATE_LIMITED"],
    [
      "at capacity",
      { admission: "capacity_reached" as const },
      "CAPACITY_REACHED",
    ],
    ["challenge rejected", { challengeSuccess: false }, "TURNSTILE_REJECTED"],
  ])(
    "fails %s without calling the summary provider",
    async (_name, options, code) => {
      const fixture = dependencies(createSummaryFixtureInput(), options);

      await expect(
        fixture.generate(fixture.request, ANONYMOUS_SESSION_ID),
      ).rejects.toMatchObject({ code });
      expect(fixture.summarizeInterview).not.toHaveBeenCalled();
    },
  );

  it("rejects a mismatched plan binding before Turnstile", async () => {
    const fixture = dependencies();
    const originalPlan = fixture.request.plan;

    await expect(
      fixture.generate(
        {
          ...fixture.request,
          plan: {
            ...originalPlan,
            openingIntent: "A different valid opening intent.",
          },
        },
        ANONYMOUS_SESSION_ID,
      ),
    ).rejects.toMatchObject({ code: "INTERVIEW_GRANT_INVALID" });
    expect(fixture.verifyChallenge).not.toHaveBeenCalled();
    expect(fixture.summarizeInterview).not.toHaveBeenCalled();
  });

  it("fails invalid provider evidence without mutating local retry input", async () => {
    const fixture = dependencies();
    const originalTranscript = structuredClone(fixture.request.transcript);
    fixture.summarizeInterview.mockResolvedValueOnce({
      summary: {
        ...createSummaryFixture(fixture.request),
        confirmedFacts: [
          {
            statement: "An unsupported provider claim.",
            evidenceTurnIds: ["invented-turn"],
          },
        ],
      },
      usage: {
        cachedInputTokens: 0,
        inputTokens: 100,
        outputTokens: 50,
      },
    });

    await expect(
      fixture.generate(fixture.request, ANONYMOUS_SESSION_ID),
    ).rejects.toMatchObject({ code: "SUMMARY_FAILED", retryable: true });
    expect(fixture.request.transcript).toEqual(originalTranscript);
    expect(fixture.request.insights).not.toHaveLength(0);
  });
});
