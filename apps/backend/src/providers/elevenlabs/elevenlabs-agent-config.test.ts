import {
  VOICE_AGENT_POLICY_VERSION,
  VOICE_CLIENT_TOOL_NAMES,
  VOICE_DYNAMIC_VARIABLE_KEYS,
} from "@screenpilot/contracts/api/voice-token";
import { VOICE_CLIENT_TOOL_DASHBOARD_DEFINITIONS } from "@screenpilot/contracts/interview/client-tools";
import { VOICE_STATIC_FILLER_MESSAGE } from "@screenpilot/contracts/interview/voice-performance-policy";
import { describe, expect, it } from "vitest";

import {
  ELEVENLABS_END_CALL_TOOL_DESCRIPTION,
  ELEVENLABS_LAST_VERIFIED_AGENT_POLICY_VERSION,
  ELEVENLABS_LIVE_OUTPUT_TOKEN_CEILING,
  SCREENPILOT_ELEVENLABS_AGENT_CONFIG,
} from "./elevenlabs-agent-config.js";
import {
  INTERVIEWER_FIRST_MESSAGE,
  INTERVIEWER_SYSTEM_PROMPT,
} from "../../ai/prompts/interviewer-prompt.js";

describe("source-controlled ElevenLabs agent configuration", () => {
  it("locks the approved model, transport behavior, privacy, and duration", () => {
    expect(SCREENPILOT_ELEVENLABS_AGENT_CONFIG).toMatchObject({
      agentRevisionId: "agtvrsn_9501m39701mmet6av5bz53yk6ggp",
      agentRevisionPolicyVersion: "sp021b-2026-09-23.1",
      dashboardSyncRequired: false,
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
        maxDurationSeconds: 480,
        softTimeout: {
          additionalMessages: [],
          disableUntilFirstUserMessage: true,
          enabled: false,
          maximumPerGeneration: 1,
          message: VOICE_STATIC_FILLER_MESSAGE,
          randomizeFillers: false,
          timeoutSeconds: 1.5,
          useLlmGeneratedMessage: false,
        },
        turnEagerness: "normal",
        turnTimeoutSeconds: 12,
      },
      liveModel: {
        model: "gpt-5.4-mini",
        outputTokenCeiling: 160,
        reasoning: "none",
      },
      latencyTuning: {
        audioBuffering: "provider_default",
        empiricalAdjustmentRequired: true,
        turnSettings: "provider_dashboard",
      },
      platform: "elevenagents",
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
      privacy: { audioSaving: false, transcriptRetentionDays: 0 },
      sttModel: "scribe_v2_realtime",
      transport: "webrtc",
      ttsModel: "eleven_flash_v2_5",
      voiceIdEnvironmentVariable: "ELEVENLABS_VOICE_ID",
    });
    expect(ELEVENLABS_LIVE_OUTPUT_TOKEN_CEILING).toBe(160);
    expect(ELEVENLABS_LAST_VERIFIED_AGENT_POLICY_VERSION).toBe(
      VOICE_AGENT_POLICY_VERSION,
    );
  });

  it("uses the one universal context and tool surface for every role", () => {
    expect(SCREENPILOT_ELEVENLABS_AGENT_CONFIG.dynamicVariables).toEqual(
      VOICE_DYNAMIC_VARIABLE_KEYS,
    );
    expect(SCREENPILOT_ELEVENLABS_AGENT_CONFIG.clientTools).toEqual(
      VOICE_CLIENT_TOOL_NAMES,
    );
  });
});
