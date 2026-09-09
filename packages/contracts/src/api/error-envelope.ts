import { z } from "zod";

export const API_ERROR_CODES = [
  "INVALID_ENTRY_MODE",
  "INVALID_CV_TEXT",
  "INTERVIEW_GRANT_EXPIRED",
  "PREPARATION_FAILED",
  "PROVIDER_UNAVAILABLE",
  "VOICE_DISABLED",
  "CAPACITY_REACHED",
  "RATE_LIMITED",
  "TURNSTILE_REQUIRED",
  "TURNSTILE_REJECTED",
  "TURNSTILE_UNAVAILABLE",
  "INVALID_TRANSCRIPT",
  "SUMMARY_FAILED",
] as const;

export const apiErrorCodeSchema = z
  .string()
  .regex(
    /^[A-Z][A-Z0-9_]{1,63}$/,
    "Expected a stable uppercase API error code.",
  );

export const apiErrorSchema = z.strictObject({
  error: z.strictObject({
    code: apiErrorCodeSchema,
    message: z.string().trim().min(1).max(300),
    retryable: z.boolean(),
    requestId: z.string().trim().min(1).max(128),
    retryAfterSeconds: z.number().int().positive().max(86_400).optional(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type RequiredApiErrorCode = (typeof API_ERROR_CODES)[number];
