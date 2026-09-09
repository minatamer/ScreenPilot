import cors from "cors";
import type { RequestHandler } from "express";

export class OriginNotAllowedError extends Error {
  readonly code = "ORIGIN_NOT_ALLOWED";

  constructor() {
    super("This request origin is not allowed.");
    this.name = "OriginNotAllowedError";
  }
}

export function createAllowedOriginMiddleware(
  allowedOrigins: readonly string[],
): RequestHandler {
  const allowedOriginSet = new Set(allowedOrigins);
  return cors({
    allowedHeaders: ["content-type"],
    credentials: true,
    exposedHeaders: ["x-request-id"],
    maxAge: 600,
    methods: ["GET", "POST", "OPTIONS"],
    origin(origin, callback) {
      if (origin === undefined || allowedOriginSet.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new OriginNotAllowedError());
    },
  });
}

export function requireAllowedOrigin(
  allowedOrigins: readonly string[],
): RequestHandler {
  const allowedOriginSet = new Set(allowedOrigins);
  return (request, _response, next) => {
    const origin = request.get("origin");
    if (origin === undefined || !allowedOriginSet.has(origin)) {
      next(new OriginNotAllowedError());
      return;
    }
    next();
  };
}
