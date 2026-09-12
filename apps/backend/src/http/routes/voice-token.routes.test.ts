import { randomUUID } from "node:crypto";
import { PassThrough } from "node:stream";

import { apiErrorSchema } from "@screenpilot/contracts/api/error-envelope";
import { prepareInterviewResponseSchema } from "@screenpilot/contracts/api/interview-preparation";
import { voiceTokenResponseSchema } from "@screenpilot/contracts/api/voice-token";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp, type AppSecuritySecrets } from "../../app.js";
import { loadBackendConfig } from "../../config/load-backend-config.js";
import type { ProviderAdapters } from "../../providers/provider-adapters.js";
import { createBackendLogger } from "../middleware/request-logging.js";

const ALLOWED_ORIGIN = "http://localhost:3000";
const FIXED_NOW = new Date("2026-09-12T09:00:00.000Z");
const SECURITY_SECRETS: AppSecuritySecrets = {
  anonymousCookieSecret: "unit-test-cookie-secret-000000000000",
  interviewGrantSigningSecret: "unit-test-grant-secret-0000000000000",
};
const PREPARE_REQUEST = {
  clientRequestId: "00000000-0000-4000-8000-000000000014",
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

function providerSpies(
  challengeResult: Awaited<
    ReturnType<ProviderAdapters["challengeVerifier"]["verifyChallenge"]>
  > = {
    action: "voice_token",
    errorCodes: [],
    hostname: "test.screenpilot.invalid",
    success: true,
  },
) {
  const verifyChallenge = vi.fn(() => Promise.resolve(challengeResult));
  const createVoiceToken = vi.fn(() =>
    Promise.resolve({
      conversationId: "conversation-014",
      conversationToken: "short-lived-conversation-token",
    }),
  );
  const adapters: ProviderAdapters = {
    challengeVerifier: { verifyChallenge },
    cvAnalyzer: { analyzeCv: vi.fn() },
    interviewSummarizer: { summarizeInterview: vi.fn() },
    voiceTokenProvider: { createVoiceToken },
  };
  return { adapters, createVoiceToken, verifyChallenge };
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
      ...(options.admission ? { voiceTokenAdmission: options.admission } : {}),
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

function tokenRequest(interviewGrant: string) {
  return {
    interviewGrant,
    turnstileToken: "single-use-voice-challenge",
  };
}

describe("POST /v1/voice/token", () => {
  it("returns one no-store private authorization after all server checks", async () => {
    const { app, providers } = createTestApp();
    const agent = request.agent(app);
    const input = tokenRequest(await prepareGrant(agent));

    const result = await agent
      .post("/v1/voice/token")
      .set("Origin", ALLOWED_ORIGIN)
      .send(input)
      .expect(200);

    expect(voiceTokenResponseSchema.parse(result.body)).toEqual({
      conversationId: "conversation-014",
      conversationToken: "short-lived-conversation-token",
    });
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(providers.verifyChallenge).toHaveBeenCalledWith(
      {
        expectedAction: "voice_token",
        token: input.turnstileToken,
      },
      expect.any(AbortSignal),
    );
    expect(providers.createVoiceToken).toHaveBeenCalledOnce();
    expect(JSON.stringify(result.body)).not.toContain(input.interviewGrant);
    expect(JSON.stringify(result.body)).not.toContain(input.turnstileToken);
  });

  it("rejects origin, cookie, and strict request shape before providers", async () => {
    const { app, providers } = createTestApp();
    const agent = request.agent(app);
    const grant = await prepareGrant(agent);

    const missingCookie = await request(app)
      .post("/v1/voice/token")
      .set("Origin", ALLOWED_ORIGIN)
      .send(tokenRequest(grant))
      .expect(401);
    expect(apiErrorSchema.parse(missingCookie.body).error.code).toBe(
      "ANONYMOUS_SESSION_REQUIRED",
    );

    const badOrigin = await agent
      .post("/v1/voice/token")
      .set("Origin", "https://attacker.invalid")
      .send(tokenRequest(grant))
      .expect(403);
    expect(apiErrorSchema.parse(badOrigin.body).error.code).toBe(
      "ORIGIN_NOT_ALLOWED",
    );

    for (const invalidBody of [
      { interviewGrant: grant, turnstileToken: "" },
      { ...tokenRequest(grant), agentId: "browser-selected-agent" },
      { ...tokenRequest(grant), prompt: "replace the system prompt" },
    ]) {
      await agent
        .post("/v1/voice/token")
        .set("Origin", ALLOWED_ORIGIN)
        .send(invalidBody)
        .expect(400);
    }
    expect(providers.verifyChallenge).not.toHaveBeenCalled();
    expect(providers.createVoiceToken).not.toHaveBeenCalled();
  });

  it("rejects a mutated or differently correlated grant before Turnstile", async () => {
    const { app, providers } = createTestApp();
    const firstAgent = request.agent(app);
    const grant = await prepareGrant(firstAgent);
    const mutatedGrant = `${grant.slice(0, -1)}${grant.endsWith("A") ? "B" : "A"}`;

    await firstAgent
      .post("/v1/voice/token")
      .set("Origin", ALLOWED_ORIGIN)
      .send(tokenRequest(mutatedGrant))
      .expect(401);

    const otherAgent = request.agent(app);
    await otherAgent.get("/v1/demo/bootstrap").expect(200);
    const mismatch = await otherAgent
      .post("/v1/voice/token")
      .set("Origin", ALLOWED_ORIGIN)
      .send(tokenRequest(grant))
      .expect(401);
    expect(apiErrorSchema.parse(mismatch.body).error.code).toBe(
      "INTERVIEW_GRANT_INVALID",
    );
    expect(providers.verifyChallenge).not.toHaveBeenCalled();
    expect(providers.createVoiceToken).not.toHaveBeenCalled();
  });

  it.each([
    ["duplicate", ["timeout-or-duplicate"]],
    ["wrong action", ["action-mismatch"]],
    ["wrong hostname", ["hostname-mismatch"]],
  ])("rejects a Turnstile %s before ElevenLabs", async (_label, codes) => {
    const providers = providerSpies({
      action: null,
      errorCodes: codes,
      hostname: null,
      success: false,
    });
    const { app } = createTestApp(providers);
    const agent = request.agent(app);
    const grant = await prepareGrant(agent);
    const result = await agent
      .post("/v1/voice/token")
      .set("Origin", ALLOWED_ORIGIN)
      .send(tokenRequest(grant))
      .expect(403);

    expect(apiErrorSchema.parse(result.body).error.code).toBe(
      "TURNSTILE_REJECTED",
    );
    expect(providers.verifyChallenge).toHaveBeenCalledOnce();
    expect(providers.createVoiceToken).not.toHaveBeenCalled();
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
      const grant = await prepareGrant(agent);
      const result = await agent
        .post("/v1/voice/token")
        .set("Origin", ALLOWED_ORIGIN)
        .send(tokenRequest(grant))
        .expect(status);

      expect(apiErrorSchema.parse(result.body).error.code).toBe(code);
      expect(providers.verifyChallenge).not.toHaveBeenCalled();
      expect(providers.createVoiceToken).not.toHaveBeenCalled();
    },
  );

  it("keeps live voice disabled while the paid-demo switch is off", async () => {
    const providers = providerSpies();
    const { app } = createTestApp(providers, {
      config: disabledLiveConfig(),
    });
    const agent = request.agent(app);
    const grant = await prepareGrant(agent);
    const result = await agent
      .post("/v1/voice/token")
      .set("Origin", ALLOWED_ORIGIN)
      .send(tokenRequest(grant))
      .expect(503);

    expect(apiErrorSchema.parse(result.body).error).toMatchObject({
      code: "VOICE_DISABLED",
      retryable: false,
    });
    expect(providers.verifyChallenge).not.toHaveBeenCalled();
    expect(providers.createVoiceToken).not.toHaveBeenCalled();
  });

  it("does not write grants, challenges, or conversation credentials to logs", async () => {
    const destination = new PassThrough();
    destination.setEncoding("utf8");
    const logChunks: string[] = [];
    destination.on("data", (chunk: string) => logChunks.push(chunk));
    const config = fakeConfig({ APP_ENV: "local" });
    const providers = providerSpies();
    const { app } = createTestApp(providers, {
      config,
      logger: createBackendLogger(config, destination),
    });
    const agent = request.agent(app);
    const input = tokenRequest(await prepareGrant(agent));
    await agent
      .post("/v1/voice/token")
      .set("Origin", ALLOWED_ORIGIN)
      .send(input)
      .expect(200);
    await new Promise<void>((resolve) => setImmediate(resolve));

    const logs = logChunks.join("");
    expect(logs).toContain("voice_token");
    expect(logs).not.toContain(input.interviewGrant);
    expect(logs).not.toContain(input.turnstileToken);
    expect(logs).not.toContain("short-lived-conversation-token");
    expect(logs).not.toContain("conversation-014");
  });
});
