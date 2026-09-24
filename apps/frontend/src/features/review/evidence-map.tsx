"use client";

import { useId, useRef, useState, type ReactNode } from "react";

import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";
import type { InsightCard } from "@screenpilot/contracts/interview/insight-card";
import type { NormalizedCv } from "@screenpilot/contracts/interview/normalized-cv";
import type { ScreeningPlan } from "@screenpilot/contracts/interview/screening-plan";
import type { ScreeningSummary } from "@screenpilot/contracts/interview/screening-summary";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";

import {
  compareInsightBoardCards,
  INSIGHT_CATEGORY_METADATA,
} from "@/features/insights/insight-category-metadata";
import { resolveInsightDisplayStatus } from "@/features/insights/insight-display-status";
import { Badge } from "@/shared/ui/badge";

import { resolveInsightEvidenceDetail } from "./review-evidence-model";

type SummaryStatus = "failed" | "pending" | "ready" | "unavailable";

type EvidenceMapProps = Readonly<{
  center: ReactNode;
  cv?: NormalizedCv | undefined;
  entryMode: EntryMode;
  insights: readonly InsightCard[];
  plan: ScreeningPlan;
  summary?: ScreeningSummary | undefined;
  summaryStatus: SummaryStatus;
  transcript: readonly TranscriptTurn[];
}>;

function insightStatusLabel(status: InsightCard["status"]): string {
  return status.replaceAll("_", " ");
}

function formatLocalTime(occurredAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(occurredAt));
}

type EvidenceNodeProps = Readonly<{
  active: boolean;
  detailId: string;
  displayStatus: InsightCard["status"];
  insight: InsightCard;
  onSelect: (insightId: string, trigger: HTMLButtonElement) => void;
}>;

function EvidenceNode({
  active,
  detailId,
  displayStatus,
  insight,
  onSelect,
}: EvidenceNodeProps) {
  const metadata = INSIGHT_CATEGORY_METADATA[insight.category];
  return (
    <li className="sp-evidence-map__branch-item">
      <button
        aria-controls={detailId}
        aria-expanded={active}
        className="sp-evidence-node"
        data-active={active || undefined}
        data-category={insight.category}
        data-status={displayStatus}
        onClick={(event) => {
          onSelect(insight.id, event.currentTarget);
        }}
        type="button"
      >
        <span aria-hidden="true" className="sp-evidence-node__mark">
          {metadata.mark}
        </span>
        <span className="sp-evidence-node__copy">
          <span>{insight.label}</span>
          <strong>{insight.value}</strong>
          <span className="sp-evidence-node__meta">
            <Badge>{insight.source}</Badge>
            <span>{insightStatusLabel(displayStatus)}</span>
          </span>
        </span>
        <span aria-hidden="true" className="sp-evidence-node__toggle">
          {active ? "−" : "+"}
        </span>
      </button>
    </li>
  );
}

type EvidenceDetailProps = Readonly<{
  cv?: NormalizedCv | undefined;
  entryMode: EntryMode;
  insight: InsightCard;
  onMinimize: () => void;
  plan: ScreeningPlan;
  summary?: ScreeningSummary | undefined;
  summaryStatus: SummaryStatus;
  transcript: readonly TranscriptTurn[];
}>;

function EvidenceDetail({
  cv,
  entryMode,
  insight,
  onMinimize,
  plan,
  summary,
  summaryStatus,
  transcript,
}: EvidenceDetailProps) {
  const detail = resolveInsightEvidenceDetail(
    insight,
    transcript,
    summary,
    plan,
  );
  const cvFacts = insight.cvFactIds.map((factId) => ({
    factId,
    fact: cv?.facts.find((candidateFact) => candidateFact.id === factId),
  }));

  return (
    <section
      aria-label={`Expanded evidence for ${insight.label}`}
      className="sp-evidence-detail"
    >
      <header className="sp-evidence-detail__header">
        <div>
          <p>Selected evidence</p>
          <h3>{insight.label}</h3>
          <strong>{insight.value}</strong>
          <Badge>{insight.source}</Badge>
        </div>
        <button
          aria-label="Minimize evidence preview"
          className="sp-evidence-detail__minimize"
          onClick={onMinimize}
          type="button"
        >
          <span aria-hidden="true">−</span>
        </button>
      </header>

      <div className="sp-evidence-detail__layers">
        <section>
          <span className="sp-evidence-detail__index">01</span>
          <div>
            <h4>Pilot question</h4>
            <p>{detail.question?.text ?? "Question unavailable"}</p>
          </div>
        </section>
        <section>
          <span className="sp-evidence-detail__index">02</span>
          <div>
            <h4>Candidate answer</h4>
            <p>{detail.answer?.text ?? "Evidence unavailable"}</p>
            {detail.additionalAnswers.length > 0 ? (
              <div className="sp-evidence-detail__additional">
                <span>Additional evidence excerpts</span>
                {detail.additionalAnswers.map((turn) => (
                  <span className="sp-evidence-chip" key={turn.id}>
                    Candidate · turn {turn.sequence + 1}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </section>
        <section>
          <span className="sp-evidence-detail__index">03</span>
          <div>
            <h4>Interview evidence</h4>
            {detail.answer ? (
              <span className="sp-evidence-chip">
                Candidate · {formatLocalTime(detail.answer.occurredAt)} · turn{" "}
                {detail.answer.sequence + 1}
              </span>
            ) : (
              <span className="sp-evidence-chip sp-evidence-chip--unavailable">
                Evidence unavailable
              </span>
            )}
            {entryMode === "cv_assisted"
              ? cvFacts.map(({ fact, factId }) =>
                  fact ? (
                    <span className="sp-evidence-chip" key={factId}>
                      CV source · {fact.statement}
                    </span>
                  ) : (
                    <span
                      className="sp-evidence-chip sp-evidence-chip--unavailable"
                      key={factId}
                    >
                      CV evidence unavailable
                    </span>
                  ),
                )
              : null}
          </div>
        </section>
        <section>
          <span className="sp-evidence-detail__index">04</span>
          <div>
            <h4>Connected summary notes</h4>
            {detail.relatedSummaryNotes.length > 0 ? (
              <ul>
                {detail.relatedSummaryNotes.map((note) => (
                  <li key={note.id}>
                    <span>{note.label}</span>
                    <p>{note.text}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                {summaryStatus === "pending"
                  ? "Connected notes are still being prepared."
                  : summaryStatus === "failed"
                    ? "Connected notes are unavailable because the summary did not finish."
                    : "No connected summary note"}
              </p>
            )}
          </div>
        </section>
      </div>

      {insight.correctionReason ? (
        <p className="sp-evidence-detail__correction">
          Candidate correction: {insight.correctionReason}
        </p>
      ) : null}
    </section>
  );
}

export function EvidenceMap({
  center,
  cv,
  entryMode,
  insights,
  plan,
  summary,
  summaryStatus,
  transcript,
}: EvidenceMapProps) {
  const detailId = useId();
  const orderedInsights = [...insights].sort(compareInsightBoardCards);
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(
    null,
  );
  const selectedNodeRef = useRef<HTMLButtonElement | null>(null);
  const selectedInsight = orderedInsights.find(
    (insight) => insight.id === selectedInsightId,
  );
  const branchSplit = Math.ceil(orderedInsights.length / 2);
  const leftNodes = orderedInsights.slice(0, branchSplit);
  const rightNodes = orderedInsights.slice(branchSplit);
  const selectInsight = (insightId: string, trigger: HTMLButtonElement) => {
    selectedNodeRef.current = trigger;
    setSelectedInsightId((current) =>
      current === insightId ? null : insightId,
    );
  };

  return (
    <section aria-label="Conversation evidence map" className="sp-evidence-map">
      <div className="sp-evidence-map__canvas">
        <ul
          aria-label="Evidence nodes, first branch"
          className="sp-evidence-map__branch sp-evidence-map__branch--left"
        >
          {leftNodes.map((insight) => (
            <EvidenceNode
              active={selectedInsight?.id === insight.id}
              detailId={detailId}
              displayStatus={resolveInsightDisplayStatus(
                insight,
                orderedInsights,
              )}
              insight={insight}
              key={insight.id}
              onSelect={selectInsight}
            />
          ))}
        </ul>

        <div
          aria-live="polite"
          className="sp-evidence-map__center"
          id={detailId}
        >
          <div
            aria-hidden={selectedInsight ? true : undefined}
            className="sp-evidence-map__center-summary"
            data-obscured={selectedInsight ? true : undefined}
          >
            {center}
          </div>
          {selectedInsight ? (
            <EvidenceDetail
              {...(cv ? { cv } : {})}
              entryMode={entryMode}
              insight={selectedInsight}
              onMinimize={() => {
                setSelectedInsightId(null);
                requestAnimationFrame(() => {
                  selectedNodeRef.current?.focus();
                });
              }}
              plan={plan}
              {...(summary ? { summary } : {})}
              summaryStatus={summaryStatus}
              transcript={transcript}
            />
          ) : null}
        </div>

        <ul
          aria-label="Evidence nodes, second branch"
          className="sp-evidence-map__branch sp-evidence-map__branch--right"
        >
          {rightNodes.map((insight) => (
            <EvidenceNode
              active={selectedInsight?.id === insight.id}
              detailId={detailId}
              displayStatus={resolveInsightDisplayStatus(
                insight,
                orderedInsights,
              )}
              insight={insight}
              key={insight.id}
              onSelect={selectInsight}
            />
          ))}
        </ul>
      </div>

      {orderedInsights.length === 0 ? (
        <p className="sp-evidence-map__empty">
          No insight nodes were finalized before the interview ended. The local
          evidence available for this review is limited.
        </p>
      ) : null}
    </section>
  );
}
