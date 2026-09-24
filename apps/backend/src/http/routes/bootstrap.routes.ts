import type { BootstrapResponse } from "@screenpilot/contracts/api/bootstrap";
import { Router, type RequestHandler } from "express";

import {
  ANONYMOUS_SESSION_COOKIE_NAME,
  createAnonymousSessionId,
  parseAnonymousSessionId,
  type AnonymousSessionCookieOptions,
} from "../../security/anonymous-session-cookie.js";
import { markRoute } from "../middleware/request-logging.js";

export function createBootstrapRoutes(input: {
  cookieOptions: AnonymousSessionCookieOptions;
  getDemoBootstrap: () => BootstrapResponse;
  idGenerator: () => string;
  requestAdmission: RequestHandler;
}): Router {
  const router = Router();

  router.get(
    "/",
    markRoute("demo_bootstrap"),
    input.requestAdmission,
    (request, response) => {
      const signedCookies: unknown = request.signedCookies;
      const existingCookie: unknown =
        typeof signedCookies === "object" && signedCookies !== null
          ? Reflect.get(signedCookies, ANONYMOUS_SESSION_COOKIE_NAME)
          : undefined;
      const anonymousSessionId =
        parseAnonymousSessionId(existingCookie) ??
        createAnonymousSessionId(input.idGenerator);

      response.cookie(
        ANONYMOUS_SESSION_COOKIE_NAME,
        anonymousSessionId,
        input.cookieOptions,
      );
      response.setHeader("cache-control", "no-store");
      response.status(200).json(input.getDemoBootstrap());
    },
  );

  return router;
}
