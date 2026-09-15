import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef } from "react";

import type { LiveCaption } from "./normalize-voice-event";

type LiveCaptionsProps = Readonly<{
  caption: LiveCaption | null;
  transcript: readonly TranscriptTurn[];
}>;

const FINAL_WORD_DELAY_MS = 75;
const MAX_FINAL_WORD_DELAY_MS = 750;
const TENTATIVE_WORD_GROUP_SIZE = 4;

function renderCaptionWords(caption: LiveCaption) {
  const words = caption.text.match(/\S+\s*/gu) ?? [];

  return words.map((word, index) => {
    const delayMs =
      caption.stability === "final"
        ? Math.min(index * FINAL_WORD_DELAY_MS, MAX_FINAL_WORD_DELAY_MS)
        : (index % TENTATIVE_WORD_GROUP_SIZE) * FINAL_WORD_DELAY_MS;
    const style = {
      "--sp-caption-word-delay": `${String(delayMs)}ms`,
    } as CSSProperties;

    return (
      <span
        className="sp-live-captions__word"
        key={`${caption.turnId}-${String(index)}-${word.trim()}`}
        style={style}
      >
        {word}
      </span>
    );
  });
}

function transcriptCaption(turn: TranscriptTurn): LiveCaption {
  return {
    speaker: turn.speaker,
    stability: "final",
    text: turn.text,
    turnId: turn.id,
  };
}

function mergeCaptionHistory(
  transcript: readonly TranscriptTurn[],
  caption: LiveCaption | null,
) {
  const messages = transcript.map(transcriptCaption);
  if (!caption) {
    return messages;
  }

  const currentTurnIndex = messages.findIndex(
    (message) => message.turnId === caption.turnId,
  );
  if (currentTurnIndex === -1) {
    messages.push(caption);
  } else {
    messages[currentTurnIndex] = caption;
  }
  return messages;
}

export function LiveCaptions({ caption, transcript }: LiveCaptionsProps) {
  const captionLogRef = useRef<HTMLElement>(null);
  const messages = useMemo(
    () => mergeCaptionHistory(transcript, caption),
    [caption, transcript],
  );

  useEffect(() => {
    const captionLog = captionLogRef.current;
    if (!captionLog) {
      return;
    }
    captionLog.scrollTop = captionLog.scrollHeight;
  }, [caption?.text, caption?.turnId, transcript.length]);

  return (
    <section
      aria-atomic="false"
      aria-live={caption?.stability === "final" ? "polite" : "off"}
      className="sp-live-captions"
      data-speaker={caption?.speaker ?? "none"}
      data-stability={caption?.stability ?? "empty"}
      ref={captionLogRef}
      role="log"
    >
      {messages.length === 0 ? (
        <p className="sp-live-captions__empty">
          Conversation captions will appear here.
        </p>
      ) : (
        <ol className="sp-live-captions__messages">
          {messages.map((message) => {
            const candidateSpeaking = message.speaker === "candidate";
            const isCurrent = message.turnId === caption?.turnId;
            const activityLabel = candidateSpeaking
              ? "Listening…"
              : "Speaking…";

            return (
              <li
                className="sp-live-captions__message"
                data-current={isCurrent ? "true" : "false"}
                data-speaker={message.speaker}
                data-stability={message.stability}
                key={message.turnId}
              >
                <div className="sp-live-captions__label">
                  <span aria-hidden="true" />
                  <strong>{candidateSpeaking ? "You" : "Pilot"}</strong>
                  {isCurrent && message.stability === "tentative" ? (
                    <small>{activityLabel}</small>
                  ) : null}
                </div>
                <p className="sp-live-captions__caption">
                  {candidateSpeaking
                    ? message.text
                    : renderCaptionWords(message)}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
