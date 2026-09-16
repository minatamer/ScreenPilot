import { describe, expect, it } from "vitest";

import { loadBackendConfig } from "../config/load-backend-config.js";
import {
  createProviderAdapters,
  MissingLiveProviderAdaptersError,
} from "./provider-adapters.js";
import { OpenAiCvAnalyzer } from "./openai/openai-cv-analyzer.js";
import { CloudflareTurnstileVerifier } from "./turnstile/cloudflare-turnstile-verifier.js";
import { FAKE_TURNSTILE_PASS_TOKEN } from "./turnstile/fake-turnstile-verifier.js";
import { ElevenLabsVoiceTokenProvider } from "./elevenlabs/elevenlabs-token-provider.js";

const fakeConfig = loadBackendConfig({
  APP_ENV: "test",
  PAID_DEMO_ENABLED: "false",
  PROVIDER_MODE: "fake",
});
const liveConfig = loadBackendConfig({
  ALLOWED_ORIGINS: "http://localhost:3000",
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

describe("provider adapter composition", () => {
  it("exercises every fake with stable, content-safe results", async () => {
    const adapters = createProviderAdapters(fakeConfig);
    const privateCandidateText = "PRIVATE CANDIDATE FIXTURE CONTENT";
    const frontendCvText = `${"Synthetic candidate context. ".repeat(25)}\n\nJunior interface developer\nTwo years of fictional experience in customer-facing product UI.`;
    const backendCvText = `${"Synthetic candidate context. ".repeat(25)}\n\nBackend-oriented product developer\nFive years of fictional experience in server-side product services.`;

    const firstCvResult = await adapters.cvAnalyzer.analyzeCv({
      cvText: frontendCvText,
    });
    const secondCvResult = await adapters.cvAnalyzer.analyzeCv({
      cvText: backendCvText,
    });
    const summaryResult = await adapters.interviewSummarizer.summarizeInterview(
      {
        transcript: privateCandidateText,
      },
    );
    const voiceResult = await adapters.voiceTokenProvider.createVoiceToken({
      requestId: "unit-test-request",
    });
    const challengeResult = await adapters.challengeVerifier.verifyChallenge({
      expectedAction: "cv_analyze",
      token: FAKE_TURNSTILE_PASS_TOKEN,
    });

    expect(secondCvResult).not.toEqual(firstCvResult);
    expect(firstCvResult.normalizedCv.suggestedRole).toMatchObject({
      label: "Frontend Developer",
    });
    expect(secondCvResult.normalizedCv.suggestedRole).toMatchObject({
      label: "Backend Developer",
    });
    expect(JSON.stringify(summaryResult)).not.toContain(privateCandidateText);
    expect(firstCvResult.usage).toMatchObject({
      cachedInputTokens: 0,
      outputTokens: 700,
    });
    expect(voiceResult).toEqual({
      conversationId: "screenpilot-fake-conversation",
      conversationToken: "screenpilot-fake-conversation-token",
    });
    expect(challengeResult).toEqual({
      action: "cv_analyze",
      errorCodes: [],
      hostname: "test.screenpilot.invalid",
      success: true,
    });
  });

  it("models a failed challenge without inventing provider fields", async () => {
    const adapters = createProviderAdapters(fakeConfig);

    await expect(
      adapters.challengeVerifier.verifyChallenge({
        expectedAction: "voice_token",
        token: "screenpilot-fake-turnstile-fail",
      }),
    ).resolves.toEqual({
      action: null,
      errorCodes: ["invalid-input-response"],
      hostname: null,
      success: false,
    });
  });

  it("rejects aborted fake operations through their Promise contract", async () => {
    const adapters = createProviderAdapters(fakeConfig);
    const abortController = new AbortController();
    abortController.abort();

    const abortedOperations = [
      () =>
        adapters.cvAnalyzer.analyzeCv(
          { cvText: "synthetic" },
          abortController.signal,
        ),
      () =>
        adapters.interviewSummarizer.summarizeInterview(
          { transcript: "synthetic" },
          abortController.signal,
        ),
      () =>
        adapters.voiceTokenProvider.createVoiceToken(
          { requestId: "unit-test-request" },
          abortController.signal,
        ),
      () =>
        adapters.challengeVerifier.verifyChallenge(
          {
            expectedAction: "interview_summary",
            token: FAKE_TURNSTILE_PASS_TOKEN,
          },
          abortController.signal,
        ),
    ];

    for (const operation of abortedOperations) {
      await expect(operation()).rejects.toMatchObject({ name: "AbortError" });
    }
  });

  it("composes only implemented real adapters in live mode", async () => {
    const adapters = createProviderAdapters(liveConfig);

    expect(adapters.cvAnalyzer).toBeInstanceOf(OpenAiCvAnalyzer);
    expect(adapters.challengeVerifier).toBeInstanceOf(
      CloudflareTurnstileVerifier,
    );
    expect(adapters.voiceTokenProvider).toBeInstanceOf(
      ElevenLabsVoiceTokenProvider,
    );
    await expect(
      adapters.interviewSummarizer.summarizeInterview({}),
    ).rejects.toBeInstanceOf(MissingLiveProviderAdaptersError);
  });

  it("uses explicitly injected adapters in live mode", () => {
    const injectedAdapters = createProviderAdapters(fakeConfig);

    expect(createProviderAdapters(liveConfig, injectedAdapters)).toBe(
      injectedAdapters,
    );
  });
});
