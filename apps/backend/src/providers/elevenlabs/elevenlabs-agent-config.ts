import { PUBLIC_RUNTIME_LIMITS } from "@screenpilot/contracts/api/public-runtime-config";
import {
  VOICE_AGENT_POLICY_VERSION,
  VOICE_CLIENT_TOOL_NAMES,
  VOICE_DYNAMIC_VARIABLE_KEYS,
} from "@screenpilot/contracts/api/voice-token";

import { LOCKED_PROVIDER_SETTINGS } from "../../config/provider-mode.js";

export const ELEVENLABS_AGENT_CONFIG_VERSION = "sp014-2026-09-12.1";
export const ELEVENLABS_LIVE_OUTPUT_TOKEN_CEILING = 160;

export const SCREENPILOT_ELEVENLABS_AGENT_CONFIG = Object.freeze({
  agentConfigVersion: ELEVENLABS_AGENT_CONFIG_VERSION,
  agentRevisionId: "agtvrsn_3001m2fxwb6ce0nva1gweerevkqr",
  clientTools: VOICE_CLIENT_TOOL_NAMES,
  conversation: {
    firstMessage: "Hi, what's your name?",
    interruptionsEnabled: true,
    maxDurationSeconds: PUBLIC_RUNTIME_LIMITS.callSeconds,
    softTimeoutEnabled: false,
    turnEagerness: "normal",
    turnTimeoutSeconds: 12,
  },
  dynamicVariables: VOICE_DYNAMIC_VARIABLE_KEYS,
  liveModel: {
    model: LOCKED_PROVIDER_SETTINGS.openAiModel,
    outputTokenCeiling: ELEVENLABS_LIVE_OUTPUT_TOKEN_CEILING,
    reasoning: LOCKED_PROVIDER_SETTINGS.openAiReasoning,
  },
  platform: LOCKED_PROVIDER_SETTINGS.elevenLabsAgentPlatform,
  policyVersion: VOICE_AGENT_POLICY_VERSION,
  privateAgent: true,
  privacy: {
    audioSaving: false,
    transcriptRetentionDays: 0,
  },
  sttModel: LOCKED_PROVIDER_SETTINGS.elevenLabsSttModel,
  transport: "webrtc",
  ttsModel: LOCKED_PROVIDER_SETTINGS.elevenLabsTtsModel,
  voiceIdEnvironmentVariable: "ELEVENLABS_VOICE_ID",
});
