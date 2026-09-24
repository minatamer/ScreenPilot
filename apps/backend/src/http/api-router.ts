import { Router, type RequestHandler } from "express";

import type { AnonymousSessionCookieOptions } from "../security/anonymous-session-cookie.js";
import type { AnalyzeCv } from "../use-cases/analyze-cv.js";
import type { GenerateInterviewSummary } from "../use-cases/generate-interview-summary.js";
import type { PrepareConversationFirst } from "../use-cases/prepare-conversation-first.js";
import type { CreateVoiceToken } from "../use-cases/create-voice-token.js";
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
  requestAdmission: Readonly<{
    bootstrap: RequestHandler;
    cvAnalyze: RequestHandler;
    interviewPrepare: RequestHandler;
    interviewSummary: RequestHandler;
    voiceToken: RequestHandler;
  }>;
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
      requestAdmission: input.requestAdmission.cvAnalyze,
    }),
  );
  router.use(
    "/v1/interview/prepare",
    createInterviewPrepareRoutes({
      allowedOrigins: input.allowedOrigins,
      prepareConversationFirst: input.prepareConversationFirst,
      requestAdmission: input.requestAdmission.interviewPrepare,
    }),
  );
  router.use(
    "/v1/interview/summary",
    createInterviewSummaryRoutes({
      allowedOrigins: input.allowedOrigins,
      generateInterviewSummary: input.generateInterviewSummary,
      requestAdmission: input.requestAdmission.interviewSummary,
    }),
  );
  router.use(
    "/v1/voice/token",
    createVoiceTokenRoutes({
      allowedOrigins: input.allowedOrigins,
      createVoiceToken: input.issueVoiceToken,
      requestAdmission: input.requestAdmission.voiceToken,
    }),
  );

  return router;
}
