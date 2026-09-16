import type { PublicRoleNeutralDemoContext } from "@screenpilot/contracts/interview/demo-context";
import type { PublicRuntimeConfig } from "@screenpilot/contracts/api/public-runtime-config";
import type { NormalizedCv } from "@screenpilot/contracts/interview/normalized-cv";
import {
  FIXED_TOPIC_KEYS,
  type ScreeningPlan,
  UNIVERSAL_TOPIC_KEYS,
} from "@screenpilot/contracts/interview/screening-plan";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";
import { describe, expect, it } from "vitest";

import {
  createInitialDemoSessionState,
  demoSessionReducer,
  InvalidSessionTransitionError,
} from "./demo-session.reducer";
import type { DemoSessionState } from "./demo-session.types";
import { projectPersistedDemoSession } from "./persisted-session.schema";

const NOW = "2026-09-09T09:00:00.000Z";
const LATER = "2026-09-09T09:20:00.000Z";
const INTERVIEW_GRANT = "signed-test-grant";
const INTERVIEW_GRANT_EXPIRES_AT = "2026-09-09T09:15:00.000Z";

const runtimeConfig: PublicRuntimeConfig = {
  abuseProtection: {
    appearance: "interaction-only",
    provider: "cloudflare_turnstile",
    siteKey: "",
  },
  limits: {
    callSeconds: 480,
    cvCharacters: 40_000,
    pdfBytes: 5_242_880,
    pdfPages: 8,
  },
  paidOperationsEnabled: false,
  privacyNoticeVersion: "2026-09-11",
  providerMode: "fake",
};

const demoContext: PublicRoleNeutralDemoContext = {
  kind: "role_agnostic_first_stage_hr_screen",
  roleAvailability: "candidate_selected_synthetic_session_vacancy",
  employerFactsAvailable: false,
};

function plan(entryMode: "cv_assisted" | "conversation_first"): ScreeningPlan {
  const conversationFirst = entryMode === "conversation_first";
  return {
    entryMode,
    openingIntent: "Begin a concise recruiter screening conversation.",
    branch: conversationFirst ? "discovery" : "graduate",
    roleClarification: {
      suggestedRole: conversationFirst ? null : "Frontend Developer",
      reason: "The candidate must confirm the screening direction.",
      cvFactIds: conversationFirst ? [] : ["fact-1"],
      requiresCandidateConfirmation: true,
    },
    topics: UNIVERSAL_TOPIC_KEYS.map((key) => ({
      key,
      title: key,
      reason: "Understand one universal HR field.",
      cvFactIds:
        !conversationFirst && key === "current_context" ? ["fact-1"] : [],
      intent: "Learn one universal HR field without professional assessment.",
      coverageCriteria: ["Candidate evidence covers this field."],
      followupDirections: [],
      required: key !== "clarifications_and_followups",
    })),
    fixedTopics: [...FIXED_TOPIC_KEYS],
  };
}

const normalizedCv: NormalizedCv = {
  displayName: "Test Candidate",
  displayNameEvidence: "Test Candidate",
  headline: "Frontend developer",
  experienceLevel: "junior",
  facts: [
    {
      id: "fact-1",
      category: "experience",
      statement: "Worked on a customer-facing web product.",
      evidenceExcerpt: "Built customer-facing web product features.",
    },
  ],
  ambiguities: [],
  suggestedRole: {
    label: "Frontend Developer",
    cvFactIds: ["fact-1"],
  },
};

const finalCandidateTurn: TranscriptTurn = {
  id: "turn-1",
  sequence: 1,
  speaker: "candidate",
  status: "final",
  text: "I recently completed a frontend internship.",
  occurredAt: LATER,
};

function bootstrappedState(): DemoSessionState {
  let state = demoSessionReducer(createInitialDemoSessionState(), {
    type: "HYDRATION_FINISHED",
    now: NOW,
  });
  state = demoSessionReducer(state, { type: "BOOTSTRAP_STARTED" });
  return demoSessionReducer(state, {
    type: "BOOTSTRAP_SUCCEEDED",
    demoContext,
    runtimeConfig,
  });
}

function conversationPreflightState(): DemoSessionState {
  const state = demoSessionReducer(bootstrappedState(), {
    type: "SELECT_ENTRY_MODE",
    entryMode: "conversation_first",
  });
  return demoSessionReducer(state, {
    type: "CONVERSATION_PREPARATION_SUCCEEDED",
    plan: plan("conversation_first"),
    interviewGrant: INTERVIEW_GRANT,
    interviewGrantExpiresAt: INTERVIEW_GRANT_EXPIRES_AT,
  });
}

function cvPreparationState(
  targetStage: "awaiting_cv" | "extracting_cv" | "analyzing_cv" | "plan_ready",
): DemoSessionState {
  let state = demoSessionReducer(bootstrappedState(), {
    type: "SELECT_ENTRY_MODE",
    entryMode: "cv_assisted",
  });
  if (targetStage === "awaiting_cv") {
    return state;
  }

  state = demoSessionReducer(state, { type: "CV_EXTRACTION_STARTED" });
  if (targetStage === "extracting_cv") {
    return state;
  }

  state = demoSessionReducer(state, { type: "CV_EXTRACTION_SUCCEEDED" });
  if (targetStage === "analyzing_cv") {
    return state;
  }

  return demoSessionReducer(state, {
    type: "CV_PREPARATION_SUCCEEDED",
    cv: normalizedCv,
    plan: plan("cv_assisted"),
    interviewGrant: INTERVIEW_GRANT,
    interviewGrantExpiresAt: INTERVIEW_GRANT_EXPIRES_AT,
    usage: {
      cachedInputTokens: 0,
      estimatedCostUsd: 0.003,
      inputTokens: 700,
      outputTokens: 500,
    },
  });
}

describe("demoSessionReducer", () => {
  it("converges both preparation branches on the same preflight stage", () => {
    const conversationState = conversationPreflightState();

    let cvState = cvPreparationState("plan_ready");
    cvState = demoSessionReducer(cvState, { type: "CONTINUE_TO_PREFLIGHT" });

    expect(conversationState.stage).toBe("preflight");
    expect(cvState.stage).toBe("preflight");
    expect(conversationState.cv).toBeUndefined();
    expect(cvState.cv).toEqual(normalizedCv);
  });

  it("rejects cross-mode and post-convergence mode changes", () => {
    const conversationState = conversationPreflightState();

    expect(() =>
      demoSessionReducer(conversationState, { type: "CV_EXTRACTION_STARTED" }),
    ).toThrow(InvalidSessionTransitionError);
    expect(() =>
      demoSessionReducer(conversationState, {
        type: "SELECT_ENTRY_MODE",
        entryMode: "cv_assisted",
      }),
    ).toThrow(InvalidSessionTransitionError);
    expect(() =>
      demoSessionReducer(conversationState, {
        type: "UPSERT_INSIGHT",
        insight: {
          id: "insight-1",
          category: "current_context",
          label: "Current context",
          value: "Frontend internship",
          source: "CV",
          status: "confirmed",
          evidenceTurnIds: [],
          cvFactIds: ["fact-1"],
          createdAt: LATER,
          updatedAt: LATER,
        },
      }),
    ).toThrow("Conversation-first insights require Candidate provenance");
  });

  it("clears mode-specific preparation on start-over and retries by mode", () => {
    let cvState = demoSessionReducer(bootstrappedState(), {
      type: "SELECT_ENTRY_MODE",
      entryMode: "cv_assisted",
    });
    cvState = demoSessionReducer(cvState, { type: "CV_EXTRACTION_STARTED" });
    cvState = demoSessionReducer(cvState, {
      type: "SESSION_FAILED",
      failure: {
        stage: "extracting_cv",
        code: "PDF_READ_FAILED",
        message: "The PDF could not be read.",
        retryable: true,
      },
    });
    cvState = demoSessionReducer(cvState, { type: "RETRY" });
    expect(cvState.stage).toBe("awaiting_cv");

    let conversationState = demoSessionReducer(bootstrappedState(), {
      type: "SELECT_ENTRY_MODE",
      entryMode: "conversation_first",
    });
    conversationState = demoSessionReducer(conversationState, {
      type: "SESSION_FAILED",
      failure: {
        stage: "preparing_conversation",
        code: "PREPARATION_FAILED",
        message: "Preparation failed.",
        retryable: true,
      },
    });
    conversationState = demoSessionReducer(conversationState, {
      type: "RETRY",
    });
    expect(conversationState.stage).toBe("preparing_conversation");

    const restartedState = demoSessionReducer(conversationState, {
      type: "START_OVER",
    });
    expect(restartedState).toMatchObject({
      stage: "choosing_entry_mode",
      entryMode: null,
      transcript: [],
      insights: [],
      topicProgress: [],
    });
    expect(restartedState.screeningPlan).toBeUndefined();
    expect(restartedState.interviewGrant).toBeUndefined();
  });

  it("returns from shared preflight by mode and tracks readiness loss", () => {
    const conversationState = conversationPreflightState();
    const readyState = demoSessionReducer(conversationState, {
      type: "PREFLIGHT_READY",
    });
    const noLongerReady = demoSessionReducer(readyState, {
      type: "PREFLIGHT_NOT_READY",
    });

    expect(readyState.stage).toBe("ready");
    expect(noLongerReady.stage).toBe("preflight");

    const backToChoices = demoSessionReducer(conversationState, {
      type: "BACK_FROM_PREFLIGHT",
    });
    expect(backToChoices).toMatchObject({
      stage: "choosing_entry_mode",
      entryMode: null,
    });
    expect(
      demoSessionReducer(readyState, { type: "BACK_FROM_PREFLIGHT" }),
    ).toMatchObject({
      stage: "choosing_entry_mode",
      entryMode: null,
    });

    let cvState = cvPreparationState("plan_ready");
    cvState = demoSessionReducer(cvState, { type: "CONTINUE_TO_PREFLIGHT" });
    const backToPlan = demoSessionReducer(cvState, {
      type: "BACK_FROM_PREFLIGHT",
    });
    expect(backToPlan.stage).toBe("plan_ready");
    expect(backToPlan.entryMode).toBe("cv_assisted");
  });

  it.each([
    ["conversation_first", "preflight", "preparing_conversation"],
    ["conversation_first", "ready", "preparing_conversation"],
    ["conversation_first", "connecting", "preparing_conversation"],
    ["cv_assisted", "preflight", "awaiting_cv"],
    ["cv_assisted", "ready", "awaiting_cv"],
    ["cv_assisted", "connecting", "awaiting_cv"],
  ] as const)(
    "recovers %s from an expired grant in %s",
    (entryMode, expiringStage, expectedStage) => {
      let expiringState =
        entryMode === "conversation_first"
          ? conversationPreflightState()
          : demoSessionReducer(cvPreparationState("plan_ready"), {
              type: "CONTINUE_TO_PREFLIGHT",
            });
      if (expiringStage === "ready" || expiringStage === "connecting") {
        expiringState = demoSessionReducer(expiringState, {
          type: "PREFLIGHT_READY",
        });
      }
      if (expiringStage === "connecting") {
        expiringState = demoSessionReducer(expiringState, {
          type: "VOICE_CONNECTING",
        });
      }

      const recoveredState = demoSessionReducer(
        expiringState,
        entryMode === "conversation_first"
          ? { type: "CONVERSATION_GRANT_EXPIRED" }
          : { type: "CV_GRANT_EXPIRED" },
      );

      expect(recoveredState).toMatchObject({
        stage: expectedStage,
        entryMode,
        restoreNotice: "interview_grant_expired",
      });
      expect(recoveredState.screeningPlan).toBeUndefined();
      expect(recoveredState.interviewGrant).toBeUndefined();
      expect(recoveredState.interviewGrantExpiresAt).toBeUndefined();
      expect(recoveredState.cv).toBeUndefined();
    },
  );

  it("returns cancellation and connection retries to fresh preflight", () => {
    let connecting = demoSessionReducer(conversationPreflightState(), {
      type: "PREFLIGHT_READY",
    });
    connecting = demoSessionReducer(connecting, { type: "VOICE_CONNECTING" });

    const cancelled = demoSessionReducer(connecting, {
      type: "VOICE_CONNECT_CANCELLED",
    });
    expect(cancelled).toMatchObject({ stage: "preflight" });
    expect(cancelled.voice).toBeUndefined();

    const failed = demoSessionReducer(connecting, {
      type: "SESSION_FAILED",
      failure: {
        stage: "connecting",
        code: "PROVIDER_UNAVAILABLE",
        message: "Voice is temporarily unavailable.",
        retryable: true,
      },
    });
    const retry = demoSessionReducer(failed, { type: "RETRY" });
    expect(retry).toMatchObject({ stage: "preflight" });
    expect(retry.failure).toBeUndefined();
  });

  it("preserves the original start time when a preflight retry reconnects", () => {
    const startedAt = "2026-09-15T10:00:00.000Z";
    const ready = demoSessionReducer(
      {
        ...conversationPreflightState(),
        voice: {
          status: "failed",
          startedAt,
          endedAt: "2026-09-15T10:01:00.000Z",
          endReason: "The connection was interrupted.",
        },
      },
      { type: "PREFLIGHT_READY" },
    );

    const reconnecting = demoSessionReducer(ready, {
      type: "VOICE_CONNECTING",
    });

    expect(reconnecting.voice).toEqual({ status: "connecting", startedAt });
  });

  it("starts a fresh browser-session window after clear", () => {
    const cleared = demoSessionReducer(conversationPreflightState(), {
      type: "CLEAR_SESSION",
    });
    const restarted = demoSessionReducer(cleared, {
      type: "BEGIN_NEW_SESSION",
      now: LATER,
    });

    expect(restarted).toMatchObject({
      hydrationStatus: "ready",
      stage: "empty",
      entryMode: null,
      createdAt: LATER,
    });
    expect(restarted.expiresAt).not.toBeNull();
  });

  it("keeps only bounded final transcript evidence", () => {
    const state = conversationPreflightState();
    const withTurn = demoSessionReducer(state, {
      type: "ADD_FINAL_TRANSCRIPT_TURN",
      turn: finalCandidateTurn,
    });
    const duplicate = demoSessionReducer(withTurn, {
      type: "ADD_FINAL_TRANSCRIPT_TURN",
      turn: finalCandidateTurn,
    });

    expect(duplicate.transcript).toHaveLength(1);
    expect(() =>
      demoSessionReducer(state, {
        type: "ADD_FINAL_TRANSCRIPT_TURN",
        turn: { ...finalCandidateTurn, id: "partial", status: "partial" },
      }),
    ).toThrow("Only final transcript turns");
  });

  it("orders final turns by provider sequence and ignores sequence duplicates", () => {
    const state = conversationPreflightState();
    const laterTurn = {
      ...finalCandidateTurn,
      id: "voice-candidate-8",
      sequence: 8,
      text: "This callback arrived first.",
    };
    const earlierTurn = {
      ...finalCandidateTurn,
      id: "voice-candidate-3",
      sequence: 3,
      text: "This callback belongs first.",
    };
    const repeatedSequence = {
      ...finalCandidateTurn,
      id: "different-id-for-sequence-8",
      sequence: 8,
      text: "A repeated provider event must not create another turn.",
    };

    const withLater = demoSessionReducer(state, {
      type: "ADD_FINAL_TRANSCRIPT_TURN",
      turn: laterTurn,
    });
    const ordered = demoSessionReducer(withLater, {
      type: "ADD_FINAL_TRANSCRIPT_TURN",
      turn: earlierTurn,
    });
    const deduplicated = demoSessionReducer(ordered, {
      type: "ADD_FINAL_TRANSCRIPT_TURN",
      turn: repeatedSequence,
    });

    expect(deduplicated.transcript.map((turn) => turn.sequence)).toEqual([
      3, 8,
    ]);
    expect(deduplicated.transcript).toHaveLength(2);
  });

  it("rejects CV insights that reference unknown normalized facts", () => {
    const state = cvPreparationState("plan_ready");
    const cvInsight = {
      id: "insight-cv-1",
      category: "relevant_experience" as const,
      label: "Relevant experience",
      value: "Customer-facing web product work",
      source: "CV" as const,
      status: "confirmed" as const,
      evidenceTurnIds: [],
      cvFactIds: ["missing-fact"],
      createdAt: LATER,
      updatedAt: LATER,
    };

    expect(() =>
      demoSessionReducer(state, {
        type: "UPSERT_INSIGHT",
        insight: cvInsight,
      }),
    ).toThrow("normalized CV evidence");

    const evidencedState = demoSessionReducer(state, {
      type: "UPSERT_INSIGHT",
      insight: { ...cvInsight, cvFactIds: ["fact-1"] },
    });
    expect(evidencedState.insights).toHaveLength(1);
  });

  it.each(["extracting_cv", "analyzing_cv"] as const)(
    "restores %s at CV selection because the file and raw text were memory-only",
    (processingStage) => {
      const persistedSession = projectPersistedDemoSession(
        cvPreparationState(processingStage),
      );
      if (!persistedSession) {
        throw new Error(
          "Expected the CV-processing session to be persistable.",
        );
      }

      const restoredState = demoSessionReducer(
        createInitialDemoSessionState(),
        {
          type: "RESTORE_SESSION",
          session: persistedSession,
          now: "2026-09-09T09:30:00.000Z",
        },
      );

      expect(restoredState).toMatchObject({
        stage: "awaiting_cv",
        entryMode: "cv_assisted",
        restoreNotice: "cv_file_required_after_refresh",
      });
      expect(restoredState.cv).toBeUndefined();
      expect(restoredState.screeningPlan).toBeUndefined();
    },
  );

  it("restores an active call as interrupted without reconnecting", () => {
    let state = demoSessionReducer(conversationPreflightState(), {
      type: "PREFLIGHT_READY",
    });
    state = demoSessionReducer(state, { type: "VOICE_CONNECTING" });
    state = demoSessionReducer(state, {
      type: "VOICE_CONNECTED",
      voice: {
        conversationId: "conversation-1",
        status: "connected",
        startedAt: LATER,
      },
    });
    state = demoSessionReducer(state, {
      type: "ADD_FINAL_TRANSCRIPT_TURN",
      turn: finalCandidateTurn,
    });
    const persistedSession = projectPersistedDemoSession(state);
    if (!persistedSession) {
      throw new Error("Expected the active test session to be persistable.");
    }

    const restoredState = demoSessionReducer(createInitialDemoSessionState(), {
      type: "RESTORE_SESSION",
      session: persistedSession,
      now: "2026-09-09T09:30:00.000Z",
    });

    expect(restoredState.stage).toBe("review_ready");
    expect(restoredState.restoreNotice).toBe("call_interrupted");
    expect(restoredState.voice).toMatchObject({
      conversationId: "conversation-1",
      status: "failed",
      endReason: "Voice session was interrupted by a page refresh.",
    });
    expect(restoredState.transcript).toEqual([finalCandidateTurn]);
  });

  it("restores ready state to preflight because consent and device readiness are local", () => {
    const readyState = demoSessionReducer(conversationPreflightState(), {
      type: "PREFLIGHT_READY",
    });
    const persisted = projectPersistedDemoSession(readyState);
    expect(persisted).not.toBeNull();
    if (!persisted) {
      throw new Error("Expected ready state to remain persistable.");
    }

    const restoredState = demoSessionReducer(createInitialDemoSessionState(), {
      type: "RESTORE_SESSION",
      session: persisted,
      now: NOW,
    });

    expect(restoredState.stage).toBe("preflight");
    expect(restoredState.interviewGrant).toBe(INTERVIEW_GRANT);
  });

  it("restores interrupted summary generation as an honest retryable failure", () => {
    let state = demoSessionReducer(conversationPreflightState(), {
      type: "PREFLIGHT_READY",
    });
    state = demoSessionReducer(state, { type: "VOICE_CONNECTING" });
    state = demoSessionReducer(state, {
      type: "VOICE_CONNECTED",
      voice: {
        conversationId: "conversation-1",
        status: "connected",
        startedAt: LATER,
      },
    });
    state = demoSessionReducer(state, {
      type: "ADD_FINAL_TRANSCRIPT_TURN",
      turn: finalCandidateTurn,
    });
    state = demoSessionReducer(state, {
      type: "UPSERT_INSIGHT",
      insight: {
        id: "insight-1",
        category: "current_context",
        label: "Current context",
        value: "Frontend internship",
        source: "Candidate",
        status: "confirmed",
        evidenceTurnIds: [finalCandidateTurn.id],
        cvFactIds: [],
        createdAt: LATER,
        updatedAt: LATER,
      },
    });
    state = demoSessionReducer(state, { type: "VOICE_ENDING" });
    state = demoSessionReducer(state, {
      type: "VOICE_ENDED",
      voice: {
        conversationId: "conversation-1",
        status: "ended",
        startedAt: LATER,
        endedAt: "2026-09-09T09:25:00.000Z",
      },
    });
    const persistedSession = projectPersistedDemoSession(state);
    if (!persistedSession) {
      throw new Error("Expected the summarizing session to be persistable.");
    }

    const restoredState = demoSessionReducer(createInitialDemoSessionState(), {
      type: "RESTORE_SESSION",
      session: persistedSession,
      now: "2026-09-09T09:30:00.000Z",
    });

    expect(restoredState.stage).toBe("summarizing");
    expect(restoredState.restoreNotice).toBe("summary_interrupted");
    expect(restoredState.failure).toMatchObject({
      stage: "summarizing",
      code: "SUMMARY_INTERRUPTED",
      retryable: true,
    });
    expect(restoredState.voice?.status).toBe("ended");
    expect(restoredState.transcript).toEqual([finalCandidateTurn]);
    expect(restoredState.insights).toHaveLength(1);

    const retryState = demoSessionReducer(restoredState, { type: "RETRY" });
    expect(retryState.stage).toBe("summarizing");
    expect(retryState.failure).toBeUndefined();
  });

  it("returns a cleared state with no candidate or preparation content", () => {
    const cleared = demoSessionReducer(conversationPreflightState(), {
      type: "CLEAR_SESSION",
    });

    expect(cleared).toEqual({
      schemaVersion: 3,
      hydrationStatus: "ready",
      stage: "cleared",
      entryMode: null,
      createdAt: null,
      expiresAt: null,
      runtimeConfig: null,
      demoContext: null,
      transcript: [],
      insights: [],
      topicProgress: [],
    });
  });

  it("completes the temporary demo through a scrubbed reducer-owned stage", () => {
    let state = demoSessionReducer(conversationPreflightState(), {
      type: "PREFLIGHT_READY",
    });
    state = demoSessionReducer(state, { type: "VOICE_CONNECTING" });
    state = demoSessionReducer(state, {
      type: "VOICE_CONNECTED",
      voice: {
        conversationId: "conversation-1",
        status: "connected",
        startedAt: LATER,
      },
    });
    state = demoSessionReducer(state, {
      type: "ADD_FINAL_TRANSCRIPT_TURN",
      turn: finalCandidateTurn,
    });
    state = demoSessionReducer(state, { type: "VOICE_ENDING" });

    const completed = demoSessionReducer(state, {
      type: "DEMO_INTERVIEW_COMPLETED",
    });

    expect(completed).toEqual({
      schemaVersion: 3,
      hydrationStatus: "ready",
      stage: "complete_placeholder",
      entryMode: null,
      createdAt: null,
      expiresAt: null,
      runtimeConfig: null,
      demoContext: null,
      transcript: [],
      insights: [],
      topicProgress: [],
    });
    expect(projectPersistedDemoSession(completed)).toBeNull();
  });

  it("rejects demo completion before voice shutdown begins", () => {
    expect(() =>
      demoSessionReducer(conversationPreflightState(), {
        type: "DEMO_INTERVIEW_COMPLETED",
      }),
    ).toThrow(InvalidSessionTransitionError);
  });

  it("expires an open tab into an understandable cleared state", () => {
    const expired = demoSessionReducer(bootstrappedState(), {
      type: "SESSION_EXPIRED",
    });

    expect(expired.stage).toBe("cleared");
    expect(expired.restoreNotice).toBe("expired_session_cleared");
    expect(expired.demoContext).toBeNull();
    expect(expired.entryMode).toBeNull();
  });
});
