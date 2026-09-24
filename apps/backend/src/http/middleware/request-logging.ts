import type { RequestHandler } from "express";
import pino, { type DestinationStream, type Logger } from "pino";
import { pinoHttp } from "pino-http";

import type { BackendConfig } from "../../config/backend-config.schema.js";
import { getRequestId } from "./request-id.js";

const REDACTED_LOG_PATHS = [
  "req",
  "request",
  "headers",
  "authorization",
  "apiKey",
  "anonymousSessionId",
  "cookie",
  "cookies",
  "cvText",
  "interviewGrant",
  "turnstileToken",
  "conversationToken",
  "providerToken",
  "accessToken",
  "refreshToken",
  "secret",
  "token",
  "hostname",
  "ip",
  "ips",
  "remoteAddress",
  "*.authorization",
  "*.apiKey",
  "*.anonymousSessionId",
  "*.cookie",
  "*.cookies",
  "*.cvText",
  "*.interviewGrant",
  "*.turnstileToken",
  "*.conversationToken",
  "*.providerToken",
  "*.accessToken",
  "*.refreshToken",
  "*.secret",
  "*.token",
  "*.hostname",
  "*.ip",
  "*.ips",
  "*.remoteAddress",
] as const;

export function createBackendLogger(
  config: Pick<BackendConfig, "appEnvironment">,
  destination?: DestinationStream,
): Logger {
  return pino(
    {
      base: {
        environment: config.appEnvironment,
        service: "screenpilot-backend",
      },
      level: config.appEnvironment === "test" ? "silent" : "info",
      redact: {
        censor: "[REDACTED]",
        paths: [...REDACTED_LOG_PATHS],
      },
    },
    destination,
  );
}

export function createRequestLoggingMiddleware(input: {
  clockMilliseconds: () => number;
  logger: Logger;
}): readonly RequestHandler[] {
  const attachRequestLogger = pinoHttp({
    autoLogging: false,
    logger: input.logger,
    quietReqLogger: true,
  });
  const logCompletedRequest: RequestHandler = (request, response, next) => {
    const startedAt = input.clockMilliseconds();
    response.once("finish", () => {
      input.logger.info({
        durationMs: Math.max(0, input.clockMilliseconds() - startedAt),
        event: "request_completed",
        method: request.method,
        requestId: getRequestId(response),
        route: response.locals["routeName"] ?? "unmatched",
        status: response.statusCode,
      });
    });
    next();
  };

  return [attachRequestLogger, logCompletedRequest];
}

export function markRoute(routeName: string): RequestHandler {
  return (_request, response, next) => {
    response.locals["routeName"] = routeName;
    next();
  };
}
