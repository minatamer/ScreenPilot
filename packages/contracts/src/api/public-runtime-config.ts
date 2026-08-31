import { z } from "zod";

export const PUBLIC_RUNTIME_LIMITS = Object.freeze({
  callSeconds: 480,
  cvCharacters: 40_000,
  pdfBytes: 5_242_880,
  pdfPages: 8,
} as const);

export const publicRuntimeConfigSchema = z.strictObject({
  abuseProtection: z.strictObject({
    appearance: z.literal("interaction-only"),
    provider: z.literal("cloudflare_turnstile"),
    siteKey: z.string().max(256),
  }),
  limits: z.strictObject({
    callSeconds: z.literal(PUBLIC_RUNTIME_LIMITS.callSeconds),
    cvCharacters: z.literal(PUBLIC_RUNTIME_LIMITS.cvCharacters),
    pdfBytes: z.literal(PUBLIC_RUNTIME_LIMITS.pdfBytes),
    pdfPages: z.literal(PUBLIC_RUNTIME_LIMITS.pdfPages),
  }),
  paidVoiceEnabled: z.boolean(),
  privacyNoticeVersion: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD version."),
});

export type PublicRuntimeConfig = z.infer<typeof publicRuntimeConfigSchema>;
