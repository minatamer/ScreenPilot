"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { PrepareInterviewResponse } from "@screenpilot/contracts/api/interview-preparation";
import type { AnalyzeCvResponse } from "@screenpilot/contracts/api/cv-analysis";
import {
  areInteractiveProviderOperationsEnabled,
  areLiveProviderOperationsEnabled,
} from "@screenpilot/contracts/api/public-runtime-config";
import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";
import type { InsightCard } from "@screenpilot/contracts/interview/insight-card";
import type { TopicProgress } from "@screenpilot/contracts/interview/topic-progress";

import { CvStage } from "@/features/cv/cv-stage";
import { createCvInsightSeeds } from "@/features/insights/seed-cv-insights";
import { InterviewStage } from "@/features/interview/interview-stage";
import {
  createVoicePerformanceCollector,
  createVoicePerformanceTracker,
} from "@/features/interview/voice-performance";
import type { VoiceStartRequest } from "@/features/interview/voice-connection-stage";
import { CvPlanPreview } from "@/features/plan/cv-plan-preview";
import { PreflightHandoff } from "@/features/preflight/preflight-handoff";
import { PrivacyDialog } from "@/features/privacy/privacy-dialog";
import { InterviewEvidenceReview } from "@/features/review/interview-evidence-review";
import { InterviewSummaryPreparation } from "@/features/review/interview-summary-preparation";
import { SessionClearDialog } from "@/features/review/session-clear-dialog";
import type {
  DemoStage,
  SessionFailure,
} from "@/features/session/demo-session.types";
import { ProviderOperationsUnavailable } from "@/features/session/provider-operations-unavailable";
import { useDemoSession } from "@/features/session/use-demo-session";
import { AppShell } from "@/shared/ui/app-shell";
import { Button } from "@/shared/ui/button";
import { DemoStageHeading } from "@/shared/ui/demo-stage-heading";
import { ErrorPanel } from "@/shared/ui/error-panel";
import { PageContainer } from "@/shared/ui/layout";
import { SiteHeader } from "@/shared/ui/site-header";

import { BootstrapStatus } from "./bootstrap-status";
import { ConversationPreparationStage } from "./conversation-preparation-stage";
import { EntryModeChooser } from "./entry-mode-chooser";
import { useDemoBootstrap } from "./use-demo-bootstrap";

const VoiceConnectionStage = dynamic(
  () =>
    import("@/features/interview/voice-connection-stage").then(
      (module) => module.VoiceConnectionStage,
    ),
  {
    loading: () => (
      <div className="sp-demo-stage" role="status">
        <DemoStageHeading
          pretitle="Secure connection"
          step={4}
          title="Loading the private voice client."
        />
      </div>
    ),
    ssr: false,
  },
);

const DEMO_STAGE_STEP: Readonly<Record<DemoStage, 1 | 2 | 3 | 4 | 5>> = {
  empty: 1,
  bootstrapping: 1,
  choosing_entry_mode: 1,
  awaiting_cv: 2,
  extracting_cv: 2,
  analyzing_cv: 2,
  plan_ready: 2,
  preparing_conversation: 2,
  preflight: 3,
  ready: 3,
  connecting: 4,
  live: 4,
  ending: 4,
  interview_complete: 4,
  summarizing: 5,
  review_ready: 5,
  cleared: 1,
};

export function DemoExperience() {
  const router = useRouter();
  const {
    completeInterview,
    clearSession,
    dispatch,
    startOver,
    state,
    storageStatus,
  } = useDemoSession();
  const [voiceStartRequest, setVoiceStartRequest] =
    useState<VoiceStartRequest | null>(null);
  const [summaryRequestPending, setSummaryRequestPending] = useState(false);
  const [performanceTracker] = useState(createVoicePerformanceTracker);
  const [performanceCollector] = useState(() =>
    createVoicePerformanceCollector(performanceTracker),
  );
  const { retryRuntimeConfig, runtimeConfigStatus } = useDemoBootstrap();
  const providerOperationsEnabled = Boolean(
    runtimeConfigStatus === "ready" &&
    state.runtimeConfig &&
    areInteractiveProviderOperationsEnabled(state.runtimeConfig),
  );
  const liveProviderOperationsEnabled = Boolean(
    runtimeConfigStatus === "ready" &&
    state.runtimeConfig &&
    areLiveProviderOperationsEnabled(state.runtimeConfig),
  );

  useEffect(() => {
    if (state.stage === "cleared") {
      router.replace("/");
    }
  }, [router, state.stage]);

  const handlePrepared = useCallback(
    (response: PrepareInterviewResponse) => {
      dispatch({
        type: "CONVERSATION_PREPARATION_SUCCEEDED",
        plan: response.plan,
        interviewGrant: response.interviewGrant,
        interviewGrantExpiresAt: response.expiresAt,
      });
    },
    [dispatch],
  );
  const handleCvPrepared = useCallback(
    (response: AnalyzeCvResponse) => {
      const preparedAt = new Date().toISOString();
      dispatch({
        type: "CV_PREPARATION_SUCCEEDED",
        cv: response.cv,
        plan: response.plan,
        interviewGrant: response.interviewGrant,
        interviewGrantExpiresAt: response.expiresAt,
        usage: response.usage,
      });
      for (const insight of createCvInsightSeeds(response.cv, preparedAt)) {
        dispatch({ type: "UPSERT_INSIGHT", insight });
      }
    },
    [dispatch],
  );
  const handlePreparationFailure = useCallback(
    (failure: SessionFailure) => {
      dispatch({ type: "SESSION_FAILED", failure });
    },
    [dispatch],
  );
  const selectEntryMode = (entryMode: EntryMode) => {
    if (entryMode === "cv_assisted" && !providerOperationsEnabled) {
      return;
    }
    dispatch({ type: "SELECT_ENTRY_MODE", entryMode });
  };
  const returnHomeAfterClear = () => {
    if (!clearSession()) {
      return false;
    }
    router.replace("/");
    return true;
  };
  const showRuntimeConfigFailure =
    runtimeConfigStatus === "failed" &&
    state.stage !== "empty" &&
    state.stage !== "bootstrapping" &&
    state.stage !== "cleared";

  let stageContent;
  if (
    (state.stage === "summarizing" || state.stage === "review_ready") &&
    state.entryMode &&
    state.screeningPlan &&
    state.runtimeConfig
  ) {
    stageContent = (
      <InterviewEvidenceReview
        {...(state.cv ? { cv: state.cv } : {})}
        entryMode={state.entryMode}
        {...(state.failure?.stage === "summarizing"
          ? { failure: state.failure }
          : {})}
        insights={state.insights}
        interviewGrant={state.interviewGrant ?? ""}
        isPartial={
          state.restoreNotice === "call_interrupted" ||
          state.voice?.status === "failed"
        }
        onFailure={handlePreparationFailure}
        onRetry={() => {
          dispatch({ type: "RETRY" });
        }}
        onReturnHome={returnHomeAfterClear}
        onSummarySucceeded={(response) => {
          dispatch({ type: "SUMMARY_SUCCEEDED", summary: response.summary });
        }}
        plan={state.screeningPlan}
        runtimeConfig={state.runtimeConfig}
        stage={state.stage}
        storageStatus={storageStatus}
        summaryPreparationManagedExternally
        summaryRequestPending={summaryRequestPending}
        {...(state.summary ? { summary: state.summary } : {})}
        topicProgress={state.topicProgress}
        transcript={state.transcript}
      />
    );
  } else if (
    state.stage === "interview_complete" &&
    state.entryMode &&
    state.interviewCompletion
  ) {
    stageContent = (
      <InterviewStage
        {...(state.cv ? { cv: state.cv } : {})}
        completed
        elapsedSeconds={state.interviewCompletion.elapsedSeconds}
        entryMode={state.entryMode}
        insights={state.insights}
        onViewSummary={() => {
          dispatch({ type: "VIEW_SUMMARY" });
        }}
        topicProgress={state.topicProgress}
        transcript={state.transcript}
      />
    );
  } else if (
    state.hydrationStatus === "pending" ||
    state.stage === "empty" ||
    state.stage === "bootstrapping" ||
    state.stage === "cleared"
  ) {
    stageContent = (
      <div className="sp-demo-stage">
        <DemoStageHeading
          pretitle="Private browser demo"
          step={1}
          title={
            state.failure
              ? "Your private demo needs another try."
              : "Preparing your private demo."
          }
        />
        <BootstrapStatus
          failure={state.failure}
          onExit={returnHomeAfterClear}
          onRetry={() => {
            dispatch({ type: "RETRY" });
          }}
        />
      </div>
    );
  } else if (state.stage === "choosing_entry_mode") {
    stageContent = (
      <div className="sp-demo-stage">
        <DemoStageHeading
          pretitle="Choose how to start"
          step={1}
          title="Bring a CV, or start with a conversation."
        />
        <EntryModeChooser
          cvAssistedEnabled={providerOperationsEnabled}
          onSelect={selectEntryMode}
        />
      </div>
    );
  } else if (
    (state.stage === "awaiting_cv" ||
      state.stage === "extracting_cv" ||
      state.stage === "analyzing_cv") &&
    state.runtimeConfig
  ) {
    stageContent = (
      <div className="sp-demo-stage sp-demo-stage--with-footer">
        <CvStage
          failure={state.failure}
          onChooseAnotherCv={() => {
            dispatch({ type: "CHOOSE_ANOTHER_CV" });
          }}
          onExtractionStarted={() => {
            dispatch({ type: "CV_EXTRACTION_STARTED" });
          }}
          onExtractionSucceeded={() => {
            dispatch({ type: "CV_EXTRACTION_SUCCEEDED" });
          }}
          onFailure={handlePreparationFailure}
          onPrepared={handleCvPrepared}
          onRetry={() => {
            dispatch({ type: "RETRY" });
          }}
          onReturnToChoices={startOver}
          providerOperationsEnabled={providerOperationsEnabled}
          restoreNotice={state.restoreNotice}
          runtimeConfig={state.runtimeConfig}
          stage={state.stage}
        />
      </div>
    );
  } else if (
    state.stage === "plan_ready" &&
    state.cv &&
    state.screeningPlan &&
    state.cvAnalysisUsage
  ) {
    stageContent = (
      <CvPlanPreview
        cv={state.cv}
        onContinue={() => {
          dispatch({ type: "CONTINUE_TO_PREFLIGHT" });
        }}
        onStartOver={startOver}
        plan={state.screeningPlan}
      />
    );
  } else if (state.stage === "preparing_conversation") {
    stageContent = (
      <ConversationPreparationStage
        failure={state.failure}
        isRefreshingExpiredGrant={
          state.restoreNotice === "interview_grant_expired"
        }
        onBack={startOver}
        onFailure={handlePreparationFailure}
        onPrepared={handlePrepared}
        onRetry={() => {
          dispatch({ type: "RETRY" });
        }}
        performanceTracker={performanceTracker}
      />
    );
  } else if (
    (state.stage === "preflight" || state.stage === "ready") &&
    state.entryMode &&
    state.interviewGrant &&
    state.interviewGrantExpiresAt &&
    state.runtimeConfig
  ) {
    const interviewGrant = state.interviewGrant;
    stageContent = (
      <PreflightHandoff
        entryMode={state.entryMode}
        interviewGrant={interviewGrant}
        interviewGrantExpiresAt={state.interviewGrantExpiresAt}
        onBack={() => {
          dispatch({ type: "BACK_FROM_PREFLIGHT" });
        }}
        onGrantExpired={() => {
          dispatch({
            type:
              state.entryMode === "conversation_first"
                ? "CONVERSATION_GRANT_EXPIRED"
                : "CV_GRANT_EXPIRED",
          });
        }}
        onNotReady={() => {
          dispatch({ type: "PREFLIGHT_NOT_READY" });
        }}
        onReady={() => {
          dispatch({ type: "PREFLIGHT_READY" });
        }}
        onStartAuthorized={(turnstileToken) => {
          if (!providerOperationsEnabled) {
            return;
          }
          setVoiceStartRequest({
            interviewGrant,
            turnstileToken,
          });
          dispatch({ type: "VOICE_CONNECTING" });
        }}
        {...(state.rolePreference
          ? { rolePreference: state.rolePreference }
          : {})}
        providerOperationsEnabled={providerOperationsEnabled}
        siteKey={state.runtimeConfig.abuseProtection.siteKey}
        stage={state.stage}
      />
    );
  } else if (
    (state.stage === "connecting" ||
      state.stage === "live" ||
      state.stage === "ending") &&
    state.entryMode &&
    state.demoContext &&
    state.screeningPlan &&
    state.runtimeConfig
  ) {
    const recoverExpiredGrant = () => {
      setVoiceStartRequest(null);
      dispatch({
        type:
          state.entryMode === "conversation_first"
            ? "CONVERSATION_GRANT_EXPIRED"
            : "CV_GRANT_EXPIRED",
      });
    };
    stageContent = providerOperationsEnabled ? (
      <VoiceConnectionStage
        {...(state.cv ? { cv: state.cv } : {})}
        demoContext={state.demoContext}
        entryMode={state.entryMode}
        {...(state.failure?.stage === "connecting"
          ? { failure: state.failure }
          : {})}
        onCancel={() => {
          setVoiceStartRequest(null);
          dispatch({ type: "VOICE_CONNECT_CANCELLED" });
        }}
        onConnected={(voice) => {
          dispatch({
            type: "VOICE_CONNECTED",
            voice,
          });
        }}
        onEnded={(voice, completion) => {
          setVoiceStartRequest(null);
          completeInterview(voice, completion);
        }}
        onEnding={(completion) => {
          setVoiceStartRequest(null);
          dispatch({ type: "VOICE_ENDING", completion });
        }}
        onFailure={(failure) => {
          setVoiceStartRequest(null);
          dispatch({ type: "SESSION_FAILED", failure });
        }}
        onGrantRejected={recoverExpiredGrant}
        onFinalTranscriptTurn={(turn) => {
          dispatch({ type: "ADD_FINAL_TRANSCRIPT_TURN", turn });
        }}
        onInsight={(insight: InsightCard) => {
          dispatch({ type: "UPSERT_INSIGHT", insight });
        }}
        onInterrupted={() => {
          setVoiceStartRequest(null);
          dispatch({
            type: "VOICE_INTERRUPTED",
            now: new Date().toISOString(),
          });
        }}
        onRetry={() => {
          setVoiceStartRequest(null);
          dispatch({ type: "RETRY" });
        }}
        onSensitiveValuesCleared={() => {
          setVoiceStartRequest(null);
        }}
        onTopicProgress={(progress: TopicProgress) => {
          dispatch({ type: "SET_TOPIC_PROGRESS", progress });
        }}
        insights={state.insights}
        liveVoiceEnabled={liveProviderOperationsEnabled}
        plan={state.screeningPlan}
        performanceCollector={performanceCollector}
        performanceTracker={performanceTracker}
        {...(state.rolePreference
          ? { rolePreference: state.rolePreference }
          : {})}
        {...(state.voice?.startedAt
          ? { sessionStartedAt: state.voice.startedAt }
          : {})}
        stage={state.stage}
        startRequest={voiceStartRequest}
        topicProgress={state.topicProgress}
        transcript={state.transcript}
      />
    ) : (
      <ProviderOperationsUnavailable
        actionLabel="Change starting option"
        description="External actions are disabled for this safety check. No voice token, provider client, or voice connection has started."
        onAction={startOver}
        title="Voice interview is unavailable right now."
      />
    );
  } else {
    stageContent = (
      <div className="sp-demo-stage">
        <DemoStageHeading
          pretitle="Private browser session"
          step={DEMO_STAGE_STEP[state.stage]}
          title="This step is not available in the current demo yet."
        />
        <p className="sp-demo-stage__lead">
          Your browser session is still private. Clear it to return home and
          start again.
        </p>
        <Button onClick={returnHomeAfterClear} variant="secondary">
          Clear &amp; exit
        </Button>
      </div>
    );
  }

  const hasFinalCandidateEvidence = state.transcript.some(
    (turn) => turn.speaker === "candidate" && turn.status === "final",
  );
  const summaryPreparationActive =
    (state.stage === "interview_complete" || state.stage === "summarizing") &&
    Boolean(
      state.entryMode &&
      state.screeningPlan &&
      state.runtimeConfig &&
      hasFinalCandidateEvidence &&
      !state.summary &&
      !state.failure,
    );
  const summaryPreparation =
    (state.stage === "interview_complete" || state.stage === "summarizing") &&
    state.entryMode &&
    state.screeningPlan &&
    state.runtimeConfig &&
    hasFinalCandidateEvidence ? (
      <div className="sp-interview-summary-preparation">
        <InterviewSummaryPreparation
          active={summaryPreparationActive}
          entryMode={state.entryMode}
          insights={state.insights}
          interviewGrant={state.interviewGrant ?? ""}
          onFailure={handlePreparationFailure}
          onPendingChange={setSummaryRequestPending}
          onSummarySucceeded={(response) => {
            dispatch({
              type: "SUMMARY_SUCCEEDED",
              summary: response.summary,
            });
          }}
          plan={state.screeningPlan}
          siteKey={state.runtimeConfig.abuseProtection.siteKey}
          topicProgress={state.topicProgress}
          transcript={state.transcript}
        />
      </div>
    ) : null;

  return (
    <AppShell
      className={`sp-demo-shell${state.stage === "review_ready" || state.stage === "summarizing" ? " sp-demo-shell--review" : ""}`}
      id="top"
      tone="dark"
    >
      <a className="sp-skip-link" href="#main-content">
        Skip to main content
      </a>
      <SiteHeader
        brandHref="/"
        className="sp-site-header--demo"
        actions={
          <>
            <PrivacyDialog
              clearActionLabel="Clear & exit"
              triggerLabel="Privacy details"
            />
            {state.stage === "review_ready" || state.stage === "summarizing" ? (
              <SessionClearDialog
                onClear={returnHomeAfterClear}
                triggerClassName="sp-header-link"
              />
            ) : (
              <button
                className="sp-header-link"
                onClick={returnHomeAfterClear}
                type="button"
              >
                Clear &amp; exit
              </button>
            )}
          </>
        }
      />
      <main className="sp-demo-main" id="main-content">
        <PageContainer className="sp-demo-layout">
          <section
            aria-label="Current demo stage"
            className="sp-demo-workspace"
            data-stage={state.stage}
          >
            <div className="sp-demo-workspace__task">
              {showRuntimeConfigFailure ? (
                <ErrorPanel
                  actions={
                    <Button onClick={retryRuntimeConfig} variant="secondary">
                      Retry safety check
                    </Button>
                  }
                  title="The safety check could not refresh"
                >
                  <p>
                    Provider actions remain disabled until ScreenPilot confirms
                    the current session settings.
                  </p>
                </ErrorPanel>
              ) : null}
              {stageContent}
              {summaryPreparation}
            </div>
          </section>
        </PageContainer>
      </main>
    </AppShell>
  );
}
