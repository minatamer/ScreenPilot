"use client";

import type { AnalyzeCvResponse } from "@screenpilot/contracts/api/cv-analysis";
import type { PublicRuntimeConfig } from "@screenpilot/contracts/api/public-runtime-config";

import { ManagedTurnstileGate } from "@/features/abuse-protection/managed-turnstile-gate";
import type { ExecuteTurnstileChallenge } from "@/features/abuse-protection/turnstile-client";
import type {
  SessionFailure,
  SessionRestoreNotice,
} from "@/features/session/demo-session.types";
import { ProviderOperationsUnavailable } from "@/features/session/provider-operations-unavailable";
import { Button, ButtonGroup } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { DemoActionFooter } from "@/shared/ui/demo-action-footer";
import { DemoStageHeading } from "@/shared/ui/demo-stage-heading";
import { ErrorPanel } from "@/shared/ui/error-panel";
import { Stack } from "@/shared/ui/layout";

import { CvDropzone } from "./cv-dropzone";
import { CV_EXTRACTION_PROGRESS } from "./extract-pdf-text";
import { CV_PDF_ERROR_COPY } from "./pdf-validation";
import {
  type CvAnalyzer,
  type CvWorkflowStage,
  useCvPreparation,
} from "./use-cv-preparation";

type CvStageProps = Readonly<{
  analyze?: CvAnalyzer;
  executeChallenge?: ExecuteTurnstileChallenge;
  failure?: SessionFailure | undefined;
  onChooseAnotherCv: () => void;
  onExtractionStarted: () => void;
  onExtractionSucceeded: () => void;
  onFailure: (failure: SessionFailure) => void;
  onPrepared: (response: AnalyzeCvResponse) => void;
  onRetry: () => void;
  onReturnToChoices: () => void;
  providerOperationsEnabled: boolean;
  requestIdFactory?: () => string;
  restoreNotice?: SessionRestoreNotice | undefined;
  runtimeConfig: PublicRuntimeConfig;
  stage: CvWorkflowStage;
}>;

function formattedFileSize(size: number): string {
  if (size < 1_024) {
    return `${String(size)} bytes`;
  }
  return `${(size / (1_024 * 1_024)).toFixed(2)} MB`;
}

export function CvStage(props: CvStageProps) {
  if (!props.providerOperationsEnabled) {
    return (
      <ProviderOperationsUnavailable
        actionLabel="Change starting option"
        description="External actions are disabled for this safety check. No CV challenge or analysis request has started."
        onAction={props.onReturnToChoices}
        title="CV analysis is unavailable right now."
      />
    );
  }

  return <EnabledCvStage {...props} />;
}

function EnabledCvStage({
  analyze,
  executeChallenge,
  failure,
  onChooseAnotherCv,
  onExtractionStarted,
  onExtractionSucceeded,
  onFailure,
  onPrepared,
  onRetry,
  onReturnToChoices,
  requestIdFactory,
  restoreNotice,
  runtimeConfig,
  stage,
}: CvStageProps) {
  const {
    extractedCv,
    handleChallengeFailure,
    handleChallengeVerified,
    handleChooseAnotherCv,
    handleFilesSelected,
    handleRetryAnalysis,
    handleReturnToChoices,
    handleSampleRequested,
    showIntake,
    state,
  } = useCvPreparation({
    ...(analyze ? { analyze } : {}),
    failure,
    onChooseAnotherCv,
    onExtractionStarted,
    onExtractionSucceeded,
    onFailure,
    onPrepared,
    onRetry,
    onReturnToChoices,
    ...(requestIdFactory ? { requestIdFactory } : {}),
    stage,
  });

  return (
    <Stack className="sp-cv-stage sp-demo-stage--with-footer" gap="medium">
      <DemoStageHeading
        pretitle="CV-assisted path"
        step={2}
        title={
          showIntake
            ? "Prepare a focused screening conversation."
            : "Turning CV details into interview context."
        }
      />

      {restoreNotice === "cv_file_required_after_refresh" ? (
        <Card aria-live="polite" className="sp-cv-notice" tone="soft">
          The previous file was released when the page refreshed. Choose the
          synthetic PDF again to continue.
        </Card>
      ) : null}
      {restoreNotice === "interview_grant_expired" ? (
        <Card aria-live="polite" className="sp-cv-notice" tone="soft">
          The prepared interview expired. Its CV text was already removed, so
          choose the synthetic PDF again for a fresh analysis.
        </Card>
      ) : null}

      {showIntake ? (
        <div className="sp-cv-stage__body">
          <CvDropzone
            onFilesSelected={handleFilesSelected}
            onSampleRequested={handleSampleRequested}
          />
          <Card
            aria-label="Synthetic screening context"
            className="sp-cv-context"
            tone="soft"
          >
            <div>
              <p className="sp-cv-ready__status">Role stays flexible</p>
              <h2>We’ll suggest one from your CV.</h2>
              <p>Confirm it, change it, or stay undecided when you talk.</p>
            </div>
          </Card>
        </div>
      ) : null}

      {state.status === "extracting" ? (
        <Card
          aria-live="polite"
          className="sp-cv-progress"
          data-phase={state.phase}
          tone="soft"
        >
          <div
            aria-hidden="true"
            className="sp-cv-progress__visual"
            data-testid="cv-extraction-animation"
          >
            <div className="sp-cv-progress__document">
              <span />
              <span />
              <span />
              <i />
            </div>
            <div className="sp-cv-progress__activity">
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="sp-cv-progress__copy">
            <span>Processing in this tab</span>
            <h2>{CV_EXTRACTION_PROGRESS[state.phase]}</h2>
            <p>
              {state.document
                ? `${state.document.name} · ${formattedFileSize(state.document.size)}`
                : "Opening the selected document"}
            </p>
            <span aria-hidden="true" className="sp-cv-progress__track">
              <i />
            </span>
          </div>
        </Card>
      ) : null}

      {state.status === "awaiting_challenge" ? (
        <Card aria-live="polite" className="sp-cv-analysis" tone="soft">
          <AnalysisVisual />
          <div className="sp-cv-analysis__copy">
            <p className="sp-cv-ready__status">Preparing protected analysis</p>
            <h2>Checking this request</h2>
            <p>
              {extractedCv?.document.name} · {extractedCv?.result.pageCount}{" "}
              {extractedCv?.result.pageCount === 1 ? "page" : "pages"}
            </p>
            <ManagedTurnstileGate
              action="cv_analyze"
              {...(executeChallenge ? { executeChallenge } : {})}
              onFailure={handleChallengeFailure}
              onVerified={handleChallengeVerified}
              siteKey={runtimeConfig.abuseProtection.siteKey}
            />
          </div>
        </Card>
      ) : null}

      {state.status === "analyzing" ? (
        <Card
          aria-busy="true"
          aria-live="polite"
          className="sp-cv-analysis"
          data-phase={state.phase}
          tone="soft"
        >
          <AnalysisVisual />
          <div className="sp-cv-analysis__copy">
            <div className="sp-cv-analysis__status">
              <span
                aria-hidden="true"
                className="sp-cv-analysis__spinner"
                data-testid="cv-analysis-spinner"
              />
              <p className="sp-cv-ready__status">CV analysis in progress</p>
            </div>
            <h2>
              {state.phase === "checking"
                ? "Checking CV details"
                : "Building the screening plan"}
            </h2>
            <p>
              No candidate facts appear until the complete response is checked.
            </p>
          </div>
        </Card>
      ) : null}

      {state.status === "pdf_error" ? (
        <ErrorPanel title={CV_PDF_ERROR_COPY[state.error.code].title}>
          <p>{CV_PDF_ERROR_COPY[state.error.code].message}</p>
        </ErrorPanel>
      ) : null}

      {state.status === "analysis_error" && failure ? (
        <ErrorPanel
          actions={
            <ButtonGroup>
              {failure.retryable ? (
                <Button onClick={handleRetryAnalysis} variant="secondary">
                  Retry analysis
                </Button>
              ) : null}
              <Button onClick={handleChooseAnotherCv} variant="quiet">
                Use another PDF
              </Button>
            </ButtonGroup>
          }
          title="CV analysis could not finish"
        >
          <p>{failure.message}</p>
        </ErrorPanel>
      ) : null}

      <DemoActionFooter>
        <ButtonGroup>
          <Button onClick={handleReturnToChoices} variant="secondary">
            Change starting option
          </Button>
        </ButtonGroup>
      </DemoActionFooter>
    </Stack>
  );
}

function AnalysisVisual() {
  return (
    <div aria-hidden="true" className="sp-cv-analysis__visual">
      <div className="sp-cv-analysis__document">
        <span />
        <span />
        <span />
      </div>
      <div className="sp-cv-analysis__facts">
        <span>Experience</span>
        <span>Context</span>
        <span>Topics</span>
      </div>
    </div>
  );
}
