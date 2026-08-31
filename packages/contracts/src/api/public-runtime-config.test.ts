import { describe, expect, it } from "vitest";

import {
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
  paidVoiceEnabled: false,
  privacyNoticeVersion: "2026-08-31",
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
});
