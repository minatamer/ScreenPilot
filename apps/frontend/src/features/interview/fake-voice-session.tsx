"use client";

import { useEffect, useRef } from "react";

import type {
  VoiceSessionBridgeProps,
  VoiceSessionEvent,
} from "./voice-session-bridge";

export const FAKE_VOICE_EVENT_TRACE = [
  {
    afterMs: 80,
    event: { type: "mode", mode: "speaking" },
  },
  {
    afterMs: 180,
    event: {
      type: "message",
      eventId: 0,
      speaker: "interviewer",
      stability: "final",
      text: "Hi. What would you like me to call you?",
    },
  },
  {
    afterMs: 260,
    event: { type: "mode", mode: "listening" },
  },
  {
    afterMs: 360,
    event: {
      type: "message",
      eventId: 1,
      speaker: "candidate",
      stability: "tentative",
      text: "You can call me",
    },
  },
  {
    afterMs: 460,
    event: {
      type: "message",
      eventId: 1,
      speaker: "candidate",
      stability: "tentative",
      text: "You can call me Sam",
    },
  },
  {
    afterMs: 560,
    event: {
      type: "message",
      eventId: 1,
      speaker: "candidate",
      stability: "final",
      text: "You can call me Sam.",
    },
  },
  {
    afterMs: 640,
    event: { type: "mode", mode: "speaking" },
  },
  {
    afterMs: 760,
    event: {
      type: "message",
      eventId: 2,
      speaker: "interviewer",
      stability: "final",
      text: "Thanks, Sam. Tell me what you would like to focus on today.",
    },
  },
  {
    afterMs: 840,
    event: { type: "mode", mode: "listening" },
  },
] as const satisfies readonly Readonly<{
  afterMs: number;
  event: VoiceSessionEvent;
}>[];

export function FakeVoiceSession({
  authorization,
  endRequested,
  expectedConversationId,
  onAuthorizationConsumed,
  onEvent,
}: VoiceSessionBridgeProps) {
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const traceTimerIdsRef = useRef<number[]>([]);
  const initialSessionRef = useRef({
    authorization,
    expectedConversationId,
    onAuthorizationConsumed,
    onEvent,
  });

  useEffect(() => {
    const initialSession = initialSessionRef.current;
    const startTimer = window.setTimeout(() => {
      if (startedRef.current || !initialSession.authorization) {
        return;
      }
      startedRef.current = true;
      initialSession.onAuthorizationConsumed();
      if (
        initialSession.expectedConversationId === undefined ||
        initialSession.authorization.conversationId !==
          initialSession.expectedConversationId
      ) {
        initialSession.onEvent({
          type: "error",
          message: "The fake voice-session identifier could not be verified.",
        });
        return;
      }
      initialSession.onEvent({
        type: "connected",
        conversationId: initialSession.expectedConversationId,
      });
      for (const traceEntry of FAKE_VOICE_EVENT_TRACE) {
        const traceTimerId = window.setTimeout(() => {
          if (!endedRef.current) {
            initialSession.onEvent(traceEntry.event);
          }
        }, traceEntry.afterMs);
        traceTimerIdsRef.current.push(traceTimerId);
      }
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      for (const traceTimerId of traceTimerIdsRef.current) {
        window.clearTimeout(traceTimerId);
      }
      traceTimerIdsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!endRequested || endedRef.current || !startedRef.current) {
      return;
    }
    endedRef.current = true;
    onEvent({ type: "connection_status", status: "disconnecting" });
    onEvent({ type: "disconnected", reason: "user" });
  }, [endRequested, onEvent]);

  return null;
}
