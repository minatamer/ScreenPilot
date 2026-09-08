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
          { cvText: "synthetic", vacancyCatalogKey: "demo-engineering" },
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
