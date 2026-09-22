import type { ScreeningPlan } from "@screenpilot/contracts/interview/screening-plan";
import type { ScreeningSummary } from "@screenpilot/contracts/interview/screening-summary";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";
import { Children, isValidElement, type ReactNode } from "react";

const SUMMARY_BALANCE_THRESHOLD = 4;

type EvidenceLinkedItemProps = Readonly<{
  evidenceTurnIds: readonly string[];
  label: string;
  text: string;
  transcript: readonly TranscriptTurn[];
}>;

function EvidenceLinkedItem({
  evidenceTurnIds,
  label,
  text,
  transcript,
}: EvidenceLinkedItemProps) {
  const candidateTurns = new Map(
    transcript
      .filter((turn) => turn.speaker === "candidate" && turn.status === "final")
      .map((turn) => [turn.id, turn] as const),
  );
  return (
    <li className="sp-summary-item">
      <span>{label}</span>
      <p>{text}</p>
      <div
        aria-label={`Evidence for ${label}`}
        className="sp-summary-item__evidence"
      >
        {evidenceTurnIds.map((turnId) => {
          const turn = candidateTurns.get(turnId);
          return turn ? (
            <span className="sp-evidence-chip" key={turnId}>
              Candidate · turn {turn.sequence + 1}
            </span>
          ) : (
            <span
              className="sp-evidence-chip sp-evidence-chip--unavailable"
              key={turnId}
            >
              Evidence unavailable
            </span>
          );
        })}
      </div>
    </li>
  );
}

type SummaryPanelProps = Readonly<{
  children: ReactNode;
  eyebrow: string;
  layout?: "standard" | "wide";
  title: string;
}>;

function SummaryPanel({
  children,
  eyebrow,
  layout = "standard",
  title,
}: SummaryPanelProps) {
  return (
    <section
      className={`sp-summary-panel${layout === "wide" ? " sp-summary-panel--wide" : ""}`}
    >
      <header>
        <p>{eyebrow}</p>
        <h3>{title}</h3>
      </header>
      {children}
    </section>
  );
}

type SummaryPanelEntry = Readonly<{
  isWide: boolean;
  panel: ReactNode;
}>;

function arrangeSummaryPanels(children: ReactNode) {
  const rows: SummaryPanelEntry[][] = [];
  let compactRow: SummaryPanelEntry[] = [];

  for (const panel of Children.toArray(children)) {
    const entry = {
      isWide:
        isValidElement<SummaryPanelProps>(panel) &&
        panel.props.layout === "wide",
      panel,
    };

    if (entry.isWide) {
      if (compactRow.length > 0) {
        rows.push(compactRow);
        compactRow = [];
      }
      rows.push([entry]);
      continue;
    }

    compactRow.push(entry);
    if (compactRow.length === 2) {
      rows.push(compactRow);
      compactRow = [];
    }
  }

  if (compactRow.length > 0) {
    rows.push(compactRow);
  }

  const singletonRowIndexes = rows.flatMap((row, rowIndex) =>
    row.length === 1 && !row[0]?.isWide ? [rowIndex] : [],
  );
  const mergedRowIndexes = new Set<number>();

  for (let index = 0; index + 1 < singletonRowIndexes.length; index += 2) {
    const firstRowIndex = singletonRowIndexes[index];
    const secondRowIndex = singletonRowIndexes[index + 1];
    const firstRow =
      firstRowIndex === undefined ? undefined : rows[firstRowIndex];
    const secondRow =
      secondRowIndex === undefined ? undefined : rows[secondRowIndex];
    const secondPanel = secondRow?.[0];

    if (
      firstRowIndex !== undefined &&
      firstRow &&
      secondPanel &&
      secondRowIndex !== undefined
    ) {
      rows[firstRowIndex] = [...firstRow, secondPanel];
      mergedRowIndexes.add(secondRowIndex);
    }
  }

  return rows.flatMap((row, rowIndex) =>
    mergedRowIndexes.has(rowIndex) ? [] : row,
  );
}

function SummaryPanelGrid({ children }: Readonly<{ children: ReactNode }>) {
  const arrangedPanels = arrangeSummaryPanels(children);

  return (
    <div className="sp-summary-sections__grid">
      {arrangedPanels.map(({ panel }) => panel)}
    </div>
  );
}

function EmptySummaryValue({ children }: Readonly<{ children: string }>) {
  return <p className="sp-summary-panel__empty">{children}</p>;
}

type SummarySectionsProps = Readonly<{
  plan: ScreeningPlan;
  summary: ScreeningSummary;
  transcript: readonly TranscriptTurn[];
}>;

export function SummarySections({
  plan,
  summary,
  transcript,
}: SummarySectionsProps) {
  const topicTitles = new Map(
    plan.topics.map((topic) => [topic.key, topic.title] as const),
  );
  const hasDenseConfirmedFacts =
    summary.confirmedFacts.length >= SUMMARY_BALANCE_THRESHOLD;
  const hasDenseClarifications =
    summary.clarifications.length >= SUMMARY_BALANCE_THRESHOLD;
  const hasDenseCoverage =
    Math.max(summary.topicsCovered.length, summary.topicsNotCovered.length) >=
    SUMMARY_BALANCE_THRESHOLD;
  const hasDenseCommunicationNotes =
    summary.communicationNotes.length >= SUMMARY_BALANCE_THRESHOLD;
  const hasDenseCandidateQuestions =
    summary.candidateQuestions.length >= SUMMARY_BALANCE_THRESHOLD;
  const hasDenseHumanFollowups =
    summary.humanFollowups.length >= SUMMARY_BALANCE_THRESHOLD;
  const hasDenseLimitations =
    summary.limitations.length >= SUMMARY_BALANCE_THRESHOLD;

  return (
    <section
      aria-labelledby="summary-details-title"
      className="sp-summary-sections"
    >
      <header className="sp-review-panel-heading">
        <div>
          <p>Human review workspace</p>
          <h2 id="summary-details-title">Organized conversation notes</h2>
        </div>
      </header>

      <SummaryPanelGrid>
        <SummaryPanel
          eyebrow="Grounded context"
          layout={hasDenseConfirmedFacts ? "wide" : "standard"}
          title="Confirmed facts"
        >
          {summary.confirmedFacts.length > 0 ? (
            <ul
              className={
                hasDenseConfirmedFacts
                  ? "sp-summary-panel__balanced-list"
                  : undefined
              }
            >
              {summary.confirmedFacts.map((fact, index) => (
                <EvidenceLinkedItem
                  evidenceTurnIds={fact.evidenceTurnIds}
                  key={`${fact.statement}-${String(index)}`}
                  label="Confirmed fact"
                  text={fact.statement}
                  transcript={transcript}
                />
              ))}
            </ul>
          ) : (
            <EmptySummaryValue>No confirmed facts available.</EmptySummaryValue>
          )}
        </SummaryPanel>

        <SummaryPanel
          eyebrow="Uncertainty stays visible"
          layout={hasDenseClarifications ? "wide" : "standard"}
          title="Clarifications"
        >
          {summary.clarifications.length > 0 ? (
            <ul
              className={
                hasDenseClarifications
                  ? "sp-summary-panel__balanced-list"
                  : undefined
              }
            >
              {summary.clarifications.map((item, index) => (
                <EvidenceLinkedItem
                  evidenceTurnIds={item.evidenceTurnIds}
                  key={`${item.statement}-${String(index)}`}
                  label="Clarification"
                  text={item.statement}
                  transcript={transcript}
                />
              ))}
            </ul>
          ) : (
            <EmptySummaryValue>
              No clarification was recorded.
            </EmptySummaryValue>
          )}
        </SummaryPanel>

        <SummaryPanel
          eyebrow="Conversation shape"
          layout={hasDenseCoverage ? "wide" : "standard"}
          title="Coverage and gaps"
        >
          <div
            className={`sp-summary-coverage${hasDenseCoverage ? " sp-summary-coverage--balanced" : ""}`}
          >
            <div>
              <h4>Covered</h4>
              {summary.topicsCovered.length > 0 ? (
                <ul
                  aria-label="Covered topics"
                  className={
                    hasDenseCoverage
                      ? "sp-summary-panel__balanced-list"
                      : undefined
                  }
                >
                  {summary.topicsCovered.map((topic) => (
                    <EvidenceLinkedItem
                      evidenceTurnIds={topic.evidenceTurnIds}
                      key={topic.topicKey}
                      label="Covered topic"
                      text={topicTitles.get(topic.topicKey) ?? topic.topicKey}
                      transcript={transcript}
                    />
                  ))}
                </ul>
              ) : (
                <EmptySummaryValue>
                  No topics were confirmed as covered.
                </EmptySummaryValue>
              )}
            </div>
            <div>
              <h4>Not covered</h4>
              {summary.topicsNotCovered.length > 0 ? (
                <ul
                  aria-label="Topics not covered"
                  className={`sp-summary-gap-list${hasDenseCoverage ? " sp-summary-panel__balanced-list" : ""}`}
                >
                  {summary.topicsNotCovered.map((topicKey) => (
                    <li key={topicKey}>
                      {topicTitles.get(topicKey) ?? topicKey}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptySummaryValue>
                  No topic gaps were reported.
                </EmptySummaryValue>
              )}
            </div>
          </div>
        </SummaryPanel>

        <SummaryPanel eyebrow="Candidate preferences" title="Practical details">
          <ul>
            {summary.compensation ? (
              <EvidenceLinkedItem
                evidenceTurnIds={summary.compensation.evidenceTurnIds}
                label="Compensation"
                text={summary.compensation.candidateStatement}
                transcript={transcript}
              />
            ) : (
              <li className="sp-summary-item sp-summary-item--unavailable">
                <span>Compensation</span>
                <p>Not covered.</p>
              </li>
            )}
            {summary.availability ? (
              <EvidenceLinkedItem
                evidenceTurnIds={summary.availability.evidenceTurnIds}
                label="Availability"
                text={summary.availability.candidateStatement}
                transcript={transcript}
              />
            ) : (
              <li className="sp-summary-item sp-summary-item--unavailable">
                <span>Availability</span>
                <p>Not covered.</p>
              </li>
            )}
          </ul>
        </SummaryPanel>

        <SummaryPanel
          eyebrow="Observed in this call"
          layout={hasDenseCommunicationNotes ? "wide" : "standard"}
          title="Communication notes"
        >
          {summary.communicationNotes.length > 0 ? (
            <ul
              className={
                hasDenseCommunicationNotes
                  ? "sp-summary-panel__balanced-list"
                  : undefined
              }
            >
              {summary.communicationNotes.map((note, index) => (
                <EvidenceLinkedItem
                  evidenceTurnIds={note.evidenceTurnIds}
                  key={`${note.observation}-${String(index)}`}
                  label="Observed behavior"
                  text={note.observation}
                  transcript={transcript}
                />
              ))}
            </ul>
          ) : (
            <EmptySummaryValue>
              No evidence-linked communication notes available.
            </EmptySummaryValue>
          )}
        </SummaryPanel>

        <SummaryPanel
          eyebrow="Candidate-led"
          layout={hasDenseCandidateQuestions ? "wide" : "standard"}
          title="Questions asked"
        >
          {summary.candidateQuestions.length > 0 ? (
            <ul
              className={
                hasDenseCandidateQuestions
                  ? "sp-summary-panel__balanced-list"
                  : undefined
              }
            >
              {summary.candidateQuestions.map((question, index) => (
                <EvidenceLinkedItem
                  evidenceTurnIds={question.evidenceTurnIds}
                  key={`${question.question}-${String(index)}`}
                  label="Candidate question"
                  text={question.question}
                  transcript={transcript}
                />
              ))}
            </ul>
          ) : (
            <EmptySummaryValue>
              No candidate questions were captured.
            </EmptySummaryValue>
          )}
        </SummaryPanel>

        <SummaryPanel
          eyebrow="No invented employer facts"
          layout={hasDenseHumanFollowups ? "wide" : "standard"}
          title="Human follow-ups"
        >
          {summary.humanFollowups.length > 0 ? (
            <ul
              className={
                hasDenseHumanFollowups
                  ? "sp-summary-panel__balanced-list"
                  : undefined
              }
            >
              {summary.humanFollowups.map((followup, index) => (
                <EvidenceLinkedItem
                  evidenceTurnIds={followup.evidenceTurnIds}
                  key={`${followup.reason}-${String(index)}`}
                  label="Human follow-up"
                  text={followup.reason}
                  transcript={transcript}
                />
              ))}
            </ul>
          ) : (
            <EmptySummaryValue>
              No human follow-ups were recorded.
            </EmptySummaryValue>
          )}
        </SummaryPanel>

        <SummaryPanel
          eyebrow="Interpretation boundary"
          layout={hasDenseLimitations ? "wide" : "standard"}
          title="Limitations"
        >
          <ul
            className={`sp-summary-limitations${hasDenseLimitations ? " sp-summary-panel__balanced-list" : ""}`}
          >
            {summary.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </SummaryPanel>
      </SummaryPanelGrid>
    </section>
  );
}
