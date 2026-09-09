import type { Request, RequestHandler, Response } from "express";
import type { z } from "zod";

import {
  ANONYMOUS_SESSION_COOKIE_NAME,
  parseAnonymousSessionId,
} from "../../security/anonymous-session-cookie.js";

export class RequestValidationError extends Error {
  readonly code: "INVALID_ENTRY_MODE" | "INVALID_REQUEST";

  constructor(code: "INVALID_ENTRY_MODE" | "INVALID_REQUEST") {
    super(
      code === "INVALID_ENTRY_MODE"
        ? "Only conversation-first preparation is accepted here."
        : "The request body is invalid.",
    );
    this.name = "RequestValidationError";
    this.code = code;
  }
}

export class AnonymousSessionRequiredError extends Error {
  readonly code = "ANONYMOUS_SESSION_REQUIRED";

  constructor() {
    super("Start a fresh demo session and try again.");
    this.name = "AnonymousSessionRequiredError";
  }
}

export function requireAnonymousSession(): RequestHandler {
  return (request, response, next) => {
    const signedCookies: unknown = request.signedCookies;
    const cookieValue: unknown =
      typeof signedCookies === "object" && signedCookies !== null
        ? Reflect.get(signedCookies, ANONYMOUS_SESSION_COOKIE_NAME)
        : undefined;
    const anonymousSessionId = parseAnonymousSessionId(cookieValue);
    if (anonymousSessionId === null) {
      next(new AnonymousSessionRequiredError());
      return;
    }
    response.locals["anonymousSessionId"] = anonymousSessionId;
    next();
  };
}

export function getAnonymousSessionId(response: Response): string {
  const anonymousSessionId = parseAnonymousSessionId(
    response.locals["anonymousSessionId"],
  );
  if (anonymousSessionId === null) {
    throw new AnonymousSessionRequiredError();
  }
  return anonymousSessionId;
}

export function validateJsonBody<T>(
  schema: z.ZodType<T>,
  handler: (
    request: Request,
    response: Response,
    validatedBody: T,
  ) => Promise<void> | void,
): RequestHandler {
  return async (request, response) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      const invalidEntryMode = result.error.issues.some(
        (issue) => issue.path[0] === "entryMode",
      );
      throw new RequestValidationError(
        invalidEntryMode ? "INVALID_ENTRY_MODE" : "INVALID_REQUEST",
      );
    }
    await handler(request, response, result.data);
  };
}
