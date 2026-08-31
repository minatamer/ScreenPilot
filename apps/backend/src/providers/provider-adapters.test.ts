import { describe, expect, it } from "vitest";

import { loadBackendConfig } from "../config/load-backend-config.js";
import {
  createProviderAdapters,
  MissingLiveProviderAdaptersError,
} from "./provider-adapters.js";
import { FAKE_TURNSTILE_PASS_TOKEN } from "./turnstile/fake-turnstile-verifier.js";

const fakeConfig = loadBackendConfig({
  APP_ENV: "test",
  PAID_DEMO_ENABLED: "false",
  PROVIDER_MODE: "fake",
});

describe("provider adapter composition", () => {
  it("exercises every fake with stable, content-safe results", async () => {
    const adapters = createProviderAdapters(fakeConfig);
    const privateCandidateText = "PRIVATE CANDIDATE FIXTURE CONTENT";

    const firstCvResult = await adapters.cvAnalyzer.analyzeCv({
      cvText: privateCandidateText,
      vacancyCatalogKey: "demo-engineering",
    });
    const secondCvResult = await adapters.cvAnalyzer.analyzeCv({
      cvText: "different input",
      vacancyCatalogKey: "demo-engineering",
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

    expect(secondCvResult).toEqual(firstCvResult);
    expect(JSON.stringify(firstCvResult)).not.toContain(privateCandidateText);
    expect(JSON.stringify(summaryResult)).not.toContain(privateCandidateText);
    expect(firstCvResult.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
    expect(voiceResult).toEqual({
      conversationToken: "screenpilot-fake-conversation-token",
      expiresAt: "2030-01-01T00:00:00.000Z",
    });
    expect(challengeResult).toEqual({
      action: "cv_analyze",
      errorCodes: [],
      hostname: "test.screenpilot.invalid",
      success: true,
    });
  });

  it("never falls back to fakes in live mode", () => {
    expect(() => createProviderAdapters({ providerMode: "live" })).toThrow(
      MissingLiveProviderAdaptersError,
    );
  });

  it("uses explicitly injected adapters in live mode", () => {
    const injectedAdapters = createProviderAdapters(fakeConfig);

    expect(
      createProviderAdapters({ providerMode: "live" }, injectedAdapters),
    ).toBe(injectedAdapters);
  });
});
