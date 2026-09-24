import {
  analyzeCvRequestSchema,
  type AnalyzeCvResponse,
} from "@screenpilot/contracts/api/cv-analysis";
import { Router, type RequestHandler } from "express";

import type { AnalyzeCv } from "../../use-cases/analyze-cv.js";
import { requireAllowedOrigin } from "../middleware/allowed-origin.js";
import { markRoute } from "../middleware/request-logging.js";
import {
  getAnonymousSessionId,
  requireAnonymousSession,
  validateJsonBody,
} from "../middleware/validate-request.js";

export function createCvAnalyzeRoutes(input: {
  allowedOrigins: readonly string[];
  analyzeCv: AnalyzeCv;
  requestAdmission: RequestHandler;
}): Router {
  const router = Router();

  router.post(
    "/",
    markRoute("cv_analyze"),
    requireAllowedOrigin(input.allowedOrigins),
    requireAnonymousSession(),
    input.requestAdmission,
    validateJsonBody(
      analyzeCvRequestSchema,
      async (request, response, validatedBody) => {
        const abortController = new AbortController();
        const abortRequest = () => {
          abortController.abort();
        };
        const abortIncompleteResponse = () => {
          if (!response.writableEnded) {
            abortController.abort();
          }
        };
        request.once("aborted", abortRequest);
        response.once("close", abortIncompleteResponse);
        try {
          const result: AnalyzeCvResponse = await input.analyzeCv(
            validatedBody,
            getAnonymousSessionId(response),
            abortController.signal,
          );
          response.setHeader("cache-control", "no-store");
          response.status(200).json(result);
        } finally {
          request.off("aborted", abortRequest);
          response.off("close", abortIncompleteResponse);
        }
      },
    ),
  );

  return router;
}
