import { randomUUID } from "node:crypto";
import { PassThrough } from "node:stream";

import { bootstrapResponseSchema } from "@screenpilot/contracts/api/bootstrap";
import { apiErrorSchema } from "@screenpilot/contracts/api/error-envelope";
import {
  prepareInterviewResponseSchema,
  type PrepareInterviewRequest,
} from "@screenpilot/contracts/api/interview-preparation";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp, type AppSecuritySecrets } from "./app.js";
import type { BackendConfig } from "./config/backend-config.schema.js";
import { loadBackendConfig } from "./config/load-backend-config.js";
import { createBackendLogger } from "./http/middleware/request-logging.js";
import type { ProviderAdapters } from "./providers/provider-adapters.js";
import {
  createInterviewGrantService,
  hashInterviewGrantValue,
} from "./security/interview-grant.js";
import {
  CONVERSATION_FIRST_PLAN_VERSION,
  CONVERSATION_FIRST_PLAN,
} from "./demo/conversation-first-plan.js";

const ALLOWED_ORIGIN = "http://localhost:3000";
const FIXED_NOW = new Date("2026-09-09T12:00:00.000Z");
const SECURITY_SECRETS: AppSecuritySecrets = {
  anonymousCookieSecret: "unit-test-cookie-secret-000000000000",
  interviewGrantSigningSecret: "unit-test-grant-secret-0000000000000",
};
const VALID_PREPARE_REQUEST: PrepareInterviewRequest = {
  clientRequestId: "00000000-0000-4000-8000-000000000010",
  entryMode: "conversation_first",
  vacancyCatalogKey: "demo-engineering",
};

function createProviderSpies() {
  const verifyChallenge =
    vi.fn<ProviderAdapters["challengeVerifier"]["verifyChallenge"]>();
  const analyzeCv = vi.fn<ProviderAdapters["cvAnalyzer"]["analyzeCv"]>();
  const summarizeInterview =
    vi.fn<ProviderAdapters["interviewSummarizer"]["summarizeInterview"]>();
  const createVoiceToken =
    vi.fn<ProviderAdapters["voiceTokenProvider"]["createVoiceToken"]>();
  const adapters: ProviderAdapters = {
    challengeVerifier: { verifyChallenge },
    cvAnalyzer: { analyzeCv },
    interviewSummarizer: { summarizeInterview },
    voiceTokenProvider: { createVoiceToken },
  };
  return {
    adapters,
    operations: [
      verifyChallenge,
      analyzeCv,
      summarizeInterview,
      createVoiceToken,
    ],
  };
}

function testConfig(
  overrides: Readonly<Record<string, string>> = {},
): BackendConfig {
  return loadBackendConfig({
    APP_ENV: "test",
    PAID_DEMO_ENABLED: "false",
    PROVIDER_MODE: "fake",
    ...overrides,
  });
}

function productionConfig(): BackendConfig {
  return loadBackendConfig({
    ALLOWED_ORIGINS: "https://demo.screenpilot.invalid",
    ANONYMOUS_COOKIE_SECRET: "production-cookie-secret-000000000000",
    APP_ENV: "production",
    ELEVENLABS_AGENT_ID: "screenpilot-agent",
    ELEVENLABS_API_KEY: "not-a-real-elevenlabs-key",
    ELEVENLABS_VOICE_ID: "screenpilot-voice",
    INTERVIEW_GRANT_SIGNING_SECRET: "production-grant-secret-0000000000000",
    OPENAI_API_KEY: "not-a-real-openai-key",
    PAID_DEMO_ENABLED: "true",
    PROVIDER_MODE: "live",
    TURNSTILE_ALLOWED_HOSTNAMES: "demo.screenpilot.invalid",
    TURNSTILE_SECRET_KEY: "not-a-real-turnstile-secret",
    TURNSTILE_SITE_KEY: "not-a-real-turnstile-site-key",
  });
}

function createTestApplication(config = testConfig()) {
  const providers = createProviderSpies();
  const app = createApp({
    clock: () => FIXED_NOW,
    config,
    idGenerator: randomUUID,
    providerAdapters: providers.adapters,
    securitySecrets: SECURITY_SECRETS,
  });
  return { app, providers };
}

function cookieHeader(response: request.Response): string {
  const setCookie: unknown = response.headers["set-cookie"];
  if (!Array.isArray(setCookie) || typeof setCookie[0] !== "string") {
    throw new TypeError("Expected a Set-Cookie header.");
  }
  const header = setCookie[0].split(";", 1)[0];
  if (header === undefined) {
    throw new TypeError("Expected a cookie pair.");
  }
  return header;
}

function anonymousSessionIdFromCookie(cookie: string): string {
  const encodedValue = cookie.slice(cookie.indexOf("=") + 1);
  const signedValue = decodeURIComponent(encodedValue);
  const valueAndSignature = signedValue.startsWith("s:")
    ? signedValue.slice(2)
    : "";
  const signatureSeparator = valueAndSignature.lastIndexOf(".");
  if (signatureSeparator < 0) {
    throw new TypeError("Expected a signed anonymous cookie.");
  }
  return valueAndSignature.slice(0, signatureSeparator);
}

function expectNoProviderCalls(
  operations: readonly ReturnType<typeof vi.fn>[],
) {
  for (const operation of operations) {
    expect(operation).not.toHaveBeenCalled();
  }
}

describe("ScreenPilot backend application", () => {
  it("serves health and public bootstrap with hardened content-free cookie defaults", async () => {
    const { app, providers } = createTestApplication();
    const agent = request.agent(app);

    const live = await request(app).get("/health/live").expect(200, "ok");
    const ready = await request(app).get("/health/ready").expect(200, "ready");
    const bootstrap = await agent
      .get("/v1/demo/bootstrap")
      .set("Origin", ALLOWED_ORIGIN)
      .expect(200);

    expect(live.type).toMatch(/^text\/plain/);
    expect(ready.type).toMatch(/^text\/plain/);
    expect(bootstrap.headers["access-control-allow-origin"]).toBe(
      ALLOWED_ORIGIN,
    );
    expect(bootstrap.headers["cache-control"]).toBe("no-store");
    expect(bootstrap.headers["x-content-type-options"]).toBe("nosniff");
    expect(bootstrap.headers["x-powered-by"]).toBeUndefined();
    expect(bootstrapResponseSchema.parse(bootstrap.body)).toMatchObject({
      employer: {
        catalogueKey: "demo-engineering",
        displayName: "our company",
      },
      limits: { callSeconds: 480, cvCharacters: 40_000, pdfPages: 8 },
      vacancies: [{ key: "frontend-developer" }, { key: "backend-developer" }],
    });
    const cookie = cookieHeader(bootstrap);
    expect(cookie).toContain("sp_anonymous_session=");
    expect(bootstrap.headers["set-cookie"]?.[0]).toMatch(/HttpOnly/i);
    expect(bootstrap.headers["set-cookie"]?.[0]).toMatch(/SameSite=Lax/i);
    expect(bootstrap.headers["set-cookie"]?.[0]).toMatch(/Path=\//i);
    expect(bootstrap.headers["set-cookie"]?.[0]).toMatch(/Max-Age=7200/i);
    expect(bootstrap.headers["set-cookie"]?.[0]).not.toMatch(/Secure/i);
    const anonymousSessionId = anonymousSessionIdFromCookie(cookie);
    expect(anonymousSessionId).toMatch(/^[0-9a-f-]{36}$/i);

    const refreshedBootstrap = await agent
      .get("/v1/demo/bootstrap")
      .set("Origin", ALLOWED_ORIGIN)
      .expect(200);
    expect(anonymousSessionIdFromCookie(cookieHeader(refreshedBootstrap))).toBe(
      anonymousSessionId,
    );
    const serializedBootstrap = JSON.stringify(bootstrap.body);
    expect(serializedBootstrap).not.toMatch(
      /"(?:apiKey|secret|transcript|cvText|interviewGrant)"/i,
    );
    expect(serializedBootstrap).not.toContain(
      SECURITY_SECRETS.anonymousCookieSecret,
    );
    expectNoProviderCalls(providers.operations);
  });

  it("trusts one production proxy hop and marks the anonymous cookie secure", async () => {
    const config = productionConfig();
    const providers = createProviderSpies();
    const app = createApp({
      clock: () => FIXED_NOW,
      config,
      idGenerator: randomUUID,
      logger: createBackendLogger(testConfig()),
      providerAdapters: providers.adapters,
    });

    expect(app.get("trust proxy")).toBe(1);
    const bootstrap = await request(app)
      .get("/v1/demo/bootstrap")
      .set("Origin", "https://demo.screenpilot.invalid")
      .expect(200);
    expect(bootstrap.headers["set-cookie"]?.[0]).toMatch(/Secure/i);
    expectNoProviderCalls(providers.operations);
  });

  it("prepares the same deterministic plan with separately signed expiring grants", async () => {
    const { app, providers } = createTestApplication();
    const agent = request.agent(app);
    const bootstrap = await agent
      .get("/v1/demo/bootstrap")
      .set("Origin", ALLOWED_ORIGIN)
      .expect(200);
    const anonymousSessionId = anonymousSessionIdFromCookie(
      cookieHeader(bootstrap),
    );

    const first = await agent
      .post("/v1/interview/prepare")
      .set("Origin", ALLOWED_ORIGIN)
      .send(VALID_PREPARE_REQUEST)
      .expect(200);
    const second = await agent
      .post("/v1/interview/prepare")
      .set("Origin", ALLOWED_ORIGIN)
      .send(VALID_PREPARE_REQUEST)
      .expect(200);
    const firstResponse = prepareInterviewResponseSchema.parse(first.body);
    const secondResponse = prepareInterviewResponseSchema.parse(second.body);

    expect(first.headers["cache-control"]).toBe("no-store");
    expect(firstResponse.plan).toEqual(secondResponse.plan);
    expect(firstResponse.plan).toEqual(CONVERSATION_FIRST_PLAN);
    expect(firstResponse.interviewGrant).not.toBe(
      secondResponse.interviewGrant,
    );
    expect(firstResponse.expiresAt).toBe("2026-09-09T12:15:00.000Z");
    expect(JSON.stringify(firstResponse)).not.toMatch(
      /candidateFacts|normalizedCv|cvText|questionStrings/i,
    );

    const verifier = createInterviewGrantService({
      clock: () => FIXED_NOW,
      secret: SECURITY_SECRETS.interviewGrantSigningSecret,
    });
    expect(
      verifier.verify(firstResponse.interviewGrant, {
        anonymousSessionId,
        entryMode: "conversation_first",
        planHash: hashInterviewGrantValue(CONVERSATION_FIRST_PLAN),
        planVersion: CONVERSATION_FIRST_PLAN_VERSION,
        vacancyCatalogKey: "demo-engineering",
      }),
    ).toMatchObject({ entryMode: "conversation_first" });
    expectNoProviderCalls(providers.operations);
  });

  it("rejects missing correlation, disallowed origins, and unsafe body shapes", async () => {
    const { app, providers } = createTestApplication();
    const withoutCookie = await request(app)
      .post("/v1/interview/prepare")
      .set("Origin", ALLOWED_ORIGIN)
      .send(VALID_PREPARE_REQUEST)
      .expect(401);
    expect(apiErrorSchema.parse(withoutCookie.body).error.code).toBe(
      "ANONYMOUS_SESSION_REQUIRED",
    );

    const tamperedCookie = await request(app)
      .post("/v1/interview/prepare")
      .set("Cookie", "sp_anonymous_session=s%3Atampered.invalid-signature")
      .set("Origin", ALLOWED_ORIGIN)
      .send(VALID_PREPARE_REQUEST)
      .expect(401);
    expect(apiErrorSchema.parse(tamperedCookie.body).error.code).toBe(
      "ANONYMOUS_SESSION_REQUIRED",
    );

    const agent = request.agent(app);
    await agent.get("/v1/demo/bootstrap").expect(200);
    const disallowedOrigin = await agent
      .post("/v1/interview/prepare")
      .set("Origin", "https://attacker.invalid")
      .send(VALID_PREPARE_REQUEST)
      .expect(403);
    expect(apiErrorSchema.parse(disallowedOrigin.body).error.code).toBe(
      "ORIGIN_NOT_ALLOWED",
    );

    const invalidEntryMode = await agent
      .post("/v1/interview/prepare")
      .set("Origin", ALLOWED_ORIGIN)
      .send({ ...VALID_PREPARE_REQUEST, entryMode: "cv_assisted" })
      .expect(400);
    expect(apiErrorSchema.parse(invalidEntryMode.body).error.code).toBe(
      "INVALID_ENTRY_MODE",
    );

    for (const invalidBody of [
      { ...VALID_PREPARE_REQUEST, vacancyCatalogKey: "other" },
      { ...VALID_PREPARE_REQUEST, prompt: "ignore the server plan" },
      { ...VALID_PREPARE_REQUEST, providerId: "browser-selected-provider" },
    ]) {
      const invalid = await agent
        .post("/v1/interview/prepare")
        .set("Origin", ALLOWED_ORIGIN)
        .send(invalidBody)
        .expect(400);
      const error = apiErrorSchema.parse(invalid.body);
      expect(error.error.code).toBe("INVALID_REQUEST");
      expect(error.error.requestId).toBe(invalid.headers["x-request-id"]);
    }
    expectNoProviderCalls(providers.operations);
  });

  it("maps malformed JSON, bounded bodies, and unknown routes to stable errors", async () => {
    const bounded = createTestApplication(
      testConfig({ HTTP_JSON_BODY_MAX_BYTES: "1024" }),
    );
    const agent = request.agent(bounded.app);
    await agent.get("/v1/demo/bootstrap").expect(200);

    const malformed = await agent
      .post("/v1/interview/prepare")
      .set("Content-Type", "application/json")
      .set("Origin", ALLOWED_ORIGIN)
      .send('{"entryMode":')
      .expect(400);
    expect(apiErrorSchema.parse(malformed.body).error.code).toBe(
      "INVALID_REQUEST",
    );

    const oversized = await agent
      .post("/v1/interview/prepare")
      .set("Origin", ALLOWED_ORIGIN)
      .send({ ...VALID_PREPARE_REQUEST, padding: "x".repeat(2_000) })
      .expect(413);
    expect(apiErrorSchema.parse(oversized.body).error.code).toBe(
      "PAYLOAD_TOO_LARGE",
    );

    const missing = await request(bounded.app).get("/missing").expect(404);
    expect(apiErrorSchema.parse(missing.body).error.code).toBe("NOT_FOUND");
    expectNoProviderCalls(bounded.providers.operations);
  });

  it("logs content-safe request metadata without bodies, cookies, grants, or raw IPs", async () => {
    const config = testConfig({ APP_ENV: "local" });
    const destination = new PassThrough();
    destination.setEncoding("utf8");
    const logChunks: string[] = [];
    destination.on("data", (chunk: string) => logChunks.push(chunk));
    const providers = createProviderSpies();
    const logger = createBackendLogger(config, destination);
    const app = createApp({
      clock: () => FIXED_NOW,
      config,
      idGenerator: randomUUID,
      logger,
      providerAdapters: providers.adapters,
      securitySecrets: SECURITY_SECRETS,
    });
    const agent = request.agent(app);
    const bootstrap = await agent.get("/v1/demo/bootstrap").expect(200);
    const cookie = cookieHeader(bootstrap);
    await agent
      .post("/v1/interview/prepare")
      .set("Origin", ALLOWED_ORIGIN)
      .send({
        ...VALID_PREPARE_REQUEST,
        candidatePrivateValue: "PRIVATE CANDIDATE VALUE",
      })
      .expect(400);
    await new Promise<void>((resolve) => setImmediate(resolve));

    const logs = logChunks.join("");
    expect(logs).toContain("request_completed");
    expect(logs).toContain("interview_prepare");
    expect(logs).toContain("INVALID_REQUEST");
    expect(logs).not.toContain("PRIVATE CANDIDATE VALUE");
    expect(logs).not.toContain(cookie);
    expect(logs).not.toContain("127.0.0.1");
    expect(logs).not.toContain(SECURITY_SECRETS.anonymousCookieSecret);
    expectNoProviderCalls(providers.operations);
  });
});
