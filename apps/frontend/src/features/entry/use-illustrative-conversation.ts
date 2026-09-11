"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ConversationPhase = "answer" | "note" | "question";
type MotionPreference = "no-preference" | "reduce" | "unknown";

type IllustrativeConversationExample = Readonly<{
  answer: string;
  question: string;
}>;

const SPOKEN_WORD_DELAY_MS = 200;
const QUESTION_HOLD_MS = 800;
const ANSWER_HOLD_MS = 800;
const NOTE_HOLD_MS = 1_200;
const COMPLETED_BOARD_HOLD_MS = 2_400;
const REDUCED_MOTION_NOTE_HOLD_MS = 1_600;
const REDUCED_MOTION_COMPLETED_BOARD_HOLD_MS = 2_600;

function countWords(value: string) {
  return value.match(/\S+/gu)?.length ?? 0;
}

function revealWords(value: string, visibleWordCount: number) {
  if (visibleWordCount <= 0) {
    return "";
  }

  const words = Array.from(value.matchAll(/\S+/gu));
  const lastVisibleWord = words[Math.min(visibleWordCount, words.length) - 1];
  if (!lastVisibleWord) {
    return value;
  }

  return value.slice(0, lastVisibleWord.index + lastVisibleWord[0].length);
}

export function useIllustrativeConversation(
  examples: readonly IllustrativeConversationExample[],
  examplesPerBoard: number,
) {
  const previewRef = useRef<HTMLElement>(null);
  const previousMotionPreferenceRef = useRef<MotionPreference>("unknown");
  const initialExample = examples[0];
  const [activeExample, setActiveExample] = useState(0);
  const [phase, setPhase] = useState<ConversationPhase>("note");
  const [visibleQuestionWordCount, setVisibleQuestionWordCount] = useState(
    countWords(initialExample?.question ?? ""),
  );
  const [visibleAnswerWordCount, setVisibleAnswerWordCount] = useState(
    countWords(initialExample?.answer ?? ""),
  );
  const [isInView, setIsInView] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isFocusPaused, setIsFocusPaused] = useState(false);
  const [completedExampleCount, setCompletedExampleCount] = useState(0);
  const [motionPreference, setMotionPreference] =
    useState<MotionPreference>("unknown");

  const startExample = useCallback((index: number) => {
    setActiveExample(index);
    setVisibleQuestionWordCount(0);
    setVisibleAnswerWordCount(0);
    setPhase("question");
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      const fallbackPreferenceTimeout = window.setTimeout(() => {
        setMotionPreference("no-preference");
      }, 0);
      return () => {
        window.clearTimeout(fallbackPreferenceTimeout);
      };
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyPreference = () => {
      setMotionPreference(mediaQuery.matches ? "reduce" : "no-preference");
    };

    applyPreference();
    mediaQuery.addEventListener("change", applyPreference);
    return () => {
      mediaQuery.removeEventListener("change", applyPreference);
    };
  }, []);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.18 },
    );
    observer.observe(preview);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const updateVisibility = () => {
      setIsPageVisible(document.visibilityState === "visible");
    };

    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (previousMotionPreferenceRef.current === motionPreference) {
      return;
    }

    previousMotionPreferenceRef.current = motionPreference;
    if (motionPreference === "unknown") {
      return;
    }

    const restartTimeout = window.setTimeout(() => {
      setCompletedExampleCount(0);
      startExample(0);
    }, 0);

    return () => {
      window.clearTimeout(restartTimeout);
    };
  }, [motionPreference, startExample]);

  const isRunning =
    motionPreference !== "unknown" &&
    examples.length > 0 &&
    isInView &&
    isPageVisible &&
    !isFocusPaused;

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const example = examples[activeExample];
    if (!example) {
      return;
    }

    const questionWordCount = countWords(example.question);
    const answerWordCount = countWords(example.answer);
    const completedBoard =
      (activeExample + 1) % Math.max(1, examplesPerBoard) === 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const advanceToNextExample = () => {
      const nextExample = (activeExample + 1) % examples.length;
      if (nextExample === 0) {
        setCompletedExampleCount(0);
      }
      startExample(nextExample);
    };

    if (phase === "question") {
      if (visibleQuestionWordCount < questionWordCount) {
        timeoutId = setTimeout(() => {
          setVisibleQuestionWordCount((wordCount) => wordCount + 1);
        }, SPOKEN_WORD_DELAY_MS);
      } else {
        timeoutId = setTimeout(() => {
          setPhase("answer");
        }, QUESTION_HOLD_MS);
      }
    } else if (phase === "answer") {
      if (visibleAnswerWordCount < answerWordCount) {
        timeoutId = setTimeout(() => {
          setVisibleAnswerWordCount((wordCount) => wordCount + 1);
        }, SPOKEN_WORD_DELAY_MS);
      } else {
        timeoutId = setTimeout(() => {
          setCompletedExampleCount(activeExample + 1);
          setPhase("note");
        }, ANSWER_HOLD_MS);
      }
    } else {
      let noteHoldMs = completedBoard ? COMPLETED_BOARD_HOLD_MS : NOTE_HOLD_MS;
      if (motionPreference === "reduce") {
        noteHoldMs = completedBoard
          ? REDUCED_MOTION_COMPLETED_BOARD_HOLD_MS
          : REDUCED_MOTION_NOTE_HOLD_MS;
      }

      timeoutId = setTimeout(advanceToNextExample, noteHoldMs);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    activeExample,
    examples,
    examplesPerBoard,
    isRunning,
    motionPreference,
    phase,
    startExample,
    visibleAnswerWordCount,
    visibleQuestionWordCount,
  ]);

  const activeConversationExample = examples[activeExample];

  return {
    activeExample,
    completedExampleCount,
    isRunning,
    phase,
    previewRef,
    setIsFocusPaused,
    spokenAnswer: revealWords(
      activeConversationExample?.answer ?? "",
      visibleAnswerWordCount,
    ),
    spokenQuestion: revealWords(
      activeConversationExample?.question ?? "",
      visibleQuestionWordCount,
    ),
  };
}
