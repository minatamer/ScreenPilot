"use client";

import type { VoiceMetadata } from "@screenpilot/contracts/api/voice-token";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";
import { VOICE_LATENCY_REVIEWING_THRESHOLD_MS } from "@screenpilot/contracts/interview/voice-performance-policy";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  createFillerPolicyState,
  observeLatencyFiller,
  type FillerPolicyState,
} from "./latency-filler-policy";
import {
  createVoiceEventNormalizerState,
  normalizeVoiceEvent,
  type LiveCaption,
} from "./normalize-voice-event";
import { INTERVIEW_HARD_STOP_MS } from "./interview-timer";
import type { VoiceSessionEvent } from "./voice-session-bridge";
import type { VoicePerformanceTracker } from "./voice-performance";

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

export type VoiceLatencyStage = "idle" | "visual" | "reviewing";

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
  hardStopAtMs?: number;
  now?: () => number;
  onConnected: (voice: VoiceMetadata) => void;
  onConnectionFailure: (message: string) => void;
  onEnded: (voice: VoiceMetadata) => void;
  onEnding: () => void;
  onFinalTranscriptTurn: (turn: TranscriptTurn) => void;
  onInterrupted: () => void;
  performanceTracker?: VoicePerformanceTracker | undefined;
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
  const [latencyStage, setLatencyStage] = useState<VoiceLatencyStage>("idle");
  const [fillerPolicy, setFillerPolicy] = useState<FillerPolicyState>(
    createFillerPolicyState,
  );
  const callbacksRef = useRef(options);
  const normalizationStateRef = useRef(createVoiceEventNormalizerState());
  const voiceRef = useRef<VoiceMetadata | null>(null);
  const connectedRef = useRef(false);
  const endingRequestedRef = useRef(false);
  const endingReasonRef = useRef("Interview ended by the candidate.");
  const completedRef = useRef(false);
  const candidateTurnRef = useRef(0);
  const candidateSpeechActiveRef = useRef(false);
  const fillerPolicyRef = useRef(createFillerPolicyState());
  const latencyTimerRef = useRef<number | null>(null);
  const latencySequenceRef = useRef(0);
  const pendingTtfaRef = useRef<{
    candidateFinalSeen: boolean;
    candidateTurn: number;
    firstAudioAtMs: number | null;
    measurementId: string | null;
    sequence: number;
    speechEndedAtMs: number | null;
    substantiveMessageSeen: boolean;
    visualStartedAtMs: number;
  } | null>(null);
  const pendingInterruptionRef = useRef<string | null>(null);
  const providerModeRef = useRef<"listening" | "speaking" | null>(null);
  const interruptionCompletedBeforeNotificationRef = useRef(false);
  const unpairedAudioStopAtRef = useRef<number | null>(null);

  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

  const currentTime = useCallback(
    () => callbacksRef.current.now?.() ?? Date.now(),
    [],
  );

  const clearLatencyTimer = useCallback(() => {
    if (latencyTimerRef.current !== null) {
      window.clearTimeout(latencyTimerRef.current);
      latencyTimerRef.current = null;
    }
  }, []);

  const cancelPendingMeasurements = useCallback(() => {
    clearLatencyTimer();
    const tracker = callbacksRef.current.performanceTracker;
    const pendingTtfa = pendingTtfaRef.current;
    if (pendingTtfa?.measurementId) {
      tracker?.cancel(pendingTtfa.measurementId);
    }
    if (pendingInterruptionRef.current) {
      tracker?.cancel(pendingInterruptionRef.current);
    }
    pendingTtfaRef.current = null;
    pendingInterruptionRef.current = null;
    interruptionCompletedBeforeNotificationRef.current = false;
    unpairedAudioStopAtRef.current = null;
  }, [clearLatencyTimer]);

  const completeTtfa = useCallback(
    (completedAtMs: number) => {
      const pending = pendingTtfaRef.current;
      if (!pending) {
        return;
      }
      clearLatencyTimer();
      if (pending.measurementId) {
        callbacksRef.current.performanceTracker?.complete(
          pending.measurementId,
          completedAtMs,
        );
      }
      pendingTtfaRef.current = null;
      setLatencyStage("idle");
    },
    [clearLatencyTimer],
  );

  const beginCandidateResponseWait = useCallback(
    (input: {
      candidateFinalSeen: boolean;
      candidateTurn: number;
      speechEndedAtMs: number | null;
      visualStartedAtMs: number;
    }) => {
      const tracker = callbacksRef.current.performanceTracker;
      const previous = pendingTtfaRef.current;
      if (previous?.measurementId) {
        tracker?.cancel(previous.measurementId);
      }
      clearLatencyTimer();
      latencySequenceRef.current += 1;
      const sequence = latencySequenceRef.current;
      pendingTtfaRef.current = {
        candidateFinalSeen: input.candidateFinalSeen,
        candidateTurn: input.candidateTurn,
        firstAudioAtMs: null,
        measurementId:
          input.speechEndedAtMs === null
            ? null
            : (tracker?.begin("ttfa", input.speechEndedAtMs) ?? null),
        sequence,
        speechEndedAtMs: input.speechEndedAtMs,
        substantiveMessageSeen: false,
        visualStartedAtMs: input.visualStartedAtMs,
      };
      setLatencyStage("visual");
      latencyTimerRef.current = window.setTimeout(() => {
        if (pendingTtfaRef.current?.sequence === sequence) {
          setLatencyStage("reviewing");
        }
      }, VOICE_LATENCY_REVIEWING_THRESHOLD_MS);
    },
    [clearLatencyTimer],
  );

  const completeEnd = useCallback(() => {
    if (completedRef.current || !voiceRef.current) {
      return;
    }
    completedRef.current = true;
    cancelPendingMeasurements();
    setLatencyStage("idle");
    dispatch({ type: "ENDED" });
    callbacksRef.current.onEnded({
      ...voiceRef.current,
      endedAt: new Date(currentTime()).toISOString(),
      endReason: endingReasonRef.current,
      status: "ended",
    });
  }, [cancelPendingMeasurements, currentTime]);

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
      cancelPendingMeasurements();
      setLatencyStage("idle");
      dispatch({ type: "ENDING" });
      setEndRequested(true);
      callbacksRef.current.onEnding();
    },
    [cancelPendingMeasurements],
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
      cancelPendingMeasurements();
      setLatencyStage("idle");
      dispatch({ type: "FAILED" });
      if (connectedRef.current) {
        callbacksRef.current.onInterrupted();
      } else {
        callbacksRef.current.onConnectionFailure(message);
      }
    },
    [cancelPendingMeasurements, completeEnd],
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
          providerEvent.type === "candidate_speech_activity" ||
          providerEvent.type === "agent_audio_started" ||
          providerEvent.type === "latency_filler" ||
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
          if (event.speaker === "candidate") {
            candidateTurnRef.current += 1;
            unpairedAudioStopAtRef.current = null;
            const pending = pendingTtfaRef.current;
            if (pending?.candidateTurn === candidateTurnRef.current) {
              pending.candidateFinalSeen = true;
            } else {
              beginCandidateResponseWait({
                candidateFinalSeen: true,
                candidateTurn: candidateTurnRef.current,
                speechEndedAtMs: null,
                visualStartedAtMs: eventTime,
              });
            }
          } else {
            const pending = pendingTtfaRef.current;
            if (pending) {
              pending.substantiveMessageSeen = true;
              if (pending.firstAudioAtMs !== null) {
                completeTtfa(pending.firstAudioAtMs);
              }
            }
          }
        }
      }

      switch (event.type) {
        case "connected": {
          if (connectedRef.current) {
            return;
          }
          connectedRef.current = true;
          const hardStopAtMs = callbacksRef.current.hardStopAtMs;
          const startedAtMs =
            hardStopAtMs !== undefined && Number.isFinite(hardStopAtMs)
              ? hardStopAtMs - INTERVIEW_HARD_STOP_MS
              : eventTime;
          const voice: VoiceMetadata = {
            conversationId: event.conversationId,
            startedAt: new Date(startedAtMs).toISOString(),
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
          if (event.mode === "speaking") {
            providerModeRef.current = "speaking";
            unpairedAudioStopAtRef.current = null;
            interruptionCompletedBeforeNotificationRef.current = false;
          } else {
            const stoppedAgentAudio = providerModeRef.current === "speaking";
            providerModeRef.current = "listening";
            if (stoppedAgentAudio && pendingInterruptionRef.current) {
              callbacksRef.current.performanceTracker?.complete(
                pendingInterruptionRef.current,
                eventTime,
              );
              pendingInterruptionRef.current = null;
              interruptionCompletedBeforeNotificationRef.current = true;
            } else if (stoppedAgentAudio) {
              unpairedAudioStopAtRef.current = eventTime;
            }
          }
          dispatch({ type: "MODE", mode: event.mode });
          return;
        case "candidate_speech_activity": {
          if (event.active === candidateSpeechActiveRef.current) {
            return;
          }
          candidateSpeechActiveRef.current = event.active;
          if (event.active) {
            const pending = pendingTtfaRef.current;
            if (pending && !pending.candidateFinalSeen) {
              if (pending.measurementId) {
                callbacksRef.current.performanceTracker?.cancel(
                  pending.measurementId,
                );
              }
              pendingTtfaRef.current = null;
              clearLatencyTimer();
              setLatencyStage("idle");
            }
            if (
              providerModeRef.current === "speaking" &&
              !pendingInterruptionRef.current
            ) {
              pendingInterruptionRef.current =
                callbacksRef.current.performanceTracker?.begin(
                  "interruption_to_audio_stop",
                  eventTime,
                ) ?? null;
            }
            return;
          }
          beginCandidateResponseWait({
            candidateFinalSeen: false,
            candidateTurn: candidateTurnRef.current + 1,
            speechEndedAtMs: eventTime,
            visualStartedAtMs: eventTime,
          });
          return;
        }
        case "agent_audio_started": {
          const pending = pendingTtfaRef.current;
          if (!pending) {
            return;
          }
          if (pending.substantiveMessageSeen) {
            completeTtfa(eventTime);
          } else {
            pending.firstAudioAtMs ??= eventTime;
          }
          return;
        }
        case "latency_filler": {
          const pending = pendingTtfaRef.current;
          const speechEndedAtMs = pending?.speechEndedAtMs ?? null;
          if (pending) {
            pending.firstAudioAtMs = null;
          }
          const nextPolicy = observeLatencyFiller(
            fillerPolicyRef.current,
            pending?.candidateTurn ?? candidateTurnRef.current,
            speechEndedAtMs === null ? null : eventTime - speechEndedAtMs,
          );
          fillerPolicyRef.current = nextPolicy;
          setFillerPolicy(nextPolicy);
          return;
        }
        case "message":
          return;
        case "interruption": {
          if (interruptionCompletedBeforeNotificationRef.current) {
            interruptionCompletedBeforeNotificationRef.current = false;
            dispatch({ type: "MODE", mode: "listening" });
            return;
          }
          pendingInterruptionRef.current ??=
            callbacksRef.current.performanceTracker?.begin(
              "interruption_to_audio_stop",
              eventTime,
            ) ?? null;
          if (
            pendingInterruptionRef.current &&
            unpairedAudioStopAtRef.current !== null
          ) {
            callbacksRef.current.performanceTracker?.complete(
              pendingInterruptionRef.current,
              eventTime,
            );
            pendingInterruptionRef.current = null;
            unpairedAudioStopAtRef.current = null;
          }
          dispatch({ type: "MODE", mode: "listening" });
          return;
        }
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
    [
      beginCandidateResponseWait,
      clearLatencyTimer,
      completeEnd,
      completeTtfa,
      currentTime,
      handleUnexpectedTerminalEvent,
      requestEnd,
    ],
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
    const connectedAt = state.connectedAt;
    const configuredHardStopAtMs = callbacksRef.current.hardStopAtMs;
    const hardStopAtMs =
      configuredHardStopAtMs !== undefined &&
      Number.isFinite(configuredHardStopAtMs)
        ? configuredHardStopAtMs
        : connectedAt + INTERVIEW_HARD_STOP_MS;
    const sessionStartedAtMs = hardStopAtMs - INTERVIEW_HARD_STOP_MS;
    const updateElapsed = () => {
      setElapsedSeconds(
        Math.min(
          INTERVIEW_HARD_STOP_MS / 1_000,
          Math.floor(Math.max(0, currentTime() - sessionStartedAtMs) / 1_000),
        ),
      );
    };
    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 1_000);
    const timeoutId = window.setTimeout(
      () => {
        requestEnd("The eight-minute interview limit was reached.");
      },
      Math.max(0, hardStopAtMs - currentTime()),
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

  useEffect(() => cancelPendingMeasurements, [cancelPendingMeasurements]);

  return {
    caption: state.caption,
    elapsedSeconds,
    endRequested,
    isMuted: state.isMuted,
    fillerPolicy,
    latencyStage,
    markConnecting,
    onSessionEvent,
    phase: state.phase,
    requestEnd,
    toggleMuted,
  } as const;
}
