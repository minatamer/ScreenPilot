"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

import type { PrepareInterviewResponse } from "@screenpilot/contracts/api/interview-preparation";
import type { AnalyzeCvResponse } from "@screenpilot/contracts/api/cv-analysis";
import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";

import { CvStage } from "@/features/cv/cv-stage";
import { CvPlanPreview } from "@/features/plan/cv-plan-preview";
import { PreflightHandoff } from "@/features/preflight/preflight-handoff";
import type {
  DemoStage,
  SessionFailure,
} from "@/features/session/demo-session.types";
import { useDemoSession } from "@/features/session/use-demo-session";
import { AppShell } from "@/shared/ui/app-shell";
import { Button } from "@/shared/ui/button";
import { PageContainer } from "@/shared/ui/layout";
import { SiteHeader } from "@/shared/ui/site-header";
import { StageIndicator } from "@/shared/ui/stage-indicator";

import { BootstrapStatus } from "./bootstrap-status";
import { ConversationPreparationStage } from "./conversation-preparation-stage";
import { DemoSafeguardsFooter } from "./demo-safeguards-footer";
import { EntryModeChooser } from "./entry-mode-chooser";
import { useDemoBootstrap } from "./use-demo-bootstrap";

const DEMO_PROGRESS_STAGES = [
  "Choose",
  "Prepare",
  "Preflight",
  "Interview",
  "Review",
] as const;

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
  cleared: 0,
};

export function DemoExperience() {
  const router = useRouter();
  const { clearSession, dispatch, startOver, state } = useDemoSession();
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
      dispatch({
        type: "CV_PREPARATION_SUCCEEDED",
        cv: response.cv,
        plan: response.plan,
        interviewGrant: response.interviewGrant,
        interviewGrantExpiresAt: response.expiresAt,
        usage: response.usage,
      });
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
    state.hydrationStatus === "pending" ||
    state.stage === "empty" ||
    state.stage === "bootstrapping" ||
    state.stage === "cleared"
  ) {
    stageContent = (
      <div className="sp-demo-stage">
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
        <div className="sp-demo-stage__heading">
          <p className="sp-eyebrow">Choose how to start</p>
          <h1>Bring a CV, or start with a conversation.</h1>
          <p className="sp-demo-stage__lead">
            A CV helps Pilot ask more focused questions. You can also skip it.
          </p>
        </div>
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
      <div className="sp-demo-stage">
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
    stageContent = (
      <PreflightHandoff
        entryMode={state.entryMode}
        interviewGrant={state.interviewGrant}
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
        {...(state.rolePreference
          ? { rolePreference: state.rolePreference }
          : {})}
        siteKey={state.runtimeConfig.abuseProtection.siteKey}
        stage={state.stage}
      />
    );
  } else {
    stageContent = (
      <div className="sp-demo-stage">
        <p className="sp-eyebrow">Private browser session</p>
        <h1>This step is not available in the current demo yet.</h1>
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
          <button
            className="sp-header-link"
            onClick={returnHomeAfterClear}
            type="button"
          >
            Clear &amp; exit
          </button>
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
            <DemoSafeguardsFooter />
          </section>
        </PageContainer>
      </main>
    </AppShell>
  );
}
