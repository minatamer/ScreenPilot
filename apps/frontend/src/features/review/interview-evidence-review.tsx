"use client";

import { type KeyboardEvent, type ReactNode, useRef, useState } from "react";

import type { SummarizeInterviewResponse } from "@screenpilot/contracts/api/interview-summary";
import type { PublicRuntimeConfig } from "@screenpilot/contracts/api/public-runtime-config";
import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";
import type { InsightCard } from "@screenpilot/contracts/interview/insight-card";
import type { NormalizedCv } from "@screenpilot/contracts/interview/normalized-cv";
import type { ScreeningPlan } from "@screenpilot/contracts/interview/screening-plan";
import type { ScreeningSummary } from "@screenpilot/contracts/interview/screening-summary";
import type { TopicProgress } from "@screenpilot/contracts/interview/topic-progress";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";

import type { ExecuteTurnstileChallenge } from "@/features/abuse-protection/turnstile-client";
import type { SessionFailure } from "@/features/session/demo-session.types";
import { Button } from "@/shared/ui/button";
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
import {
  InterviewSummaryPreparation,
  type SummaryRequester,
} from "./interview-summary-preparation";

export type { SummaryRequester } from "./interview-summary-preparation";

const REVIEW_VIEWS = ["evidence", "notes"] as const;
type ReviewView = (typeof REVIEW_VIEWS)[number];

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
  summaryPreparationManagedExternally?: boolean | undefined;
  summaryRequestPending?: boolean | undefined;
  stage: "review_ready" | "summarizing";
  storageStatus: "saved" | "rejected" | "unavailable" | "idle";
  summary?: ScreeningSummary | undefined;
  summarize?: SummaryRequester | undefined;
  topicProgress: readonly TopicProgress[];
  transcript: readonly TranscriptTurn[];
}>;

function ReviewViewTabs({
  activeView,
  onSelect,
}: Readonly<{
  activeView: ReviewView;
  onSelect: (view: ReviewView) => void;
}>) {
  const tabRefs = useRef<Record<ReviewView, HTMLButtonElement | null>>({
    evidence: null,
    notes: null,
  });

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentView: ReviewView,
  ) => {
    const currentIndex = REVIEW_VIEWS.indexOf(currentView);
    let nextView: ReviewView | undefined;

    if (event.key === "ArrowRight") {
      nextView = REVIEW_VIEWS[(currentIndex + 1) % REVIEW_VIEWS.length];
    } else if (event.key === "ArrowLeft") {
      nextView =
        REVIEW_VIEWS[
          (currentIndex - 1 + REVIEW_VIEWS.length) % REVIEW_VIEWS.length
        ];
    } else if (event.key === "Home") {
      nextView = REVIEW_VIEWS[0];
    } else if (event.key === "End") {
      nextView = REVIEW_VIEWS[REVIEW_VIEWS.length - 1];
    }

    if (!nextView) {
      return;
    }

    event.preventDefault();
    onSelect(nextView);
    tabRefs.current[nextView]?.focus();
  };

  return (
    <div aria-label="Review views" className="sp-review-tabs" role="tablist">
      {REVIEW_VIEWS.map((view) => {
        const isActive = activeView === view;
        const label = view === "evidence" ? "Evidence map" : "Organized notes";

        return (
          <button
            aria-controls={`review-${view}-panel`}
            aria-selected={isActive}
            id={`review-${view}-tab`}
            key={view}
            onClick={() => {
              onSelect(view);
            }}
            onKeyDown={(event) => {
              handleKeyDown(event, view);
            }}
            ref={(node) => {
              tabRefs.current[view] = node;
            }}
            role="tab"
            tabIndex={isActive ? 0 : -1}
            type="button"
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

type SummaryCenterCardProps = Readonly<{
  failure?: SessionFailure | undefined;
  onRetry: () => void;
  preparation?: ReactNode;
  requestPending: boolean;
  stage: "review_ready" | "summarizing";
  summary?: ScreeningSummary | undefined;
  transcript: readonly TranscriptTurn[];
}>;

function SummaryCenterCard({
  failure,
  onRetry,
  preparation,
  requestPending,
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
          </div>
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
              {preparation}
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
  summaryPreparationManagedExternally = false,
  summaryRequestPending: externalSummaryRequestPending = false,
  stage,
  storageStatus,
  summary,
  summarize,
  topicProgress,
  transcript,
}: InterviewEvidenceReviewProps) {
  const [internalRequestPending, setInternalRequestPending] = useState(false);
  const [activeView, setActiveView] = useState<ReviewView>("evidence");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const requestPending = summaryPreparationManagedExternally
    ? externalSummaryRequestPending
    : internalRequestPending;

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
          step={5}
          title="Your conversation, organized as connected evidence."
        />
        {summary ? (
          <ReviewViewTabs activeView={activeView} onSelect={setActiveView} />
        ) : null}
      </div>

      {storageStatus === "unavailable" || storageStatus === "rejected" ? (
        <p className="sp-review-storage-warning" role="status">
          This evidence is still visible now, but the browser could not save the
          latest review state. Keep this tab open if you need to inspect it.
        </p>
      ) : null}

      {isPartial ? (
        <p className="sp-review-storage-warning" role="status">
          The voice connection ended before the interview was complete. The
          final answers and insight notes already captured in this browser are
          still available below.
        </p>
      ) : null}

      <div
        {...(summary
          ? {
              "aria-labelledby": "review-evidence-tab",
              id: "review-evidence-panel",
              role: "tabpanel",
            }
          : {})}
        className="sp-review-tab-panel"
        hidden={summary ? activeView !== "evidence" : false}
      >
        <EvidenceMap
          center={
            <SummaryCenterCard
              {...(failure ? { failure } : {})}
              onRetry={onRetry}
              preparation={
                summaryPreparationManagedExternally ? null : (
                  <InterviewSummaryPreparation
                    active={stage === "summarizing" && !failure && !summary}
                    entryMode={entryMode}
                    {...(executeChallenge ? { executeChallenge } : {})}
                    insights={insights}
                    interviewGrant={interviewGrant}
                    onFailure={onFailure}
                    onPendingChange={setInternalRequestPending}
                    onSummarySucceeded={onSummarySucceeded}
                    plan={plan}
                    siteKey={runtimeConfig.abuseProtection.siteKey}
                    {...(summarize ? { summarize } : {})}
                    topicProgress={topicProgress}
                    transcript={transcript}
                  />
                )
              }
              requestPending={requestPending}
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
      </div>

      {summary ? (
        <div
          aria-labelledby="review-notes-tab"
          className="sp-review-tab-panel"
          hidden={activeView !== "notes"}
          id="review-notes-panel"
          role="tabpanel"
        >
          <SummarySections
            plan={plan}
            summary={summary}
            transcript={transcript}
          />
        </div>
      ) : null}

      <p aria-live="polite" className="sp-review-copy-status">
        {copyStatus === "copied"
          ? "Summary copied to the clipboard."
          : copyStatus === "failed"
            ? "The summary could not be copied in this browser."
            : ""}
      </p>

      <DemoActionFooter>
        <div className="sp-review-actions">
          <Button
            disabled={!summary}
            onClick={() => {
              void copySummary();
            }}
          >
            Copy summary
          </Button>
          <SessionClearDialog onClear={onReturnHome} />
        </div>
      </DemoActionFooter>
    </div>
  );
}
