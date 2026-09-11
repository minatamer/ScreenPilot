"use client";

import { useIllustrativeConversation } from "./use-illustrative-conversation";

const conversationExamples = [
  {
    answer: "Around 25k–30k.",
    noteLabel: "Salary expectation",
    noteValue: "25k–30k",
    question: ["What are your ", "salary expectations?", ""],
  },
  {
    answer: "I spent three years helping customers solve account issues.",
    noteLabel: "Relevant experience",
    noteValue: "3 years in customer support",
    question: ["What ", "experience", " would you like to highlight?"],
  },
  {
    answer: "I could start in about four weeks.",
    noteLabel: "Availability",
    noteValue: "About 4 weeks",
    question: ["When would you be ", "available to start?", ""],
  },
  {
    answer: "I enjoy customer-facing work and solving practical problems.",
    noteLabel: "Role preference",
    noteValue: "Customer-facing problem solving",
    question: ["What kind of ", "role", " would you like to explore?"],
  },
  {
    answer: "Remote or hybrid work both suit me.",
    noteLabel: "Work setup",
    noteValue: "Remote or hybrid",
    question: ["Which ", "work setup", " suits you best?"],
  },
  {
    answer: "I want to grow my product knowledge and leadership skills.",
    noteLabel: "Growth goal",
    noteValue: "Product knowledge and leadership",
    question: ["What would you like to ", "learn", " in your next role?"],
  },
] as const;

const EXAMPLES_PER_BOARD = 3;
const conversationLines = conversationExamples.map(({ answer, question }) => ({
  answer,
  question: question.join(""),
}));

function renderSpokenWords(value: string, keyPrefix: string) {
  const words = value.match(/\S+\s*/gu) ?? [];

  return words.map((word, index) => (
    <span
      className="sp-live-conversation__spoken-word"
      key={`${keyPrefix}-${String(index)}`}
    >
      {word}
    </span>
  ));
}

function renderHighlightedQuestion(
  questionSegments: readonly [string, string, string],
  spokenQuestion: string,
) {
  let segmentStart = 0;

  return questionSegments.map((segment, index) => {
    const visibleSegment = spokenQuestion.slice(
      segmentStart,
      segmentStart + segment.length,
    );
    segmentStart += segment.length;

    if (!visibleSegment) {
      return null;
    }

    const segmentKey = `question-${String(index)}`;

    return index === 1 ? (
      <mark key={segmentKey}>
        {renderSpokenWords(visibleSegment, segmentKey)}
      </mark>
    ) : (
      <span key={segmentKey}>
        {renderSpokenWords(visibleSegment, segmentKey)}
      </span>
    );
  });
}

function SpeakerBars({ active }: Readonly<{ active: boolean }>) {
  return (
    <span
      aria-hidden="true"
      className="sp-live-conversation__speaker-bars"
      data-active={active}
    >
      {Array.from({ length: 7 }, (_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}

function CandidateAtLaptopIllustration({
  speaking,
}: Readonly<{ speaking: boolean }>) {
  return (
    <svg
      aria-label="Illustration of a person speaking beside a laptop"
      className="sp-live-conversation__person"
      data-speaking={speaking}
      role="img"
      viewBox="0 0 360 300"
    >
      <circle cx="180" cy="145" fill="#FCA39A" opacity=".045" r="116" />
      <path
        d="M68 260c10-61 48-96 108-96 61 0 100 35 112 96H68Z"
        fill="#FCA39A"
        opacity=".94"
      />
      <path
        d="M146 162c8 13 19 20 32 20 14 0 25-7 33-20l-10-24h-45l-10 24Z"
        fill="#F7CEC9"
      />
      <circle cx="177" cy="108" fill="#FDE8E4" r="50" />
      <circle cx="128" cy="111" fill="#FDE8E4" r="9" />
      <circle cx="226" cy="111" fill="#FDE8E4" r="9" />
      <path
        d="M127 105c1-39 20-61 55-61 34 0 56 26 54 65-21-1-40-11-55-29-13 15-31 24-54 27v-2Z"
        fill="#18243A"
      />
      <circle cx="158" cy="111" fill="#22314B" r="3.5" />
      <circle cx="198" cy="111" fill="#22314B" r="3.5" />
      <path
        className="sp-live-conversation__person-mouth"
        d="M157 129c6 7 13 11 21 11 9 0 16-4 22-12"
        fill="none"
        stroke="#CC493F"
        strokeLinecap="round"
        strokeWidth="5"
      />
      <path
        d="M105 216c21 1 42 10 62 29"
        fill="none"
        stroke="#FDE8E4"
        strokeLinecap="round"
        strokeWidth="17"
      />
      <circle cx="171" cy="247" fill="#FDE8E4" r="9" />
      <path
        d="M250 222c12 5 23 14 32 27"
        fill="none"
        stroke="#FDE8E4"
        strokeLinecap="round"
        strokeWidth="17"
      />
      <path
        d="M211 202h111l-19 57H191l20-57Z"
        fill="#22314B"
        stroke="#FAFAF8"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path d="M201 250h105" opacity=".26" stroke="#FCA39A" />
      <circle cx="263" cy="230" fill="#F26B5B" r="7" />
      <path
        d="M35 260h290"
        fill="none"
        stroke="#FAFAF8"
        strokeLinecap="round"
        strokeWidth="5"
      />
      <g aria-hidden="true" className="sp-live-conversation__person-voice">
        <rect height="18" rx="3" width="6" x="40" y="106" />
        <rect height="34" rx="3" width="6" x="50" y="98" />
        <rect height="24" rx="3" width="6" x="60" y="103" />
        <rect height="44" rx="3" width="6" x="70" y="93" />
        <rect height="28" rx="3" width="6" x="80" y="101" />
        <rect height="36" rx="3" width="6" x="90" y="97" />
        <rect height="18" rx="3" width="6" x="100" y="106" />
      </g>
    </svg>
  );
}

export function IllustrativeInterviewPreview() {
  const {
    activeExample,
    completedExampleCount,
    isRunning,
    phase,
    previewRef,
    setIsFocusPaused,
    spokenAnswer,
    spokenQuestion,
  } = useIllustrativeConversation(conversationLines, EXAMPLES_PER_BOARD);
  const example =
    conversationExamples[activeExample] ?? conversationExamples[0];
  const activeBoardIndex = Math.floor(activeExample / EXAMPLES_PER_BOARD);
  const activeBoardStart = activeBoardIndex * EXAMPLES_PER_BOARD;
  const visibleExamples = conversationExamples.slice(
    activeBoardStart,
    activeBoardStart + EXAMPLES_PER_BOARD,
  );
  const createdNoteCount = Math.max(
    0,
    Math.min(completedExampleCount - activeBoardStart, visibleExamples.length),
  );
  const pilotIsSpeaking = phase === "question";
  const candidateIsSpeaking = phase === "answer";

  return (
    <figure
      aria-label="Example interview"
      aria-describedby="illustrative-interview-description"
      className="sp-live-conversation"
      data-board={activeBoardIndex + 1}
      data-example={activeExample + 1}
      data-phase={phase}
      data-running={isRunning}
      onBlur={() => {
        setIsFocusPaused(false);
      }}
      onFocus={() => {
        setIsFocusPaused(true);
      }}
      ref={previewRef}
      tabIndex={0}
    >
      <p className="sp-visually-hidden" id="illustrative-interview-description">
        This looping animated example plays through six fictional interview
        questions and fills two sets of three notes from the candidate&apos;s
        own answers: salary, experience, availability, role preference, work
        setup, and growth goals. Focus the example to pause it.
      </p>

      <div className="sp-live-conversation__stage">
        <div className="sp-live-conversation__participant">
          <CandidateAtLaptopIllustration speaking={candidateIsSpeaking} />
        </div>

        <div className="sp-live-conversation__exchange">
          <div
            className="sp-live-conversation__turn sp-live-conversation__turn--pilot"
            data-active={pilotIsSpeaking}
          >
            <div className="sp-live-conversation__speaker">
              <span>Pilot asks</span>
              <SpeakerBars active={pilotIsSpeaking} />
            </div>
            <p aria-label={example.question.join("")}>
              {renderHighlightedQuestion(example.question, spokenQuestion)}
            </p>
          </div>

          <div
            className="sp-live-conversation__turn sp-live-conversation__turn--candidate"
            data-active={candidateIsSpeaking}
          >
            <div className="sp-live-conversation__speaker">
              <span>You answer</span>
              <SpeakerBars active={candidateIsSpeaking} />
            </div>
            <p aria-label={example.answer}>
              <mark data-highlighted={phase === "note"}>
                {renderSpokenWords(spokenAnswer, "answer")}
              </mark>
            </p>
          </div>
        </div>
      </div>

      <section
        aria-label="Notes created from this interview"
        className="sp-live-conversation__notes-board"
      >
        <div className="sp-live-conversation__notes-heading">
          <span>Interview notes</span>
          <strong>
            {createdNoteCount} / {visibleExamples.length}
          </strong>
        </div>
        <p className="sp-visually-hidden">
          {createdNoteCount === 0
            ? "Listening for interview details."
            : `${String(createdNoteCount)} of ${String(visibleExamples.length)} current interview notes created.`}
        </p>
        <ol
          className="sp-live-conversation__note-grid"
          key={`note-board-${String(activeBoardIndex)}`}
        >
          {visibleExamples.map(({ noteLabel, noteValue }, index) => {
            const isCreated = index < createdNoteCount;

            return (
              <li data-created={isCreated} key={noteLabel}>
                <div className="sp-live-conversation__note-card-heading">
                  <span className="sp-live-conversation__note-card-index">
                    {String(activeBoardStart + index + 1).padStart(2, "0")}
                  </span>
                  <span
                    aria-hidden="true"
                    className="sp-live-conversation__note-card-status"
                  />
                </div>
                <strong>{noteLabel}</strong>
                <p>{isCreated ? noteValue : "—"}</p>
              </li>
            );
          })}
        </ol>
      </section>
    </figure>
  );
}
