import type { BackendConfig } from "../config/backend-config.schema.js";
import type { ChallengeVerifier } from "../use-cases/ports/challenge-verifier.js";
import type { CvAnalyzer } from "../use-cases/ports/cv-analyzer.js";
import type { InterviewSummarizer } from "../use-cases/ports/interview-summarizer.js";
import type { VoiceTokenProvider } from "../use-cases/ports/voice-token-provider.js";
import { FakeElevenLabs } from "./elevenlabs/fake-elevenlabs.js";
import { FakeOpenAi } from "./openai/fake-openai.js";
import { FakeTurnstileVerifier } from "./turnstile/fake-turnstile-verifier.js";

export type ProviderAdapters = Readonly<{
  challengeVerifier: ChallengeVerifier;
  cvAnalyzer: CvAnalyzer;
  interviewSummarizer: InterviewSummarizer;
  voiceTokenProvider: VoiceTokenProvider;
}>;

export class MissingLiveProviderAdaptersError extends Error {
  constructor() {
    super("Live provider mode requires explicit live adapter injection.");
    this.name = "MissingLiveProviderAdaptersError";
  }
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

export const createProviderAdapters = (
  config: Pick<BackendConfig, "providerMode">,
  liveAdapters?: ProviderAdapters,
): ProviderAdapters => {
  if (config.providerMode === "fake") {
    return createFakeProviderAdapters();
  }

  if (liveAdapters === undefined) {
    throw new MissingLiveProviderAdaptersError();
  }

  return liveAdapters;
};
