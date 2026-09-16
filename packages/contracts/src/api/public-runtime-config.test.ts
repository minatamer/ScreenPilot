import { describe, expect, it } from "vitest";

import {
  areInteractiveProviderOperationsEnabled,
  areLiveProviderOperationsEnabled,
  PUBLIC_RUNTIME_LIMITS,
  publicRuntimeConfigSchema,
} from "./public-runtime-config.js";

const validPublicRuntimeConfig = {
  abuseProtection: {
    appearance: "interaction-only",
    provider: "cloudflare_turnstile",
    siteKey: "",
  },
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
        limits: { ...PUBLIC_RUNTIME_LIMITS, callSeconds: 481 },
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
  });

  it("fails closed for live mode while paid operations are disabled", () => {
    const runtimeConfig = publicRuntimeConfigSchema.parse({
      ...validPublicRuntimeConfig,
      providerMode: "live",
    });

    expect(areInteractiveProviderOperationsEnabled(runtimeConfig)).toBe(false);
    expect(areLiveProviderOperationsEnabled(runtimeConfig)).toBe(false);
  });

  it("requires the site key to match the paid live boundary", () => {
    expect(
      publicRuntimeConfigSchema.safeParse({
        ...validPublicRuntimeConfig,
        abuseProtection: {
          ...validPublicRuntimeConfig.abuseProtection,
          siteKey: "must-not-be-public",
        },
        providerMode: "live",
      }).success,
    ).toBe(false);
    expect(
      publicRuntimeConfigSchema.safeParse({
        ...validPublicRuntimeConfig,
        paidOperationsEnabled: true,
      }).success,
    ).toBe(false);
    expect(
      publicRuntimeConfigSchema.safeParse({
        ...validPublicRuntimeConfig,
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
      paidOperationsEnabled: true,
      providerMode: "live",
    });
    expect(areInteractiveProviderOperationsEnabled(paidLiveConfig)).toBe(true);
    expect(areLiveProviderOperationsEnabled(paidLiveConfig)).toBe(true);
  });
});
