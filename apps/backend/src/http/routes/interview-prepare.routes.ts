import {
  prepareInterviewRequestSchema,
  type PrepareInterviewResponse,
} from "@screenpilot/contracts/api/interview-preparation";
import { Router, type RequestHandler } from "express";

import type { PrepareConversationFirst } from "../../use-cases/prepare-conversation-first.js";
import { requireAllowedOrigin } from "../middleware/allowed-origin.js";
import { markRoute } from "../middleware/request-logging.js";
import {
  getAnonymousSessionId,
  requireAnonymousSession,
  validateJsonBody,
} from "../middleware/validate-request.js";

export function createInterviewPrepareRoutes(input: {
  allowedOrigins: readonly string[];
  prepareConversationFirst: PrepareConversationFirst;
  requestBody: RequestHandler;
  requestAdmission: RequestHandler;
  requireJsonRequest: RequestHandler;
}): Router {
  const router = Router();

  router.post(
    "/",
    markRoute("interview_prepare"),
    requireAllowedOrigin(input.allowedOrigins),
    requireAnonymousSession(),
    input.requireJsonRequest,
    input.requestAdmission,
    input.requestBody,
    validateJsonBody(
      prepareInterviewRequestSchema,
      (_request, response, validatedBody) => {
        const result: PrepareInterviewResponse = input.prepareConversationFirst(
          validatedBody,
          getAnonymousSessionId(response),
        );
        response.setHeader("cache-control", "no-store");
        response.status(200).json(result);
      },
    ),
  );

  return router;
}
