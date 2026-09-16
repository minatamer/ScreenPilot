import { z } from "zod";

export const PUBLIC_RUNTIME_LIMITS = Object.freeze({
  callSeconds: 480,
  cvCharacters: 40_000,
  pdfBytes: 5_242_880,
  pdfPages: 8,
} as const);

export const PUBLIC_PROVIDER_MODES = ["fake", "live"] as const;

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
    paidOperationsEnabled: z.boolean(),
    privacyNoticeVersion: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD version."),
    providerMode: z.enum(PUBLIC_PROVIDER_MODES),
  })
  .superRefine((runtimeConfig, context) => {
    const paidLiveMode =
      runtimeConfig.providerMode === "live" &&
      runtimeConfig.paidOperationsEnabled;

    if (
      runtimeConfig.providerMode === "fake" &&
      runtimeConfig.paidOperationsEnabled
    ) {
      context.addIssue({
        code: "custom",
        message: "Paid operations cannot be enabled in fake mode.",
        path: ["paidOperationsEnabled"],
      });
    }

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
  return (
    runtimeConfig.providerMode === "fake" || runtimeConfig.paidOperationsEnabled
  );
}

export function areLiveProviderOperationsEnabled(
  runtimeConfig: PublicRuntimeConfig,
): boolean {
  return (
    runtimeConfig.providerMode === "live" && runtimeConfig.paidOperationsEnabled
  );
}
