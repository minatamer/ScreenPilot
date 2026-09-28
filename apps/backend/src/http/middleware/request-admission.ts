import type { Request, RequestHandler } from "express";

import {
  ANONYMOUS_SESSION_COOKIE_NAME,
  parseAnonymousSessionId,
} from "../../security/anonymous-session-cookie.js";
import type {
  RateLimitedRoute,
  StatelessRateLimiter,
} from "../../security/stateless-rate-limit.js";
import type { RequestSourceResolver } from "../../security/request-source.js";
import { UseCaseError } from "../../use-cases/use-case-error.js";
import { getAnonymousSessionId } from "./validate-request.js";

type RequestAdmissionPolicy = Readonly<{
  globalRateLimit: number;
  label: string;
  rateLimit: number;
  route: RateLimitedRoute;
  session: "optional" | "required";
}>;

function optionalAnonymousSessionId(request: Request): string | undefined {
  const signedCookies: unknown = request.signedCookies;
  const cookieValue: unknown =
    typeof signedCookies === "object" && signedCookies !== null
      ? Reflect.get(signedCookies, ANONYMOUS_SESSION_COOKIE_NAME)
      : undefined;
  return parseAnonymousSessionId(cookieValue) ?? undefined;
}

export function createRequestAdmissionMiddleware(input: {
  policy: RequestAdmissionPolicy;
  rateLimiter: StatelessRateLimiter;
  requestSource: RequestSourceResolver;
}): RequestHandler {
  return (request, response, next) => {
    const anonymousSessionId =
      input.policy.session === "required"
        ? getAnonymousSessionId(response)
        : optionalAnonymousSessionId(request);
    const rateLimitDecision = input.rateLimiter.consume({
      ...(anonymousSessionId === undefined ? {} : { anonymousSessionId }),
      globalLimit: input.policy.globalRateLimit,
      limit: input.policy.rateLimit,
      route: input.policy.route,
      source: input.requestSource(request),
    });
    if (!rateLimitDecision.allowed) {
      next(
        new UseCaseError(
          "RATE_LIMITED",
          `${input.policy.label} has received too many requests. Wait briefly and try again.`,
          {
            retryable: true,
            retryAfterSeconds: rateLimitDecision.retryAfterSeconds,
          },
        ),
      );
      return;
    }
    next();
  };
}
