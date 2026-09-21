import type { ScreeningPlan } from "@screenpilot/contracts/interview/screening-plan";
import type { ScreeningSummary } from "@screenpilot/contracts/interview/screening-summary";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";
import type { ReactNode } from "react";

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

function SummaryPanel({
  children,
  eyebrow,
  title,
}: Readonly<{
  children: ReactNode;
  eyebrow: string;
  title: string;
}>) {
  return (
    <section className="sp-summary-panel">
      <header>
        <p>{eyebrow}</p>
        <h3>{title}</h3>
      </header>
      {children}
    </section>
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

      <div className="sp-summary-sections__grid">
        <SummaryPanel eyebrow="Grounded context" title="Confirmed facts">
          {summary.confirmedFacts.length > 0 ? (
            <ul>
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
          title="Clarifications"
        >
          {summary.clarifications.length > 0 ? (
            <ul>
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

        <SummaryPanel eyebrow="Conversation shape" title="Coverage and gaps">
          <div className="sp-summary-coverage">
            <div>
              <h4>Covered</h4>
              {summary.topicsCovered.length > 0 ? (
                <ul>
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
                <ul className="sp-summary-gap-list">
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
          title="Communication notes"
        >
          {summary.communicationNotes.length > 0 ? (
            <ul>
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

        <SummaryPanel eyebrow="Candidate-led" title="Questions asked">
          {summary.candidateQuestions.length > 0 ? (
            <ul>
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
          title="Human follow-ups"
        >
          {summary.humanFollowups.length > 0 ? (
            <ul>
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

        <SummaryPanel eyebrow="Interpretation boundary" title="Limitations">
          <ul className="sp-summary-limitations">
            {summary.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </SummaryPanel>
      </div>
    </section>
  );
}
