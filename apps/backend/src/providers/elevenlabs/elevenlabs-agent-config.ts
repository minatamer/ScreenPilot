import { PUBLIC_RUNTIME_LIMITS } from "@screenpilot/contracts/api/public-runtime-config";
import {
  VOICE_AGENT_POLICY_VERSION,
  VOICE_CLIENT_TOOL_NAMES,
  VOICE_DYNAMIC_VARIABLE_KEYS,
} from "@screenpilot/contracts/api/voice-token";

import { LOCKED_PROVIDER_SETTINGS } from "../../config/provider-mode.js";
import {
  INTERVIEWER_FIRST_MESSAGE,
  INTERVIEWER_SYSTEM_PROMPT,
} from "../../ai/prompts/interviewer-prompt.js";

export const ELEVENLABS_AGENT_CONFIG_VERSION = "sp017-2026-09-15.1";
export const ELEVENLABS_LIVE_OUTPUT_TOKEN_CEILING = 160;
export const ELEVENLABS_LAST_VERIFIED_AGENT_POLICY_VERSION =
  "sp014-connection-v1";

export const SCREENPILOT_ELEVENLABS_AGENT_CONFIG = Object.freeze({
  agentConfigVersion: ELEVENLABS_AGENT_CONFIG_VERSION,
  agentRevisionId: "agtvrsn_3001m2fxwb6ce0nva1gweerevkqr",
  agentRevisionPolicyVersion: ELEVENLABS_LAST_VERIFIED_AGENT_POLICY_VERSION,
  clientTools: VOICE_CLIENT_TOOL_NAMES,
  conversation: {
    firstMessage: INTERVIEWER_FIRST_MESSAGE,
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
  systemPrompt: INTERVIEWER_SYSTEM_PROMPT,
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
