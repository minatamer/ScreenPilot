import {
  VOICE_AGENT_POLICY_VERSION,
  VOICE_CLIENT_TOOL_NAMES,
  VOICE_DYNAMIC_VARIABLE_KEYS,
} from "@screenpilot/contracts/api/voice-token";
import { describe, expect, it } from "vitest";

import {
  ELEVENLABS_LIVE_OUTPUT_TOKEN_CEILING,
  SCREENPILOT_ELEVENLABS_AGENT_CONFIG,
} from "./elevenlabs-agent-config.js";

describe("source-controlled ElevenLabs agent configuration", () => {
  it("locks the approved model, transport behavior, privacy, and duration", () => {
    expect(SCREENPILOT_ELEVENLABS_AGENT_CONFIG).toMatchObject({
      agentRevisionId: null,
      conversation: {
        firstMessage: "Hi, what's your name?",
        interruptionsEnabled: true,
        maxDurationSeconds: 480,
        softTimeoutEnabled: false,
        turnEagerness: "normal",
        turnTimeoutSeconds: 12,
      },
      liveModel: {
        model: "gpt-5.4-mini",
        outputTokenCeiling: 160,
        reasoning: "none",
      },
      platform: "elevenagents",
      policyVersion: VOICE_AGENT_POLICY_VERSION,
      privateAgent: true,
      privacy: { audioSaving: false, transcriptRetentionDays: 0 },
      sttModel: "scribe_v2_realtime",
      transport: "webrtc",
      ttsModel: "eleven_flash_v2_5",
      voiceIdEnvironmentVariable: "ELEVENLABS_VOICE_ID",
    });
    expect(ELEVENLABS_LIVE_OUTPUT_TOKEN_CEILING).toBe(160);
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
