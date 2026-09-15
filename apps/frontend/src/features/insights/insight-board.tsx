import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";
import type {
  InsightCard,
  InsightStatus,
} from "@screenpilot/contracts/interview/insight-card";
import type { NormalizedCv } from "@screenpilot/contracts/interview/normalized-cv";
import type { TopicProgress } from "@screenpilot/contracts/interview/topic-progress";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";

import { Badge, type BadgeTone } from "@/shared/ui/badge";

import {
  compareInsightBoardCards,
  INSIGHT_CATEGORY_METADATA,
} from "./insight-category-metadata";

type InsightBoardProps = Readonly<{
  cv?: NormalizedCv | undefined;
  entryMode: EntryMode;
  insights: readonly InsightCard[];
  topicProgress: readonly TopicProgress[];
  transcript: readonly TranscriptTurn[];
}>;

const STATUS_LABELS: Readonly<Record<InsightStatus, string>> = {
  appearing: "Organizing",
  confirmed: "Confirmed",
  corrected: "Corrected",
  needs_clarification: "Needs clarification",
};

function statusTone(status: InsightStatus): BadgeTone {
  if (status === "needs_clarification") {
    return "warning";
  }
  if (status === "confirmed") {
    return "success";
  }
  return "coral";
}

function topicLabel(topicKey: TopicProgress["topicKey"]): string {
  return topicKey
    .replace("relevant_experience_summary", "experience")
    .replace("motivation_and_next_role", "motivation")
    .replace("location_work_arrangement", "work arrangement")
    .replace("compensation_expectation", "compensation")
    .replace("english_use_context", "English use")
    .replace("clarifications_and_followups", "follow-ups")
    .replaceAll("_", " ");
}

function topicStatusLabel(status: TopicProgress["status"]): string {
  return status.replaceAll("_", " ");
}

function InsightEvidence({
  cv,
  insight,
  transcript,
}: Readonly<{
  cv?: NormalizedCv | undefined;
  insight: InsightCard;
  transcript: readonly TranscriptTurn[];
}>) {
  const candidateTurns = insight.evidenceTurnIds.flatMap((turnId) => {
    const turn = transcript.find((candidate) => candidate.id === turnId);
    return turn ? [turn] : [];
  });
  const cvFacts = insight.cvFactIds.flatMap((factId) => {
    const fact = cv?.facts.find((candidate) => candidate.id === factId);
    return fact ? [fact] : [];
  });
  const evidenceCount = candidateTurns.length + cvFacts.length;

  return (
    <details className="sp-insight-card__evidence">
      <summary>
        Evidence <span>{evidenceCount}</span>
      </summary>
      <div>
        {cvFacts.map((fact) => (
          <blockquote key={`cv-${fact.id}`}>
            <span>CV</span>
            <p>{fact.statement}</p>
          </blockquote>
        ))}
        {candidateTurns.map((turn) => (
          <blockquote key={`turn-${turn.id}`}>
            <span>Candidate · turn {turn.sequence + 1}</span>
            <p>{turn.text}</p>
          </blockquote>
        ))}
        {insight.correctionReason ? (
          <p className="sp-insight-card__correction-note">
            Correction note: {insight.correctionReason}
          </p>
        ) : null}
      </div>
    </details>
  );
}

function InsightCardView({
  cv,
  insight,
  transcript,
}: Readonly<{
  cv?: NormalizedCv | undefined;
  insight: InsightCard;
  transcript: readonly TranscriptTurn[];
}>) {
  const categoryMetadata = INSIGHT_CATEGORY_METADATA[insight.category];

  return (
    <article
      className="sp-insight-card"
      data-category={insight.category}
      data-status={insight.status}
      role="listitem"
    >
      <div aria-hidden="true" className="sp-insight-card__mark">
        {categoryMetadata.mark}
      </div>
      <div className="sp-insight-card__body">
        <header>
          <p>{insight.label}</p>
          <Badge tone={statusTone(insight.status)}>
            {STATUS_LABELS[insight.status]}
          </Badge>
        </header>
        <p className="sp-insight-card__value">{insight.value}</p>
        <div className="sp-insight-card__meta">
          <Badge>{insight.source}</Badge>
          {insight.status === "corrected" ? (
            <span>Candidate updated</span>
          ) : null}
        </div>
        <InsightEvidence cv={cv} insight={insight} transcript={transcript} />
      </div>
    </article>
  );
}

export function InsightBoard({
  cv,
  entryMode,
  insights,
  topicProgress,
  transcript,
}: InsightBoardProps) {
  const coveredTopics = topicProgress.filter(
    (progress) => progress.status === "covered",
  ).length;
  const orderedInsights = [...insights].sort(compareInsightBoardCards);

  return (
    <section aria-labelledby="insight-board-title" className="sp-insight-board">
      <header className="sp-insight-board__header">
        <div>
          <p>Live candidate evidence</p>
          <h2 id="insight-board-title">What ScreenPilot understood</h2>
        </div>
        <Badge tone="coral">
          {insights.length} {insights.length === 1 ? "note" : "notes"}
        </Badge>
      </header>
      <p className="sp-insight-board__disclaimer">
        AI-organized notes for human interpretation—not a score or hiring
        decision.
      </p>

      {insights.length === 0 ? (
        <div className="sp-insight-board__empty" role="status">
          <span aria-hidden="true">+</span>
          <div>
            <strong>Ready for candidate evidence</strong>
            <p>
              {entryMode === "conversation_first"
                ? "Cards appear only after your final spoken answers."
                : "Grounded CV notes and confirmed answers will appear here."}
            </p>
          </div>
        </div>
      ) : (
        <div
          aria-label="Candidate insight cards"
          aria-live="polite"
          className="sp-insight-board__rail"
          role="list"
        >
          {orderedInsights.map((insight) => (
            <InsightCardView
              {...(cv ? { cv } : {})}
              insight={insight}
              key={insight.id}
              transcript={transcript}
            />
          ))}
        </div>
      )}

      <div className="sp-insight-board__topics">
        <div>
          <strong>Conversation coverage</strong>
          <span>{coveredTopics} covered</span>
        </div>
        {topicProgress.length === 0 ? (
          <p>Topics will update as candidate answers are confirmed.</p>
        ) : (
          <ul aria-label="Interview topic progress">
            {topicProgress.map((progress) => (
              <li data-status={progress.status} key={progress.topicKey}>
                <span>{topicLabel(progress.topicKey)}</span>
                <small>{topicStatusLabel(progress.status)}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
