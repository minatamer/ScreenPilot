"use client";

import type { VoiceMetadata } from "@screenpilot/contracts/api/voice-token";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  createVoiceEventNormalizerState,
  normalizeVoiceEvent,
  type LiveCaption,
} from "./normalize-voice-event";
import {
  elapsedInterviewSeconds,
  INTERVIEW_HARD_STOP_MS,
  remainingInterviewMilliseconds,
} from "./interview-timer";
import type { VoiceSessionEvent } from "./voice-session-bridge";

export type VoiceSessionPhase =
  | "idle"
  | "requesting_token"
  | "connecting"
  | "listening"
  | "speaking"
  | "reconnecting"
  | "ending"
  | "ended"
  | "failed";

type VoiceSessionViewState = Readonly<{
  caption: LiveCaption | null;
  connectedAt: number | null;
  isMuted: boolean;
  phase: VoiceSessionPhase;
}>;

type VoiceSessionViewEvent =
  | Readonly<{ type: "CONNECTING" }>
  | Readonly<{ type: "CONNECTED"; connectedAt: number }>
  | Readonly<{ type: "MODE"; mode: "listening" | "speaking" }>
  | Readonly<{ type: "RECONNECTING" }>
  | Readonly<{ type: "RECONNECTED" }>
  | Readonly<{ type: "CAPTION"; caption: LiveCaption }>
  | Readonly<{ type: "TOGGLE_MUTED" }>
  | Readonly<{ type: "ENDING" }>
  | Readonly<{ type: "ENDED" }>
  | Readonly<{ type: "FAILED" }>;

function createInitialViewState(): VoiceSessionViewState {
  return {
    caption: null,
    connectedAt: null,
    isMuted: false,
    phase: "requesting_token",
  };
}

function voiceSessionViewReducer(
  state: VoiceSessionViewState,
  event: VoiceSessionViewEvent,
): VoiceSessionViewState {
  if (state.phase === "ended" || state.phase === "failed") {
    return state;
  }
  switch (event.type) {
    case "CONNECTING":
      return state.phase === "idle" || state.phase === "requesting_token"
        ? { ...state, phase: "connecting" }
        : state;
    case "CONNECTED":
      if (
        state.connectedAt !== null ||
        (state.phase !== "requesting_token" && state.phase !== "connecting")
      ) {
        return state;
      }
      return {
        ...state,
        connectedAt: event.connectedAt,
        phase: "listening",
      };
    case "MODE":
      if (state.phase !== "listening" && state.phase !== "speaking") {
        return state;
      }
      return state.phase === event.mode
        ? state
        : { ...state, phase: event.mode };
    case "RECONNECTING":
      return state.phase === "listening" || state.phase === "speaking"
        ? { ...state, phase: "reconnecting" }
        : state;
    case "RECONNECTED":
      return state.phase === "reconnecting"
        ? { ...state, phase: "listening" }
        : state;
    case "CAPTION":
      return state.connectedAt === null
        ? state
        : { ...state, caption: event.caption };
    case "TOGGLE_MUTED":
      return state.phase === "listening" ||
        state.phase === "speaking" ||
        state.phase === "reconnecting"
        ? { ...state, isMuted: !state.isMuted }
        : state;
    case "ENDING":
      return state.phase === "listening" ||
        state.phase === "speaking" ||
        state.phase === "reconnecting"
        ? { ...state, phase: "ending" }
        : state;
    case "ENDED":
      return state.phase === "ending" ? { ...state, phase: "ended" } : state;
    case "FAILED":
      return { ...state, phase: "failed" };
  }
}

type UseVoiceSessionOptions = Readonly<{
  endFallbackMs?: number;
  hardStopMs?: number;
  now?: () => number;
  onConnected: (voice: VoiceMetadata) => void;
  onConnectionFailure: (message: string) => void;
  onEnded: (voice: VoiceMetadata) => void;
  onEnding: () => void;
  onFinalTranscriptTurn: (turn: TranscriptTurn) => void;
  onInterrupted: () => void;
}>;

const DEFAULT_END_FALLBACK_MS = 2_000;

export function useVoiceSession(options: UseVoiceSessionOptions) {
  const [state, dispatch] = useReducer(
    voiceSessionViewReducer,
    undefined,
    createInitialViewState,
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [endRequested, setEndRequested] = useState(false);
  const callbacksRef = useRef(options);
  const normalizationStateRef = useRef(createVoiceEventNormalizerState());
  const voiceRef = useRef<VoiceMetadata | null>(null);
  const connectedRef = useRef(false);
  const endingRequestedRef = useRef(false);
  const endingReasonRef = useRef("Interview ended by the candidate.");
  const completedRef = useRef(false);

  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

  const currentTime = useCallback(
    () => callbacksRef.current.now?.() ?? Date.now(),
    [],
  );

  const completeEnd = useCallback(() => {
    if (completedRef.current || !voiceRef.current) {
      return;
    }
    completedRef.current = true;
    dispatch({ type: "ENDED" });
    callbacksRef.current.onEnded({
      ...voiceRef.current,
      endedAt: new Date(currentTime()).toISOString(),
      endReason: endingReasonRef.current,
      status: "ended",
    });
  }, [currentTime]);

  const requestEnd = useCallback(
    (reason = "Interview ended by the candidate.") => {
      if (
        endingRequestedRef.current ||
        completedRef.current ||
        !connectedRef.current
      ) {
        return;
      }
      endingRequestedRef.current = true;
      endingReasonRef.current = reason;
      dispatch({ type: "ENDING" });
      setEndRequested(true);
      callbacksRef.current.onEnding();
    },
    [],
  );

  const handleUnexpectedTerminalEvent = useCallback(
    (message: string) => {
      if (completedRef.current) {
        return;
      }
      if (endingRequestedRef.current) {
        completeEnd();
        return;
      }
      completedRef.current = true;
      dispatch({ type: "FAILED" });
      if (connectedRef.current) {
        callbacksRef.current.onInterrupted();
      } else {
        callbacksRef.current.onConnectionFailure(message);
      }
    },
    [completeEnd],
  );

  const onSessionEvent = useCallback(
    (providerEvent: VoiceSessionEvent) => {
      if (completedRef.current) {
        return;
      }
      if (
        !connectedRef.current &&
        (providerEvent.type === "message" ||
          providerEvent.type === "mode" ||
          providerEvent.type === "interruption" ||
          (providerEvent.type === "connection_status" &&
            providerEvent.status !== "connecting"))
      ) {
        return;
      }
      const eventTime = currentTime();
      const normalized = normalizeVoiceEvent(
        providerEvent,
        normalizationStateRef.current,
        new Date(eventTime).toISOString(),
      );
      normalizationStateRef.current = normalized.state;
      const event = normalized.event;
      if (!event) {
        return;
      }
      if (event.type === "message") {
        if (event.shouldDisplayCaption) {
          dispatch({ type: "CAPTION", caption: event.caption });
        }
        if (event.transcriptTurn) {
          callbacksRef.current.onFinalTranscriptTurn(event.transcriptTurn);
        }
      }

      switch (event.type) {
        case "connected": {
          if (connectedRef.current) {
            return;
          }
          connectedRef.current = true;
          const voice: VoiceMetadata = {
            conversationId: event.conversationId,
            startedAt: new Date(eventTime).toISOString(),
            status: "connected",
          };
          voiceRef.current = voice;
          dispatch({ type: "CONNECTED", connectedAt: eventTime });
          callbacksRef.current.onConnected(voice);
          return;
        }
        case "connection_status":
          if (event.status === "connecting") {
            dispatch({ type: "CONNECTING" });
          } else if (event.status === "reconnecting") {
            dispatch({ type: "RECONNECTING" });
          } else if (event.status === "reconnected") {
            dispatch({ type: "RECONNECTED" });
          }
          return;
        case "mode":
          dispatch({ type: "MODE", mode: event.mode });
          return;
        case "message":
          return;
        case "interruption":
          dispatch({ type: "MODE", mode: "listening" });
          return;
        case "error":
          handleUnexpectedTerminalEvent(
            event.message.trim()
              ? event.message
              : "The voice provider rejected the connection.",
          );
          return;
        case "disconnected":
          if (
            connectedRef.current &&
            (event.reason === "agent" || event.reason === "user")
          ) {
            if (!endingRequestedRef.current) {
              requestEnd(
                event.reason === "agent"
                  ? "Interview completed by the interviewer."
                  : "Interview ended by the candidate.",
              );
            }
            completeEnd();
            return;
          }
          handleUnexpectedTerminalEvent(
            event.message?.trim()
              ? event.message
              : "The voice session disconnected unexpectedly.",
          );
          return;
      }
    },
    [completeEnd, currentTime, handleUnexpectedTerminalEvent, requestEnd],
  );

  const markConnecting = useCallback(() => {
    dispatch({ type: "CONNECTING" });
  }, []);

  const toggleMuted = useCallback(() => {
    if (!connectedRef.current || endingRequestedRef.current) {
      return;
    }
    dispatch({ type: "TOGGLE_MUTED" });
  }, []);

  useEffect(() => {
    if (state.connectedAt === null || completedRef.current) {
      return;
    }
    const updateElapsed = () => {
      setElapsedSeconds(
        elapsedInterviewSeconds(
          state.connectedAt ?? currentTime(),
          currentTime(),
        ),
      );
    };
    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 1_000);
    const timeoutId = window.setTimeout(
      () => {
        requestEnd("The eight-minute interview limit was reached.");
      },
      remainingInterviewMilliseconds(
        state.connectedAt,
        currentTime(),
        callbacksRef.current.hardStopMs ?? INTERVIEW_HARD_STOP_MS,
      ),
    );
    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [currentTime, requestEnd, state.connectedAt]);

  useEffect(() => {
    if (!endRequested) {
      return;
    }
    const fallbackId = window.setTimeout(
      completeEnd,
      callbacksRef.current.endFallbackMs ?? DEFAULT_END_FALLBACK_MS,
    );
    return () => {
      window.clearTimeout(fallbackId);
    };
  }, [completeEnd, endRequested]);

  return {
    caption: state.caption,
    elapsedSeconds,
    endRequested,
    isMuted: state.isMuted,
    markConnecting,
    onSessionEvent,
    phase: state.phase,
    requestEnd,
    toggleMuted,
  } as const;
}
