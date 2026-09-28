import {
  summarizeInterviewRequestSchema,
  type SummarizeInterviewResponse,
} from "@screenpilot/contracts/api/interview-summary";
import { Router, type RequestHandler } from "express";

import type { GenerateInterviewSummary } from "../../use-cases/generate-interview-summary.js";
import { requireAllowedOrigin } from "../middleware/allowed-origin.js";
import type { ProviderCapacityGuard } from "../middleware/provider-capacity.js";
import { markRoute } from "../middleware/request-logging.js";
import { withRequestAbortSignal } from "../middleware/with-request-abort-signal.js";
import {
  getAnonymousSessionId,
  requireAnonymousSession,
  validateJsonBody,
} from "../middleware/validate-request.js";

export function createInterviewSummaryRoutes(input: {
  allowedOrigins: readonly string[];
  generateInterviewSummary: GenerateInterviewSummary;
  providerCapacity: ProviderCapacityGuard;
  requestBody: RequestHandler;
  requestAdmission: RequestHandler;
  requireJsonRequest: RequestHandler;
}): Router {
  const router = Router();

  router.post(
    "/",
    markRoute("interview_summary"),
    requireAllowedOrigin(input.allowedOrigins),
    requireAnonymousSession(),
    input.requireJsonRequest,
    input.requestAdmission,
    input.requestBody,
    validateJsonBody(
      summarizeInterviewRequestSchema,
      async (request, response, validatedBody) => {
        const result: SummarizeInterviewResponse =
          await input.providerCapacity.run(response, () =>
            withRequestAbortSignal(request, response, (signal) =>
              input.generateInterviewSummary(
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
