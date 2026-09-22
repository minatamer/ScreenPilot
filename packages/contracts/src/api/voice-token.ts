import { z } from "zod";

import { interviewGrantSchema } from "./interview-preparation.ts";

export const VOICE_CONNECTION_STATUSES = [
  "idle",
  "connecting",
  "connected",
  "ended",
  "failed",
] as const;

export const VOICE_DYNAMIC_VARIABLE_KEYS = [
  "screenpilot_policy_version",
  "screenpilot_entry_mode",
  "screenpilot_demo_disclosure",
  "screenpilot_screening_plan",
  "screenpilot_role_context",
  "screenpilot_cv_context",
  "screenpilot_known_state",
  "screenpilot_remaining_seconds",
] as const;

export const VOICE_CLIENT_TOOL_NAMES = [
  "recordInsight",
  "correctInsight",
  "markTopic",
  "recordCandidateQuestion",
  "requestFollowup",
] as const;

export const VOICE_AGENT_POLICY_VERSION = "sp017-2026-09-22.1" as const;

export const voiceMetadataSchema = z.strictObject({
  conversationId: z.string().trim().min(1).max(256).optional(),
  status: z.enum(VOICE_CONNECTION_STATUSES),
  startedAt: z.iso.datetime({ offset: true }).optional(),
  endedAt: z.iso.datetime({ offset: true }).optional(),
  endReason: z.string().trim().min(1).max(300).optional(),
});

export const voiceTokenRequestSchema = z.strictObject({
  interviewGrant: interviewGrantSchema,
  turnstileToken: z.string().trim().min(1).max(4_096),
});

export const voiceTokenResponseSchema = z.strictObject({
  conversationToken: z.string().trim().min(1).max(8_192),
  conversationId: z.string().trim().min(1).max(256),
});

export type VoiceMetadata = z.infer<typeof voiceMetadataSchema>;
export type VoiceClientToolName = (typeof VOICE_CLIENT_TOOL_NAMES)[number];
export type VoiceDynamicVariableKey =
  (typeof VOICE_DYNAMIC_VARIABLE_KEYS)[number];
export type VoiceTokenRequest = z.infer<typeof voiceTokenRequestSchema>;
export type VoiceTokenResponse = z.infer<typeof voiceTokenResponseSchema>;
