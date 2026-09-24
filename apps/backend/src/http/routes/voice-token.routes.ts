import {
  voiceTokenRequestSchema,
  type VoiceTokenResponse,
} from "@screenpilot/contracts/api/voice-token";
import { Router, type RequestHandler } from "express";

import type { CreateVoiceToken } from "../../use-cases/create-voice-token.js";
import { requireAllowedOrigin } from "../middleware/allowed-origin.js";
import { getRequestId } from "../middleware/request-id.js";
import { markRoute } from "../middleware/request-logging.js";
import { withRequestAbortSignal } from "../middleware/with-request-abort-signal.js";
import {
  getAnonymousSessionId,
  requireAnonymousSession,
  validateJsonBody,
} from "../middleware/validate-request.js";

export function createVoiceTokenRoutes(input: {
  allowedOrigins: readonly string[];
  createVoiceToken: CreateVoiceToken;
  requestAdmission: RequestHandler;
}): Router {
  const router = Router();

  router.post(
    "/",
    markRoute("voice_token"),
    requireAllowedOrigin(input.allowedOrigins),
    requireAnonymousSession(),
    input.requestAdmission,
    validateJsonBody(
      voiceTokenRequestSchema,
      async (request, response, validatedBody) => {
        const result: VoiceTokenResponse = await withRequestAbortSignal(
          request,
          response,
          (signal) =>
            input.createVoiceToken(
              validatedBody,
              getAnonymousSessionId(response),
              getRequestId(response),
              signal,
            ),
        );
        response.setHeader("cache-control", "no-store");
        response.status(200).json(result);
      },
    ),
  );

  return router;
}
