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
import { createRequestIdMiddleware } from "./http/middleware/request-id.js";
import {
  createBackendLogger,
  createRequestLoggingMiddleware,
} from "./http/middleware/request-logging.js";
import { createSecurityHeadersMiddleware } from "./http/middleware/security-headers.js";
import type { ProviderAdapters } from "./providers/provider-adapters.js";
import { createAnonymousSessionCookieOptions } from "./security/anonymous-session-cookie.js";
import { createInterviewGrantService } from "./security/interview-grant.js";
import { createGetDemoBootstrap } from "./use-cases/get-demo-bootstrap.js";
import { createPrepareConversationFirst } from "./use-cases/prepare-conversation-first.js";

export type AppSecuritySecrets = Readonly<{
  anonymousCookieSecret: string;
  interviewGrantSigningSecret: string;
}>;

export type CreateAppOptions = Readonly<{
  clock?: () => Date;
  clockMilliseconds?: () => number;
  config: BackendConfig;
  idGenerator?: () => string;
  logger?: Logger;
  providerAdapters: ProviderAdapters;
  securitySecrets?: AppSecuritySecrets;
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
    grantService,
    grantTtlSeconds: parsedConfig.limits.interviewGrantTtlSeconds,
    idGenerator,
  });
  const app = express();

  app.disable("x-powered-by");
  app.set(
    "trust proxy",
    parsedConfig.appEnvironment === "production" ? 1 : false,
  );

  app.use(createRequestIdMiddleware(idGenerator));
  app.use(
    ...createRequestLoggingMiddleware({
      clockMilliseconds: options.clockMilliseconds ?? Date.now,
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
      cookieOptions: createAnonymousSessionCookieOptions({
        appEnvironment: parsedConfig.appEnvironment,
        ttlSeconds: parsedConfig.limits.anonymousCookieTtlSeconds,
      }),
      getDemoBootstrap,
      idGenerator,
      isReady: () =>
        backendConfigSchema.safeParse(parsedConfig).success &&
        providerAdaptersAreReady(options.providerAdapters),
      prepareConversationFirst,
    }),
  );
  app.use(notFoundHandler);
  app.use(terminalErrorHandler);

  return app;
}
