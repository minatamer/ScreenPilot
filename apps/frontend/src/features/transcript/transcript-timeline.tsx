"use client";

import { useSyncExternalStore } from "react";

import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";

import { Badge } from "@/shared/ui/badge";

export function transcriptTurnDomId(turnId: string): string {
  const encodedId = Array.from(turnId, (character) =>
    character.codePointAt(0)?.toString(16),
  ).join("-");
  return `sp-transcript-turn-${encodedId}`;
}

function speakerLabel(speaker: TranscriptTurn["speaker"]): string {
  return speaker === "candidate" ? "Candidate" : "Pilot";
}

function formatLocalTime(occurredAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(occurredAt));
}

function subscribeToLocalTime() {
  return () => undefined;
}

function TranscriptTurnTime({ occurredAt }: Readonly<{ occurredAt: string }>) {
  const displayTime = useSyncExternalStore(
    subscribeToLocalTime,
    () => formatLocalTime(occurredAt),
    () => `${new Date(occurredAt).toISOString().slice(11, 16)} UTC`,
  );

  return <time dateTime={occurredAt}>{displayTime}</time>;
}

function compareTranscriptTurns(
  left: TranscriptTurn,
  right: TranscriptTurn,
): number {
  const sequenceDifference = left.sequence - right.sequence;
  if (sequenceDifference !== 0) {
    return sequenceDifference;
  }
  const timeDifference = left.occurredAt.localeCompare(right.occurredAt);
  return timeDifference !== 0
    ? timeDifference
    : left.id.localeCompare(right.id);
}

type TranscriptTimelineProps = Readonly<{
  activeTurnId: string | null;
  onReturnToEvidence: () => void;
  transcript: readonly TranscriptTurn[];
}>;

export function TranscriptTimeline({
  activeTurnId,
  onReturnToEvidence,
  transcript,
}: TranscriptTimelineProps) {
  const orderedTurns = [...transcript].sort(compareTranscriptTurns);

  return (
    <section
      aria-labelledby="local-transcript-title"
      className="sp-transcript-timeline"
    >
      <header className="sp-review-panel-heading">
        <div>
          <p>Same-tab evidence</p>
          <h2 id="local-transcript-title">Local transcript</h2>
        </div>
        <Badge>
          {orderedTurns.length} {orderedTurns.length === 1 ? "turn" : "turns"}
        </Badge>
      </header>

      {orderedTurns.length === 0 ? (
        <p className="sp-transcript-timeline__empty">
          No final transcript turns were received before this interview ended.
        </p>
      ) : (
        <ol aria-label="Final local transcript turns">
          {orderedTurns.map((turn) => {
            const active = activeTurnId === turn.id;
            const label = speakerLabel(turn.speaker);
            return (
              <li key={turn.id}>
                <article
                  aria-label={`${label}, turn ${String(turn.sequence + 1)}`}
                  className="sp-transcript-turn"
                  data-active-evidence={active || undefined}
                  data-speaker={turn.speaker}
                  id={transcriptTurnDomId(turn.id)}
                  tabIndex={-1}
                >
                  <header>
                    <strong>{label}</strong>
                    <div>
                      <TranscriptTurnTime occurredAt={turn.occurredAt} />
                      <Badge
                        tone={turn.status === "final" ? "success" : "warning"}
                      >
                        {turn.status === "final" ? "Final" : "Partial"}
                      </Badge>
                    </div>
                  </header>
                  <p>{turn.text}</p>
                  {active ? (
                    <button
                      className="sp-transcript-turn__return"
                      onClick={onReturnToEvidence}
                      type="button"
                    >
                      Return to evidence card
                    </button>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
