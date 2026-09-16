import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PassThrough } from "node:stream";

import {
  analyzeCvResponseSchema,
  type AnalyzeCvRequest,
} from "@screenpilot/contracts/api/cv-analysis";
import { apiErrorSchema } from "@screenpilot/contracts/api/error-envelope";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp, type AppSecuritySecrets } from "../../app.js";
import { loadBackendConfig } from "../../config/load-backend-config.js";
import { createBackendLogger } from "../middleware/request-logging.js";
import {
  createProviderAdapters,
  type ProviderAdapters,
} from "../../providers/provider-adapters.js";
import {
  OpenAiRequestError,
  OpenAiStructuredOutputError,
} from "../../providers/openai/openai-client.js";
import { TurnstileVerificationError } from "../../providers/turnstile/cloudflare-turnstile-verifier.js";
import { FAKE_TURNSTILE_PASS_TOKEN } from "../../providers/turnstile/fake-turnstile-verifier.js";

const ALLOWED_ORIGIN = "http://localhost:3000";
const FIXED_NOW = new Date("2026-09-11T08:00:00.000Z");
const SECURITY_SECRETS: AppSecuritySecrets = {
  anonymousCookieSecret: "unit-test-cookie-secret-000000000000",
  interviewGrantSigningSecret: "unit-test-grant-secret-0000000000000",
};
const fixtureUrl = new URL(
  "../../../../../tests/fixtures/cv/frontend-leaning.txt",
  import.meta.url,
);

function testConfig() {
  return loadBackendConfig({
    APP_ENV: "test",
    PAID_DEMO_ENABLED: "false",
    PROVIDER_MODE: "fake",
  });
}

function disabledLiveConfig() {
  return loadBackendConfig({
    ALLOWED_ORIGINS: ALLOWED_ORIGIN,
    ANONYMOUS_COOKIE_SECRET: "unit-test-cookie-secret-000000000000",
    APP_ENV: "test",
    ELEVENLABS_AGENT_ID: "test-agent",
    ELEVENLABS_API_KEY: "not-a-real-elevenlabs-key",
    ELEVENLABS_VOICE_ID: "test-voice",
    INTERVIEW_GRANT_SIGNING_SECRET: "unit-test-grant-secret-0000000000000",
    OPENAI_API_KEY: "not-a-real-openai-key",
    PAID_DEMO_ENABLED: "false",
    PROVIDER_MODE: "live",
    TURNSTILE_ALLOWED_HOSTNAMES: "test.screenpilot.invalid",
    TURNSTILE_SECRET_KEY: "not-a-real-turnstile-secret",
    TURNSTILE_SITE_KEY: "not-a-real-turnstile-site-key",
  });
}

async function validRequest(): Promise<AnalyzeCvRequest> {
  return {
    clientRequestId: "00000000-0000-4000-8000-000000000010",
    cvText: await readFile(fixtureUrl, "utf8"),
    turnstileToken: FAKE_TURNSTILE_PASS_TOKEN,
  };
}

function providerSpies(
  challengeResult: Awaited<
    ReturnType<ProviderAdapters["challengeVerifier"]["verifyChallenge"]>
  > = {
    action: "cv_analyze",
    errorCodes: [],
    hostname: "test.screenpilot.invalid",
    success: true,
  },
) {
  const base = createProviderAdapters(testConfig());
  const verifyChallenge = vi.fn(() => Promise.resolve(challengeResult));
  const analyzeCv = vi.fn(base.cvAnalyzer.analyzeCv.bind(base.cvAnalyzer));
  const adapters: ProviderAdapters = {
    ...base,
    challengeVerifier: { verifyChallenge },
    cvAnalyzer: { analyzeCv },
  };
  return { adapters, analyzeCv, verifyChallenge };
}

function createTestApp(
  providers = providerSpies(),
  options: { admission?: () => "allowed" | "rate_limited" } = {},
) {
  return {
    app: createApp({
      clock: () => FIXED_NOW,
      config: testConfig(),
      ...(options.admission === undefined
        ? {}
        : { cvAnalysisAdmission: options.admission }),
      idGenerator: randomUUID,
      providerAdapters: providers.adapters,
      securitySecrets: SECURITY_SECRETS,
    }),
    providers,
  };
}

describe("POST /v1/cv/analyze", () => {
  it("returns a no-store grounded analysis after cookie and Turnstile verification", async () => {
    const { app, providers } = createTestApp();
    const agent = request.agent(app);
    await agent.get("/v1/demo/bootstrap").expect(200);
    const input = await validRequest();

    const result = await agent
      .post("/v1/cv/analyze")
      .set("Origin", ALLOWED_ORIGIN)
      .send(input)
      .expect(200);
    const parsed = analyzeCvResponseSchema.parse(result.body);

    expect(result.headers["cache-control"]).toBe("no-store");
    expect(parsed.cv.displayName).toBe("Tala Venn");
    expect(parsed.plan.entryMode).toBe("cv_assisted");
    expect(parsed.cv.suggestedRole).toMatchObject({
      label: "Frontend Developer",
      cvFactIds: ["role-direction-1"],
    });
    expect(parsed.plan.roleClarification.suggestedRole).toBe(
      "Frontend Developer",
    );
    expect(parsed.expiresAt).toBe("2026-09-11T08:15:00.000Z");
    expect(providers.verifyChallenge).toHaveBeenCalledOnce();
    expect(providers.analyzeCv).toHaveBeenCalledOnce();
    expect(JSON.stringify(result.body)).not.toContain(input.turnstileToken);
  });

  it("rejects origin, cookie, schema, and missing challenge before providers", async () => {
    const { app, providers } = createTestApp();
    const input = await validRequest();

    const missingCookie = await request(app)
      .post("/v1/cv/analyze")
      .set("Origin", ALLOWED_ORIGIN)
      .send(input)
      .expect(401);
    expect(apiErrorSchema.parse(missingCookie.body).error.code).toBe(
      "ANONYMOUS_SESSION_REQUIRED",
    );

    const agent = request.agent(app);
    await agent.get("/v1/demo/bootstrap").expect(200);
    const badOrigin = await agent
      .post("/v1/cv/analyze")
      .set("Origin", "https://attacker.invalid")
      .send(input)
      .expect(403);
    expect(apiErrorSchema.parse(badOrigin.body).error.code).toBe(
      "ORIGIN_NOT_ALLOWED",
    );
    const missingChallenge = await agent
      .post("/v1/cv/analyze")
      .set("Origin", ALLOWED_ORIGIN)
      .send({ ...input, turnstileToken: "" })
      .expect(400);
    expect(apiErrorSchema.parse(missingChallenge.body).error.code).toBe(
      "TURNSTILE_REQUIRED",
    );
    const forbiddenShape = await agent
      .post("/v1/cv/analyze")
      .set("Origin", ALLOWED_ORIGIN)
      .send({ ...input, pdfUrl: "https://example.invalid/private.pdf" })
      .expect(400);
    expect(apiErrorSchema.parse(forbiddenShape.body).error.code).toBe(
      "INVALID_REQUEST",
    );
    for (const invalidBody of [
      { ...input, clientRequestId: "not-a-uuid" },
      { ...input, cvText: "x".repeat(499) },
      { ...input, cvText: "x".repeat(40_001) },
      // Migration guard: the superseded catalogue selector must stay rejected.
      { ...input, vacancyCatalogKey: "arbitrary-employer-role" },
    ]) {
      await agent
        .post("/v1/cv/analyze")
        .set("Origin", ALLOWED_ORIGIN)
        .send(invalidBody)
        .expect(400);
    }
    expect(providers.verifyChallenge).not.toHaveBeenCalled();
    expect(providers.analyzeCv).not.toHaveBeenCalled();
  });

  it.each([
    ["duplicate", ["timeout-or-duplicate"]],
    ["wrong action", ["action-mismatch"]],
    ["wrong hostname", ["hostname-mismatch"]],
  ])("rejects a Turnstile %s without calling OpenAI", async (_label, codes) => {
    const providers = providerSpies({
      action: null,
      errorCodes: codes,
      hostname: null,
      success: false,
    });
    const { app } = createTestApp(providers);
    const agent = request.agent(app);
    await agent.get("/v1/demo/bootstrap").expect(200);
    const result = await agent
      .post("/v1/cv/analyze")
      .set("Origin", ALLOWED_ORIGIN)
      .send(await validRequest())
      .expect(403);

    expect(apiErrorSchema.parse(result.body).error).toMatchObject({
      code: "TURNSTILE_REJECTED",
      retryable: true,
    });
    expect(providers.verifyChallenge).toHaveBeenCalledOnce();
    expect(providers.analyzeCv).not.toHaveBeenCalled();
  });

  it("returns a bounded retry signal when admission denies the request", async () => {
    const providers = providerSpies();
    const { app } = createTestApp(providers, {
      admission: () => "rate_limited",
    });
    const agent = request.agent(app);
    await agent.get("/v1/demo/bootstrap").expect(200);
    const result = await agent
      .post("/v1/cv/analyze")
      .set("Origin", ALLOWED_ORIGIN)
      .send(await validRequest())
      .expect(429);

    expect(apiErrorSchema.parse(result.body).error).toMatchObject({
      code: "RATE_LIMITED",
      retryAfterSeconds: 60,
      retryable: true,
    });
    expect(result.headers["retry-after"]).toBe("60");
    expect(providers.verifyChallenge).not.toHaveBeenCalled();
    expect(providers.analyzeCv).not.toHaveBeenCalled();
  });

  it("keeps live CV analysis disabled when the paid-demo kill switch is off", async () => {
    const providers = providerSpies();
    const app = createApp({
      clock: () => FIXED_NOW,
      config: disabledLiveConfig(),
      idGenerator: randomUUID,
      providerAdapters: providers.adapters,
      securitySecrets: SECURITY_SECRETS,
    });
    const agent = request.agent(app);
    await agent.get("/v1/demo/bootstrap").expect(200);
    const result = await agent
      .post("/v1/cv/analyze")
      .set("Origin", ALLOWED_ORIGIN)
      .send(await validRequest())
      .expect(503);

    expect(apiErrorSchema.parse(result.body).error.code).toBe(
      "CAPACITY_REACHED",
    );
    expect(providers.verifyChallenge).not.toHaveBeenCalled();
    expect(providers.analyzeCv).not.toHaveBeenCalled();
  });

  it("keeps CV text, challenge tokens, and provider output out of logs", async () => {
    const config = loadBackendConfig({
      APP_ENV: "local",
      PAID_DEMO_ENABLED: "false",
      PROVIDER_MODE: "fake",
    });
    const destination = new PassThrough();
    destination.setEncoding("utf8");
    const logChunks: string[] = [];
    destination.on("data", (chunk: string) => logChunks.push(chunk));
    const providers = providerSpies();
    const app = createApp({
      clock: () => FIXED_NOW,
      config,
      idGenerator: randomUUID,
      logger: createBackendLogger(config, destination),
      providerAdapters: providers.adapters,
      securitySecrets: SECURITY_SECRETS,
    });
    const agent = request.agent(app);
    await agent.get("/v1/demo/bootstrap").expect(200);
    const input = await validRequest();
    await agent
      .post("/v1/cv/analyze")
      .set("Origin", ALLOWED_ORIGIN)
      .send(input)
      .expect(200);
    await new Promise<void>((resolve) => setImmediate(resolve));

    const logs = logChunks.join("");
    expect(logs).toContain("cv_analyze");
    expect(logs).not.toContain(input.cvText);
    expect(logs).not.toContain(input.turnstileToken);
    expect(logs).not.toContain("Tala Venn");
  });

  it("logs only content-safe Turnstile diagnostics without changing the API error", async () => {
    const config = loadBackendConfig({
      APP_ENV: "local",
      PAID_DEMO_ENABLED: "false",
      PROVIDER_MODE: "fake",
    });
    const destination = new PassThrough();
    destination.setEncoding("utf8");
    const logChunks: string[] = [];
    destination.on("data", (chunk: string) => logChunks.push(chunk));
    const providers = providerSpies();
    const privateCause = "PRIVATE SITEVERIFY FAILURE DETAIL";
    const verifyChallenge = vi.fn(() =>
      Promise.reject(
        new TurnstileVerificationError({
          category: "response_schema_mismatch",
          cause: new Error(privateCause),
          durationMs: 614,
          schemaMismatchCategory: "success",
        }),
      ),
    );
    const app = createApp({
      clock: () => FIXED_NOW,
      config,
      idGenerator: randomUUID,
      logger: createBackendLogger(config, destination),
      providerAdapters: {
        ...providers.adapters,
        challengeVerifier: { verifyChallenge },
      },
      securitySecrets: SECURITY_SECRETS,
    });
    const agent = request.agent(app);
    await agent.get("/v1/demo/bootstrap").expect(200);
    const input = await validRequest();
    const result = await agent
      .post("/v1/cv/analyze")
      .set("Origin", ALLOWED_ORIGIN)
      .send(input)
      .expect(503);
    await new Promise<void>((resolve) => setImmediate(resolve));

    const publicError = apiErrorSchema.parse(result.body).error;
    expect(publicError).toEqual({
      code: "TURNSTILE_UNAVAILABLE",
      message: "Challenge verification is temporarily unavailable. Try again.",
      requestId: publicError.requestId,
      retryable: true,
    });
    const logEntries = logChunks
      .join("")
      .trim()
      .split("\n")
      .map((entry) => JSON.parse(entry) as Record<string, unknown>);
    expect(
      logEntries.find(
        (entry) => entry["providerFailureCategory"] !== undefined,
      ),
    ).toMatchObject({
      code: "TURNSTILE_UNAVAILABLE",
      msg: "request_failed",
      provider: "turnstile",
      providerDurationMs: 614,
      providerFailureCategory: "response_schema_mismatch",
      providerSchemaMismatchCategory: "success",
      requestId: publicError.requestId,
    });
    const logs = logChunks.join("");
    expect(logs).not.toContain(privateCause);
    expect(logs).not.toContain(input.cvText);
    expect(logs).not.toContain(input.turnstileToken);
    expect(providers.analyzeCv).not.toHaveBeenCalled();
  });

  it("logs only content-safe OpenAI diagnostics through the use-case boundary", async () => {
    const config = loadBackendConfig({
      APP_ENV: "local",
      PAID_DEMO_ENABLED: "false",
      PROVIDER_MODE: "fake",
    });
    const destination = new PassThrough();
    destination.setEncoding("utf8");
    const logChunks: string[] = [];
    destination.on("data", (chunk: string) => logChunks.push(chunk));
    const providers = providerSpies();
    const privateCause = "PRIVATE OPENAI FAILURE DETAIL";
    providers.analyzeCv.mockRejectedValueOnce(
      new OpenAiRequestError({
        category: "http_non_success",
        cause: new Error(privateCause),
        durationMs: 22_100,
        httpStatus: 429,
      }),
    );
    const app = createApp({
      clock: () => FIXED_NOW,
      config,
      idGenerator: randomUUID,
      logger: createBackendLogger(config, destination),
      providerAdapters: providers.adapters,
      securitySecrets: SECURITY_SECRETS,
    });
    const agent = request.agent(app);
    await agent.get("/v1/demo/bootstrap").expect(200);
    const input = await validRequest();
    const result = await agent
      .post("/v1/cv/analyze")
      .set("Origin", ALLOWED_ORIGIN)
      .send(input)
      .expect(503);
    await new Promise<void>((resolve) => setImmediate(resolve));

    const publicError = apiErrorSchema.parse(result.body).error;
    expect(publicError).toEqual({
      code: "PROVIDER_UNAVAILABLE",
      message: "CV analysis is temporarily unavailable. Try again.",
      requestId: publicError.requestId,
      retryable: true,
    });
    const logEntries = logChunks
      .join("")
      .trim()
      .split("\n")
      .map((entry) => JSON.parse(entry) as Record<string, unknown>);
    expect(
      logEntries.find((entry) => entry["provider"] === "openai"),
    ).toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      msg: "request_failed",
      provider: "openai",
      providerDurationMs: 22_100,
      providerFailureCategory: "http_non_success",
      providerHttpStatus: 429,
      requestId: publicError.requestId,
    });
    const logs = logChunks.join("");
    expect(logs).not.toContain(privateCause);
    expect(logs).not.toContain(input.cvText);
    expect(logs).not.toContain(input.turnstileToken);
    expect(providers.analyzeCv).toHaveBeenCalledOnce();
  });

  it("logs structured-output rule IDs and paths without generated values", async () => {
    const config = loadBackendConfig({
      APP_ENV: "local",
      PAID_DEMO_ENABLED: "false",
      PROVIDER_MODE: "fake",
    });
    const destination = new PassThrough();
    destination.setEncoding("utf8");
    const logChunks: string[] = [];
    destination.on("data", (chunk: string) => logChunks.push(chunk));
    const providers = providerSpies();
    const privateGeneratedValue = "PRIVATE GENERATED PROVIDER VALUE";
    providers.analyzeCv.mockRejectedValueOnce(
      new OpenAiStructuredOutputError({
        durationMs: 12_460,
        usage: {
          cachedInputTokens: 0,
          inputTokens: 400,
          outputTokens: 200,
        },
        validationPaths: ["cv.facts.0.category"],
        validationRuleIds: ["schema_invalid_value"],
      }),
    );
    const app = createApp({
      clock: () => FIXED_NOW,
      config,
      idGenerator: randomUUID,
      logger: createBackendLogger(config, destination),
      providerAdapters: providers.adapters,
      securitySecrets: SECURITY_SECRETS,
    });
    const agent = request.agent(app);
    await agent.get("/v1/demo/bootstrap").expect(200);
    const input = await validRequest();
    await agent
      .post("/v1/cv/analyze")
      .set("Origin", ALLOWED_ORIGIN)
      .send(input)
      .expect(503);
    await new Promise<void>((resolve) => setImmediate(resolve));

    const logEntries = logChunks
      .join("")
      .trim()
      .split("\n")
      .map((entry) => JSON.parse(entry) as Record<string, unknown>);
    expect(
      logEntries.find((entry) => entry["provider"] === "openai"),
    ).toMatchObject({
      provider: "openai",
      providerDurationMs: 12_460,
      providerFailureCategory: "structured_output_invalid",
      providerValidationPaths: ["cv.facts.0.category"],
      providerValidationRuleIds: ["schema_invalid_value"],
    });
    const logs = logChunks.join("");
    expect(logs).not.toContain(privateGeneratedValue);
    expect(logs).not.toContain(input.cvText);
    expect(providers.analyzeCv).toHaveBeenCalledOnce();
  });
});
