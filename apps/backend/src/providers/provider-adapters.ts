import type { NormalizedCv } from "@screenpilot/contracts/interview/normalized-cv";

import type { BackendConfig } from "../config/backend-config.schema.js";
import type { ChallengeVerifier } from "../use-cases/ports/challenge-verifier.js";
import type { CvAnalyzer } from "../use-cases/ports/cv-analyzer.js";
import type { InterviewSummarizer } from "../use-cases/ports/interview-summarizer.js";
import type { VoiceTokenProvider } from "../use-cases/ports/voice-token-provider.js";
import { ElevenLabsHttpClient } from "./elevenlabs/elevenlabs-client.js";
import { ElevenLabsVoiceTokenProvider } from "./elevenlabs/elevenlabs-token-provider.js";
import { FakeElevenLabs } from "./elevenlabs/fake-elevenlabs.js";
import { FakeOpenAi } from "./openai/fake-openai.js";
import { OpenAiHttpClient } from "./openai/openai-client.js";
import { OpenAiCvAnalyzer } from "./openai/openai-cv-analyzer.js";
import { OpenAiInterviewSummarizer } from "./openai/openai-interview-summarizer.js";
import { CloudflareTurnstileVerifier } from "./turnstile/cloudflare-turnstile-verifier.js";
import { FakeTurnstileVerifier } from "./turnstile/fake-turnstile-verifier.js";

export type ProviderAdapters = Readonly<{
  challengeVerifier: ChallengeVerifier;
  cvAnalyzer: CvAnalyzer<NormalizedCv>;
  interviewSummarizer: InterviewSummarizer;
  voiceTokenProvider: VoiceTokenProvider;
}>;

export class MissingLiveProviderAdaptersError extends Error {
  constructor(provider?: string) {
    super(
      provider === undefined
        ? "Live provider configuration is incomplete."
        : `${provider} is not implemented yet for live provider mode.`,
    );
    this.name = "MissingLiveProviderAdaptersError";
  }
}

function requireLiveValue(value: string | null): string {
  if (value === null) {
    throw new MissingLiveProviderAdaptersError();
  }
  return value;
}

const createFakeProviderAdapters = (): ProviderAdapters => {
  const fakeOpenAi = new FakeOpenAi();

  return Object.freeze({
    challengeVerifier: new FakeTurnstileVerifier(),
    cvAnalyzer: fakeOpenAi,
    interviewSummarizer: fakeOpenAi,
    voiceTokenProvider: new FakeElevenLabs(),
  });
};

function createLiveVoiceTokenProvider(
  config: BackendConfig,
): VoiceTokenProvider {
  if (config.effectiveMode === "summary_rehearsal") {
    return new FakeElevenLabs();
  }

  const agentId = requireLiveValue(config.providers.elevenLabs.agentId);
  return new ElevenLabsVoiceTokenProvider({
    agentId,
    client: new ElevenLabsHttpClient({
      agentId,
      apiKey: requireLiveValue(config.providers.elevenLabs.apiKey),
      timeoutMs: config.limits.providerRequestTimeoutMs,
    }),
  });
}

const createLiveProviderAdapters = (
  config: BackendConfig,
): ProviderAdapters => {
  const openAiClient = new OpenAiHttpClient({
    apiKey: requireLiveValue(config.providers.openAi.apiKey),
    model: config.providers.openAi.model,
    reasoning: config.providers.openAi.reasoning,
    store: config.providers.openAi.store,
    timeoutMs: config.limits.providerRequestTimeoutMs,
  });
  return Object.freeze({
    challengeVerifier: new CloudflareTurnstileVerifier({
      allowedHostnames: config.providers.turnstile.allowedHostnames,
      secretKey: requireLiveValue(config.providers.turnstile.secretKey),
      timeoutMs: config.limits.providerRequestTimeoutMs,
      verificationUrl: config.providers.turnstile.verificationUrl,
    }),
    cvAnalyzer:
      config.effectiveMode === "summary_rehearsal"
        ? new FakeOpenAi()
        : new OpenAiCvAnalyzer(openAiClient),
    interviewSummarizer: new OpenAiInterviewSummarizer(openAiClient),
    voiceTokenProvider: createLiveVoiceTokenProvider(config),
  });
};

export const createProviderAdapters = (
  config: BackendConfig,
  liveAdapters?: ProviderAdapters,
): ProviderAdapters => {
  if (config.effectiveMode === "deterministic_fake") {
    return createFakeProviderAdapters();
  }

  return liveAdapters ?? createLiveProviderAdapters(config);
};
