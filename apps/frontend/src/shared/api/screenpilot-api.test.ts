import { afterEach, describe, expect, it, vi } from "vitest";

import { summarizeInterviewRequestSchema } from "@screenpilot/contracts/api/interview-summary";
import {
  SCREENING_SUMMARY_LIMITATIONS,
  SCREENING_SUMMARY_OVERVIEW,
} from "@screenpilot/contracts/interview/screening-summary";

import { createConversationFirstPlanFixture } from "@/test/conversation-first-plan.fixture";
import { createCvAnalysisResponseFixture } from "@/test/cv-analysis.fixture";

import {
  analyzeCv,
  fetchDemoBootstrap,
  prepareConversationFirst,
  requestVoiceToken,
  ScreenPilotApiError,
  summarizeInterview,
} from "./screenpilot-api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function requestJsonBody(
  options: RequestInit | undefined,
): Record<string, unknown> {
  if (typeof options?.body !== "string") {
    throw new TypeError("Expected a JSON request body.");
  }
  return JSON.parse(options.body) as Record<string, unknown>;
}

function realisticConversationFirstSummaryRequest() {
  const plan = createConversationFirstPlanFixture();
  const occurredAt = "2026-09-23T09:00:00.000Z";
  const transcript = [
    ["pilot-name", 0, "interviewer", "What would you like me to call you?"],
    ["candidate-role", 1, "candidate", "Use Riley and a product role."],
    ["pilot-question", 2, "interviewer", "What would you like clarified?"],
    [
      "candidate-question",
      3,
      "candidate",
      "How large is the team and what onboarding is provided?",
    ],
    [
      "pilot-fallback",
      4,
      "interviewer",
      "A human recruiter must confirm that. What matters in your next role?",
    ],
    [
      "candidate-motivation",
      5,
      "candidate",
      "Clear priorities, mentorship, and collaborative work matter most.",
    ],
    ["pilot-final", 6, "interviewer", "Any final questions?"],
    ["candidate-final-no", 7, "candidate", "No."],
  ].map(([id, sequence, speaker, text]) => ({
    id: String(id),
    occurredAt,
    sequence: Number(sequence),
    speaker: speaker as "candidate" | "interviewer",
    status: "final" as const,
    text: String(text),
  }));
  const insight = (
    id: string,
    category:
      | "role_preference"
      | "candidate_question"
      | "follow_up_needed"
      | "motivation",
    label: string,
    value: string,
    evidenceTurnId: string,
    status: "confirmed" | "needs_clarification" = "confirmed",
  ) => ({
    category,
    createdAt: occurredAt,
    cvFactIds: [],
    evidenceTurnIds: [evidenceTurnId],
    id,
    label,
    source: "Candidate" as const,
    status,
    updatedAt: occurredAt,
    value,
  });
  return {
    entryMode: "conversation_first" as const,
    insights: [
      insight(
        "role",
        "role_preference",
        "Role preference",
        "Product role",
        "candidate-role",
      ),
      insight(
        "question",
        "candidate_question",
        "Candidate question",
        "How large is the team and what onboarding is provided?",
        "candidate-question",
      ),
      insight(
        "followup",
        "follow_up_needed",
        "Human follow-up",
        "A human recruiter must confirm team size and onboarding.",
        "candidate-question",
        "needs_clarification",
      ),
      insight(
        "motivation",
        "motivation",
        "Motivation / next role",
        "Clear priorities, mentorship, and collaborative work",
        "candidate-motivation",
      ),
    ],
    interviewGrant: "signed-interview-grant",
    plan,
    topicProgress: [
      {
        evidenceTurnIds: ["candidate-role"],
        status: "covered" as const,
        topicKey: "role_preference" as const,
        updatedAt: occurredAt,
      },
      {
        evidenceTurnIds: ["candidate-question"],
        status: "covered" as const,
        topicKey: "candidate_questions" as const,
        updatedAt: occurredAt,
      },
      {
        evidenceTurnIds: ["candidate-motivation"],
        status: "covered" as const,
        topicKey: "motivation_and_next_role" as const,
        updatedAt: occurredAt,
      },
    ],
    transcript,
    turnstileToken: "single-use-summary-token",
  };
}

describe("ScreenPilot browser API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("validates bootstrap and uses the shared relative endpoint", async () => {
    const browserFetch = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        abuseProtection: {
          appearance: "interaction-only",
          provider: "cloudflare_turnstile",
          siteKey: "",
        },
        limits: {
          callSeconds: 480,
          cvCharacters: 40_000,
          pdfBytes: 5_242_880,
          pdfPages: 8,
        },
        effectiveMode: "deterministic_fake",
        paidOperationsEnabled: false,
        privacyNoticeVersion: "2026-09-11",
        providerMode: "fake",
        demoContext: {
          kind: "role_agnostic_first_stage_hr_screen",
          roleAvailability: "candidate_selected_synthetic_session_vacancy",
          employerFactsAvailable: false,
        },
      }),
    );
    const controller = new AbortController();

    const response = await fetchDemoBootstrap(controller.signal, browserFetch);

    expect(response.demoContext.employerFactsAvailable).toBe(false);
    expect(browserFetch).toHaveBeenCalledWith(
      "/v1/demo/bootstrap",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      }),
    );
  });

  it("sends only the conversation-first contract and validates its response", async () => {
    const responseBody = {
      plan: createConversationFirstPlanFixture(),
      interviewGrant: "signed-conversation-first-grant",
      expiresAt: "2026-09-11T12:15:00.000Z",
    };
    const browserFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(responseBody));
    const controller = new AbortController();

    await expect(
      prepareConversationFirst(
        "00000000-0000-4000-8000-000000000011",
        controller.signal,
        browserFetch,
      ),
    ).resolves.toEqual(responseBody);
    const options = browserFetch.mock.calls[0]?.[1];
    expect(browserFetch.mock.calls[0]?.[0]).toBe("/v1/interview/prepare");
    expect(requestJsonBody(options)).toEqual({
      clientRequestId: "00000000-0000-4000-8000-000000000011",
      entryMode: "conversation_first",
    });
    expect(options?.method).toBe("POST");
  });

  it("sends only bounded CV text, request ID, and a one-time challenge token", async () => {
    const responseBody = createCvAnalysisResponseFixture();
    const browserFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(responseBody));
    const controller = new AbortController();
    const cvText = "Grounded synthetic CV content. ".repeat(30);

    await expect(
      analyzeCv(
        {
          clientRequestId: "00000000-0000-4000-8000-000000000013",
          cvText,
          turnstileToken: "single-use-token",
        },
        controller.signal,
        browserFetch,
        () => Date.parse("2026-09-12T10:00:00.000Z"),
      ),
    ).resolves.toEqual(responseBody);

    const options = browserFetch.mock.calls[0]?.[1];
    expect(browserFetch.mock.calls[0]?.[0]).toBe("/v1/cv/analyze");
    expect(requestJsonBody(options)).toEqual({
      clientRequestId: "00000000-0000-4000-8000-000000000013",
      cvText: cvText.trim(),
      turnstileToken: "single-use-token",
    });
    expect(options).toMatchObject({
      cache: "no-store",
      credentials: "same-origin",
      method: "POST",
      signal: controller.signal,
    });
  });

  it("requests one private voice authorization through the relative API", async () => {
    const responseBody = {
      conversationId: "conversation-014",
      conversationToken: "short-lived-conversation-token",
    };
    const browserFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(responseBody));
    const controller = new AbortController();

    await expect(
      requestVoiceToken(
        {
          interviewGrant: "signed-interview-grant",
          turnstileToken: "single-use-turnstile-token",
        },
        controller.signal,
        browserFetch,
      ),
    ).resolves.toEqual(responseBody);

    const options = browserFetch.mock.calls[0]?.[1];
    expect(browserFetch.mock.calls[0]?.[0]).toBe("/v1/voice/token");
    expect(requestJsonBody(options)).toEqual({
      interviewGrant: "signed-interview-grant",
      turnstileToken: "single-use-turnstile-token",
    });
    expect(options).toMatchObject({
      cache: "no-store",
      credentials: "same-origin",
      method: "POST",
      signal: controller.signal,
    });
  });

  it("sends bounded local evidence to the relative summary endpoint", async () => {
    const plan = createConversationFirstPlanFixture();
    const request = {
      interviewGrant: "signed-interview-grant",
      turnstileToken: "single-use-summary-token",
      entryMode: "conversation_first" as const,
      plan,
      transcript: [
        {
          id: "candidate-turn-1",
          sequence: 0,
          speaker: "candidate" as const,
          status: "final" as const,
          text: "I am exploring a collaborative product role.",
          occurredAt: "2026-09-21T09:10:00.000Z",
        },
      ],
      insights: [],
      topicProgress: [],
    };
    const responseBody = {
      summary: {
        overview: SCREENING_SUMMARY_OVERVIEW,
        confirmedFacts: [],
        clarifications: [],
        topicsCovered: [],
        topicsNotCovered: [],
        communicationNotes: [],
        candidateQuestions: [],
        humanFollowups: [],
        limitations: [SCREENING_SUMMARY_LIMITATIONS[0]],
      },
      limitations: [],
      usage: {
        inputTokens: 400,
        outputTokens: 180,
        cachedInputTokens: 0,
        estimatedCostUsd: 0.001,
      },
    };
    const browserFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(responseBody));
    const controller = new AbortController();

    await expect(
      summarizeInterview(request, controller.signal, browserFetch),
    ).resolves.toEqual(responseBody);
    const options = browserFetch.mock.calls[0]?.[1];
    expect(browserFetch.mock.calls[0]?.[0]).toBe("/v1/interview/summary");
    expect(requestJsonBody(options)).toEqual(request);
    expect(options).toMatchObject({
      cache: "no-store",
      credentials: "same-origin",
      method: "POST",
      signal: controller.signal,
    });
  });

  it("assembles the realistic failed-live scenario as one schema-valid POST", async () => {
    const input = realisticConversationFirstSummaryRequest();
    expect(summarizeInterviewRequestSchema.safeParse(input).success).toBe(true);
    const responseBody = {
      limitations: [SCREENING_SUMMARY_LIMITATIONS[0]],
      summary: {
        overview: SCREENING_SUMMARY_OVERVIEW,
        confirmedFacts: [],
        clarifications: [],
        topicsCovered: [],
        topicsNotCovered: [],
        communicationNotes: [],
        candidateQuestions: [
          {
            evidenceTurnIds: ["candidate-question"],
            question: "How large is the team and what onboarding is provided?",
          },
        ],
        humanFollowups: [
          {
            evidenceTurnIds: ["candidate-question"],
            reason: "A human recruiter must confirm team size and onboarding.",
          },
        ],
        limitations: [SCREENING_SUMMARY_LIMITATIONS[0]],
      },
      usage: {
        cachedInputTokens: 0,
        estimatedCostUsd: 0.001,
        inputTokens: 400,
        outputTokens: 180,
      },
    };
    const browserFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(responseBody));

    await expect(
      summarizeInterview(input, new AbortController().signal, browserFetch),
    ).resolves.toEqual(responseBody);
    expect(browserFetch).toHaveBeenCalledOnce();
    expect(browserFetch.mock.calls[0]?.[0]).toBe("/v1/interview/summary");
    expect(requestJsonBody(browserFetch.mock.calls[0]?.[1])).toEqual(input);
  });

  it("classifies an invalid local summary request without sending candidate evidence", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {
      // The assertion below inspects the intentionally content-free payload.
    });
    const browserFetch = vi.fn<typeof fetch>();
    const plan = createConversationFirstPlanFixture();

    const failure = await summarizeInterview(
      {
        entryMode: "conversation_first",
        insights: [],
        interviewGrant: "signed-interview-grant",
        plan,
        topicProgress: [],
        transcript: [],
        turnstileToken: "single-use-summary-token",
      },
      new AbortController().signal,
      browserFetch,
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ScreenPilotApiError);
    expect(failure).toMatchObject({
      code: "INVALID_SUMMARY_REQUEST",
      retryable: false,
    });
    expect(browserFetch).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "screenpilot_api_boundary_failure",
      {
        category: "request_validation",
        operation: "interview_summary",
      },
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "single-use-summary-token",
    );
  });

  it("classifies a summary network failure without logging the request", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {
      // The assertion below inspects the intentionally content-free payload.
    });
    const browserFetch = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError("PRIVATE NETWORK DETAIL"));
    const plan = createConversationFirstPlanFixture();
    const failure = await summarizeInterview(
      {
        entryMode: "conversation_first",
        insights: [],
        interviewGrant: "signed-interview-grant",
        plan,
        topicProgress: [],
        transcript: [
          {
            id: "candidate-turn-network",
            occurredAt: "2026-09-23T09:00:00.000Z",
            sequence: 0,
            speaker: "candidate",
            status: "final",
            text: "PRIVATE CANDIDATE EVIDENCE",
          },
        ],
        turnstileToken: "single-use-summary-token",
      },
      new AbortController().signal,
      browserFetch,
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ScreenPilotApiError);
    expect(failure).toMatchObject({
      code: "SUMMARY_UNREACHABLE",
      retryable: true,
    });
    expect(consoleError).toHaveBeenCalledWith(
      "screenpilot_api_boundary_failure",
      { category: "fetch_failure", operation: "interview_summary" },
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toMatch(
      /PRIVATE|single-use-summary-token/u,
    );
  });

  it.each([
    {
      category: "response_envelope_invalid",
      expectedCode: "INVALID_RESPONSE",
      response: new Response("not-json", { status: 503 }),
      retryable: true,
    },
    {
      category: "backend_rejection",
      expectedCode: "SUMMARY_FAILED",
      response: jsonResponse(
        {
          error: {
            code: "SUMMARY_FAILED",
            message: "The summary service needs owner attention.",
            requestId: "request-summary-permanent",
            retryable: false,
          },
        },
        503,
      ),
      retryable: false,
    },
    {
      category: "response_validation",
      expectedCode: "INVALID_SUMMARY_RESPONSE",
      response: jsonResponse({ incomplete: true }),
      retryable: true,
    },
  ])(
    "classifies $category without logging evidence",
    async ({ category, expectedCode, response, retryable }) => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const failure = await summarizeInterview(
        realisticConversationFirstSummaryRequest(),
        new AbortController().signal,
        vi.fn<typeof fetch>().mockResolvedValue(response),
      ).catch((error: unknown) => error);

      expect(failure).toMatchObject({ code: expectedCode, retryable });
      expect(consoleError).toHaveBeenCalledWith(
        "screenpilot_api_boundary_failure",
        expect.objectContaining({ category, operation: "interview_summary" }),
      );
      expect(JSON.stringify(consoleError.mock.calls)).not.toMatch(
        /Riley|team size|onboarding is provided|single-use-summary-token/iu,
      );
    },
  );

  it("rejects incomplete voice authorization responses", async () => {
    const browserFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ conversationId: "id-only" }));

    await expect(
      requestVoiceToken(
        {
          interviewGrant: "signed-interview-grant",
          turnstileToken: "single-use-turnstile-token",
        },
        new AbortController().signal,
        browserFetch,
      ),
    ).rejects.toMatchObject({
      code: "INVALID_VOICE_TOKEN_RESPONSE",
      retryable: true,
    });
  });

  it("rejects incomplete, internally inconsistent, and expired analysis", async () => {
    const invalidFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ plan: { entryMode: "cv_assisted" } }));
    const cvText = "Grounded synthetic CV content. ".repeat(30);
    const request = {
      clientRequestId: "00000000-0000-4000-8000-000000000014",
      cvText,
      turnstileToken: "single-use-token",
    } as const;

    await expect(
      analyzeCv(request, new AbortController().signal, invalidFetch),
    ).rejects.toMatchObject({ code: "INVALID_CV_ANALYSIS_RESPONSE" });

    const inconsistentResponse = createCvAnalysisResponseFixture();
    const inconsistentFetch = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        ...inconsistentResponse,
        plan: {
          ...inconsistentResponse.plan,
          roleClarification: {
            ...inconsistentResponse.plan.roleClarification,
            suggestedRole: "Graphic Designer",
          },
        },
      }),
    );
    await expect(
      analyzeCv(request, new AbortController().signal, inconsistentFetch),
    ).rejects.toMatchObject({ code: "INVALID_CV_ANALYSIS_RESPONSE" });

    const expiredFetch = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        createCvAnalysisResponseFixture({
          expiresAt: "2026-09-12T09:59:59.000Z",
        }),
      ),
    );
    await expect(
      analyzeCv(request, new AbortController().signal, expiredFetch, () =>
        Date.parse("2026-09-12T10:00:00.000Z"),
      ),
    ).rejects.toMatchObject({
      code: "INTERVIEW_GRANT_EXPIRED",
      retryable: true,
    });
  });

  it("surfaces a validated typed error without trusting an arbitrary body", async () => {
    const browserFetch = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "PREPARATION_FAILED",
            message: "Preparation is temporarily unavailable.",
            retryable: true,
            requestId: "request-17",
          },
        },
        503,
      ),
    );

    const failure = await prepareConversationFirst(
      "00000000-0000-4000-8000-000000000012",
      new AbortController().signal,
      browserFetch,
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ScreenPilotApiError);
    expect(failure).toMatchObject({
      code: "PREPARATION_FAILED",
      message: "Preparation is temporarily unavailable.",
      requestId: "request-17",
      retryable: true,
    });
  });
});
