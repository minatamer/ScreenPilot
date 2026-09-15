"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { PrepareInterviewResponse } from "@screenpilot/contracts/api/interview-preparation";
import type { AnalyzeCvResponse } from "@screenpilot/contracts/api/cv-analysis";
import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";
import type { InsightCard } from "@screenpilot/contracts/interview/insight-card";
import type { TopicProgress } from "@screenpilot/contracts/interview/topic-progress";

import { CvStage } from "@/features/cv/cv-stage";
import { createCvInsightSeeds } from "@/features/insights/seed-cv-insights";
import type { VoiceStartRequest } from "@/features/interview/voice-connection-stage";
import { CvPlanPreview } from "@/features/plan/cv-plan-preview";
import { PreflightHandoff } from "@/features/preflight/preflight-handoff";
import { PrivacyDialog } from "@/features/privacy/privacy-dialog";
import { InterviewCompletePlaceholder } from "@/features/review/interview-complete-placeholder";
import type {
  DemoStage,
  SessionFailure,
} from "@/features/session/demo-session.types";
import { useDemoSession } from "@/features/session/use-demo-session";
import { AppShell } from "@/shared/ui/app-shell";
import { Button } from "@/shared/ui/button";
import { DemoStageHeading } from "@/shared/ui/demo-stage-heading";
import { PageContainer } from "@/shared/ui/layout";
import { SiteHeader } from "@/shared/ui/site-header";
import { StageIndicator } from "@/shared/ui/stage-indicator";

import { BootstrapStatus } from "./bootstrap-status";
import { ConversationPreparationStage } from "./conversation-preparation-stage";
import { EntryModeChooser } from "./entry-mode-chooser";
import { useDemoBootstrap } from "./use-demo-bootstrap";

const DEMO_PROGRESS_STAGES = [
  "Choose",
  "Prepare",
  "Preflight",
  "Interview",
  "Review",
] as const;

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
          title="Loading the private voice client."
        />
      </div>
    ),
    ssr: false,
  },
);

const DEMO_STAGE_PROGRESS: Readonly<Record<DemoStage, number>> = {
  empty: 0,
  bootstrapping: 0,
  choosing_entry_mode: 0,
  awaiting_cv: 1,
  extracting_cv: 1,
  analyzing_cv: 1,
  plan_ready: 1,
  preparing_conversation: 1,
  preflight: 2,
  ready: 2,
  connecting: 3,
  live: 3,
  ending: 3,
  summarizing: 4,
  review_ready: 4,
  complete_placeholder: 4,
  cleared: 0,
};

export function DemoExperience() {
  const router = useRouter();
  const { completeInterview, clearSession, dispatch, startOver, state } =
    useDemoSession();
  const [voiceStartRequest, setVoiceStartRequest] =
    useState<VoiceStartRequest | null>(null);
  useDemoBootstrap();

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
    dispatch({ type: "SELECT_ENTRY_MODE", entryMode });
  };
  const returnHomeAfterClear = () => {
    clearSession();
    router.replace("/");
  };

  let stageContent;
  if (
    state.stage === "complete_placeholder" ||
    state.stage === "summarizing" ||
    state.stage === "review_ready"
  ) {
    stageContent = (
      <InterviewCompletePlaceholder onReturnHome={returnHomeAfterClear} />
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
          title="Bring a CV, or start with a conversation."
        />
        <EntryModeChooser onSelect={selectEntryMode} />
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
          setVoiceStartRequest({
            interviewGrant,
            turnstileToken,
          });
          dispatch({ type: "VOICE_CONNECTING" });
        }}
        {...(state.rolePreference
          ? { rolePreference: state.rolePreference }
          : {})}
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
    stageContent = (
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
        onEnded={() => {
          setVoiceStartRequest(null);
          completeInterview();
        }}
        onEnding={() => {
          dispatch({ type: "VOICE_ENDING" });
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
        liveVoiceEnabled={state.runtimeConfig.paidVoiceEnabled}
        plan={state.screeningPlan}
        {...(state.rolePreference
          ? { rolePreference: state.rolePreference }
          : {})}
        stage={state.stage}
        startRequest={voiceStartRequest}
        topicProgress={state.topicProgress}
        transcript={state.transcript}
      />
    );
  } else {
    stageContent = (
      <div className="sp-demo-stage">
        <DemoStageHeading
          pretitle="Private browser session"
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

  return (
    <AppShell className="sp-demo-shell" id="top" tone="dark">
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
            <button
              className="sp-header-link"
              onClick={returnHomeAfterClear}
              type="button"
            >
              Clear &amp; exit
            </button>
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
            <div className="sp-demo-progress-panel">
              <StageIndicator
                currentIndex={DEMO_STAGE_PROGRESS[state.stage]}
                label="Demo progress"
                stages={DEMO_PROGRESS_STAGES}
              />
            </div>
            <div className="sp-demo-workspace__task">{stageContent}</div>
          </section>
        </PageContainer>
      </main>
    </AppShell>
  );
}
