import {
  PUBLIC_RUNTIME_LIMITS,
  publicRuntimeConfigSchema,
} from "@screenpilot/contracts/api/public-runtime-config";
import { z } from "zod";

import {
  APP_ENVIRONMENTS,
  LOCKED_PROVIDER_SETTINGS,
  PROVIDER_MODES,
  TURNSTILE_ACTIONS,
} from "./provider-mode.js";

const hostnamePattern =
  /^(?:localhost|(?=.{1,253}$)(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)*[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?)$/i;
const publishedTurnstileTestKeyPattern = /^[123]x0{10,}(?:AA|AB|BB|FF)$/;
const providerIdentifierPattern = /^[A-Za-z\d_-]+$/;

const integerEnvironmentValue = (minimum: number, maximum: number) =>
  z
    .string()
    .regex(/^\d+$/, "Expected a base-10 integer.")
    .transform(Number)
    .pipe(z.number().int().min(minimum).max(maximum));

const booleanEnvironmentValue = z
  .enum(["false", "true"])
  .transform((value) => value === "true");

const blankableSecret = z
  .string()
  .max(512)
  .refine(
    (value) => value === "" || value.trim().length > 0,
    "Must be exactly blank or contain a non-whitespace value.",
  );

const blankableProviderIdentifier = z
  .string()
  .max(256)
  .refine(
    (value) => value === "" || providerIdentifierPattern.test(value),
    "Must be exactly blank or an alphanumeric provider identifier.",
  );

const allowedOriginsSchema = z.string().transform((value, context) => {
  const origins = value.split(",").map((origin) => origin.trim());

  if (origins.length === 0 || origins.length > 8 || origins.includes("")) {
    context.addIssue({
      code: "custom",
      message: "Expected one to eight comma-separated origins.",
    });
    return [];
  }

  const normalizedOrigins: string[] = [];
  for (const origin of origins) {
    try {
      const parsedOrigin = new URL(origin);
      const isHttp = ["http:", "https:"].includes(parsedOrigin.protocol);
      const hasOnlyOrigin =
        parsedOrigin.pathname === "/" &&
        parsedOrigin.search === "" &&
        parsedOrigin.hash === "";
      const hasCredentials =
        parsedOrigin.username !== "" || parsedOrigin.password !== "";

      if (!isHttp || !hasOnlyOrigin || hasCredentials) {
        throw new Error("Invalid origin boundary.");
      }

      normalizedOrigins.push(parsedOrigin.origin);
    } catch {
      context.addIssue({
        code: "custom",
        message:
          "Every allowed origin must be an HTTP(S) origin without a path.",
      });
      return [];
    }
  }

  if (new Set(normalizedOrigins).size !== normalizedOrigins.length) {
    context.addIssue({
      code: "custom",
      message: "Allowed origins must be unique.",
    });
  }

  return normalizedOrigins;
});

const allowedHostnamesSchema = z.string().transform((value, context) => {
  if (value === "") {
    return [];
  }

  const hostnames = value
    .split(",")
    .map((hostname) => hostname.trim().toLowerCase());

  if (hostnames.length > 10 || hostnames.includes("")) {
    context.addIssue({
      code: "custom",
      message: "Expected at most ten comma-separated hostnames.",
    });
    return [];
  }

  if (hostnames.some((hostname) => !hostnamePattern.test(hostname))) {
    context.addIssue({
      code: "custom",
      message: "Expected bare hostnames without a scheme, port, or path.",
    });
    return [];
  }

  if (new Set(hostnames).size !== hostnames.length) {
    context.addIssue({
      code: "custom",
      message: "Allowed hostnames must be unique.",
    });
  }

  return hostnames;
});

export const backendEnvironmentSchema = z
  .object({
    ALLOWED_ORIGINS: allowedOriginsSchema.default(["http://localhost:3000"]),
    ANONYMOUS_COOKIE_SECRET: blankableSecret.default(""),
    ANONYMOUS_COOKIE_TTL_SECONDS: integerEnvironmentValue(300, 86_400).default(
      7_200,
    ),
    APP_ENV: z.enum(APP_ENVIRONMENTS).default("local"),
    ELEVENLABS_AGENT_ID: blankableProviderIdentifier.default(""),
    ELEVENLABS_API_KEY: blankableSecret.default(""),
    ELEVENLABS_VOICE_ID: blankableProviderIdentifier.default(""),
    HTTP_JSON_BODY_MAX_BYTES: integerEnvironmentValue(1_024, 1_048_576).default(
      65_536,
    ),
    INTERVIEW_GRANT_SIGNING_SECRET: blankableSecret.default(""),
    INTERVIEW_GRANT_TTL_SECONDS: integerEnvironmentValue(60, 3_600).default(
      900,
    ),
    OPENAI_API_KEY: blankableSecret.default(""),
    PAID_DEMO_ENABLED: booleanEnvironmentValue.default(false),
    PORT: integerEnvironmentValue(1, 65_535).default(3_001),
    PROVIDER_MODE: z.enum(PROVIDER_MODES).default("fake"),
    PROVIDER_REQUEST_TIMEOUT_MS: integerEnvironmentValue(
      1_000,
      120_000,
    ).default(30_000),
    RATE_LIMIT_BOOTSTRAP_REQUESTS: integerEnvironmentValue(1, 10_000).default(
      120,
    ),
    RATE_LIMIT_CV_ANALYZE_REQUESTS: integerEnvironmentValue(1, 1_000).default(
      10,
    ),
    RATE_LIMIT_MAX_ENTRIES: integerEnvironmentValue(100, 100_000).default(
      10_000,
    ),
    RATE_LIMIT_PREPARE_REQUESTS: integerEnvironmentValue(1, 10_000).default(30),
    RATE_LIMIT_SUMMARY_REQUESTS: integerEnvironmentValue(1, 1_000).default(10),
    RATE_LIMIT_VOICE_TOKEN_REQUESTS: integerEnvironmentValue(1, 100).default(3),
    RATE_LIMIT_WINDOW_SECONDS: integerEnvironmentValue(10, 3_600).default(60),
    TURNSTILE_ALLOWED_HOSTNAMES: allowedHostnamesSchema.default([]),
    TURNSTILE_SECRET_KEY: blankableSecret.default(""),
    TURNSTILE_SITE_KEY: blankableProviderIdentifier.default(""),
  })
  .superRefine((environment, context) => {
    const requiresLiveConfiguration =
      environment.PROVIDER_MODE === "live" ||
      environment.APP_ENV === "production";

    if (
      environment.APP_ENV === "production" &&
      environment.PROVIDER_MODE !== "live"
    ) {
      context.addIssue({
        code: "custom",
        message: "Production requires live provider mode.",
        path: ["PROVIDER_MODE"],
      });
    }

    if (environment.PROVIDER_MODE === "fake" && environment.PAID_DEMO_ENABLED) {
      context.addIssue({
        code: "custom",
        message: "Paid demo operations cannot be enabled in fake mode.",
        path: ["PAID_DEMO_ENABLED"],
      });
    }

    if (requiresLiveConfiguration) {
      const requiredLiveFields = [
        "OPENAI_API_KEY",
        "ELEVENLABS_API_KEY",
        "ELEVENLABS_AGENT_ID",
        "ELEVENLABS_VOICE_ID",
        "TURNSTILE_SITE_KEY",
        "TURNSTILE_SECRET_KEY",
        "INTERVIEW_GRANT_SIGNING_SECRET",
        "ANONYMOUS_COOKIE_SECRET",
      ] as const;

      for (const field of requiredLiveFields) {
        if (environment[field] === "") {
          context.addIssue({
            code: "custom",
            message: "Required in live or production mode.",
            path: [field],
          });
        }
      }

      if (environment.TURNSTILE_ALLOWED_HOSTNAMES.length === 0) {
        context.addIssue({
          code: "custom",
          message: "At least one hostname is required in live mode.",
          path: ["TURNSTILE_ALLOWED_HOSTNAMES"],
        });
      }

      if (environment.INTERVIEW_GRANT_SIGNING_SECRET.length < 32) {
        context.addIssue({
          code: "custom",
          message: "Must contain at least 32 characters.",
          path: ["INTERVIEW_GRANT_SIGNING_SECRET"],
        });
      }

      if (environment.ANONYMOUS_COOKIE_SECRET.length < 32) {
        context.addIssue({
          code: "custom",
          message: "Must contain at least 32 characters.",
          path: ["ANONYMOUS_COOKIE_SECRET"],
        });
      }

      if (
        environment.INTERVIEW_GRANT_SIGNING_SECRET !== "" &&
        environment.INTERVIEW_GRANT_SIGNING_SECRET ===
          environment.ANONYMOUS_COOKIE_SECRET
      ) {
        context.addIssue({
          code: "custom",
          message: "Must differ from the interview-grant signing secret.",
          path: ["ANONYMOUS_COOKIE_SECRET"],
        });
      }
    }

    if (environment.APP_ENV === "production") {
      if (
        environment.ALLOWED_ORIGINS.some(
          (origin) => !origin.startsWith("https://"),
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "Production origins must use HTTPS.",
          path: ["ALLOWED_ORIGINS"],
        });
      }

      if (
        environment.TURNSTILE_ALLOWED_HOSTNAMES.some(
          (hostname) =>
            hostname === "localhost" || hostname.endsWith(".localhost"),
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "Production hostnames cannot use localhost.",
          path: ["TURNSTILE_ALLOWED_HOSTNAMES"],
        });
      }

      for (const field of [
        "TURNSTILE_SITE_KEY",
        "TURNSTILE_SECRET_KEY",
      ] as const) {
        if (publishedTurnstileTestKeyPattern.test(environment[field])) {
          context.addIssue({
            code: "custom",
            message:
              "Published Turnstile test keys are forbidden in production.",
            path: [field],
          });
        }
      }
    }
  });

const nullableSecretSchema = z.string().nullable();

export const backendConfigSchema = z.strictObject({
  appEnvironment: z.enum(APP_ENVIRONMENTS),
  limits: z.strictObject({
    anonymousCookieTtlSeconds: z.number().int().min(300).max(86_400),
    httpJsonBodyBytes: z.number().int().min(1_024).max(1_048_576),
    interviewGrantTtlSeconds: z.number().int().min(60).max(3_600),
    providerRequestTimeoutMs: z.number().int().min(1_000).max(120_000),
    rateLimit: z.strictObject({
      bootstrapRequests: z.number().int().min(1).max(10_000),
      cvAnalyzeRequests: z.number().int().min(1).max(1_000),
      maxEntries: z.number().int().min(100).max(100_000),
      prepareRequests: z.number().int().min(1).max(10_000),
      summaryRequests: z.number().int().min(1).max(1_000),
      voiceTokenRequests: z.number().int().min(1).max(100),
      windowSeconds: z.number().int().min(10).max(3_600),
    }),
  }),
  origins: z.strictObject({
    allowed: z.array(z.url()).min(1).max(8),
  }),
  paidDemoEnabled: z.boolean(),
  port: z.number().int().min(1).max(65_535),
  providerMode: z.enum(PROVIDER_MODES),
  providers: z.strictObject({
    elevenLabs: z.strictObject({
      agentId: nullableSecretSchema,
      agentPlatform: z.literal(
        LOCKED_PROVIDER_SETTINGS.elevenLabsAgentPlatform,
      ),
      apiKey: nullableSecretSchema,
      sttModel: z.literal(LOCKED_PROVIDER_SETTINGS.elevenLabsSttModel),
      ttsModel: z.literal(LOCKED_PROVIDER_SETTINGS.elevenLabsTtsModel),
      voiceId: nullableSecretSchema,
    }),
    openAi: z.strictObject({
      apiKey: nullableSecretSchema,
      model: z.literal(LOCKED_PROVIDER_SETTINGS.openAiModel),
      reasoning: z.literal(LOCKED_PROVIDER_SETTINGS.openAiReasoning),
      store: z.literal(LOCKED_PROVIDER_SETTINGS.openAiStore),
    }),
    turnstile: z.strictObject({
      actions: z.strictObject({
        cvAnalyze: z.literal(TURNSTILE_ACTIONS.cvAnalyze),
        interviewSummary: z.literal(TURNSTILE_ACTIONS.interviewSummary),
        voiceToken: z.literal(TURNSTILE_ACTIONS.voiceToken),
      }),
      allowedHostnames: z.array(z.string().regex(hostnamePattern)).max(10),
      secretKey: nullableSecretSchema,
      siteKey: nullableSecretSchema,
      verificationUrl: z.literal(
        LOCKED_PROVIDER_SETTINGS.turnstileVerificationUrl,
      ),
    }),
  }),
  publicRuntime: publicRuntimeConfigSchema,
  security: z.strictObject({
    anonymousCookieSecret: nullableSecretSchema,
    interviewGrantSigningSecret: nullableSecretSchema,
  }),
});

export type BackendConfig = z.infer<typeof backendConfigSchema>;
export type BackendEnvironment = z.infer<typeof backendEnvironmentSchema>;

export const createBackendConfigCandidate = (
  environment: BackendEnvironment,
): BackendConfig => ({
  appEnvironment: environment.APP_ENV,
  limits: {
    anonymousCookieTtlSeconds: environment.ANONYMOUS_COOKIE_TTL_SECONDS,
    httpJsonBodyBytes: environment.HTTP_JSON_BODY_MAX_BYTES,
    interviewGrantTtlSeconds: environment.INTERVIEW_GRANT_TTL_SECONDS,
    providerRequestTimeoutMs: environment.PROVIDER_REQUEST_TIMEOUT_MS,
    rateLimit: {
      bootstrapRequests: environment.RATE_LIMIT_BOOTSTRAP_REQUESTS,
      cvAnalyzeRequests: environment.RATE_LIMIT_CV_ANALYZE_REQUESTS,
      maxEntries: environment.RATE_LIMIT_MAX_ENTRIES,
      prepareRequests: environment.RATE_LIMIT_PREPARE_REQUESTS,
      summaryRequests: environment.RATE_LIMIT_SUMMARY_REQUESTS,
      voiceTokenRequests: environment.RATE_LIMIT_VOICE_TOKEN_REQUESTS,
      windowSeconds: environment.RATE_LIMIT_WINDOW_SECONDS,
    },
  },
  origins: { allowed: environment.ALLOWED_ORIGINS },
  paidDemoEnabled: environment.PAID_DEMO_ENABLED,
  port: environment.PORT,
  providerMode: environment.PROVIDER_MODE,
  providers: {
    elevenLabs: {
      agentId: environment.ELEVENLABS_AGENT_ID || null,
      agentPlatform: LOCKED_PROVIDER_SETTINGS.elevenLabsAgentPlatform,
      apiKey: environment.ELEVENLABS_API_KEY || null,
      sttModel: LOCKED_PROVIDER_SETTINGS.elevenLabsSttModel,
      ttsModel: LOCKED_PROVIDER_SETTINGS.elevenLabsTtsModel,
      voiceId: environment.ELEVENLABS_VOICE_ID || null,
    },
    openAi: {
      apiKey: environment.OPENAI_API_KEY || null,
      model: LOCKED_PROVIDER_SETTINGS.openAiModel,
      reasoning: LOCKED_PROVIDER_SETTINGS.openAiReasoning,
      store: LOCKED_PROVIDER_SETTINGS.openAiStore,
    },
    turnstile: {
      actions: TURNSTILE_ACTIONS,
      allowedHostnames: environment.TURNSTILE_ALLOWED_HOSTNAMES,
      secretKey: environment.TURNSTILE_SECRET_KEY || null,
      siteKey: environment.TURNSTILE_SITE_KEY || null,
      verificationUrl: LOCKED_PROVIDER_SETTINGS.turnstileVerificationUrl,
    },
  },
  publicRuntime: {
    abuseProtection: {
      appearance: LOCKED_PROVIDER_SETTINGS.turnstileAppearance,
      provider: LOCKED_PROVIDER_SETTINGS.turnstileProvider,
      siteKey:
        environment.PROVIDER_MODE === "live" && environment.PAID_DEMO_ENABLED
          ? environment.TURNSTILE_SITE_KEY
          : "",
    },
    limits: PUBLIC_RUNTIME_LIMITS,
    paidOperationsEnabled: environment.PAID_DEMO_ENABLED,
    privacyNoticeVersion: "2026-08-31",
    providerMode: environment.PROVIDER_MODE,
  },
  security: {
    anonymousCookieSecret: environment.ANONYMOUS_COOKIE_SECRET || null,
    interviewGrantSigningSecret:
      environment.INTERVIEW_GRANT_SIGNING_SECRET || null,
  },
});
