import type { InterviewGrant } from "@screenpilot/contracts/api/interview-preparation";
import type { ProviderUsage } from "@screenpilot/contracts/api/cv-analysis";
import {
  publicRuntimeConfigSchema,
  type PublicRuntimeConfig,
} from "@screenpilot/contracts/api/public-runtime-config";
import type { VoiceMetadata } from "@screenpilot/contracts/api/voice-token";
import {
  publicRoleNeutralDemoContextSchema,
  rolePreferenceSchema,
  type PublicRoleNeutralDemoContext,
} from "@screenpilot/contracts/interview/demo-context";
import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";
import type { InsightCard } from "@screenpilot/contracts/interview/insight-card";
import type { NormalizedCv } from "@screenpilot/contracts/interview/normalized-cv";
import type { ScreeningPlan } from "@screenpilot/contracts/interview/screening-plan";
import type { ScreeningSummary } from "@screenpilot/contracts/interview/screening-summary";
import type { TopicProgress } from "@screenpilot/contracts/interview/topic-progress";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";

import {
  FAILURE_STAGES,
  type DemoStage,
  type DemoSessionState,
  type FailureStage,
  type PreferredName,
  type RolePreference,
  type SessionFailure,
  type SessionRestoreNotice,
} from "./demo-session.types";
import {
  projectPersistedDemoSession,
  SESSION_LIFETIME_MS,
  type PersistedDemoSession,
} from "./persisted-session.schema";

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
  | Readonly<{ type: "SET_PREFERRED_NAME"; preferredName: PreferredName }>
  | Readonly<{ type: "SET_ROLE_PREFERENCE"; rolePreference: RolePreference }>
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
    stage: hasUsableEvidence ? "review_ready" : "preflight",
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
    return "ready";
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
      assertStage(state, event.type, ["preflight", "ready"]);
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
      assertStage(state, event.type, ["plan_ready", "preflight", "ready"]);
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
      return { ...state, stage: "connecting", voice: { status: "connecting" } };
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
      return { ...state, stage: "summarizing", voice: event.voice };
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
      if (event.turn.status !== "final") {
        throw new TypeError(
          "Only final transcript turns may enter session evidence.",
        );
      }
      if (state.transcript.some((turn) => turn.id === event.turn.id)) {
        return state;
      }
      const transcriptCharacters = state.transcript.reduce(
        (total, turn) => total + turn.text.length,
        event.turn.text.length,
      );
      if (state.transcript.length >= 160 || transcriptCharacters > 30_000) {
        throw new RangeError(
          "The persisted transcript limit has been reached.",
        );
      }
      return { ...state, transcript: [...state.transcript, event.turn] };
    }
    case "UPSERT_INSIGHT":
      if (
        state.entryMode === "conversation_first" &&
        event.insight.source !== "Candidate"
      ) {
        throw new TypeError(
          "Conversation-first insights require Candidate provenance.",
        );
      }
      if (
        event.insight.source !== "CV" &&
        !hasFinalCandidateEvidence(state, event.insight.evidenceTurnIds)
      ) {
        throw new TypeError(
          "Candidate-sourced insights require final candidate evidence.",
        );
      }
      if (
        event.insight.source !== "Candidate" &&
        !hasNormalizedCvEvidence(state, event.insight.cvFactIds)
      ) {
        throw new TypeError(
          "CV-sourced insights require normalized CV evidence.",
        );
      }
      return {
        ...state,
        insights: upsertByKey(
          state.insights,
          event.insight,
          (insight) => insight.id,
          24,
        ),
      };
    case "SET_TOPIC_PROGRESS":
      return {
        ...state,
        topicProgress: upsertByKey(
          state.topicProgress,
          event.progress,
          (progress) => progress.topicKey,
          16,
        ),
      };
    case "SET_PREFERRED_NAME":
      if (
        state.entryMode === "conversation_first" &&
        event.preferredName.source !== "Candidate"
      ) {
        throw new TypeError(
          "Conversation-first preferred names require Candidate provenance.",
        );
      }
      if (
        event.preferredName.source !== "CV" &&
        !hasFinalCandidateEvidence(state, event.preferredName.evidenceTurnIds)
      ) {
        throw new TypeError(
          "Candidate-confirmed preferred names require final candidate evidence.",
        );
      }
      return { ...state, preferredName: event.preferredName };
    case "SET_ROLE_PREFERENCE": {
      const rolePreference = rolePreferenceSchema.parse(event.rolePreference);
      if (!hasFinalCandidateEvidence(state, rolePreference.evidenceTurnIds)) {
        throw new TypeError(
          "Role preferences require final candidate evidence.",
        );
      }
      return { ...state, rolePreference };
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
