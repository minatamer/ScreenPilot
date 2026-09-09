import type { RequestHandler } from "express";
import helmet from "helmet";

export function createSecurityHeadersMiddleware(): RequestHandler {
  return helmet();
}
