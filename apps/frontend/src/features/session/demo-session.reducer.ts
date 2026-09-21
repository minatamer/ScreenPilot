import type { InterviewGrant } from "@screenpilot/contracts/api/interview-preparation";
import type { ProviderUsage } from "@screenpilot/contracts/api/cv-analysis";
import {
  publicRuntimeConfigSchema,
  type PublicRuntimeConfig,
} from "@screenpilot/contracts/api/public-runtime-config";
import type { VoiceMetadata } from "@screenpilot/contracts/api/voice-token";
import { isUndecidedRoleValue } from "@screenpilot/contracts/interview/client-tools";
import {
  publicRoleNeutralDemoContextSchema,
  rolePreferenceSchema,
  type PublicRoleNeutralDemoContext,
} from "@screenpilot/contracts/interview/demo-context";
import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";
import {
  insightCardSchema,
  type InsightCard,
} from "@screenpilot/contracts/interview/insight-card";
import type { NormalizedCv } from "@screenpilot/contracts/interview/normalized-cv";
import type { ScreeningPlan } from "@screenpilot/contracts/interview/screening-plan";
import type { ScreeningSummary } from "@screenpilot/contracts/interview/screening-summary";
import {
  topicProgressSchema,
  type TopicProgress,
} from "@screenpilot/contracts/interview/topic-progress";
import {
  transcriptTurnSchema,
  type TranscriptTurn,
} from "@screenpilot/contracts/interview/transcript-turn";

import {
  FAILURE_STAGES,
  type DemoStage,
  type DemoSessionState,
  type FailureStage,
  type SessionFailure,
  type SessionRestoreNotice,
} from "./demo-session.types";
import {
  projectPersistedDemoSession,
  SESSION_LIFETIME_MS,
  type PersistedDemoSession,
} from "./persisted-session.schema";
import {
  MAX_LOCAL_TRANSCRIPT_CHARACTERS,
  MAX_LOCAL_TRANSCRIPT_TURNS,
} from "@/features/transcript/transcript-limits";

export type DemoSessionEvent =
  | Readonly<{
      type: "HYDRATION_FINISHED";
      now: string;
      notice?: SessionRestoreNotice;
    }>
  | Readonly<{
      type: "RESTORE_SESSION";
      session: PersistedDemoSession;
      now: string;
    }>
  | Readonly<{ type: "BOOTSTRAP_STARTED" }>
  | Readonly<{
      type: "BOOTSTRAP_SUCCEEDED";
      demoContext: PublicRoleNeutralDemoContext;
      runtimeConfig: PublicRuntimeConfig;
    }>
  | Readonly<{
      type: "RUNTIME_CONFIG_REFRESHED";
      demoContext: PublicRoleNeutralDemoContext;
      runtimeConfig: PublicRuntimeConfig;
    }>
  | Readonly<{ type: "SELECT_ENTRY_MODE"; entryMode: EntryMode }>
  | Readonly<{ type: "CV_EXTRACTION_STARTED" }>
  | Readonly<{ type: "CV_EXTRACTION_SUCCEEDED" }>
  | Readonly<{
      type: "CV_PREPARATION_SUCCEEDED";
      cv: NormalizedCv;
      plan: ScreeningPlan;
      interviewGrant: InterviewGrant;
      interviewGrantExpiresAt: string;
      usage: ProviderUsage;
    }>
  | Readonly<{
      type: "CONVERSATION_PREPARATION_SUCCEEDED";
      plan: ScreeningPlan;
      interviewGrant: InterviewGrant;
      interviewGrantExpiresAt: string;
    }>
  | Readonly<{ type: "CONTINUE_TO_PREFLIGHT" }>
  | Readonly<{ type: "BACK_FROM_PREFLIGHT" }>
  | Readonly<{ type: "CONVERSATION_GRANT_EXPIRED" }>
  | Readonly<{ type: "CV_GRANT_EXPIRED" }>
  | Readonly<{ type: "CHOOSE_ANOTHER_CV" }>
  | Readonly<{ type: "PREFLIGHT_READY" }>
  | Readonly<{ type: "PREFLIGHT_NOT_READY" }>
  | Readonly<{ type: "VOICE_CONNECTING" }>
  | Readonly<{ type: "VOICE_CONNECT_CANCELLED" }>
  | Readonly<{ type: "VOICE_CONNECTED"; voice: VoiceMetadata }>
  | Readonly<{ type: "VOICE_ENDING" }>
  | Readonly<{ type: "VOICE_ENDED"; voice: VoiceMetadata }>
  | Readonly<{ type: "VOICE_INTERRUPTED"; now: string }>
  | Readonly<{ type: "SUMMARY_SUCCEEDED"; summary: ScreeningSummary }>
  | Readonly<{ type: "SESSION_FAILED"; failure: SessionFailure }>
  | Readonly<{ type: "RETRY" }>
  | Readonly<{ type: "ADD_FINAL_TRANSCRIPT_TURN"; turn: TranscriptTurn }>
  | Readonly<{ type: "UPSERT_INSIGHT"; insight: InsightCard }>
  | Readonly<{ type: "SET_TOPIC_PROGRESS"; progress: TopicProgress }>
  | Readonly<{ type: "START_OVER" }>
  | Readonly<{ type: "BEGIN_NEW_SESSION"; now: string }>
  | Readonly<{ type: "SESSION_EXPIRED" }>
  | Readonly<{ type: "CLEAR_SESSION" }>;

export class InvalidSessionTransitionError extends Error {
  constructor(stage: string, event: DemoSessionEvent["type"]) {
    super(`Cannot apply ${event} while the demo session is ${stage}.`);
    this.name = "InvalidSessionTransitionError";
  }
}

export function createInitialDemoSessionState(): DemoSessionState {
  return {
    schemaVersion: 3,
    hydrationStatus: "pending",
    stage: "empty",
    entryMode: null,
    createdAt: null,
    expiresAt: null,
    runtimeConfig: null,
    demoContext: null,
    transcript: [],
    insights: [],
    topicProgress: [],
  };
}

function createSessionWindow(now: string) {
  const createdAt = new Date(now);
  if (Number.isNaN(createdAt.getTime())) {
    throw new TypeError("Session events require a valid ISO timestamp.");
  }

  return {
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(
      createdAt.getTime() + SESSION_LIFETIME_MS,
    ).toISOString(),
  };
}

function assertStage(
  state: DemoSessionState,
  event: DemoSessionEvent["type"],
  stages: readonly DemoSessionState["stage"][],
) {
  if (!stages.includes(state.stage)) {
    throw new InvalidSessionTransitionError(state.stage, event);
  }
}

function assertMode(
  state: DemoSessionState,
  event: DemoSessionEvent["type"],
  entryMode: EntryMode,
) {
  if (state.entryMode !== entryMode) {
    throw new InvalidSessionTransitionError(state.stage, event);
  }
}

function clearModeSpecificState(state: DemoSessionState): DemoSessionState {
  return {
    schemaVersion: state.schemaVersion,
    hydrationStatus: state.hydrationStatus,
    stage: "choosing_entry_mode",
    entryMode: null,
    createdAt: state.createdAt,
    expiresAt: state.expiresAt,
    runtimeConfig: state.runtimeConfig,
    demoContext: state.demoContext,
    transcript: [],
    insights: [],
    topicProgress: [],
  };
}

function interruptedSession(
  session: PersistedDemoSession,
  now: string,
): DemoSessionState {
  const hasUsableEvidence =
    session.transcript.length > 0 || session.insights.length > 0;
  const canSummarize =
    Boolean(session.interviewGrant && session.screeningPlan) &&
    session.transcript.some(
      (turn) => turn.speaker === "candidate" && turn.status === "final",
    );
  const voice: VoiceMetadata = {
    ...(session.voice?.conversationId
      ? { conversationId: session.voice.conversationId }
      : {}),
    status: "failed",
    ...(session.voice?.startedAt ? { startedAt: session.voice.startedAt } : {}),
    endedAt: new Date(now).toISOString(),
    endReason: "Voice session was interrupted by a page refresh.",
  };

  return {
    ...session,
    hydrationStatus: "ready",
    stage: canSummarize
      ? "summarizing"
      : hasUsableEvidence
        ? "review_ready"
        : "preflight",
    voice,
    restoreNotice: "call_interrupted",
  };
}

function interruptedCvProcessingSession(
  session: PersistedDemoSession,
): DemoSessionState {
  return {
    ...session,
    hydrationStatus: "ready",
    stage: "awaiting_cv",
    restoreNotice: "cv_file_required_after_refresh",
  };
}

function interruptedSummarySession(
  session: PersistedDemoSession,
): DemoSessionState {
  return {
    ...session,
    hydrationStatus: "ready",
    stage: "summarizing",
    failure: {
      stage: "summarizing",
      code: "SUMMARY_INTERRUPTED",
      message:
        "Summary generation was interrupted by the page refresh. Retry to continue.",
      retryable: true,
    },
    restoreNotice: "summary_interrupted",
  };
}

export function restoreDemoSession(
  session: PersistedDemoSession,
  now: string,
): DemoSessionState {
  if (session.stage === "extracting_cv" || session.stage === "analyzing_cv") {
    return interruptedCvProcessingSession(session);
  }

  if (session.stage === "summarizing") {
    return interruptedSummarySession(session);
  }

  if (["connecting", "live", "ending"].includes(session.stage)) {
    return interruptedSession(session, now);
  }

  if (session.stage === "ready") {
    return {
      ...session,
      hydrationStatus: "ready",
      stage: "preflight",
    };
  }

  return {
    ...session,
    hydrationStatus: "ready",
  };
}

function upsertByKey<T>(
  values: readonly T[],
  incoming: T,
  keyOf: (value: T) => string,
  maximum: number,
): readonly T[] {
  const existingIndex = values.findIndex(
    (value) => keyOf(value) === keyOf(incoming),
  );
  if (existingIndex < 0) {
    if (values.length >= maximum) {
      throw new RangeError(
        `The collection cannot contain more than ${String(maximum)} items.`,
      );
    }
    return [...values, incoming];
  }

  return values.map((value, index) =>
    index === existingIndex ? incoming : value,
  );
}

function retryStage(failureStage: FailureStage): DemoSessionState["stage"] {
  if (failureStage === "extracting_cv") {
    return "awaiting_cv";
  }
  if (failureStage === "connecting" || failureStage === "live") {
    return "preflight";
  }
  return failureStage;
}

function isFailureStage(stage: DemoStage): stage is FailureStage {
  return FAILURE_STAGES.some((failureStage) => failureStage === stage);
}

function hasFinalCandidateEvidence(
  state: DemoSessionState,
  evidenceTurnIds: readonly string[],
): boolean {
  return (
    evidenceTurnIds.length > 0 &&
    evidenceTurnIds.every((evidenceTurnId) =>
      state.transcript.some(
        (turn) =>
          turn.id === evidenceTurnId &&
          turn.speaker === "candidate" &&
          turn.status === "final",
      ),
    )
  );
}

function hasNormalizedCvEvidence(
  state: DemoSessionState,
  cvFactIds: readonly string[],
): boolean {
  if (!state.cv || cvFactIds.length === 0) {
    return false;
  }

  const normalizedCvFactIds = new Set(state.cv.facts.map((fact) => fact.id));
  return cvFactIds.every((cvFactId) => normalizedCvFactIds.has(cvFactId));
}

export function demoSessionReducer(
  state: DemoSessionState,
  event: DemoSessionEvent,
): DemoSessionState {
  switch (event.type) {
    case "HYDRATION_FINISHED": {
      assertStage(state, event.type, ["empty"]);
      return {
        ...state,
        ...createSessionWindow(event.now),
        hydrationStatus: "ready",
        ...(event.notice ? { restoreNotice: event.notice } : {}),
      };
    }
    case "RESTORE_SESSION":
      assertStage(state, event.type, ["empty"]);
      return restoreDemoSession(event.session, event.now);
    case "BOOTSTRAP_STARTED":
      assertStage(state, event.type, ["empty"]);
      return { ...state, stage: "bootstrapping", failure: undefined };
    case "BOOTSTRAP_SUCCEEDED":
      assertStage(state, event.type, ["bootstrapping"]);
      {
        const parsedDemoContext = publicRoleNeutralDemoContextSchema.safeParse(
          event.demoContext,
        );
        const parsedRuntimeConfig = publicRuntimeConfigSchema.safeParse(
          event.runtimeConfig,
        );
        if (!parsedDemoContext.success) {
          throw new TypeError("The role-neutral demo disclosure is invalid.");
        }
        if (!parsedRuntimeConfig.success) {
          throw new TypeError("The public demo configuration is invalid.");
        }
        return {
          ...state,
          stage: "choosing_entry_mode",
          demoContext: parsedDemoContext.data,
          runtimeConfig: parsedRuntimeConfig.data,
          failure: undefined,
        };
      }
    case "RUNTIME_CONFIG_REFRESHED": {
      if (
        state.stage === "empty" ||
        state.stage === "bootstrapping" ||
        state.stage === "cleared"
      ) {
        throw new InvalidSessionTransitionError(state.stage, event.type);
      }
      const parsedDemoContext = publicRoleNeutralDemoContextSchema.safeParse(
        event.demoContext,
      );
      const parsedRuntimeConfig = publicRuntimeConfigSchema.safeParse(
        event.runtimeConfig,
      );
      if (!parsedDemoContext.success) {
        throw new TypeError("The role-neutral demo disclosure is invalid.");
      }
      if (!parsedRuntimeConfig.success) {
        throw new TypeError("The public demo configuration is invalid.");
      }
      return {
        ...state,
        demoContext: parsedDemoContext.data,
        runtimeConfig: parsedRuntimeConfig.data,
      };
    }
    case "SELECT_ENTRY_MODE":
      assertStage(state, event.type, ["choosing_entry_mode"]);
      return {
        ...state,
        entryMode: event.entryMode,
        stage:
          event.entryMode === "cv_assisted"
            ? "awaiting_cv"
            : "preparing_conversation",
        failure: undefined,
      };
    case "CV_EXTRACTION_STARTED":
      assertMode(state, event.type, "cv_assisted");
      assertStage(state, event.type, ["awaiting_cv"]);
      return {
        ...state,
        stage: "extracting_cv",
        failure: undefined,
        restoreNotice: undefined,
      };
    case "CV_EXTRACTION_SUCCEEDED":
      assertMode(state, event.type, "cv_assisted");
      assertStage(state, event.type, ["extracting_cv"]);
      return { ...state, stage: "analyzing_cv", failure: undefined };
    case "CV_PREPARATION_SUCCEEDED":
      assertMode(state, event.type, "cv_assisted");
      assertStage(state, event.type, ["analyzing_cv"]);
      if (event.plan.entryMode !== "cv_assisted") {
        throw new InvalidSessionTransitionError(state.stage, event.type);
      }
      return {
        ...state,
        stage: "plan_ready",
        cv: event.cv,
        screeningPlan: event.plan,
        interviewGrant: event.interviewGrant,
        interviewGrantExpiresAt: event.interviewGrantExpiresAt,
        cvAnalysisUsage: event.usage,
        failure: undefined,
        restoreNotice: undefined,
      };
    case "CONVERSATION_PREPARATION_SUCCEEDED":
      assertMode(state, event.type, "conversation_first");
      assertStage(state, event.type, ["preparing_conversation"]);
      if (event.plan.entryMode !== "conversation_first") {
        throw new InvalidSessionTransitionError(state.stage, event.type);
      }
      return {
        ...state,
        stage: "preflight",
        screeningPlan: event.plan,
        interviewGrant: event.interviewGrant,
        interviewGrantExpiresAt: event.interviewGrantExpiresAt,
        failure: undefined,
        restoreNotice: undefined,
      };
    case "CONTINUE_TO_PREFLIGHT":
      assertMode(state, event.type, "cv_assisted");
      assertStage(state, event.type, ["plan_ready"]);
      return { ...state, stage: "preflight", failure: undefined };
    case "BACK_FROM_PREFLIGHT":
      assertStage(state, event.type, ["preflight", "ready"]);
      if (state.entryMode === "conversation_first") {
        return clearModeSpecificState(state);
      }
      assertMode(state, event.type, "cv_assisted");
      return { ...state, stage: "plan_ready", failure: undefined };
    case "CONVERSATION_GRANT_EXPIRED":
      assertMode(state, event.type, "conversation_first");
      assertStage(state, event.type, ["preflight", "ready", "connecting"]);
      return {
        ...state,
        stage: "preparing_conversation",
        screeningPlan: undefined,
        interviewGrant: undefined,
        interviewGrantExpiresAt: undefined,
        failure: undefined,
        restoreNotice: "interview_grant_expired",
      };
    case "CV_GRANT_EXPIRED":
      assertMode(state, event.type, "cv_assisted");
      assertStage(state, event.type, [
        "plan_ready",
        "preflight",
        "ready",
        "connecting",
      ]);
      return {
        schemaVersion: state.schemaVersion,
        hydrationStatus: state.hydrationStatus,
        stage: "awaiting_cv",
        entryMode: "cv_assisted",
        createdAt: state.createdAt,
        expiresAt: state.expiresAt,
        runtimeConfig: state.runtimeConfig,
        demoContext: state.demoContext,
        transcript: [],
        insights: [],
        topicProgress: [],
        restoreNotice: "interview_grant_expired",
      };
    case "CHOOSE_ANOTHER_CV":
      assertMode(state, event.type, "cv_assisted");
      assertStage(state, event.type, ["extracting_cv", "analyzing_cv"]);
      return {
        ...state,
        stage: "awaiting_cv",
        failure: undefined,
        restoreNotice: undefined,
      };
    case "PREFLIGHT_READY":
      assertStage(state, event.type, ["preflight"]);
      return { ...state, stage: "ready", failure: undefined };
    case "PREFLIGHT_NOT_READY":
      assertStage(state, event.type, ["ready"]);
      return { ...state, stage: "preflight", failure: undefined };
    case "VOICE_CONNECTING":
      assertStage(state, event.type, ["ready"]);
      return {
        ...state,
        stage: "connecting",
        voice: {
          status: "connecting",
          ...(state.voice?.startedAt
            ? { startedAt: state.voice.startedAt }
            : {}),
        },
      };
    case "VOICE_CONNECT_CANCELLED":
      assertStage(state, event.type, ["connecting"]);
      return {
        ...state,
        stage: "preflight",
        voice: undefined,
        failure: undefined,
      };
    case "VOICE_CONNECTED":
      assertStage(state, event.type, ["connecting"]);
      if (event.voice.status !== "connected") {
        throw new InvalidSessionTransitionError(state.stage, event.type);
      }
      return {
        ...state,
        stage: "live",
        voice: event.voice,
        failure: undefined,
      };
    case "VOICE_ENDING":
      assertStage(state, event.type, ["live"]);
      return { ...state, stage: "ending" };
    case "VOICE_ENDED":
      assertStage(state, event.type, ["ending"]);
      if (event.voice.status !== "ended" && event.voice.status !== "failed") {
        throw new InvalidSessionTransitionError(state.stage, event.type);
      }
      return {
        ...state,
        stage: state.transcript.some(
          (turn) => turn.speaker === "candidate" && turn.status === "final",
        )
          ? "summarizing"
          : "review_ready",
        voice: event.voice,
      };
    case "VOICE_INTERRUPTED":
      assertStage(state, event.type, ["connecting", "live", "ending"]);
      {
        const persistedSession = projectPersistedDemoSession(state);
        if (!persistedSession) {
          throw new InvalidSessionTransitionError(state.stage, event.type);
        }
        return interruptedSession(persistedSession, event.now);
      }
    case "SUMMARY_SUCCEEDED":
      assertStage(state, event.type, ["summarizing"]);
      return {
        ...state,
        stage: "review_ready",
        summary: event.summary,
        failure: undefined,
      };
    case "SESSION_FAILED":
      if (!isFailureStage(state.stage) || event.failure.stage !== state.stage) {
        throw new InvalidSessionTransitionError(state.stage, event.type);
      }
      return { ...state, failure: event.failure };
    case "RETRY":
      if (!state.failure?.retryable) {
        throw new InvalidSessionTransitionError(state.stage, event.type);
      }
      return {
        ...state,
        stage: retryStage(state.failure.stage),
        failure: undefined,
      };
    case "ADD_FINAL_TRANSCRIPT_TURN": {
      const turn = transcriptTurnSchema.parse(event.turn);
      if (turn.status !== "final") {
        throw new TypeError(
          "Only final transcript turns may enter session evidence.",
        );
      }
      if (
        state.transcript.some(
          (existingTurn) =>
            existingTurn.id === turn.id ||
            (existingTurn.speaker === turn.speaker &&
              existingTurn.sequence === turn.sequence),
        )
      ) {
        return state;
      }
      const transcriptCharacters = state.transcript.reduce(
        (total, existingTurn) => total + existingTurn.text.length,
        turn.text.length,
      );
      if (
        state.transcript.length >= MAX_LOCAL_TRANSCRIPT_TURNS ||
        transcriptCharacters > MAX_LOCAL_TRANSCRIPT_CHARACTERS
      ) {
        throw new RangeError(
          "The persisted transcript limit has been reached.",
        );
      }
      return {
        ...state,
        transcript: [...state.transcript, turn].sort((left, right) => {
          const sequenceDifference = left.sequence - right.sequence;
          if (sequenceDifference !== 0) {
            return sequenceDifference;
          }
          const timeDifference = left.occurredAt.localeCompare(
            right.occurredAt,
          );
          return timeDifference !== 0
            ? timeDifference
            : left.id.localeCompare(right.id);
        }),
      };
    }
    case "UPSERT_INSIGHT": {
      const insight = insightCardSchema.parse(event.insight);
      if (
        state.entryMode === "conversation_first" &&
        insight.source !== "Candidate"
      ) {
        throw new TypeError(
          "Conversation-first insights require Candidate provenance.",
        );
      }
      if (
        insight.source !== "CV" &&
        !hasFinalCandidateEvidence(state, insight.evidenceTurnIds)
      ) {
        throw new TypeError(
          "Candidate-sourced insights require final candidate evidence.",
        );
      }
      if (
        insight.source !== "Candidate" &&
        !hasNormalizedCvEvidence(state, insight.cvFactIds)
      ) {
        throw new TypeError(
          "CV-sourced insights require normalized CV evidence.",
        );
      }
      const existingInsight = state.insights.find(
        (candidate) => candidate.id === insight.id,
      );
      if (
        existingInsight &&
        (existingInsight.category !== insight.category ||
          existingInsight.createdAt !== insight.createdAt ||
          existingInsight.evidenceTurnIds.some(
            (turnId) => !insight.evidenceTurnIds.includes(turnId),
          ) ||
          existingInsight.cvFactIds.some(
            (factId) => !insight.cvFactIds.includes(factId),
          ))
      ) {
        throw new TypeError(
          "Insight updates must preserve their identity and evidence history.",
        );
      }
      const nextState: DemoSessionState = {
        ...state,
        insights: upsertByKey(
          state.insights,
          insight,
          (insight) => insight.id,
          24,
        ),
      };
      if (insight.category === "preferred_name") {
        return {
          ...nextState,
          preferredName: {
            value: insight.value,
            source: insight.source,
            evidenceTurnIds: insight.evidenceTurnIds,
          },
        };
      }
      if (insight.category === "role_preference") {
        return {
          ...nextState,
          rolePreference: rolePreferenceSchema.parse({
            label: isUndecidedRoleValue(insight.value) ? null : insight.value,
            status: isUndecidedRoleValue(insight.value)
              ? "undecided"
              : "candidate_stated",
            evidenceTurnIds: insight.evidenceTurnIds,
          }),
        };
      }
      return nextState;
    }
    case "SET_TOPIC_PROGRESS": {
      const progress = topicProgressSchema.parse(event.progress);
      if (!hasFinalCandidateEvidence(state, progress.evidenceTurnIds)) {
        throw new TypeError(
          "Topic progress requires final candidate evidence.",
        );
      }
      const existingProgress = state.topicProgress.find(
        (candidate) => candidate.topicKey === progress.topicKey,
      );
      if (
        existingProgress?.evidenceTurnIds.some(
          (turnId) => !progress.evidenceTurnIds.includes(turnId),
        )
      ) {
        throw new TypeError(
          "Topic progress updates must preserve their evidence history.",
        );
      }
      return {
        ...state,
        topicProgress: upsertByKey(
          state.topicProgress,
          progress,
          (progress) => progress.topicKey,
          16,
        ),
      };
    }
    case "START_OVER":
      assertStage(state, event.type, [
        "awaiting_cv",
        "extracting_cv",
        "analyzing_cv",
        "plan_ready",
        "preparing_conversation",
        "preflight",
        "ready",
      ]);
      return clearModeSpecificState(state);
    case "BEGIN_NEW_SESSION":
      assertStage(state, event.type, ["cleared"]);
      return {
        ...createInitialDemoSessionState(),
        ...createSessionWindow(event.now),
        hydrationStatus: "ready",
        restoreNotice: state.restoreNotice,
      };
    case "SESSION_EXPIRED":
      return {
        ...createInitialDemoSessionState(),
        hydrationStatus: "ready",
        stage: "cleared",
        restoreNotice: "expired_session_cleared",
      };
    case "CLEAR_SESSION":
      return {
        ...createInitialDemoSessionState(),
        hydrationStatus: "ready",
        stage: "cleared",
      };
  }
}
