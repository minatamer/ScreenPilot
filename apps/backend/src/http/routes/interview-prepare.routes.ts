import {
  prepareInterviewRequestSchema,
  type PrepareInterviewResponse,
} from "@screenpilot/contracts/api/interview-preparation";
import { Router } from "express";

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
}): Router {
  const router = Router();

  router.post(
    "/",
    markRoute("interview_prepare"),
    requireAllowedOrigin(input.allowedOrigins),
    requireAnonymousSession(),
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
