import { isIP } from "node:net";

import type { Request, RequestHandler } from "express";

import {
  ANONYMOUS_SESSION_COOKIE_NAME,
  parseAnonymousSessionId,
} from "../../security/anonymous-session-cookie.js";
import type { SpendCapacityGate } from "../../security/spend-cap.js";
import type {
  RateLimitedRoute,
  StatelessRateLimiter,
} from "../../security/stateless-rate-limit.js";
import { UseCaseError } from "../../use-cases/use-case-error.js";
import { getAnonymousSessionId } from "./validate-request.js";

type RequestAdmissionPolicy = Readonly<{
  capacityRoute?: "cv_analyze" | "interview_summary" | "voice_token";
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

function validatedRequestSource(request: Request): string {
  const source = request.ip;
  return typeof source === "string" && isIP(source) !== 0
    ? source.toLowerCase()
    : "unresolved";
}

export function createRequestAdmissionMiddleware(input: {
  capacityGate: SpendCapacityGate;
  policy: RequestAdmissionPolicy;
  rateLimiter: StatelessRateLimiter;
}): RequestHandler {
  return (request, response, next) => {
    const anonymousSessionId =
      input.policy.session === "required"
        ? getAnonymousSessionId(response)
        : optionalAnonymousSessionId(request);
    const rateLimitDecision = input.rateLimiter.consume({
      ...(anonymousSessionId === undefined ? {} : { anonymousSessionId }),
      limit: input.policy.rateLimit,
      route: input.policy.route,
      source: validatedRequestSource(request),
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

    if (input.policy.capacityRoute === undefined) {
      next();
      return;
    }
    const lease = input.capacityGate.acquire(input.policy.capacityRoute);
    if (lease === null) {
      next(
        new UseCaseError(
          "CAPACITY_REACHED",
          `${input.policy.label} is temporarily at capacity. Try again later.`,
          { retryable: true },
        ),
      );
      return;
    }

    let released = false;
    const release = () => {
      if (released) {
        return;
      }
      released = true;
      response.off("finish", release);
      response.off("close", release);
      lease.release();
    };
    response.once("finish", release);
    response.once("close", release);
    next();
  };
}
