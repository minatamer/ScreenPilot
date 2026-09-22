"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { SummarizeInterviewResponse } from "@screenpilot/contracts/api/interview-summary";
import type { PublicRuntimeConfig } from "@screenpilot/contracts/api/public-runtime-config";
import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";
import type { InsightCard } from "@screenpilot/contracts/interview/insight-card";
import type { NormalizedCv } from "@screenpilot/contracts/interview/normalized-cv";
import type { ScreeningPlan } from "@screenpilot/contracts/interview/screening-plan";
import type { ScreeningSummary } from "@screenpilot/contracts/interview/screening-summary";
import type { TopicProgress } from "@screenpilot/contracts/interview/topic-progress";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";

import { ManagedTurnstileGate } from "@/features/abuse-protection/managed-turnstile-gate";
import {
  TURNSTILE_ACTIONS,
  type ExecuteTurnstileChallenge,
} from "@/features/abuse-protection/turnstile-client";
import type { SessionFailure } from "@/features/session/demo-session.types";
import {
  isAbortError,
  ScreenPilotApiError,
  summarizeInterview,
} from "@/shared/api/screenpilot-api";
import { Badge } from "@/shared/ui/badge";
import { Button, ButtonGroup } from "@/shared/ui/button";
import { DemoActionFooter } from "@/shared/ui/demo-action-footer";
import { DemoStageHeading } from "@/shared/ui/demo-stage-heading";
import { ErrorPanel } from "@/shared/ui/error-panel";

import { EvidenceMap } from "./evidence-map";
import {
  formatSummaryForCopy,
  resolveSummaryRoleReview,
} from "./review-evidence-model";
import { SessionClearDialog } from "./session-clear-dialog";
import { SummarySections } from "./summary-sections";

export type SummaryRequester = typeof summarizeInterview;

type InterviewEvidenceReviewProps = Readonly<{
  cv?: NormalizedCv | undefined;
  entryMode: EntryMode;
  executeChallenge?: ExecuteTurnstileChallenge | undefined;
  failure?: SessionFailure | undefined;
  insights: readonly InsightCard[];
  interviewGrant: string;
  isPartial: boolean;
  onFailure: (failure: SessionFailure) => void;
  onRetry: () => void;
  onReturnHome: () => boolean;
  onSummarySucceeded: (response: SummarizeInterviewResponse) => void;
  plan: ScreeningPlan;
  runtimeConfig: PublicRuntimeConfig;
  stage: "review_ready" | "summarizing";
  storageStatus: "saved" | "rejected" | "unavailable" | "idle";
  summary?: ScreeningSummary | undefined;
  summarize?: SummaryRequester | undefined;
  topicProgress: readonly TopicProgress[];
  transcript: readonly TranscriptTurn[];
}>;

function modeLabel(entryMode: EntryMode): string {
  return entryMode === "cv_assisted" ? "CV-assisted" : "Conversation-first";
}

function summaryFailure(error: unknown): SessionFailure {
  if (error instanceof ScreenPilotApiError) {
    return {
      stage: "summarizing",
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    };
  }
  return {
    stage: "summarizing",
    code: "SUMMARY_UNREACHABLE",
    message:
      "ScreenPilot could not organize the conversation. Your local evidence is still available.",
    retryable: true,
  };
}

type SummaryCenterCardProps = Readonly<{
  entryMode: EntryMode;
  executeChallenge?: ExecuteTurnstileChallenge | undefined;
  failure?: SessionFailure | undefined;
  onChallengeFailure: (failure: {
    code: "TURNSTILE_REJECTED" | "TURNSTILE_UNAVAILABLE";
    message: string;
    retryable: true;
  }) => void;
  onRetry: () => void;
  onVerified: (token: string) => void;
  requestPending: boolean;
  siteKey: string;
  stage: "review_ready" | "summarizing";
  summary?: ScreeningSummary | undefined;
  transcript: readonly TranscriptTurn[];
}>;

function SummaryCenterCard({
  entryMode,
  executeChallenge,
  failure,
  onChallengeFailure,
  onRetry,
  onVerified,
  requestPending,
  siteKey,
  stage,
  summary,
  transcript,
}: SummaryCenterCardProps) {
  const roleReview = summary
    ? resolveSummaryRoleReview(summary, transcript)
    : undefined;

  return (
    <article
      aria-busy={stage === "summarizing" && !failure ? true : undefined}
      className="sp-summary-center-card"
      data-state={summary ? "ready" : failure ? "failed" : stage}
    >
      <div className="sp-summary-center-card__signal" aria-hidden="true">
        <span>SP</span>
      </div>
      {summary ? (
        <>
          <p className="sp-summary-center-card__eyebrow">
            Conversation overview
          </p>
          <h3>Conversation summary</h3>
          <p className="sp-summary-center-card__overview">{summary.overview}</p>
          <div className="sp-summary-center-card__role">
            <span>Synthetic session role</span>
            <strong>{roleReview?.label}</strong>
            <small>{roleReview?.note}</small>
            <div
              aria-label="Evidence for synthetic session role"
              className="sp-summary-center-card__role-evidence"
            >
              {roleReview?.evidenceReferences.map((reference) => (
                <span
                  className={`sp-evidence-chip${
                    reference.available ? "" : " sp-evidence-chip--unavailable"
                  }`}
                  key={reference.id}
                >
                  {reference.label}
                </span>
              ))}
            </div>
          </div>
          <div className="sp-summary-center-card__meta">
            <Badge tone="coral">{modeLabel(entryMode)}</Badge>
            <Badge tone="success">Summary ready</Badge>
          </div>
          <p className="sp-summary-center-card__notice">
            AI-organized notes require human interpretation. No hiring decision
            was made.
          </p>
        </>
      ) : stage === "summarizing" ? (
        <>
          <p className="sp-summary-center-card__eyebrow">End-of-call review</p>
          <h3>Organizing this conversation</h3>
          <p className="sp-summary-center-card__overview">
            The interview has ended. Your insight nodes remain available while
            ScreenPilot prepares cautious, evidence-linked notes.
          </p>
          {failure ? (
            <ErrorPanel
              actions={
                failure.retryable ? (
                  <Button onClick={onRetry} variant="secondary">
                    Retry summary
                  </Button>
                ) : undefined
              }
              announce="polite"
              title="The summary did not finish"
            >
              <p>{failure.message}</p>
            </ErrorPanel>
          ) : (
            <>
              <div className="sp-summary-center-card__organizing" role="status">
                <span aria-hidden="true" />
                <span>
                  {requestPending
                    ? "Connecting evidence to the review…"
                    : "Securing this summary request…"}
                </span>
              </div>
              <ManagedTurnstileGate
                action={TURNSTILE_ACTIONS.interviewSummary}
                {...(executeChallenge ? { executeChallenge } : {})}
                onFailure={onChallengeFailure}
                onVerified={onVerified}
                siteKey={siteKey}
              />
            </>
          )}
        </>
      ) : (
        <>
          <p className="sp-summary-center-card__eyebrow">
            Local evidence review
          </p>
          <h3>Summary unavailable</h3>
          <p className="sp-summary-center-card__overview">
            The interview evidence remains available, but there was not enough
            final candidate material to create a grounded summary.
          </p>
          <Badge tone="warning">Local evidence only</Badge>
        </>
      )}
    </article>
  );
}

export function InterviewEvidenceReview({
  cv,
  entryMode,
  executeChallenge,
  failure,
  insights,
  interviewGrant,
  isPartial,
  onFailure,
  onRetry,
  onReturnHome,
  onSummarySucceeded,
  plan,
  runtimeConfig,
  stage,
  storageStatus,
  summary,
  summarize = summarizeInterview,
  topicProgress,
  transcript,
}: InterviewEvidenceReviewProps) {
  const [requestPending, setRequestPending] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const summaryAbortRef = useRef<AbortController | null>(null);
  const summaryRequestStartedRef = useRef(false);

  useEffect(
    () => () => {
      summaryAbortRef.current?.abort();
      summaryAbortRef.current = null;
    },
    [],
  );

  const handleVerified = useCallback(
    (turnstileToken: string) => {
      if (summaryRequestStartedRef.current || stage !== "summarizing") {
        return;
      }
      summaryRequestStartedRef.current = true;
      setRequestPending(true);
      const controller = new AbortController();
      summaryAbortRef.current?.abort();
      summaryAbortRef.current = controller;
      void summarize(
        {
          entryMode,
          insights: [...insights],
          interviewGrant,
          plan,
          topicProgress: [...topicProgress],
          transcript: [...transcript],
          turnstileToken,
        },
        controller.signal,
      )
        .then((response) => {
          if (!controller.signal.aborted) {
            setRequestPending(false);
            onSummarySucceeded(response);
          }
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || isAbortError(error)) {
            return;
          }
          summaryRequestStartedRef.current = false;
          setRequestPending(false);
          onFailure(summaryFailure(error));
        });
    },
    [
      entryMode,
      insights,
      interviewGrant,
      onFailure,
      onSummarySucceeded,
      plan,
      stage,
      summarize,
      topicProgress,
      transcript,
    ],
  );

  const copySummary = async () => {
    if (!summary) {
      setCopyStatus("failed");
      return;
    }
    try {
      await navigator.clipboard.writeText(
        formatSummaryForCopy(summary, plan, transcript),
      );
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  };

  const summaryStatus = summary
    ? "ready"
    : failure
      ? "failed"
      : stage === "summarizing"
        ? "pending"
        : "unavailable";

  return (
    <div
      className="sp-demo-stage sp-review-stage"
      data-review-phase={summaryStatus}
    >
      <div className="sp-review-stage__heading">
        <DemoStageHeading
          pretitle={isPartial ? "Partial interview review" : "Interview review"}
          title="Your conversation, organized as connected evidence."
        />
        <div className="sp-review-stage__badges">
          <Badge tone="coral">{modeLabel(entryMode)}</Badge>
          <Badge tone={isPartial ? "warning" : "success"}>
            {isPartial ? "Partial review" : "Interview ended"}
          </Badge>
        </div>
      </div>

      {storageStatus === "unavailable" || storageStatus === "rejected" ? (
        <p className="sp-review-storage-warning" role="status">
          This evidence is still visible now, but the browser could not save the
          latest review state. Keep this tab open if you need to inspect it.
        </p>
      ) : null}

      <EvidenceMap
        center={
          <SummaryCenterCard
            entryMode={entryMode}
            {...(executeChallenge ? { executeChallenge } : {})}
            {...(failure ? { failure } : {})}
            onChallengeFailure={(challengeFailure) => {
              summaryRequestStartedRef.current = false;
              setRequestPending(false);
              onFailure({ stage: "summarizing", ...challengeFailure });
            }}
            onRetry={onRetry}
            onVerified={handleVerified}
            requestPending={requestPending}
            siteKey={runtimeConfig.abuseProtection.siteKey}
            stage={stage}
            {...(summary ? { summary } : {})}
            transcript={transcript}
          />
        }
        {...(cv ? { cv } : {})}
        entryMode={entryMode}
        insights={insights}
        plan={plan}
        {...(summary ? { summary } : {})}
        summaryStatus={summaryStatus}
        transcript={transcript}
      />

      {summary ? (
        <SummarySections
          plan={plan}
          summary={summary}
          transcript={transcript}
        />
      ) : null}

      <p aria-live="polite" className="sp-review-copy-status">
        {copyStatus === "copied"
          ? "Summary copied to the clipboard."
          : copyStatus === "failed"
            ? "The summary could not be copied in this browser."
            : ""}
      </p>

      <DemoActionFooter note="No score or automated hiring decision was created.">
        <div className="sp-review-actions">
          <ButtonGroup>
            <Button
              disabled={!summary}
              onClick={() => {
                void copySummary();
              }}
            >
              Copy summary
            </Button>
          </ButtonGroup>
          <div className="sp-review-actions__clear">
            <span>Remove every ScreenPilot item held in this tab.</span>
            <SessionClearDialog onClear={onReturnHome} />
          </div>
        </div>
      </DemoActionFooter>
    </div>
  );
}
