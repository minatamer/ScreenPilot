import { describe, expect, it } from "vitest";

import { backendConfigSchema } from "./backend-config.schema.js";
import {
  BackendConfigError,
  loadBackendConfig,
} from "./load-backend-config.js";

const fakeEnvironment = {
  ALLOWED_ORIGINS: "http://localhost:3000",
  ANONYMOUS_COOKIE_SECRET: "",
  APP_ENV: "local",
  ELEVENLABS_AGENT_ID: "",
  ELEVENLABS_API_KEY: "",
  ELEVENLABS_VOICE_ID: "",
  INTERVIEW_GRANT_SIGNING_SECRET: "",
  OPENAI_API_KEY: "",
  PAID_DEMO_ENABLED: "false",
  PORT: "3001",
  PROVIDER_MODE: "fake",
  TURNSTILE_ALLOWED_HOSTNAMES: "",
  TURNSTILE_SECRET_KEY: "",
  TURNSTILE_SITE_KEY: "",
} as const;

const liveEnvironment = {
  ...fakeEnvironment,
  ALLOWED_ORIGINS: "https://demo.screenpilot.invalid",
  ANONYMOUS_COOKIE_SECRET: "unit-test-cookie-secret-000000000000",
  APP_ENV: "production",
  ELEVENLABS_AGENT_ID: "not-a-real-agent-id",
  ELEVENLABS_API_KEY: "not-a-real-elevenlabs-key",
  ELEVENLABS_VOICE_ID: "not-a-real-voice-id",
  INTERVIEW_GRANT_SIGNING_SECRET: "unit-test-grant-secret-0000000000000",
  OPENAI_API_KEY: "not-a-real-openai-key",
  PAID_DEMO_ENABLED: "true",
  PROVIDER_MODE: "live",
  TURNSTILE_ALLOWED_HOSTNAMES: "demo.screenpilot.invalid",
  TURNSTILE_SECRET_KEY: "not-a-real-turnstile-secret",
  TURNSTILE_SITE_KEY: "not-a-real-turnstile-site-key",
} as const;

const summaryRehearsalEnvironment = {
  ...liveEnvironment,
  ALLOWED_ORIGINS: "http://localhost:3000",
  APP_ENV: "local",
  ELEVENLABS_AGENT_ID: "",
  ELEVENLABS_API_KEY: "",
  ELEVENLABS_VOICE_ID: "",
  LIVE_INTERVIEW_ENABLED: "false",
  TURNSTILE_ALLOWED_HOSTNAMES: "localhost",
} as const;

const publishedTurnstileTestSiteKeys = [
  "1x00000000000000000000AA",
  "2x00000000000000000000AB",
  "1x00000000000000000000BB",
  "2x00000000000000000000BB",
  "3x00000000000000000000FF",
] as const;

const publishedTurnstileTestSecretKeys = [
  "1x0000000000000000000000000000000AA",
  "2x0000000000000000000000000000000AA",
  "3x0000000000000000000000000000000AA",
] as const;

describe("loadBackendConfig", () => {
  it.each([
    ["local fake", fakeEnvironment],
    ["test fake", { ...fakeEnvironment, APP_ENV: "test" }],
    ["production live", liveEnvironment],
  ])("loads a valid %s example", (_name, environment) => {
    const config = loadBackendConfig(environment);

    expect(config.appEnvironment).toBe(environment.APP_ENV);
    expect(config.effectiveMode).toBe(
      environment.PROVIDER_MODE === "fake"
        ? "deterministic_fake"
        : "standard_live",
    );
    expect(config.providerMode).toBe(environment.PROVIDER_MODE);
    expect(config.providers.openAi.model).toBe("gpt-5.4-mini");
    expect(config.providers.openAi.reasoning).toBe("none");
    expect(config.providers.openAi.store).toBe(false);
    expect(config.providers.elevenLabs.sttModel).toBe("scribe_v2_realtime");
    expect(config.providers.elevenLabs.ttsModel).toBe("eleven_flash_v2_5");
  });

  it("keeps fake mode valid with every user-owned field blank", () => {
    const config = loadBackendConfig(fakeEnvironment);

    expect(config.providers.openAi.apiKey).toBeNull();
    expect(config.providers.elevenLabs.apiKey).toBeNull();
    expect(config.providers.turnstile.secretKey).toBeNull();
    expect(config.security.anonymousCookieSecret).toBeNull();
    expect(config.publicRuntime.abuseProtection.siteKey).toBe("");
    expect(config.publicRuntime.effectiveMode).toBe("deterministic_fake");
  });

  it("loads local summary rehearsal without ElevenLabs configuration", () => {
    const config = loadBackendConfig(summaryRehearsalEnvironment);

    expect(config.effectiveMode).toBe("summary_rehearsal");
    expect(config.publicRuntime).toMatchObject({
      effectiveMode: "summary_rehearsal",
      paidOperationsEnabled: true,
      providerMode: "live",
    });
    expect(config.providers.elevenLabs).toMatchObject({
      agentId: null,
      apiKey: null,
      voiceId: null,
    });
    expect(config.providers.openAi.apiKey).not.toBeNull();
    expect(config.providers.turnstile.secretKey).not.toBeNull();
  });

  it.each([
    [
      "test live mode",
      {
        ...summaryRehearsalEnvironment,
        APP_ENV: "test",
      },
    ],
    [
      "production live mode",
      {
        ...liveEnvironment,
        LIVE_INTERVIEW_ENABLED: "false",
      },
    ],
  ])("rejects summary rehearsal in %s", (_name, environment) => {
    expect(() => loadBackendConfig(environment)).toThrow(
      /summary rehearsal only in local paid live mode/i,
    );
  });

  it.each([
    ["absent", undefined],
    ["true", "true"],
    ["false", "false"],
  ] as const)(
    "keeps fake mode deterministic when the interview flag is %s",
    (_name, liveInterviewEnabled) => {
      const config = loadBackendConfig({
        ...fakeEnvironment,
        ...(liveInterviewEnabled === undefined
          ? {}
          : { LIVE_INTERVIEW_ENABLED: liveInterviewEnabled }),
      });

      expect(config.effectiveMode).toBe("deterministic_fake");
      expect(config.publicRuntime.effectiveMode).toBe("deterministic_fake");
    },
  );

  it.each([
    ["absent", undefined],
    ["true", "true"],
    ["false", "false"],
  ] as const)(
    "keeps paid-disabled live mode closed when the interview flag is %s",
    (_name, liveInterviewEnabled) => {
      const config = loadBackendConfig({
        ...summaryRehearsalEnvironment,
        PAID_DEMO_ENABLED: "false",
        ...(liveInterviewEnabled === undefined
          ? { LIVE_INTERVIEW_ENABLED: undefined }
          : { LIVE_INTERVIEW_ENABLED: liveInterviewEnabled }),
      });

      expect(config.effectiveMode).toBe("paid_disabled");
      expect(config.publicRuntime.effectiveMode).toBe("paid_disabled");
    },
  );

  it.each([
    ["absent", undefined, "standard_live"],
    ["true", "true", "standard_live"],
    ["false", "false", "summary_rehearsal"],
  ] as const)(
    "derives the expected local paid live mode when the flag is %s",
    (_flagName, liveInterviewEnabled, expectedMode) => {
      const config = loadBackendConfig({
        ...liveEnvironment,
        ALLOWED_ORIGINS: "http://localhost:3000",
        APP_ENV: "local",
        TURNSTILE_ALLOWED_HOSTNAMES: "localhost",
        ...(liveInterviewEnabled === undefined
          ? { LIVE_INTERVIEW_ENABLED: undefined }
          : { LIVE_INTERVIEW_ENABLED: liveInterviewEnabled }),
      });

      expect(config.effectiveMode).toBe(expectedMode);
      expect(config.publicRuntime.effectiveMode).toBe(expectedMode);
    },
  );

  it("projects the Turnstile site key only when paid live mode is enabled", () => {
    const fakeConfig = loadBackendConfig({
      ...fakeEnvironment,
      TURNSTILE_SITE_KEY: "configured-local-site-key",
    });
    const paidDisabledLiveConfig = loadBackendConfig({
      ...liveEnvironment,
      PAID_DEMO_ENABLED: "false",
    });
    const liveConfig = loadBackendConfig(liveEnvironment);

    expect(fakeConfig.providers.turnstile.siteKey).toBe(
      "configured-local-site-key",
    );
    expect(fakeConfig.publicRuntime.abuseProtection.siteKey).toBe("");
    expect(paidDisabledLiveConfig.publicRuntime.abuseProtection.siteKey).toBe(
      "",
    );
    expect(paidDisabledLiveConfig.publicRuntime).toMatchObject({
      paidOperationsEnabled: false,
      providerMode: "live",
    });
    expect(liveConfig.publicRuntime.abuseProtection.siteKey).toBe(
      liveEnvironment.TURNSTILE_SITE_KEY,
    );
    expect(liveConfig.publicRuntime).toMatchObject({
      paidOperationsEnabled: true,
      providerMode: "live",
    });
  });

  it.each(publishedTurnstileTestSiteKeys)(
    "accepts Cloudflare's published test site key %s outside production",
    (siteKey) => {
      const config = loadBackendConfig({
        ...liveEnvironment,
        ALLOWED_ORIGINS: "http://localhost:3000",
        APP_ENV: "test",
        TURNSTILE_ALLOWED_HOSTNAMES: "localhost",
        TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
        TURNSTILE_SITE_KEY: siteKey,
      });

      expect(config.providerMode).toBe("live");
    },
  );

  it.each(publishedTurnstileTestSecretKeys)(
    "rejects Cloudflare's published test secret key %s in production",
    (secretKey) => {
      expect(() =>
        loadBackendConfig({
          ...liveEnvironment,
          TURNSTILE_SECRET_KEY: secretKey,
        }),
      ).toThrow(/test keys are forbidden/i);
    },
  );

  it("rejects production fake mode", () => {
    expect(() =>
      loadBackendConfig({ ...fakeEnvironment, APP_ENV: "production" }),
    ).toThrow(BackendConfigError);
  });

  it.each(publishedTurnstileTestSiteKeys)(
    "rejects Cloudflare's published test site key %s in production",
    (siteKey) => {
      expect(() =>
        loadBackendConfig({
          ...liveEnvironment,
          TURNSTILE_SITE_KEY: siteKey,
        }),
      ).toThrow(/test keys are forbidden/i);
    },
  );

  it("rejects incomplete live groups without printing secret values", () => {
    const privateValue = "private-test-value-that-must-not-appear";

    expect.assertions(4);
    try {
      loadBackendConfig({
        ...liveEnvironment,
        ELEVENLABS_API_KEY: "",
        OPENAI_API_KEY: privateValue,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(BackendConfigError);
      expect(String(error)).toContain("ELEVENLABS_API_KEY");
      expect(String(error)).not.toContain(privateValue);
      expect(String(error)).not.toContain("not-a-real-turnstile-secret");
    }
  });

  it.each([
    ["invalid provider enum", { PROVIDER_MODE: "automatic" }],
    ["invalid application enum", { APP_ENV: "preview" }],
    ["invalid live-interview flag", { LIVE_INTERVIEW_ENABLED: "sometimes" }],
    ["malformed port", { PORT: "three-thousand" }],
    ["out-of-range body limit", { HTTP_JSON_BODY_MAX_BYTES: "1023" }],
    ["out-of-range rate limit", { RATE_LIMIT_VOICE_TOKEN_REQUESTS: "0" }],
    ["invalid origin URL", { ALLOWED_ORIGINS: "localhost:3000/path" }],
  ])("rejects %s", (_name, override) => {
    expect(() =>
      loadBackendConfig({ ...fakeEnvironment, ...override }),
    ).toThrow(BackendConfigError);
  });

  it("rejects invalid live hostnames and production HTTP origins", () => {
    expect(() =>
      loadBackendConfig({
        ...liveEnvironment,
        TURNSTILE_ALLOWED_HOSTNAMES: "https://demo.screenpilot.invalid/path",
      }),
    ).toThrow(/bare hostnames/i);
    expect(() =>
      loadBackendConfig({
        ...liveEnvironment,
        ALLOWED_ORIGINS: "http://demo.screenpilot.invalid",
      }),
    ).toThrow(/HTTPS/i);
  });

  it("rejects altered locked Turnstile actions", () => {
    const config = loadBackendConfig(fakeEnvironment);
    const result = backendConfigSchema.safeParse({
      ...config,
      providers: {
        ...config.providers,
        turnstile: {
          ...config.providers.turnstile,
          actions: {
            ...config.providers.turnstile.actions,
            cvAnalyze: "voice_token",
          },
        },
      },
    });

    expect(result.success).toBe(false);
  });

  it("exposes only the strict public-runtime projection", () => {
    const config = loadBackendConfig(liveEnvironment);
    const serializedPublicConfig = JSON.stringify(config.publicRuntime);

    expect(serializedPublicConfig).not.toContain("OPENAI_API_KEY");
    expect(serializedPublicConfig).not.toContain("not-a-real-openai-key");
    expect(serializedPublicConfig).not.toContain("ANONYMOUS_COOKIE_SECRET");
    expect(Object.keys(config.publicRuntime).sort()).toEqual([
      "abuseProtection",
      "effectiveMode",
      "limits",
      "paidOperationsEnabled",
      "privacyNoticeVersion",
      "providerMode",
    ]);
  });
});
