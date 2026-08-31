export const APP_ENVIRONMENTS = ["local", "test", "production"] as const;
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

export const PROVIDER_MODES = ["fake", "live"] as const;
export type ProviderMode = (typeof PROVIDER_MODES)[number];

export const LOCKED_PROVIDER_SETTINGS = Object.freeze({
  elevenLabsAgentPlatform: "elevenagents",
  elevenLabsSttModel: "scribe_v2_realtime",
  elevenLabsTtsModel: "eleven_flash_v2_5",
  openAiModel: "gpt-5.4-mini",
  openAiReasoning: "none",
  openAiStore: false,
  turnstileAppearance: "interaction-only",
  turnstileProvider: "cloudflare_turnstile",
  turnstileVerificationUrl:
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
} as const);

export const TURNSTILE_ACTIONS = Object.freeze({
  cvAnalyze: "cv_analyze",
  interviewSummary: "interview_summary",
  voiceToken: "voice_token",
} as const);

export type TurnstileAction =
  (typeof TURNSTILE_ACTIONS)[keyof typeof TURNSTILE_ACTIONS];
