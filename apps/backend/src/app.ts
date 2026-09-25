import { randomBytes, randomUUID } from "node:crypto";

import cookieParser from "cookie-parser";
import express, { type Express } from "express";
import type { Logger } from "pino";

import {
  backendConfigSchema,
  type BackendConfig,
} from "./config/backend-config.schema.js";
import { createApiRouter } from "./http/api-router.js";
import { notFoundHandler, terminalErrorHandler } from "./http/map-api-error.js";
import { createAllowedOriginMiddleware } from "./http/middleware/allowed-origin.js";
import { createRequestAdmissionMiddleware } from "./http/middleware/request-admission.js";
import { createRequestIdMiddleware } from "./http/middleware/request-id.js";
import {
  createBackendLogger,
  createRequestLoggingMiddleware,
} from "./http/middleware/request-logging.js";
import { createSecurityHeadersMiddleware } from "./http/middleware/security-headers.js";
import type { ProviderAdapters } from "./providers/provider-adapters.js";
import { createAnonymousSessionCookieOptions } from "./security/anonymous-session-cookie.js";
import { createInterviewGrantService } from "./security/interview-grant.js";
import { createSpendCapacityGate } from "./security/spend-cap.js";
import { createStatelessRateLimiter } from "./security/stateless-rate-limit.js";
import { createGetDemoBootstrap } from "./use-cases/get-demo-bootstrap.js";
import {
  createAnalyzeCv,
  type CvAnalysisAdmission,
} from "./use-cases/analyze-cv.js";
import { createPrepareConversationFirst } from "./use-cases/prepare-conversation-first.js";
import {
  createVoiceToken,
  type VoiceTokenAdmission,
} from "./use-cases/create-voice-token.js";
import {
  createGenerateInterviewSummary,
  type InterviewSummaryAdmission,
} from "./use-cases/generate-interview-summary.js";

export type AppSecuritySecrets = Readonly<{
  anonymousCookieSecret: string;
  interviewGrantSigningSecret: string;
}>;

export type CreateAppOptions = Readonly<{
  clock?: () => Date;
  clockMilliseconds?: () => number;
  config: BackendConfig;
  cvAnalysisAdmission?: CvAnalysisAdmission;
  idGenerator?: () => string;
  logger?: Logger;
  providerAdapters: ProviderAdapters;
  securitySecrets?: AppSecuritySecrets;
  summaryAdmission?: InterviewSummaryAdmission;
  voiceTokenAdmission?: VoiceTokenAdmission;
}>;

function createEphemeralSecret(): string {
  return randomBytes(32).toString("base64url");
}

function resolveSecuritySecrets(
  config: BackendConfig,
  injected?: AppSecuritySecrets,
): AppSecuritySecrets {
  const resolved = injected ??
    // Blank fake-mode configuration gets process-local keys so local unpaid routes
    // remain usable. Production configuration requires durable injected secrets.
    {
      anonymousCookieSecret:
        config.security.anonymousCookieSecret ?? createEphemeralSecret(),
      interviewGrantSigningSecret:
        config.security.interviewGrantSigningSecret ?? createEphemeralSecret(),
    };
  if (
    resolved.anonymousCookieSecret.length < 32 ||
    resolved.interviewGrantSigningSecret.length < 32 ||
    resolved.anonymousCookieSecret === resolved.interviewGrantSigningSecret
  ) {
    throw new TypeError(
      "Cookie and grant secrets must be distinct and contain 32 characters.",
    );
  }
  return resolved;
}

function providerAdaptersAreReady(adapters: ProviderAdapters): boolean {
  return (
    typeof adapters.challengeVerifier.verifyChallenge === "function" &&
    typeof adapters.cvAnalyzer.analyzeCv === "function" &&
    typeof adapters.interviewSummarizer.summarizeInterview === "function" &&
    typeof adapters.voiceTokenProvider.createVoiceToken === "function"
  );
}

export function createApp(options: CreateAppOptions): Express {
  const parsedConfig = backendConfigSchema.parse(options.config);
  const clock = options.clock ?? (() => new Date());
  const clockMilliseconds = options.clockMilliseconds ?? Date.now;
  const idGenerator = options.idGenerator ?? randomUUID;
  const logger = options.logger ?? createBackendLogger(parsedConfig);
  const securitySecrets = resolveSecuritySecrets(
    parsedConfig,
    options.securitySecrets,
  );
  const grantService = createInterviewGrantService({
    clock,
    secret: securitySecrets.interviewGrantSigningSecret,
  });
  const getDemoBootstrap = createGetDemoBootstrap(parsedConfig.publicRuntime);
  const prepareConversationFirst = createPrepareConversationFirst({
    enabled: parsedConfig.effectiveMode !== "paid_disabled",
    grantService,
    grantTtlSeconds: parsedConfig.limits.interviewGrantTtlSeconds,
    idGenerator,
  });
  const analyzeCv = createAnalyzeCv({
    admission: options.cvAnalysisAdmission ?? (() => "allowed"),
    analyzer: options.providerAdapters.cvAnalyzer,
    enabled: parsedConfig.effectiveMode !== "paid_disabled",
    grantService,
    grantTtlSeconds: parsedConfig.limits.interviewGrantTtlSeconds,
    idGenerator,
    verifier: options.providerAdapters.challengeVerifier,
  });
  const issueVoiceToken = createVoiceToken({
    admission: options.voiceTokenAdmission ?? (() => "allowed"),
    enabled: parsedConfig.effectiveMode !== "paid_disabled",
    grantService,
    provider: options.providerAdapters.voiceTokenProvider,
    verifier: options.providerAdapters.challengeVerifier,
  });
  const generateInterviewSummary = createGenerateInterviewSummary({
    admission: options.summaryAdmission ?? (() => "allowed"),
    enabled: parsedConfig.effectiveMode !== "paid_disabled",
    grantService,
    summarizer: options.providerAdapters.interviewSummarizer,
    verifier: options.providerAdapters.challengeVerifier,
  });
  const rateLimiter = createStatelessRateLimiter({
    clockMilliseconds,
    maxEntries: parsedConfig.limits.rateLimit.maxEntries,
    windowSeconds: parsedConfig.limits.rateLimit.windowSeconds,
  });
  const capacityGate = createSpendCapacityGate({
    globalMaximum: parsedConfig.limits.capacity.globalConcurrentRequests,
    routeMaximums: {
      cv_analyze: parsedConfig.limits.capacity.cvAnalyzeConcurrentRequests,
      interview_summary: parsedConfig.limits.capacity.summaryConcurrentRequests,
      voice_token: parsedConfig.limits.capacity.voiceTokenConcurrentRequests,
    },
  });
  const requestAdmission = {
    bootstrap: createRequestAdmissionMiddleware({
      capacityGate,
      policy: {
        label: "Demo startup",
        rateLimit: parsedConfig.limits.rateLimit.bootstrapRequests,
        route: "demo_bootstrap",
        session: "optional",
      },
      rateLimiter,
    }),
    cvAnalyze: createRequestAdmissionMiddleware({
      capacityGate,
      policy: {
        capacityRoute: "cv_analyze",
        label: "CV analysis",
        rateLimit: parsedConfig.limits.rateLimit.cvAnalyzeRequests,
        route: "cv_analyze",
        session: "required",
      },
      rateLimiter,
    }),
    interviewPrepare: createRequestAdmissionMiddleware({
      capacityGate,
      policy: {
        label: "Interview preparation",
        rateLimit: parsedConfig.limits.rateLimit.prepareRequests,
        route: "interview_prepare",
        session: "required",
      },
      rateLimiter,
    }),
    interviewSummary: createRequestAdmissionMiddleware({
      capacityGate,
      policy: {
        capacityRoute: "interview_summary",
        label: "Interview summary",
        rateLimit: parsedConfig.limits.rateLimit.summaryRequests,
        route: "interview_summary",
        session: "required",
      },
      rateLimiter,
    }),
    voiceToken: createRequestAdmissionMiddleware({
      capacityGate,
      policy: {
        capacityRoute: "voice_token",
        label: "Voice interview start",
        rateLimit: parsedConfig.limits.rateLimit.voiceTokenRequests,
        route: "voice_token",
        session: "required",
      },
      rateLimiter,
    }),
  } as const;
  const app = express();

  app.disable("x-powered-by");
  app.set(
    "trust proxy",
    parsedConfig.appEnvironment === "production" ? 1 : false,
  );

  app.use(createRequestIdMiddleware(idGenerator));
  app.use(
    ...createRequestLoggingMiddleware({
      clockMilliseconds,
      logger,
    }),
  );
  app.use(createSecurityHeadersMiddleware());
  app.use(createAllowedOriginMiddleware(parsedConfig.origins.allowed));
  app.use(
    express.json({
      limit: parsedConfig.limits.httpJsonBodyBytes,
      strict: true,
      type: "application/json",
    }),
  );
  app.use(cookieParser(securitySecrets.anonymousCookieSecret));
  app.use(
    createApiRouter({
      allowedOrigins: parsedConfig.origins.allowed,
      analyzeCv,
      cookieOptions: createAnonymousSessionCookieOptions({
        appEnvironment: parsedConfig.appEnvironment,
        ttlSeconds: parsedConfig.limits.anonymousCookieTtlSeconds,
      }),
      getDemoBootstrap,
      generateInterviewSummary,
      idGenerator,
      issueVoiceToken,
      isReady: () =>
        backendConfigSchema.safeParse(parsedConfig).success &&
        providerAdaptersAreReady(options.providerAdapters),
      prepareConversationFirst,
      requestAdmission,
    }),
  );
  app.use(notFoundHandler);
  app.use(terminalErrorHandler);

  return app;
}
