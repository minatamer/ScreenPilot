import { providerUsageSchema } from "@screenpilot/contracts/api/cv-analysis";
import { interviewGrantSchema } from "@screenpilot/contracts/api/interview-preparation";
import {
  PUBLIC_RUNTIME_LIMITS,
  publicRuntimeConfigSchema,
} from "@screenpilot/contracts/api/public-runtime-config";
import { voiceMetadataSchema } from "@screenpilot/contracts/api/voice-token";
import { isUndecidedRoleValue } from "@screenpilot/contracts/interview/client-tools";
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
import {
  transcriptTurnIdentityKey,
  transcriptTurnSchema,
} from "@screenpilot/contracts/interview/transcript-turn";
import { z } from "zod";

import {
  MAX_LOCAL_TRANSCRIPT_CHARACTERS,
  MAX_LOCAL_TRANSCRIPT_TURNS,
} from "@/features/transcript/transcript-limits";

import {
  DEMO_STAGES,
  INTERVIEW_TERMINAL_REASONS,
  type DemoSessionState,
  type DemoStage,
} from "./demo-session.types";

export const PERSISTED_SESSION_SCHEMA_VERSION = 3 as const;
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
  "interview_complete",
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

function haveSameEvidenceIds(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((evidenceId, index) => evidenceId === right[index])
  );
}

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

export const interviewCompletionSchema = z.strictObject({
  reason: z.enum(INTERVIEW_TERMINAL_REASONS),
  elapsedSeconds: z
    .number()
    .int()
    .min(0)
    .max(PUBLIC_RUNTIME_LIMITS.callSeconds),
});

export const persistedDemoSessionSchema = z
  .strictObject({
    schemaVersion: z.literal(PERSISTED_SESSION_SCHEMA_VERSION),
    stage: z.enum(DEMO_STAGES),
    entryMode: entryModeSchema.nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    expiresAt: z.iso.datetime({ offset: true }),
    runtimeConfig: publicRuntimeConfigSchema,
    demoContext: publicRoleNeutralDemoContextSchema,
    preferredName: preferredNameSchema.optional(),
    rolePreference: rolePreferenceSchema.optional(),
    cv: normalizedCvSchema.optional(),
    screeningPlan: screeningPlanSchema.optional(),
    interviewGrant: interviewGrantSchema.optional(),
    interviewGrantExpiresAt: z.iso.datetime({ offset: true }).optional(),
    cvAnalysisUsage: providerUsageSchema.optional(),
    voice: voiceMetadataSchema.optional(),
    interviewCompletion: interviewCompletionSchema.optional(),
    transcript: z.array(transcriptTurnSchema).max(MAX_LOCAL_TRANSCRIPT_TURNS),
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
      (!session.cv || !session.cvAnalysisUsage)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Prepared CV-assisted stages require normalized CV data and bounded analysis metadata.",
        path: ["cv"],
      });
    }

    if (session.cvAnalysisUsage && !session.cv) {
      context.addIssue({
        code: "custom",
        message: "CV analysis metadata requires normalized CV data.",
        path: ["cvAnalysisUsage"],
      });
    }

    if (
      UNPREPARED_STAGES.has(session.stage) &&
      (session.cv ||
        session.screeningPlan ||
        session.interviewGrant ||
        session.cvAnalysisUsage ||
        session.voice ||
        session.interviewCompletion ||
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

    if (
      session.summary &&
      session.stage !== "interview_complete" &&
      session.stage !== "review_ready"
    ) {
      context.addIssue({
        code: "custom",
        message:
          "A completed summary requires the completed-interview or review-ready stage.",
        path: ["summary"],
      });
    }

    if (
      session.interviewCompletion &&
      !["ending", "interview_complete", "summarizing", "review_ready"].includes(
        session.stage,
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Interview completion metadata is only valid after normal termination begins.",
        path: ["interviewCompletion"],
      });
    }

    if (
      session.stage === "interview_complete" &&
      (!session.interviewCompletion || session.voice?.status !== "ended")
    ) {
      context.addIssue({
        code: "custom",
        message:
          "A completed interview requires a terminal reason, frozen elapsed time, and ended voice metadata.",
        path: ["interviewCompletion"],
      });
    }

    if (
      session.stage === "review_ready" &&
      (session.voice === undefined ||
        (session.voice.status !== "ended" && session.voice.status !== "failed"))
    ) {
      context.addIssue({
        code: "custom",
        message:
          "A review-ready session requires ended or failed voice metadata.",
        path: ["voice"],
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

    const transcriptIds = session.transcript.map((turn) => turn.id);
    if (new Set(transcriptIds).size !== transcriptIds.length) {
      context.addIssue({
        code: "custom",
        message: "Stored transcript turn IDs must be unique.",
        path: ["transcript"],
      });
    }
    const transcriptTurnIdentities = session.transcript.map(
      transcriptTurnIdentityKey,
    );
    if (
      new Set(transcriptTurnIdentities).size !== transcriptTurnIdentities.length
    ) {
      context.addIssue({
        code: "custom",
        message: "Stored transcript speaker/sequence pairs must be unique.",
        path: ["transcript"],
      });
    }

    const transcriptCharacters = session.transcript.reduce(
      (total, turn) => total + turn.text.length,
      0,
    );
    if (transcriptCharacters > MAX_LOCAL_TRANSCRIPT_CHARACTERS) {
      context.addIssue({
        code: "custom",
        message: "The stored transcript exceeds its character limit.",
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
      (session.cv ||
        session.screeningPlan ||
        session.interviewGrant ||
        session.cvAnalysisUsage)
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

    const preferredNameInsights = session.insights.filter(
      (insight) => insight.category === "preferred_name",
    );
    const preferredNameInsight = preferredNameInsights[0];
    if (
      preferredNameInsights.length > 1 ||
      (session.preferredName === undefined) !==
        (preferredNameInsight === undefined) ||
      (session.preferredName !== undefined &&
        preferredNameInsight !== undefined &&
        (session.preferredName.value !== preferredNameInsight.value ||
          session.preferredName.source !== preferredNameInsight.source ||
          !haveSameEvidenceIds(
            session.preferredName.evidenceTurnIds,
            preferredNameInsight.evidenceTurnIds,
          )))
    ) {
      context.addIssue({
        code: "custom",
        message:
          "The preferred name must match exactly one preferred-name insight card.",
        path: ["preferredName"],
      });
    }

    const rolePreferenceInsights = session.insights.filter(
      (insight) => insight.category === "role_preference",
    );
    const rolePreferenceInsight = rolePreferenceInsights[0];
    const expectedRolePreference = rolePreferenceInsight
      ? {
          label: isUndecidedRoleValue(rolePreferenceInsight.value)
            ? null
            : rolePreferenceInsight.value,
          status: isUndecidedRoleValue(rolePreferenceInsight.value)
            ? ("undecided" as const)
            : ("candidate_stated" as const),
          evidenceTurnIds: rolePreferenceInsight.evidenceTurnIds,
        }
      : undefined;
    if (
      rolePreferenceInsights.length > 1 ||
      (session.rolePreference === undefined) !==
        (expectedRolePreference === undefined) ||
      (session.rolePreference !== undefined &&
        expectedRolePreference !== undefined &&
        (session.rolePreference.label !== expectedRolePreference.label ||
          session.rolePreference.status !== expectedRolePreference.status ||
          !haveSameEvidenceIds(
            session.rolePreference.evidenceTurnIds,
            expectedRolePreference.evidenceTurnIds,
          )))
    ) {
      context.addIssue({
        code: "custom",
        message:
          "The role preference must match exactly one role-preference insight card.",
        path: ["rolePreference"],
      });
    }

    session.topicProgress.forEach((progress, progressIndex) => {
      if (!hasFinalCandidateEvidence(progress.evidenceTurnIds)) {
        context.addIssue({
          code: "custom",
          message: "Topic progress must reference final candidate turns.",
          path: ["topicProgress", progressIndex, "evidenceTurnIds"],
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
    NON_PERSISTABLE_SESSION_STAGES.has(state.stage) ||
    state.createdAt === null ||
    state.expiresAt === null ||
    state.runtimeConfig === null ||
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
    runtimeConfig: state.runtimeConfig,
    demoContext: state.demoContext,
    ...(state.preferredName ? { preferredName: state.preferredName } : {}),
    ...(state.rolePreference ? { rolePreference: state.rolePreference } : {}),
    ...(state.cv ? { cv: state.cv } : {}),
    ...(state.screeningPlan ? { screeningPlan: state.screeningPlan } : {}),
    ...(state.interviewGrant ? { interviewGrant: state.interviewGrant } : {}),
    ...(state.interviewGrantExpiresAt
      ? { interviewGrantExpiresAt: state.interviewGrantExpiresAt }
      : {}),
    ...(state.cvAnalysisUsage
      ? { cvAnalysisUsage: state.cvAnalysisUsage }
      : {}),
    ...(state.voice ? { voice: state.voice } : {}),
    ...(state.interviewCompletion
      ? { interviewCompletion: state.interviewCompletion }
      : {}),
    transcript: [...state.transcript],
    insights: [...state.insights],
    topicProgress: [...state.topicProgress],
    ...(state.summary ? { summary: state.summary } : {}),
  };

  return persistedDemoSessionSchema.parse(projection);
}
