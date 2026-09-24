import { describe, expect, it } from "vitest";

import { loadBackendConfig } from "../config/load-backend-config.js";
import { CONVERSATION_FIRST_PLAN } from "../demo/conversation-first-plan.js";
import { createProviderAdapters } from "./provider-adapters.js";
import type { InterviewSummaryInput } from "../use-cases/ports/interview-summarizer.js";
import { OpenAiCvAnalyzer } from "./openai/openai-cv-analyzer.js";
import { FakeOpenAi } from "./openai/fake-openai.js";
import { OpenAiInterviewSummarizer } from "./openai/openai-interview-summarizer.js";
import { CloudflareTurnstileVerifier } from "./turnstile/cloudflare-turnstile-verifier.js";
import { FAKE_TURNSTILE_PASS_TOKEN } from "./turnstile/fake-turnstile-verifier.js";
import { FakeElevenLabs } from "./elevenlabs/fake-elevenlabs.js";
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
const summaryRehearsalConfig = loadBackendConfig({
  ALLOWED_ORIGINS: "http://localhost:3000",
  ANONYMOUS_COOKIE_SECRET: "unit-test-cookie-secret-000000000000",
  APP_ENV: "local",
  ELEVENLABS_AGENT_ID: "",
  ELEVENLABS_API_KEY: "",
  ELEVENLABS_VOICE_ID: "",
  INTERVIEW_GRANT_SIGNING_SECRET: "unit-test-grant-secret-0000000000000",
  LIVE_INTERVIEW_ENABLED: "false",
  OPENAI_API_KEY: "not-a-real-openai-key",
  PAID_DEMO_ENABLED: "true",
  PROVIDER_MODE: "live",
  TURNSTILE_ALLOWED_HOSTNAMES: "localhost",
  TURNSTILE_SECRET_KEY: "not-a-real-turnstile-secret",
  TURNSTILE_SITE_KEY: "not-a-real-turnstile-site-key",
});

const summaryInput: InterviewSummaryInput = {
  entryMode: "conversation_first",
  plan: CONVERSATION_FIRST_PLAN,
  transcript: [
    {
      id: "turn-1",
      sequence: 1,
      speaker: "candidate",
      status: "final",
      text: "I am still deciding which direction to pursue.",
      occurredAt: "2026-09-12T09:01:00.000Z",
    },
  ],
  insights: [
    {
      id: "insight-role",
      category: "role_preference",
      label: "Requested role",
      value: "Undecided",
      source: "Candidate",
      status: "confirmed",
      evidenceTurnIds: ["turn-1"],
      cvFactIds: [],
      createdAt: "2026-09-12T09:01:00.000Z",
      updatedAt: "2026-09-12T09:01:00.000Z",
    },
    {
      id: "insight-current-context",
      category: "current_context",
      label: "Current context",
      value: "Early-career developer with product internship experience",
      source: "Candidate",
      status: "confirmed",
      evidenceTurnIds: ["turn-1"],
      cvFactIds: [],
      createdAt: "2026-09-12T09:01:00.000Z",
      updatedAt: "2026-09-12T09:01:00.000Z",
    },
  ],
  topicProgress: [],
};

describe("provider adapter composition", () => {
  it("uses the chronologically latest candidate correction across timezone offsets", async () => {
    const adapters = createProviderAdapters(fakeConfig);
    const offsetInput = structuredClone(summaryInput);
    const originalRoleInsight = offsetInput.insights.find(
      (insight) => insight.category === "role_preference",
    );
    if (originalRoleInsight === undefined) {
      throw new Error("The summary fixture requires a role insight.");
    }
    originalRoleInsight.value = "Graphic Designer";
    originalRoleInsight.createdAt = "2026-09-12T07:00:00Z";
    originalRoleInsight.updatedAt = "2026-09-12T10:30:00+03:00";
    offsetInput.transcript.push({
      id: "turn-2",
      sequence: 2,
      speaker: "candidate",
      status: "final",
      text: "I would like to use UX Researcher as the role for this session.",
      occurredAt: "2026-09-12T08:00:00Z",
    });
    offsetInput.insights.push({
      ...originalRoleInsight,
      id: "insight-role-correction",
      value: "UX Researcher",
      evidenceTurnIds: ["turn-2"],
      createdAt: "2026-09-12T08:00:00Z",
      updatedAt: "2026-09-12T08:00:00Z",
    });

    const result =
      await adapters.interviewSummarizer.summarizeInterview(offsetInput);

    expect(result.summary.rolePreference).toEqual({
      label: "UX Researcher",
      status: "candidate_stated",
      evidenceTurnIds: ["turn-2"],
    });
  });

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
    const summaryResult =
      await adapters.interviewSummarizer.summarizeInterview(summaryInput);
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
    expect(summaryResult.summary.confirmedFacts).toContainEqual({
      evidenceTurnIds: ["turn-1"],
      statement:
        "Current context: Early-career developer with product internship experience.",
    });
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
          summaryInput,
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

  it("composes only implemented real adapters in live mode", () => {
    const adapters = createProviderAdapters(liveConfig);

    expect(adapters.cvAnalyzer).toBeInstanceOf(OpenAiCvAnalyzer);
    expect(adapters.challengeVerifier).toBeInstanceOf(
      CloudflareTurnstileVerifier,
    );
    expect(adapters.voiceTokenProvider).toBeInstanceOf(
      ElevenLabsVoiceTokenProvider,
    );
    expect(adapters.interviewSummarizer).toBeInstanceOf(
      OpenAiInterviewSummarizer,
    );
  });

  it("uses fake CV analysis and voice while keeping the live summary boundary in summary rehearsal", async () => {
    const adapters = createProviderAdapters(summaryRehearsalConfig);

    expect(adapters.cvAnalyzer).toBeInstanceOf(FakeOpenAi);
    expect(adapters.challengeVerifier).toBeInstanceOf(
      CloudflareTurnstileVerifier,
    );
    expect(adapters.interviewSummarizer).toBeInstanceOf(
      OpenAiInterviewSummarizer,
    );
    expect(adapters.voiceTokenProvider).toBeInstanceOf(FakeElevenLabs);
    const analysis = await adapters.cvAnalyzer.analyzeCv({
      cvText: [
        "Riley Vale",
        "Junior developer with a product internship and accessible workflow project experience.",
        "Suggested role: Junior Software Developer",
      ].join("\n\n"),
    });
    expect(analysis.normalizedCv.facts.length).toBeGreaterThan(0);
    await expect(
      adapters.voiceTokenProvider.createVoiceToken({
        requestId: "summary-rehearsal-request",
      }),
    ).resolves.toEqual({
      conversationId: "screenpilot-fake-conversation",
      conversationToken: "screenpilot-fake-conversation-token",
    });
  });

  it("uses explicitly injected adapters in live mode", () => {
    const injectedAdapters = createProviderAdapters(fakeConfig);

    expect(createProviderAdapters(liveConfig, injectedAdapters)).toBe(
      injectedAdapters,
    );
  });
});
