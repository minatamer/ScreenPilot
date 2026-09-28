import { Router, type RequestHandler } from "express";

import type { AnonymousSessionCookieOptions } from "../security/anonymous-session-cookie.js";
import type { AnalyzeCv } from "../use-cases/analyze-cv.js";
import type { GenerateInterviewSummary } from "../use-cases/generate-interview-summary.js";
import type { PrepareConversationFirst } from "../use-cases/prepare-conversation-first.js";
import type { CreateVoiceToken } from "../use-cases/create-voice-token.js";
import type { ProviderCapacityGuard } from "./middleware/provider-capacity.js";
import { createBootstrapRoutes } from "./routes/bootstrap.routes.js";
import { createCvAnalyzeRoutes } from "./routes/cv-analyze.routes.js";
import { createHealthRoutes } from "./routes/health.routes.js";
import { createInterviewPrepareRoutes } from "./routes/interview-prepare.routes.js";
import { createInterviewSummaryRoutes } from "./routes/interview-summary.routes.js";
import { createVoiceTokenRoutes } from "./routes/voice-token.routes.js";
import type { BootstrapResponse } from "@screenpilot/contracts/api/bootstrap";

export function createApiRouter(input: {
  allowedOrigins: readonly string[];
  analyzeCv: AnalyzeCv;
  cookieOptions: AnonymousSessionCookieOptions;
  getDemoBootstrap: () => BootstrapResponse;
  generateInterviewSummary: GenerateInterviewSummary;
  idGenerator: () => string;
  isReady: () => boolean;
  issueVoiceToken: CreateVoiceToken;
  prepareConversationFirst: PrepareConversationFirst;
  providerCapacity: Readonly<{
    cvAnalyze: ProviderCapacityGuard;
    interviewSummary: ProviderCapacityGuard;
    voiceToken: ProviderCapacityGuard;
  }>;
  requestBody: Readonly<{
    cvAnalyze: RequestHandler;
    interviewPrepare: RequestHandler;
    interviewSummary: RequestHandler;
    voiceToken: RequestHandler;
  }>;
  requestAdmission: Readonly<{
    bootstrap: RequestHandler;
    cvAnalyze: RequestHandler;
    interviewPrepare: RequestHandler;
    interviewSummary: RequestHandler;
    voiceToken: RequestHandler;
  }>;
  requireJsonRequest: RequestHandler;
}): Router {
  const router = Router();

  router.use("/health", createHealthRoutes(input.isReady));
  router.use(
    "/v1/demo/bootstrap",
    createBootstrapRoutes({
      cookieOptions: input.cookieOptions,
      getDemoBootstrap: input.getDemoBootstrap,
      idGenerator: input.idGenerator,
      requestAdmission: input.requestAdmission.bootstrap,
    }),
  );
  router.use(
    "/v1/cv/analyze",
    createCvAnalyzeRoutes({
      allowedOrigins: input.allowedOrigins,
      analyzeCv: input.analyzeCv,
      providerCapacity: input.providerCapacity.cvAnalyze,
      requestBody: input.requestBody.cvAnalyze,
      requestAdmission: input.requestAdmission.cvAnalyze,
      requireJsonRequest: input.requireJsonRequest,
    }),
  );
  router.use(
    "/v1/interview/prepare",
    createInterviewPrepareRoutes({
      allowedOrigins: input.allowedOrigins,
      prepareConversationFirst: input.prepareConversationFirst,
      requestBody: input.requestBody.interviewPrepare,
      requestAdmission: input.requestAdmission.interviewPrepare,
      requireJsonRequest: input.requireJsonRequest,
    }),
  );
  router.use(
    "/v1/interview/summary",
    createInterviewSummaryRoutes({
      allowedOrigins: input.allowedOrigins,
      generateInterviewSummary: input.generateInterviewSummary,
      providerCapacity: input.providerCapacity.interviewSummary,
      requestBody: input.requestBody.interviewSummary,
      requestAdmission: input.requestAdmission.interviewSummary,
      requireJsonRequest: input.requireJsonRequest,
    }),
  );
  router.use(
    "/v1/voice/token",
    createVoiceTokenRoutes({
      allowedOrigins: input.allowedOrigins,
      createVoiceToken: input.issueVoiceToken,
      providerCapacity: input.providerCapacity.voiceToken,
      requestBody: input.requestBody.voiceToken,
      requestAdmission: input.requestAdmission.voiceToken,
      requireJsonRequest: input.requireJsonRequest,
    }),
  );

  return router;
}
