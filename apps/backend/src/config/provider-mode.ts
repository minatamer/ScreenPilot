import {
  TURNSTILE_ACTIONS,
  type TurnstileAction,
} from "@screenpilot/contracts/abuse-protection/turnstile-action";

export { TURNSTILE_ACTIONS, type TurnstileAction };

export const APP_ENVIRONMENTS = ["local", "test", "production"] as const;
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

export const PROVIDER_MODES = ["fake", "live"] as const;
export type ProviderMode = (typeof PROVIDER_MODES)[number];

export const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
export const ELEVENLABS_CONVERSATION_TOKEN_URL =
  "https://api.elevenlabs.io/v1/convai/conversation/token";

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
