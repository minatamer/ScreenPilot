import {
  analyzeCvRequestSchema,
  type AnalyzeCvResponse,
} from "@screenpilot/contracts/api/cv-analysis";
import { Router, type RequestHandler } from "express";

import type { AnalyzeCv } from "../../use-cases/analyze-cv.js";
import { requireAllowedOrigin } from "../middleware/allowed-origin.js";
import type { ProviderCapacityGuard } from "../middleware/provider-capacity.js";
import { markRoute } from "../middleware/request-logging.js";
import { withRequestAbortSignal } from "../middleware/with-request-abort-signal.js";
import {
  getAnonymousSessionId,
  requireAnonymousSession,
  validateJsonBody,
} from "../middleware/validate-request.js";

export function createCvAnalyzeRoutes(input: {
  allowedOrigins: readonly string[];
  analyzeCv: AnalyzeCv;
  providerCapacity: ProviderCapacityGuard;
  requestBody: RequestHandler;
  requestAdmission: RequestHandler;
  requireJsonRequest: RequestHandler;
}): Router {
  const router = Router();

  router.post(
    "/",
    markRoute("cv_analyze"),
    requireAllowedOrigin(input.allowedOrigins),
    requireAnonymousSession(),
    input.requireJsonRequest,
    input.requestAdmission,
    input.requestBody,
    validateJsonBody(
      analyzeCvRequestSchema,
      async (request, response, validatedBody) => {
        const result: AnalyzeCvResponse = await input.providerCapacity.run(
          response,
          () =>
            withRequestAbortSignal(request, response, (signal) =>
              input.analyzeCv(
                validatedBody,
                getAnonymousSessionId(response),
                signal,
              ),
            ),
        );
        response.setHeader("cache-control", "no-store");
        response.status(200).json(result);
      },
    ),
  );

  return router;
}
