import { describe, expect, it } from "vitest";

import {
  areInteractiveProviderOperationsEnabled,
  areLiveProviderOperationsEnabled,
  isLiveVoiceEnabled,
  isSummaryRehearsal,
  PUBLIC_RUNTIME_LIMITS,
  publicRuntimeConfigSchema,
} from "./public-runtime-config.js";

const validPublicRuntimeConfig = {
  abuseProtection: {
    appearance: "interaction-only",
    provider: "cloudflare_turnstile",
    siteKey: "",
  },
  effectiveMode: "deterministic_fake",
  limits: PUBLIC_RUNTIME_LIMITS,
  paidOperationsEnabled: false,
  privacyNoticeVersion: "2026-08-31",
  providerMode: "fake",
} as const;

describe("publicRuntimeConfigSchema", () => {
  it("accepts the allow-listed browser configuration", () => {
    expect(publicRuntimeConfigSchema.parse(validPublicRuntimeConfig)).toEqual(
      validPublicRuntimeConfig,
    );
  });

  it("rejects server-only configuration fields", () => {
    expect(
      publicRuntimeConfigSchema.safeParse({
        ...validPublicRuntimeConfig,
        openAiApiKey: "must-never-be-public",
      }).success,
    ).toBe(false);
  });

  it("rejects altered public limits and abuse-protection values", () => {
    expect(
      publicRuntimeConfigSchema.safeParse({
        ...validPublicRuntimeConfig,
        limits: {
          ...PUBLIC_RUNTIME_LIMITS,
          callSeconds: PUBLIC_RUNTIME_LIMITS.callSeconds + 1,
        },
      }).success,
    ).toBe(false);
    expect(
      publicRuntimeConfigSchema.safeParse({
        ...validPublicRuntimeConfig,
        abuseProtection: {
          ...validPublicRuntimeConfig.abuseProtection,
          provider: "disabled",
        },
      }).success,
    ).toBe(false);
  });

  it("keeps fake operations available without exposing paid live providers", () => {
    const runtimeConfig = publicRuntimeConfigSchema.parse(
      validPublicRuntimeConfig,
    );

    expect(areInteractiveProviderOperationsEnabled(runtimeConfig)).toBe(true);
    expect(areLiveProviderOperationsEnabled(runtimeConfig)).toBe(false);
    expect(isLiveVoiceEnabled(runtimeConfig)).toBe(false);
  });

  it("fails closed for live mode while paid operations are disabled", () => {
    const runtimeConfig = publicRuntimeConfigSchema.parse({
      ...validPublicRuntimeConfig,
      effectiveMode: "paid_disabled",
      providerMode: "live",
    });

    expect(areInteractiveProviderOperationsEnabled(runtimeConfig)).toBe(false);
    expect(areLiveProviderOperationsEnabled(runtimeConfig)).toBe(false);
    expect(isLiveVoiceEnabled(runtimeConfig)).toBe(false);
  });

  it("requires the site key to match the paid live boundary", () => {
    expect(
      publicRuntimeConfigSchema.safeParse({
        ...validPublicRuntimeConfig,
        abuseProtection: {
          ...validPublicRuntimeConfig.abuseProtection,
          siteKey: "must-not-be-public",
        },
        effectiveMode: "paid_disabled",
        providerMode: "live",
      }).success,
    ).toBe(false);
    expect(
      publicRuntimeConfigSchema.safeParse({
        ...validPublicRuntimeConfig,
        effectiveMode: "standard_live",
        paidOperationsEnabled: true,
      }).success,
    ).toBe(false);
    expect(
      publicRuntimeConfigSchema.safeParse({
        ...validPublicRuntimeConfig,
        effectiveMode: "standard_live",
        paidOperationsEnabled: true,
        providerMode: "live",
      }).success,
    ).toBe(false);

    const paidLiveConfig = publicRuntimeConfigSchema.parse({
      ...validPublicRuntimeConfig,
      abuseProtection: {
        ...validPublicRuntimeConfig.abuseProtection,
        siteKey: "public-live-site-key",
      },
      effectiveMode: "standard_live",
      paidOperationsEnabled: true,
      providerMode: "live",
    });
    expect(areInteractiveProviderOperationsEnabled(paidLiveConfig)).toBe(true);
    expect(areLiveProviderOperationsEnabled(paidLiveConfig)).toBe(true);
    expect(isLiveVoiceEnabled(paidLiveConfig)).toBe(true);
  });

  it("exposes summary rehearsal only in paid live mode and disables live voice", () => {
    const summaryRehearsal = publicRuntimeConfigSchema.parse({
      ...validPublicRuntimeConfig,
      abuseProtection: {
        ...validPublicRuntimeConfig.abuseProtection,
        siteKey: "public-live-site-key",
      },
      effectiveMode: "summary_rehearsal",
      paidOperationsEnabled: true,
      providerMode: "live",
    });

    expect(areInteractiveProviderOperationsEnabled(summaryRehearsal)).toBe(
      true,
    );
    expect(areLiveProviderOperationsEnabled(summaryRehearsal)).toBe(true);
    expect(isLiveVoiceEnabled(summaryRehearsal)).toBe(false);
    expect(isSummaryRehearsal(summaryRehearsal)).toBe(true);
    expect(
      publicRuntimeConfigSchema.safeParse({
        ...validPublicRuntimeConfig,
        effectiveMode: "summary_rehearsal",
      }).success,
    ).toBe(false);
    expect(
      publicRuntimeConfigSchema.safeParse({
        ...validPublicRuntimeConfig,
        effectiveMode: undefined,
      }).success,
    ).toBe(false);
  });
});
