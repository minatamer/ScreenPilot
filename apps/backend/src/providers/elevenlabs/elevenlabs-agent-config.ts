import { PUBLIC_RUNTIME_LIMITS } from "@screenpilot/contracts/api/public-runtime-config";
import {
  VOICE_AGENT_POLICY_VERSION,
  VOICE_CLIENT_TOOL_NAMES,
  VOICE_DYNAMIC_VARIABLE_KEYS,
} from "@screenpilot/contracts/api/voice-token";
import { VOICE_CLIENT_TOOL_DASHBOARD_DEFINITIONS } from "@screenpilot/contracts/interview/client-tools";
import {
  VOICE_MAX_FILLERS_PER_TURN,
  VOICE_STATIC_FILLER_MESSAGE,
  VOICE_STATIC_FILLER_THRESHOLD_MS,
} from "@screenpilot/contracts/interview/voice-performance-policy";

import { LOCKED_PROVIDER_SETTINGS } from "../../config/provider-mode.js";
import {
  INTERVIEWER_FIRST_MESSAGE,
  INTERVIEWER_SYSTEM_PROMPT,
} from "../../ai/prompts/interviewer-prompt.js";

export const ELEVENLABS_AGENT_CONFIG_VERSION = "sp021b-2026-09-23.1";
export const ELEVENLABS_LIVE_OUTPUT_TOKEN_CEILING = 160;
export const ELEVENLABS_END_CALL_TOOL_DESCRIPTION =
  "End the conversation immediately after ScreenPilot's brief closing sentence when screening is complete, the final candidate-question opportunity is resolved or declined, or the candidate asks to stop. Never wait for another user turn after closing.";
export const ELEVENLABS_LAST_VERIFIED_AGENT_POLICY_VERSION =
  "sp017-2026-09-22.1";

function agentPolicyRequiresDashboardSync(
  sourcePolicyVersion: string,
  publishedPolicyVersion: string,
) {
  return sourcePolicyVersion !== publishedPolicyVersion;
}

export const SCREENPILOT_ELEVENLABS_AGENT_CONFIG = Object.freeze({
  agentConfigVersion: ELEVENLABS_AGENT_CONFIG_VERSION,
  agentRevisionId: "agtvrsn_8901m350e924f2ev7t4pwnvq38b1",
  agentRevisionPolicyVersion: ELEVENLABS_LAST_VERIFIED_AGENT_POLICY_VERSION,
  dashboardSyncRequired: agentPolicyRequiresDashboardSync(
    VOICE_AGENT_POLICY_VERSION,
    ELEVENLABS_LAST_VERIFIED_AGENT_POLICY_VERSION,
  ),
  clientTools: VOICE_CLIENT_TOOL_NAMES,
  clientToolDefinitions: VOICE_CLIENT_TOOL_DASHBOARD_DEFINITIONS,
  conversation: {
    clientEvents: [
      "audio",
      "interruption",
      "user_transcript",
      "agent_response",
      "agent_response_correction",
      "agent_chat_response_part",
      "vad_score",
    ],
    firstMessage: INTERVIEWER_FIRST_MESSAGE,
    interruptionsEnabled: true,
    maxDurationSeconds: PUBLIC_RUNTIME_LIMITS.callSeconds,
    softTimeout: {
      additionalMessages: [],
      disableUntilFirstUserMessage: true,
      enabled: false,
      maximumPerGeneration: VOICE_MAX_FILLERS_PER_TURN,
      message: VOICE_STATIC_FILLER_MESSAGE,
      randomizeFillers: false,
      timeoutSeconds: VOICE_STATIC_FILLER_THRESHOLD_MS / 1_000,
      useLlmGeneratedMessage: false,
    },
    turnEagerness: "normal",
    turnTimeoutSeconds: 12,
  },
  dynamicVariables: VOICE_DYNAMIC_VARIABLE_KEYS,
  liveModel: {
    model: LOCKED_PROVIDER_SETTINGS.openAiModel,
    outputTokenCeiling: ELEVENLABS_LIVE_OUTPUT_TOKEN_CEILING,
    reasoning: LOCKED_PROVIDER_SETTINGS.openAiReasoning,
  },
  latencyTuning: {
    audioBuffering: "provider_default",
    empiricalAdjustmentRequired: true,
    turnSettings: "provider_dashboard",
  },
  platform: LOCKED_PROVIDER_SETTINGS.elevenLabsAgentPlatform,
  policyVersion: VOICE_AGENT_POLICY_VERSION,
  systemTools: {
    endCall: {
      description: ELEVENLABS_END_CALL_TOOL_DESCRIPTION,
      name: "end_call",
      type: "system",
    },
  },
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
