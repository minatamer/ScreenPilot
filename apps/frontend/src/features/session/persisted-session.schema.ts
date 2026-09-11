import { interviewGrantSchema } from "@screenpilot/contracts/api/interview-preparation";
import { voiceMetadataSchema } from "@screenpilot/contracts/api/voice-token";
import {
  publicRoleNeutralDemoContextSchema,
  rolePreferenceSchema,
} from "@screenpilot/contracts/interview/demo-context";
import { entryModeSchema } from "@screenpilot/contracts/interview/entry-mode";
import { insightCardSchema } from "@screenpilot/contracts/interview/insight-card";
import { normalizedCvSchema } from "@screenpilot/contracts/interview/normalized-cv";
import { screeningPlanSchema } from "@screenpilot/contracts/interview/screening-plan";
import { screeningSummarySchema } from "@screenpilot/contracts/interview/screening-summary";
import { topicProgressSchema } from "@screenpilot/contracts/interview/topic-progress";
import { transcriptTurnSchema } from "@screenpilot/contracts/interview/transcript-turn";
import { z } from "zod";

import {
  DEMO_STAGES,
  type DemoSessionState,
  type DemoStage,
} from "./demo-session.types";

export const PERSISTED_SESSION_SCHEMA_VERSION = 2 as const;
export const SESSION_LIFETIME_MS = 2 * 60 * 60 * 1_000;
export const MAX_PERSISTED_SESSION_BYTES = 512 * 1_024;

const NON_PERSISTABLE_SESSION_STAGES = new Set<DemoStage>([
  "empty",
  "bootstrapping",
  "cleared",
]);
const CV_ASSISTED_STAGES = new Set<DemoStage>([
  "awaiting_cv",
  "extracting_cv",
  "analyzing_cv",
  "plan_ready",
]);
const CONVERSATION_FIRST_STAGES = new Set<DemoStage>([
  "preparing_conversation",
]);
const PREPARED_CONTEXT_STAGES = new Set<DemoStage>([
  "plan_ready",
  "preflight",
  "ready",
  "connecting",
  "live",
  "ending",
  "summarizing",
  "review_ready",
]);
const UNPREPARED_STAGES = new Set<DemoStage>([
  "choosing_entry_mode",
  "awaiting_cv",
  "extracting_cv",
  "analyzing_cv",
  "preparing_conversation",
]);

export const preferredNameSchema = z
  .strictObject({
    value: z.string().trim().min(1).max(120),
    source: z.enum(["CV", "Candidate", "CV + Candidate"]),
    evidenceTurnIds: z.array(z.string().trim().min(1).max(64)).max(16),
  })
  .superRefine((preferredName, context) => {
    if (
      preferredName.source !== "CV" &&
      preferredName.evidenceTurnIds.length === 0
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Candidate-confirmed preferred names require transcript evidence.",
        path: ["evidenceTurnIds"],
      });
    }
  });

export const persistedDemoSessionSchema = z
  .strictObject({
    schemaVersion: z.literal(PERSISTED_SESSION_SCHEMA_VERSION),
    stage: z.enum(DEMO_STAGES),
    entryMode: entryModeSchema.nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    expiresAt: z.iso.datetime({ offset: true }),
    demoContext: publicRoleNeutralDemoContextSchema,
    preferredName: preferredNameSchema.optional(),
    rolePreference: rolePreferenceSchema.optional(),
    cv: normalizedCvSchema.optional(),
    screeningPlan: screeningPlanSchema.optional(),
    interviewGrant: interviewGrantSchema.optional(),
    interviewGrantExpiresAt: z.iso.datetime({ offset: true }).optional(),
    voice: voiceMetadataSchema.optional(),
    transcript: z.array(transcriptTurnSchema).max(160),
    insights: z.array(insightCardSchema).max(24),
    topicProgress: z.array(topicProgressSchema).max(16),
    summary: screeningSummarySchema.optional(),
  })
  .superRefine((session, context) => {
    if (NON_PERSISTABLE_SESSION_STAGES.has(session.stage)) {
      context.addIssue({
        code: "custom",
        message: "This workflow stage cannot be restored from browser storage.",
        path: ["stage"],
      });
    }

    if (
      (session.stage === "choosing_entry_mode" && session.entryMode !== null) ||
      (session.stage !== "choosing_entry_mode" && session.entryMode === null)
    ) {
      context.addIssue({
        code: "custom",
        message: "The workflow stage and entry mode are inconsistent.",
        path: ["entryMode"],
      });
    }

    if (
      (CV_ASSISTED_STAGES.has(session.stage) &&
        session.entryMode !== "cv_assisted") ||
      (CONVERSATION_FIRST_STAGES.has(session.stage) &&
        session.entryMode !== "conversation_first")
    ) {
      context.addIssue({
        code: "custom",
        message:
          "This workflow stage is not available for the stored entry mode.",
        path: ["stage"],
      });
    }

    if (
      PREPARED_CONTEXT_STAGES.has(session.stage) &&
      (!session.screeningPlan || !session.interviewGrant)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "This workflow stage requires a screening plan and interview grant.",
        path: ["stage"],
      });
    }

    const hasInterviewGrant = session.interviewGrant !== undefined;
    const hasInterviewGrantExpiry =
      session.interviewGrantExpiresAt !== undefined;
    if (hasInterviewGrant !== hasInterviewGrantExpiry) {
      context.addIssue({
        code: "custom",
        message:
          "An interview grant and its expiry must be persisted together.",
        path: [
          hasInterviewGrant ? "interviewGrantExpiresAt" : "interviewGrant",
        ],
      });
    }

    if (
      PREPARED_CONTEXT_STAGES.has(session.stage) &&
      session.entryMode === "cv_assisted" &&
      !session.cv
    ) {
      context.addIssue({
        code: "custom",
        message: "Prepared CV-assisted stages require normalized CV data.",
        path: ["cv"],
      });
    }

    if (
      UNPREPARED_STAGES.has(session.stage) &&
      (session.cv ||
        session.screeningPlan ||
        session.interviewGrant ||
        session.voice ||
        session.transcript.length > 0 ||
        session.insights.length > 0 ||
        session.topicProgress.length > 0 ||
        session.summary ||
        session.preferredName ||
        session.rolePreference)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Unprepared workflow stages cannot contain prepared or interview evidence.",
        path: ["stage"],
      });
    }

    if (session.summary && session.stage !== "review_ready") {
      context.addIssue({
        code: "custom",
        message: "A completed summary requires the review-ready stage.",
        path: ["summary"],
      });
    }

    const createdAt = Date.parse(session.createdAt);
    const expiresAt = Date.parse(session.expiresAt);
    if (expiresAt <= createdAt || expiresAt - createdAt > SESSION_LIFETIME_MS) {
      context.addIssue({
        code: "custom",
        message:
          "Session expiry must be after creation and no more than two hours later.",
        path: ["expiresAt"],
      });
    }

    if (session.transcript.some((turn) => turn.status !== "final")) {
      context.addIssue({
        code: "custom",
        message: "Only final transcript turns may be persisted.",
        path: ["transcript"],
      });
    }

    if (
      session.screeningPlan &&
      session.screeningPlan.entryMode !== session.entryMode
    ) {
      context.addIssue({
        code: "custom",
        message: "The session entry mode must match the screening plan.",
        path: ["screeningPlan", "entryMode"],
      });
    }

    if (
      session.entryMode === null &&
      (session.cv || session.screeningPlan || session.interviewGrant)
    ) {
      context.addIssue({
        code: "custom",
        message: "Mode-specific preparation data requires an entry mode.",
        path: ["entryMode"],
      });
    }

    const finalCandidateTurnIds = new Set(
      session.transcript
        .filter(
          (turn) => turn.speaker === "candidate" && turn.status === "final",
        )
        .map((turn) => turn.id),
    );
    const normalizedCvFactIds = new Set(
      session.cv?.facts.map((fact) => fact.id) ?? [],
    );
    const hasFinalCandidateEvidence = (evidenceTurnIds: readonly string[]) =>
      evidenceTurnIds.length > 0 &&
      evidenceTurnIds.every((evidenceTurnId) =>
        finalCandidateTurnIds.has(evidenceTurnId),
      );

    if (
      session.preferredName?.source !== undefined &&
      session.preferredName.source !== "CV" &&
      !hasFinalCandidateEvidence(session.preferredName.evidenceTurnIds)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Candidate-confirmed preferred names must reference final candidate turns.",
        path: ["preferredName", "evidenceTurnIds"],
      });
    }

    if (
      session.rolePreference &&
      !hasFinalCandidateEvidence(session.rolePreference.evidenceTurnIds)
    ) {
      context.addIssue({
        code: "custom",
        message: "Role preferences must reference final candidate turns.",
        path: ["rolePreference", "evidenceTurnIds"],
      });
    }

    session.insights.forEach((insight, insightIndex) => {
      if (
        insight.source !== "CV" &&
        !hasFinalCandidateEvidence(insight.evidenceTurnIds)
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Candidate-sourced insights must reference final candidate turns.",
          path: ["insights", insightIndex, "evidenceTurnIds"],
        });
      }
      if (
        insight.source !== "Candidate" &&
        !insight.cvFactIds.every((cvFactId) =>
          normalizedCvFactIds.has(cvFactId),
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "CV-sourced insights must reference normalized CV facts.",
          path: ["insights", insightIndex, "cvFactIds"],
        });
      }
    });

    if (session.entryMode !== "conversation_first") {
      return;
    }

    if (session.cv) {
      context.addIssue({
        code: "custom",
        message:
          "Conversation-first sessions cannot contain normalized CV data.",
        path: ["cv"],
      });
    }

    if (session.preferredName && session.preferredName.source !== "Candidate") {
      context.addIssue({
        code: "custom",
        message:
          "Conversation-first preferred names require Candidate provenance.",
        path: ["preferredName", "source"],
      });
    }

    if (session.insights.some((insight) => insight.source !== "Candidate")) {
      context.addIssue({
        code: "custom",
        message: "Conversation-first insights require Candidate provenance.",
        path: ["insights"],
      });
    }
  });

export type PersistedDemoSession = z.infer<typeof persistedDemoSessionSchema>;

export function projectPersistedDemoSession(
  state: DemoSessionState,
): PersistedDemoSession | null {
  if (
    state.hydrationStatus !== "ready" ||
    state.stage === "cleared" ||
    state.createdAt === null ||
    state.expiresAt === null ||
    state.demoContext === null
  ) {
    return null;
  }

  const projection = {
    schemaVersion: PERSISTED_SESSION_SCHEMA_VERSION,
    stage: state.stage,
    entryMode: state.entryMode,
    createdAt: state.createdAt,
    expiresAt: state.expiresAt,
    demoContext: state.demoContext,
    ...(state.preferredName ? { preferredName: state.preferredName } : {}),
    ...(state.rolePreference ? { rolePreference: state.rolePreference } : {}),
    ...(state.cv ? { cv: state.cv } : {}),
    ...(state.screeningPlan ? { screeningPlan: state.screeningPlan } : {}),
    ...(state.interviewGrant ? { interviewGrant: state.interviewGrant } : {}),
    ...(state.interviewGrantExpiresAt
      ? { interviewGrantExpiresAt: state.interviewGrantExpiresAt }
      : {}),
    ...(state.voice ? { voice: state.voice } : {}),
    transcript: [...state.transcript],
    insights: [...state.insights],
    topicProgress: [...state.topicProgress],
    ...(state.summary ? { summary: state.summary } : {}),
  };

  return persistedDemoSessionSchema.parse(projection);
}
