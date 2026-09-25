import { randomUUID } from "node:crypto";
import { PassThrough } from "node:stream";

import { apiErrorSchema } from "@screenpilot/contracts/api/error-envelope";
import { prepareInterviewResponseSchema } from "@screenpilot/contracts/api/interview-preparation";
import { summarizeInterviewResponseSchema } from "@screenpilot/contracts/api/interview-summary";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp, type AppSecuritySecrets } from "../../app.js";
import { loadBackendConfig } from "../../config/load-backend-config.js";
import {
  OpenAiHttpClient,
  OpenAiRequestError,
  OpenAiStructuredOutputError,
} from "../../providers/openai/openai-client.js";
import { createProviderAdapters } from "../../providers/provider-adapters.js";
import {
  createSummaryFixture,
  createSummaryFixtureInput,
} from "../../test/interview-summary-fixtures.js";
import type { InterviewSummaryInput } from "../../use-cases/ports/interview-summarizer.js";
import type { ChallengeVerificationResult } from "../../use-cases/ports/challenge-verifier.js";
import { createBackendLogger } from "../middleware/request-logging.js";

const ALLOWED_ORIGIN = "http://localhost:3000";
const FIXED_NOW = new Date("2026-09-21T09:00:00.000Z");
const SECURITY_SECRETS: AppSecuritySecrets = {
  anonymousCookieSecret: "unit-test-cookie-secret-000000000000",
  interviewGrantSigningSecret: "unit-test-grant-secret-0000000000000",
};
const PREPARE_REQUEST = {
  clientRequestId: "00000000-0000-4000-8000-000000000020",
  entryMode: "conversation_first",
} as const;

function fakeConfig(overrides: Readonly<Record<string, string>> = {}) {
  return loadBackendConfig({
    APP_ENV: "test",
    PAID_DEMO_ENABLED: "false",
    PROVIDER_MODE: "fake",
    ...overrides,
  });
}

function disabledLiveConfig() {
  return loadBackendConfig({
    ALLOWED_ORIGINS: ALLOWED_ORIGIN,
    ANONYMOUS_COOKIE_SECRET: SECURITY_SECRETS.anonymousCookieSecret,
    APP_ENV: "test",
    ELEVENLABS_AGENT_ID: "test-agent",
    ELEVENLABS_API_KEY: "not-a-real-elevenlabs-key",
    ELEVENLABS_VOICE_ID: "test-voice",
    INTERVIEW_GRANT_SIGNING_SECRET:
      SECURITY_SECRETS.interviewGrantSigningSecret,
    OPENAI_API_KEY: "not-a-real-openai-key",
    PAID_DEMO_ENABLED: "false",
    PROVIDER_MODE: "live",
    TURNSTILE_ALLOWED_HOSTNAMES: "test.screenpilot.invalid",
    TURNSTILE_SECRET_KEY: "not-a-real-turnstile-secret",
    TURNSTILE_SITE_KEY: "not-a-real-turnstile-site-key",
  });
}

function providerSpies() {
  const verifyChallenge = vi.fn((): Promise<ChallengeVerificationResult> =>
    Promise.resolve({
      action: "interview_summary",
      errorCodes: [] as string[],
      hostname: "test.screenpilot.invalid",
      success: true,
    }),
  );
  const summarizeInterview = vi.fn((input: InterviewSummaryInput) =>
    Promise.resolve({
      summary: createSummaryFixture(input),
      usage: {
        cachedInputTokens: 100,
        inputTokens: 1_000,
        outputTokens: 500,
      },
    }),
  );
  return {
    adapters: {
      challengeVerifier: { verifyChallenge },
      cvAnalyzer: { analyzeCv: vi.fn() },
      interviewSummarizer: { summarizeInterview },
      voiceTokenProvider: { createVoiceToken: vi.fn() },
    },
    summarizeInterview,
    verifyChallenge,
  };
}

function createTestApp(
  providers = providerSpies(),
  options: {
    admission?: () => "allowed" | "capacity_reached" | "rate_limited";
    config?: ReturnType<typeof fakeConfig>;
    logger?: ReturnType<typeof createBackendLogger>;
  } = {},
) {
  return {
    app: createApp({
      clock: () => FIXED_NOW,
      config: options.config ?? fakeConfig(),
      idGenerator: randomUUID,
      ...(options.logger ? { logger: options.logger } : {}),
      providerAdapters: providers.adapters,
      securitySecrets: SECURITY_SECRETS,
      ...(options.admission ? { summaryAdmission: options.admission } : {}),
    }),
    providers,
  };
}

async function prepareGrant(agent: ReturnType<typeof request.agent>) {
  await agent.get("/v1/demo/bootstrap").expect(200);
  const response = await agent
    .post("/v1/interview/prepare")
    .set("Origin", ALLOWED_ORIGIN)
    .send(PREPARE_REQUEST)
    .expect(200);
  return prepareInterviewResponseSchema.parse(response.body).interviewGrant;
}

async function prepareGrantBeforeKillSwitch() {
  const { app } = createTestApp();
  const bootstrap = await request(app).get("/v1/demo/bootstrap").expect(200);
  const setCookie: unknown = bootstrap.headers["set-cookie"];
  if (!Array.isArray(setCookie) || typeof setCookie[0] !== "string") {
    throw new TypeError("Expected a signed anonymous-session cookie.");
  }
  const cookie = setCookie[0].split(";", 1)[0];
  if (cookie === undefined) {
    throw new TypeError("Expected an anonymous-session cookie pair.");
  }
  const response = await request(app)
    .post("/v1/interview/prepare")
    .set("Cookie", cookie)
    .set("Origin", ALLOWED_ORIGIN)
    .send(PREPARE_REQUEST)
    .expect(200);
  return {
    cookie,
    interviewGrant: prepareInterviewResponseSchema.parse(response.body)
      .interviewGrant,
  };
}

function summaryRequest(
  interviewGrant: string,
  input = createSummaryFixtureInput(),
) {
  return {
    interviewGrant,
    turnstileToken: "screenpilot-fake-turnstile-pass",
    ...input,
  };
}

function correctedRoleFixture() {
  const input = createSummaryFixtureInput({ roleLabel: "Product Manager" });
  const roleInsight = input.insights.find(
    (insight) => insight.category === "role_preference",
  );
  if (roleInsight === undefined) {
    throw new Error("The role fixture is incomplete.");
  }
  input.transcript.push({
    id: "turn-role-original",
    sequence: input.transcript.length + 1,
    speaker: "candidate",
    status: "final",
    text: "I first mentioned Graphic Designer, then corrected the role.",
    occurredAt: "2026-09-21T09:01:00.000Z",
  });
  roleInsight.status = "corrected";
  roleInsight.correctionReason = "The candidate corrected the role label.";
  roleInsight.evidenceTurnIds = [
    "turn-role-original",
    ...roleInsight.evidenceTurnIds,
  ];
  return input;
}

function failedLiveScenarioFixture() {
  const input = createSummaryFixtureInput({ includeFollowup: true });
  const questionTurn = input.transcript.find(
    (turn) => turn.id === "turn-candidate_questions",
  );
  if (!questionTurn) {
    throw new Error("The candidate-question fixture is incomplete.");
  }
  questionTurn.text =
    "How large is the synthetic team and what onboarding is provided?";
  for (const insight of input.insights) {
    if (insight.category === "candidate_question") {
      insight.value = questionTurn.text;
    } else if (insight.category === "follow_up_needed") {
      insight.value =
        "A human recruiter must confirm synthetic team size and onboarding.";
    }
  }
  input.transcript.push(
    {
      id: "pilot-fallback-and-next-question",
      occurredAt: "2026-09-23T09:01:00.000Z",
      sequence: 30,
      speaker: "interviewer",
      status: "final",
      text: "A human recruiter must confirm that. What matters next?",
    },
    {
      id: "candidate-continued-answer",
      occurredAt: "2026-09-23T09:01:05.000Z",
      sequence: 31,
      speaker: "candidate",
      status: "final",
      text: "Mentorship and clear priorities matter most.",
    },
    {
      id: "pilot-final-question",
      occurredAt: "2026-09-23T09:01:10.000Z",
      sequence: 31,
      speaker: "interviewer",
      status: "final",
      text: "Any final questions?",
    },
    {
      id: "candidate-final-no",
      occurredAt: "2026-09-23T09:01:15.000Z",
      sequence: 32,
      speaker: "candidate",
      status: "final",
      text: "No.",
    },
  );
  return input;
}

describe("POST /v1/interview/summary", () => {
  it("returns one no-store evidence-linked summary with coarse usage", async () => {
    const { app, providers } = createTestApp();
    const agent = request.agent(app);
    const input = summaryRequest(await prepareGrant(agent));

    const result = await agent
      .post("/v1/interview/summary")
      .set("Origin", ALLOWED_ORIGIN)
      .send(input)
      .expect(200);

    const response = summarizeInterviewResponseSchema.parse(result.body);
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(response.summary.rolePreference).toMatchObject({
      label: "Graphic Designer",
      status: "candidate_stated",
    });
    expect(response.usage).toEqual({
      cachedInputTokens: 100,
      estimatedCostUsd: 0.0029325,
      inputTokens: 1_000,
      outputTokens: 500,
    });
    expect(response.limitations).toEqual(response.summary.limitations);
    expect(providers.verifyChallenge).toHaveBeenCalledWith(
      {
        expectedAction: "interview_summary",
        token: input.turnstileToken,
      },
      expect.any(AbortSignal),
    );
    expect(providers.summarizeInterview).toHaveBeenCalledOnce();
    const providerInput = providers.summarizeInterview.mock.calls[0]?.[0];
    expect(providerInput).not.toHaveProperty("interviewGrant");
    expect(providerInput).not.toHaveProperty("turnstileToken");
  });

  it("accepts the realistic failed-live scenario and calls the fake summary adapter once", async () => {
    const { app, providers } = createTestApp();
    const agent = request.agent(app);
    const input = summaryRequest(
      await prepareGrant(agent),
      failedLiveScenarioFixture(),
    );

    const result = await agent
      .post("/v1/interview/summary")
      .set("Origin", ALLOWED_ORIGIN)
      .send(input)
      .expect(200);

    expect(
      summarizeInterviewResponseSchema.safeParse(result.body).success,
    ).toBe(true);
    expect(providers.verifyChallenge).toHaveBeenCalledOnce();
    expect(providers.summarizeInterview).toHaveBeenCalledOnce();
    const providerInput = providers.summarizeInterview.mock.calls[0]?.[0];
    expect(providerInput?.transcript.at(-1)).toMatchObject({
      id: "candidate-final-no",
      text: "No.",
    });
    expect(
      providerInput?.insights.some(
        (insight) => insight.category === "candidate_question",
      ),
    ).toBe(true);
    expect(
      providerInput?.insights.some(
        (insight) => insight.category === "follow_up_needed",
      ),
    ).toBe(true);
  });

  it("rejects origin, cookie, grant binding, and invalid evidence before providers", async () => {
    const { app, providers } = createTestApp();
    const agent = request.agent(app);
    const grant = await prepareGrant(agent);
    const valid = summaryRequest(grant);

    await request(app)
      .post("/v1/interview/summary")
      .set("Origin", ALLOWED_ORIGIN)
      .send(valid)
      .expect(401);
    await agent
      .post("/v1/interview/summary")
      .set("Origin", "https://attacker.invalid")
      .send(valid)
      .expect(403);

    const mismatchedPlan = {
      ...valid,
      plan: {
        ...valid.plan,
        openingIntent: "A different but structurally valid opening intent.",
      },
    };
    const grantFailure = await agent
      .post("/v1/interview/summary")
      .set("Origin", ALLOWED_ORIGIN)
      .send(mismatchedPlan)
      .expect(401);
    expect(apiErrorSchema.parse(grantFailure.body).error.code).toBe(
      "INTERVIEW_GRANT_INVALID",
    );

    const invalidEvidence = {
      ...valid,
      insights: valid.insights.map((insight) =>
        insight.category === "current_context"
          ? { ...insight, evidenceTurnIds: ["missing-turn"] }
          : insight,
      ),
    };
    const evidenceFailure = await agent
      .post("/v1/interview/summary")
      .set("Origin", ALLOWED_ORIGIN)
      .send(invalidEvidence)
      .expect(400);
    expect(apiErrorSchema.parse(evidenceFailure.body).error.code).toBe(
      "INVALID_TRANSCRIPT",
    );

    const invalidSource = {
      ...valid,
      insights: valid.insights.map((insight) =>
        insight.category === "current_context"
          ? {
              ...insight,
              source: "CV",
              evidenceTurnIds: [],
              cvFactIds: ["cv-fact-1"],
            }
          : insight,
      ),
    };
    await agent
      .post("/v1/interview/summary")
      .set("Origin", ALLOWED_ORIGIN)
      .send(invalidSource)
      .expect(400);

    expect(providers.verifyChallenge).not.toHaveBeenCalled();
    expect(providers.summarizeInterview).not.toHaveBeenCalled();
  });

  it("rejects oversized transcript content before Turnstile or OpenAI", async () => {
    const { app, providers } = createTestApp();
    const agent = request.agent(app);
    const grant = await prepareGrant(agent);
    const fixture = createSummaryFixtureInput();
    const input = summaryRequest(grant, {
      ...fixture,
      insights: [],
      topicProgress: [],
      transcript: Array.from({ length: 8 }, (_, index) => ({
        id: `turn-large-${String(index)}`,
        sequence: index,
        speaker: "candidate",
        status: "final",
        text: "x".repeat(4_000),
        occurredAt: "2026-09-21T09:00:00.000Z",
      })),
    });

    const result = await agent
      .post("/v1/interview/summary")
      .set("Origin", ALLOWED_ORIGIN)
      .send(input)
      .expect(400);

    expect(apiErrorSchema.parse(result.body).error.code).toBe(
      "INVALID_TRANSCRIPT",
    );
    expect(providers.verifyChallenge).not.toHaveBeenCalled();
    expect(providers.summarizeInterview).not.toHaveBeenCalled();
  });

  it("rejects failed and replayed Turnstile challenges before OpenAI", async () => {
    const providers = providerSpies();
    providers.verifyChallenge
      .mockResolvedValueOnce({
        action: "interview_summary",
        errorCodes: [],
        hostname: "test.screenpilot.invalid",
        success: true,
      })
      .mockResolvedValueOnce({
        action: null,
        errorCodes: ["timeout-or-duplicate"],
        hostname: null,
        success: false,
      });
    const { app } = createTestApp(providers);
    const agent = request.agent(app);
    const input = summaryRequest(await prepareGrant(agent));

    await agent
      .post("/v1/interview/summary")
      .set("Origin", ALLOWED_ORIGIN)
      .send(input)
      .expect(200);
    const replay = await agent
      .post("/v1/interview/summary")
      .set("Origin", ALLOWED_ORIGIN)
      .send(input)
      .expect(403);

    expect(apiErrorSchema.parse(replay.body).error.code).toBe(
      "TURNSTILE_REJECTED",
    );
    expect(providers.summarizeInterview).toHaveBeenCalledOnce();
  });

  it.each([
    ["invalid token", ["invalid-input-response"]],
    ["wrong action", ["action-mismatch"]],
    ["wrong hostname", ["hostname-mismatch"]],
  ])("rejects a Turnstile %s before OpenAI", async (_name, errorCodes) => {
    const providers = providerSpies();
    providers.verifyChallenge.mockResolvedValueOnce({
      action: null,
      errorCodes,
      hostname: null,
      success: false,
    });
    const { app } = createTestApp(providers);
    const agent = request.agent(app);
    const input = summaryRequest(await prepareGrant(agent));

    const result = await agent
      .post("/v1/interview/summary")
      .set("Origin", ALLOWED_ORIGIN)
      .send(input)
      .expect(403);

    expect(apiErrorSchema.parse(result.body).error.code).toBe(
      "TURNSTILE_REJECTED",
    );
    expect(providers.summarizeInterview).not.toHaveBeenCalled();
  });

  it.each([
    ["rate_limited", 429, "RATE_LIMITED"],
    ["capacity_reached", 503, "CAPACITY_REACHED"],
  ] as const)(
    "rejects %s admission before external calls",
    async (decision, status, code) => {
      const providers = providerSpies();
      const { app } = createTestApp(providers, {
        admission: () => decision,
      });
      const agent = request.agent(app);
      const input = summaryRequest(await prepareGrant(agent));
      const result = await agent
        .post("/v1/interview/summary")
        .set("Origin", ALLOWED_ORIGIN)
        .send(input)
        .expect(status);

      expect(apiErrorSchema.parse(result.body).error.code).toBe(code);
      expect(providers.verifyChallenge).not.toHaveBeenCalled();
      expect(providers.summarizeInterview).not.toHaveBeenCalled();
    },
  );

  it("keeps live summaries disabled while the paid switch is off", async () => {
    const prepared = await prepareGrantBeforeKillSwitch();
    const providers = providerSpies();
    const { app } = createTestApp(providers, {
      config: disabledLiveConfig(),
    });
    const input = summaryRequest(prepared.interviewGrant);
    const result = await request(app)
      .post("/v1/interview/summary")
      .set("Cookie", prepared.cookie)
      .set("Origin", ALLOWED_ORIGIN)
      .send(input)
      .expect(503);

    expect(apiErrorSchema.parse(result.body).error.code).toBe(
      "CAPACITY_REACHED",
    );
    expect(providers.verifyChallenge).not.toHaveBeenCalled();
    expect(providers.summarizeInterview).not.toHaveBeenCalled();
  });

  it("maps provider timeout safely without logging candidate content", async () => {
    const destination = new PassThrough();
    destination.setEncoding("utf8");
    const logChunks: string[] = [];
    destination.on("data", (chunk: string) => logChunks.push(chunk));
    const config = fakeConfig({ APP_ENV: "local" });
    const providers = providerSpies();
    providers.summarizeInterview.mockRejectedValueOnce(
      new OpenAiRequestError({
        category: "request_timeout",
        durationMs: 30_000,
      }),
    );
    const { app } = createTestApp(providers, {
      config,
      logger: createBackendLogger(config, destination),
    });
    const agent = request.agent(app);
    const input = summaryRequest(await prepareGrant(agent));
    const firstTurn = input.transcript[0];
    if (firstTurn === undefined) {
      throw new Error("The summary fixture requires a transcript turn.");
    }
    input.transcript[0] = {
      ...firstTurn,
      text: "PRIVATE SUMMARY TRANSCRIPT CONTENT",
    };

    const result = await agent
      .post("/v1/interview/summary")
      .set("Origin", ALLOWED_ORIGIN)
      .send(input)
      .expect(503);
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(apiErrorSchema.parse(result.body).error).toMatchObject({
      code: "SUMMARY_FAILED",
      retryable: true,
    });
    const logs = logChunks.join("");
    expect(logs).toContain('"providerType":"request_timeout"');
    expect(logs).toContain('"providerRetryable":true');
    expect(logs).not.toContain("PRIVATE SUMMARY TRANSCRIPT CONTENT");
    expect(logs).not.toContain(input.interviewGrant);
    expect(logs).not.toContain(input.turnstileToken);
  });

  it("logs only content-free structured-output validation diagnostics", async () => {
    const destination = new PassThrough();
    destination.setEncoding("utf8");
    const logChunks: string[] = [];
    destination.on("data", (chunk: string) => logChunks.push(chunk));
    const config = fakeConfig({ APP_ENV: "local" });
    const providers = providerSpies();
    providers.summarizeInterview.mockRejectedValueOnce(
      new OpenAiStructuredOutputError({
        durationMs: 125,
        usage: {
          cachedInputTokens: 0,
          inputTokens: 100,
          outputTokens: 50,
        },
        validationPaths: ["confirmedFacts.0.statement"],
        validationRuleIds: ["schema_invalid_value"],
      }),
    );
    const { app } = createTestApp(providers, {
      config,
      logger: createBackendLogger(config, destination),
    });
    const agent = request.agent(app);
    const input = summaryRequest(await prepareGrant(agent));

    await agent
      .post("/v1/interview/summary")
      .set("Origin", ALLOWED_ORIGIN)
      .send(input)
      .expect(503);
    await new Promise<void>((resolve) => setImmediate(resolve));

    const logs = logChunks.join("");
    expect(logs).toContain(
      '"providerValidationPaths":["confirmedFacts.0.statement"]',
    );
    expect(logs).toContain(
      '"providerValidationRuleIds":["schema_invalid_value"]',
    );
    expect(logs).not.toContain(input.interviewGrant);
    expect(logs).not.toContain(input.turnstileToken);
  });

  it("maps a permanent provider account failure without a Retry-After header", async () => {
    const destination = new PassThrough();
    destination.setEncoding("utf8");
    const logChunks: string[] = [];
    destination.on("data", (chunk: string) => logChunks.push(chunk));
    const config = fakeConfig({ APP_ENV: "local" });
    const providers = providerSpies();
    providers.summarizeInterview.mockRejectedValueOnce(
      new OpenAiRequestError({
        category: "http_non_success",
        durationMs: 27,
        httpStatus: 429,
        providerFailureClass: "billing_or_quota",
        retryable: false,
      }),
    );
    const { app } = createTestApp(providers, {
      config,
      logger: createBackendLogger(config, destination),
    });
    const agent = request.agent(app);
    const input = summaryRequest(await prepareGrant(agent));

    const result = await agent
      .post("/v1/interview/summary")
      .set("Origin", ALLOWED_ORIGIN)
      .send(input)
      .expect(503);
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(apiErrorSchema.parse(result.body).error).toMatchObject({
      code: "SUMMARY_FAILED",
      retryable: false,
    });
    expect(result.headers["retry-after"]).toBeUndefined();
    const logs = logChunks.join("");
    expect(logs).toContain('"providerHttpStatus":429');
    expect(logs).toContain('"providerFailureClass":"billing_or_quota"');
    expect(logs).not.toContain(input.interviewGrant);
    expect(logs).not.toContain(input.turnstileToken);
  });

  it("omits Retry-After zero through provider, use case, and JSON API mapping", async () => {
    const providers = providerSpies();
    const client = new OpenAiHttpClient({
      apiKey: "unit-test-openai-key-not-real",
      fetchImplementation: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "rate_limit_exceeded", type: "requests" },
          }),
          { headers: { "retry-after": "0" }, status: 429 },
        ),
      ),
      model: "gpt-5.4-mini",
      reasoning: "none",
      store: false,
      timeoutMs: 100,
    });
    providers.summarizeInterview.mockImplementationOnce(async () => {
      await client.createStructuredResponse({
        input: "synthetic summary input",
        instructions: "Return the required structure.",
        outputJsonSchema: { type: "object" },
        outputSchemaName: "summary_retry_after_zero",
        parseOutput: (value: unknown) => value,
      });
      throw new Error("Expected the synthetic provider failure.");
    });
    const { app } = createTestApp(providers);
    const agent = request.agent(app);
    const input = summaryRequest(await prepareGrant(agent));

    const result = await agent
      .post("/v1/interview/summary")
      .set("Origin", ALLOWED_ORIGIN)
      .send(input)
      .expect("content-type", /json/u)
      .expect(503);

    const mappedError = apiErrorSchema.parse(result.body).error;
    expect(mappedError).toMatchObject({
      code: "SUMMARY_FAILED",
      retryable: true,
    });
    expect(mappedError).not.toHaveProperty("retryAfterSeconds");
    expect(result.headers["retry-after"]).toBeUndefined();
    expect(providers.summarizeInterview).toHaveBeenCalledOnce();
  });

  it.each([
    ["complete Graphic Designer", createSummaryFixtureInput()],
    [
      "partial",
      createSummaryFixtureInput({
        missingTopicKeys: ["availability", "compensation_expectation"],
      }),
    ],
    [
      "disconnected",
      createSummaryFixtureInput({
        missingTopicKeys: [
          "motivation_and_next_role",
          "location_work_arrangement",
          "availability",
          "compensation_expectation",
          "english_use_context",
          "candidate_questions",
        ],
      }),
    ],
    ["refused compensation", createSummaryFixtureInput()],
    ["uncertain availability", createSummaryFixtureInput()],
    [
      "no candidate question",
      createSummaryFixtureInput({ includeCandidateQuestion: false }),
    ],
    [
      "compound role",
      createSummaryFixtureInput({
        roleLabel: "Graphic Designer and UX Researcher",
      }),
    ],
    ["undecided role", createSummaryFixtureInput({ roleLabel: null })],
    ["corrected role", correctedRoleFixture()],
    [
      "unsupported employer question",
      createSummaryFixtureInput({ includeFollowup: true }),
    ],
  ])("keeps the %s fixture grounded and stateless", async (_name, input) => {
    const config = fakeConfig();
    const app = createApp({
      clock: () => FIXED_NOW,
      config,
      idGenerator: randomUUID,
      providerAdapters: createProviderAdapters(config),
      securitySecrets: SECURITY_SECRETS,
    });
    const agent = request.agent(app);
    const body = summaryRequest(await prepareGrant(agent), input);

    const first = await agent
      .post("/v1/interview/summary")
      .set("Origin", ALLOWED_ORIGIN)
      .send(body)
      .expect(200);
    const second = await agent
      .post("/v1/interview/summary")
      .set("Origin", ALLOWED_ORIGIN)
      .send({ ...body, turnstileToken: "screenpilot-fake-turnstile-pass" })
      .expect(200);

    const firstSummary = summarizeInterviewResponseSchema.parse(first.body);
    const secondSummary = summarizeInterviewResponseSchema.parse(second.body);
    expect(secondSummary.summary).toEqual(firstSummary.summary);
    expect(
      firstSummary.summary.confirmedFacts.flatMap(
        (fact) => fact.evidenceTurnIds,
      ),
    ).not.toContain("invented-turn");
    if (
      input.insights.some((insight) => insight.category === "follow_up_needed")
    ) {
      expect(firstSummary.summary.humanFollowups).not.toHaveLength(0);
    }
  });
});
