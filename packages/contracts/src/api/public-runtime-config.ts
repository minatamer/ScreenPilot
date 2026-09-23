import { z } from "zod";

export const PUBLIC_RUNTIME_LIMITS = Object.freeze({
  callSeconds: 480,
  cvCharacters: 40_000,
  pdfBytes: 5_242_880,
  pdfPages: 8,
} as const);

export const PUBLIC_PROVIDER_MODES = ["fake", "live"] as const;
export const EFFECTIVE_RUNTIME_MODES = [
  "deterministic_fake",
  "paid_disabled",
  "standard_live",
  "summary_rehearsal",
] as const;

export const publicRuntimeConfigSchema = z
  .strictObject({
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
    effectiveMode: z.enum(EFFECTIVE_RUNTIME_MODES),
    paidOperationsEnabled: z.boolean(),
    privacyNoticeVersion: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD version."),
    providerMode: z.enum(PUBLIC_PROVIDER_MODES),
  })
  .superRefine((runtimeConfig, context) => {
    const expectedProviderBoundary = {
      deterministic_fake: { paid: false, provider: "fake" },
      paid_disabled: { paid: false, provider: "live" },
      standard_live: { paid: true, provider: "live" },
      summary_rehearsal: { paid: true, provider: "live" },
    } as const;
    const expected = expectedProviderBoundary[runtimeConfig.effectiveMode];
    if (
      runtimeConfig.providerMode !== expected.provider ||
      runtimeConfig.paidOperationsEnabled !== expected.paid
    ) {
      context.addIssue({
        code: "custom",
        message: "The effective mode does not match the provider safety gates.",
        path: ["effectiveMode"],
      });
    }

    const paidLiveMode =
      runtimeConfig.effectiveMode === "standard_live" ||
      runtimeConfig.effectiveMode === "summary_rehearsal";
    if (!paidLiveMode && runtimeConfig.abuseProtection.siteKey !== "") {
      context.addIssue({
        code: "custom",
        message:
          "The public Turnstile site key must be blank unless paid live operations are enabled.",
        path: ["abuseProtection", "siteKey"],
      });
    }

    if (paidLiveMode && runtimeConfig.abuseProtection.siteKey === "") {
      context.addIssue({
        code: "custom",
        message: "Paid live operations require a public Turnstile site key.",
        path: ["abuseProtection", "siteKey"],
      });
    }
  });

export type PublicRuntimeConfig = z.infer<typeof publicRuntimeConfigSchema>;

export function areInteractiveProviderOperationsEnabled(
  runtimeConfig: PublicRuntimeConfig,
): boolean {
  return runtimeConfig.effectiveMode !== "paid_disabled";
}

export function areLiveProviderOperationsEnabled(
  runtimeConfig: PublicRuntimeConfig,
): boolean {
  return (
    runtimeConfig.effectiveMode === "standard_live" ||
    runtimeConfig.effectiveMode === "summary_rehearsal"
  );
}

export function isLiveVoiceEnabled(
  runtimeConfig: PublicRuntimeConfig,
): boolean {
  return runtimeConfig.effectiveMode === "standard_live";
}

export function isSummaryRehearsal(
  runtimeConfig: PublicRuntimeConfig,
): boolean {
  return runtimeConfig.effectiveMode === "summary_rehearsal";
}
