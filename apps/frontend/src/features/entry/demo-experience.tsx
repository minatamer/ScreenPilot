"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

import type { PrepareInterviewResponse } from "@screenpilot/contracts/api/interview-preparation";
import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";

import { CvStage } from "@/features/cv/cv-stage";
import { PreflightHandoff } from "@/features/preflight/preflight-handoff";
import { PrivacyDialog } from "@/features/privacy/privacy-dialog";
import type {
  DemoStage,
  SessionFailure,
} from "@/features/session/demo-session.types";
import { useDemoSession } from "@/features/session/use-demo-session";
import { AppShell } from "@/shared/ui/app-shell";
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
          <p className="sp-eyebrow">Choose your starting point</p>
          <h1>How should this conversation begin?</h1>
          <p className="sp-demo-stage__lead">
            Both paths are role-neutral and reach the same shared preflight.
          </p>
        </div>
        <EntryModeChooser onSelect={selectEntryMode} />
      </div>
    );
  } else if (state.stage === "awaiting_cv") {
    stageContent = (
      <div className="sp-demo-stage">
        <CvStage onReturnToChoices={startOver} />
      </div>
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
    state.stage === "preflight" &&
    state.entryMode === "conversation_first"
  ) {
    stageContent = (
      <PreflightHandoff
        onBack={() => {
          dispatch({ type: "BACK_FROM_PREFLIGHT" });
        }}
        onStartOver={startOver}
      />
    );
  } else {
    stageContent = (
      <div className="sp-demo-stage">
        <p className="sp-eyebrow">Private browser session</p>
        <h1>Your session is ready to continue.</h1>
        <p className="sp-demo-stage__lead">
          This prepared stage is owned by the next focused implementation
          ticket.
        </p>
      </div>
    );
  }

  return (
    <AppShell id="top" tone="light">
      <a className="sp-skip-link" href="#main-content">
        Skip to main content
      </a>
      <SiteHeader
        actions={
          <>
            <PrivacyDialog />
            <button
              className="sp-header-link"
              onClick={returnHomeAfterClear}
              type="button"
            >
              Clear session
            </button>
          </>
        }
        middle={
          <StageIndicator
            currentIndex={DEMO_STAGE_PROGRESS[state.stage]}
            label="Demo progress"
            stages={DEMO_PROGRESS_STAGES}
          />
        }
      />
      <main className="sp-demo-main" id="main-content">
        <PageContainer>{stageContent}</PageContainer>
      </main>
    </AppShell>
  );
}
