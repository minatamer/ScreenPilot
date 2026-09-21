"use client";

import { useRef, useState } from "react";

import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";
import type { InsightCard } from "@screenpilot/contracts/interview/insight-card";
import type { NormalizedCv } from "@screenpilot/contracts/interview/normalized-cv";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";

import {
  compareInsightBoardCards,
  INSIGHT_CATEGORY_METADATA,
} from "@/features/insights/insight-category-metadata";
import {
  TranscriptTimeline,
  transcriptTurnDomId,
} from "@/features/transcript/transcript-timeline";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DemoActionFooter } from "@/shared/ui/demo-action-footer";
import { DemoStageHeading } from "@/shared/ui/demo-stage-heading";

type InterviewEvidenceReviewProps = Readonly<{
  cv?: NormalizedCv | undefined;
  entryMode: EntryMode;
  insights: readonly InsightCard[];
  isPartial: boolean;
  onReturnHome: () => void;
  storageStatus: "saved" | "rejected" | "unavailable" | "idle";
  transcript: readonly TranscriptTurn[];
}>;

function modeLabel(entryMode: EntryMode): string {
  return entryMode === "cv_assisted" ? "CV-assisted" : "Conversation-first";
}

function insightStatusLabel(status: InsightCard["status"]): string {
  return status.replaceAll("_", " ");
}

export function InterviewEvidenceReview({
  cv,
  entryMode,
  insights,
  isPartial,
  onReturnHome,
  storageStatus,
  transcript,
}: InterviewEvidenceReviewProps) {
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  const [navigationAnnouncement, setNavigationAnnouncement] = useState("");
  const returnTargetRef = useRef<HTMLButtonElement | null>(null);
  const eligibleCandidateTurns = new Map(
    transcript
      .filter((turn) => turn.speaker === "candidate" && turn.status === "final")
      .map((turn) => [turn.id, turn] as const),
  );
  const orderedInsights = [...insights].sort(compareInsightBoardCards);

  const navigateToTurn = (turn: TranscriptTurn, trigger: HTMLButtonElement) => {
    const turnElement = document.getElementById(transcriptTurnDomId(turn.id));
    if (!turnElement) {
      setNavigationAnnouncement(
        "That evidence is unavailable in this transcript.",
      );
      return;
    }

    returnTargetRef.current = trigger;
    setActiveTurnId(turn.id);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    turnElement.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
    turnElement.focus({ preventScroll: true });
    setNavigationAnnouncement(
      `Moved to Candidate turn ${String(turn.sequence + 1)}.`,
    );
  };

  const returnToEvidence = () => {
    returnTargetRef.current?.focus();
    setActiveTurnId(null);
    setNavigationAnnouncement("Returned to the evidence card.");
  };

  return (
    <div className="sp-demo-stage sp-review-stage">
      <div className="sp-review-stage__heading">
        <DemoStageHeading
          pretitle={isPartial ? "Partial interview review" : "Interview review"}
          title="Review the evidence saved in this tab."
        />
        <div className="sp-review-stage__badges">
          <Badge tone="coral">{modeLabel(entryMode)}</Badge>
          <Badge tone={isPartial ? "warning" : "success"}>
            {isPartial ? "Partial transcript" : "Interview ended"}
          </Badge>
        </div>
      </div>

      <div
        className="sp-review-disclosure"
        data-partial={isPartial || undefined}
        role={isPartial ? "status" : undefined}
      >
        <strong>
          {isPartial
            ? "The connection ended before a complete transcript was received."
            : "This review contains the final text received during this interview."}
        </strong>
        <p>
          It is stored only for this browser tab, may omit speech around a
          disconnect, and is not a recording or certified transcript. The role
          shown in this demo was synthetic and available only for this session.
        </p>
      </div>

      {storageStatus === "unavailable" || storageStatus === "rejected" ? (
        <p className="sp-review-storage-warning" role="status">
          This evidence is still visible now, but the browser could not save the
          latest review state. Keep this tab open if you need to inspect it.
        </p>
      ) : null}

      <div className="sp-review-stage__workspace">
        <section
          aria-labelledby="review-insights-title"
          className="sp-review-insights"
        >
          <header className="sp-review-panel-heading">
            <div>
              <p>Grounded notes</p>
              <h2 id="review-insights-title">Candidate insights</h2>
            </div>
            <Badge>
              {orderedInsights.length}{" "}
              {orderedInsights.length === 1 ? "note" : "notes"}
            </Badge>
          </header>

          {orderedInsights.length === 0 ? (
            <p className="sp-review-insights__empty">
              No insight cards were finalized before the interview ended.
            </p>
          ) : (
            <div className="sp-review-insights__list" role="list">
              {orderedInsights.map((insight) => {
                const metadata = INSIGHT_CATEGORY_METADATA[insight.category];
                return (
                  <article
                    className="sp-review-insight-card"
                    data-status={insight.status}
                    key={insight.id}
                    role="listitem"
                  >
                    <header>
                      <span aria-hidden="true">{metadata.mark}</span>
                      <div>
                        <p>{insight.label}</p>
                        <strong>{insight.value}</strong>
                      </div>
                    </header>
                    <div className="sp-review-insight-card__meta">
                      <Badge>{insight.source}</Badge>
                      <span>{insightStatusLabel(insight.status)}</span>
                    </div>
                    <div
                      aria-label={`Evidence for ${insight.label}`}
                      className="sp-review-insight-card__evidence"
                    >
                      {insight.cvFactIds.map((factId) => {
                        const fact = cv?.facts.find(
                          (candidateFact) => candidateFact.id === factId,
                        );
                        return fact ? (
                          <span
                            className="sp-evidence-chip"
                            key={`cv-${factId}`}
                          >
                            CV source: {fact.statement}
                          </span>
                        ) : (
                          <span
                            className="sp-evidence-chip sp-evidence-chip--unavailable"
                            key={`cv-${factId}`}
                          >
                            CV evidence unavailable
                          </span>
                        );
                      })}
                      {insight.evidenceTurnIds.map((turnId) => {
                        const turn = eligibleCandidateTurns.get(turnId);
                        return turn ? (
                          <button
                            aria-controls={transcriptTurnDomId(turn.id)}
                            aria-label={`View Candidate evidence, turn ${String(turn.sequence + 1)}, for ${insight.label}`}
                            className="sp-evidence-chip sp-evidence-chip--button"
                            key={`turn-${turnId}`}
                            onClick={(event) => {
                              navigateToTurn(turn, event.currentTarget);
                            }}
                            type="button"
                          >
                            Candidate · turn {turn.sequence + 1}
                          </button>
                        ) : (
                          <span
                            aria-label={`Candidate evidence unavailable for ${insight.label}`}
                            className="sp-evidence-chip sp-evidence-chip--unavailable"
                            key={`turn-${turnId}`}
                          >
                            Candidate evidence unavailable
                          </span>
                        );
                      })}
                    </div>
                    {insight.correctionReason ? (
                      <p className="sp-review-insight-card__correction">
                        Correction note: {insight.correctionReason}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <TranscriptTimeline
          activeTurnId={activeTurnId}
          onReturnToEvidence={returnToEvidence}
          transcript={transcript}
        />
      </div>

      <p aria-live="polite" className="sp-visually-hidden">
        {navigationAnnouncement}
      </p>

      <DemoActionFooter note="No score or automated hiring decision was created.">
        <Button onClick={onReturnHome}>Clear &amp; return home</Button>
      </DemoActionFooter>
    </div>
  );
}
