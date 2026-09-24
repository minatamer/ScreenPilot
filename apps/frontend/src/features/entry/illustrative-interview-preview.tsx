"use client";

import { useIllustrativeConversation } from "./use-illustrative-conversation";

const conversationExamples = [
  {
    answer: ["Around ", "25k–30k", "."],
    noteLabel: "Salary expectation",
    noteValue: "25k–30k",
    question: ["What are your ", "salary expectations?", ""],
  },
  {
    answer: [
      "I spent ",
      "three years helping customers",
      " solve account issues.",
    ],
    noteLabel: "Relevant experience",
    noteValue: "3 years in customer support",
    question: ["What ", "experience", " would you like to highlight?"],
  },
  {
    answer: ["I could start in ", "about four weeks", "."],
    noteLabel: "Availability",
    noteValue: "About 4 weeks",
    question: ["When would you be ", "available to start?", ""],
  },
  {
    answer: [
      "I enjoy ",
      "customer-facing work and solving practical problems",
      ".",
    ],
    noteLabel: "Role preference",
    noteValue: "Customer-facing problem solving",
    question: ["What kind of ", "role", " would you like to explore?"],
  },
  {
    answer: ["", "Remote or hybrid", " work both suit me."],
    noteLabel: "Work setup",
    noteValue: "Remote or hybrid",
    question: ["Which ", "work setup", " suits you best?"],
  },
  {
    answer: [
      "I want to grow my ",
      "product knowledge and leadership skills",
      ".",
    ],
    noteLabel: "Growth goal",
    noteValue: "Product knowledge and leadership",
    question: ["What would you like to ", "learn", " in your next role?"],
  },
] as const;

const EXAMPLES_PER_BOARD = 3;
const conversationLines = conversationExamples.map(({ answer, question }) => ({
  answer: answer.join(""),
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

function renderHighlightedLine(
  lineSegments: readonly [string, string, string],
  spokenLine: string,
  keyPrefix: string,
  highlighted: boolean,
) {
  let segmentStart = 0;

  return lineSegments.map((segment, index) => {
    const visibleSegment = spokenLine.slice(
      segmentStart,
      segmentStart + segment.length,
    );
    segmentStart += segment.length;

    if (!visibleSegment) {
      return null;
    }

    const segmentKey = `${keyPrefix}-${String(index)}`;

    return index === 1 ? (
      <mark data-highlighted={highlighted} key={segmentKey}>
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
  candidateSpeaking,
  pilotSpeaking,
}: Readonly<{ candidateSpeaking: boolean; pilotSpeaking: boolean }>) {
  return (
    <svg
      aria-label="Illustration of a candidate behind a laptop during a Pilot conversation"
      className="sp-live-conversation__person"
      data-candidate-speaking={candidateSpeaking}
      data-pilot-speaking={pilotSpeaking}
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
        fill="#B87356"
      />
      <circle cx="177" cy="108" fill="#D49A79" r="50" />
      <circle cx="128" cy="111" fill="#D49A79" r="9" />
      <circle cx="226" cy="111" fill="#D49A79" r="9" />
      <path
        d="M127 105c1-39 20-61 55-61 34 0 56 26 54 65-21-1-40-11-55-29-13 15-31 24-54 27v-2Z"
        fill="#18243A"
      />
      <path
        d="M147 174c8 8 18 12 31 12 12 0 23-4 32-12"
        fill="none"
        opacity=".32"
        stroke="#CC493F"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <path
        d="M35 265h290"
        fill="none"
        stroke="#FAFAF8"
        strokeLinecap="round"
        strokeWidth="5"
      />
      <g aria-hidden="true" className="sp-live-conversation__laptop">
        <path
          d="M106 252h148l10 7H96l10-7Z"
          fill="#8592A5"
          stroke="#C9D1DE"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          className="sp-live-conversation__laptop-lid"
          d="M114 183h132c3 0 5 2 6 5l12 69H96l12-69c1-3 3-5 6-5Z"
          fill="#293750"
          stroke="#C9D1DE"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        <path
          d="M116 189h128"
          fill="none"
          opacity=".12"
          stroke="#FFFFFF"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <g className="sp-live-conversation__laptop-pilot">
          <circle
            className="sp-live-conversation__laptop-pilot-ring sp-live-conversation__laptop-pilot-ring--outer"
            cx="180"
            cy="218"
            fill="none"
            r="17"
            stroke="#F26B5B"
            strokeWidth="2"
          />
          <circle
            className="sp-live-conversation__laptop-pilot-ring sp-live-conversation__laptop-pilot-ring--inner"
            cx="180"
            cy="218"
            fill="none"
            r="12"
            stroke="#FCA39A"
            strokeWidth="2"
          />
          <g transform="translate(164 202)">
            <g className="sp-live-conversation__laptop-pilot-mark">
              <path d="M7 9.5 25 5l-5.2 20-4.4-7.2L7 9.5Z" fill="#F26B5B" />
              <path d="m11 11 8.5-2.2-5.8 6.3L11 11Z" fill="#FDE8E4" />
            </g>
          </g>
        </g>
      </g>
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
          <CandidateAtLaptopIllustration
            candidateSpeaking={candidateIsSpeaking}
            pilotSpeaking={pilotIsSpeaking}
          />
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
              {renderHighlightedLine(
                example.question,
                spokenQuestion,
                "question",
                phase === "highlight" || phase === "note",
              )}
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
            <p aria-label={example.answer.join("")}>
              {renderHighlightedLine(
                example.answer,
                spokenAnswer,
                "answer",
                phase === "highlight" || phase === "note",
              )}
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
