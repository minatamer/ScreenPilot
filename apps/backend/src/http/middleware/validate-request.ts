import type { Request, RequestHandler, Response } from "express";
import type { z } from "zod";

import {
  ANONYMOUS_SESSION_COOKIE_NAME,
  parseAnonymousSessionId,
} from "../../security/anonymous-session-cookie.js";

export class RequestValidationError extends Error {
  readonly code:
    | "INVALID_CV_TEXT"
    | "INVALID_ENTRY_MODE"
    | "INVALID_REQUEST"
    | "TURNSTILE_REQUIRED";

  constructor(
    code:
      | "INVALID_CV_TEXT"
      | "INVALID_ENTRY_MODE"
      | "INVALID_REQUEST"
      | "TURNSTILE_REQUIRED",
  ) {
    const messages = {
      INVALID_CV_TEXT: "The extracted CV text is invalid.",
      INVALID_ENTRY_MODE:
        "Only conversation-first preparation is accepted here.",
      INVALID_REQUEST: "The request body is invalid.",
      TURNSTILE_REQUIRED: "Complete the anti-abuse check and try again.",
    } as const;
    super(messages[code]);
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
      const invalidFields = new Set(
        result.error.issues.map((issue) => issue.path[0]),
      );
      const code = invalidFields.has("entryMode")
        ? "INVALID_ENTRY_MODE"
        : invalidFields.has("cvText")
          ? "INVALID_CV_TEXT"
          : invalidFields.has("turnstileToken")
            ? "TURNSTILE_REQUIRED"
            : "INVALID_REQUEST";
      throw new RequestValidationError(code);
    }
    await handler(request, response, result.data);
  };
}
