import { z } from "zod";

import { interviewGrantSchema } from "./interview-preparation.js";

export const VOICE_CONNECTION_STATUSES = [
  "idle",
  "connecting",
  "connected",
  "ended",
  "failed",
] as const;

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
  agentId: z.string().trim().min(1).max(256),
  conversationId: z.string().trim().min(1).max(256).optional(),
});

export type VoiceMetadata = z.infer<typeof voiceMetadataSchema>;
export type VoiceTokenRequest = z.infer<typeof voiceTokenRequestSchema>;
export type VoiceTokenResponse = z.infer<typeof voiceTokenResponseSchema>;
