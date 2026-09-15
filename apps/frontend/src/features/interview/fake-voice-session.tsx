"use client";

import type { VoiceClientToolName } from "@screenpilot/contracts/api/voice-token";
import { useEffect, useRef } from "react";

import { INSIGHT_CATEGORY_METADATA } from "@/features/insights/insight-category-metadata";

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
      stability: "tentative",
      text: "Hi.",
    },
  },
  {
    afterMs: 360,
    event: {
      type: "message",
      eventId: 0,
      speaker: "interviewer",
      stability: "tentative",
      text: "Hi. What would you",
    },
  },
  {
    afterMs: 540,
    event: {
      type: "message",
      eventId: 0,
      speaker: "interviewer",
      stability: "tentative",
      text: "Hi. What would you like me to call",
    },
  },
  {
    afterMs: 720,
    event: {
      type: "message",
      eventId: 0,
      speaker: "interviewer",
      stability: "tentative",
      text: "Hi. What would you like me to call you?",
    },
  },
  {
    afterMs: 920,
    event: {
      type: "message",
      eventId: 0,
      speaker: "interviewer",
      stability: "final",
      text: "Hi. What would you like me to call you?",
    },
  },
  {
    afterMs: 1_150,
    event: { type: "mode", mode: "listening" },
  },
  {
    afterMs: 1_350,
    event: {
      type: "message",
      eventId: 1,
      speaker: "candidate",
      stability: "tentative",
      text: "You can",
    },
  },
  {
    afterMs: 1_575,
    event: {
      type: "message",
      eventId: 1,
      speaker: "candidate",
      stability: "tentative",
      text: "You can call me",
    },
  },
  {
    afterMs: 1_800,
    event: {
      type: "message",
      eventId: 1,
      speaker: "candidate",
      stability: "tentative",
      text: "You can call me Sam",
    },
  },
  {
    afterMs: 2_025,
    event: {
      type: "message",
      eventId: 1,
      speaker: "candidate",
      stability: "final",
      text: "You can call me Sam.",
    },
  },
  {
    afterMs: 2_300,
    event: { type: "mode", mode: "speaking" },
  },
  {
    afterMs: 2_500,
    event: {
      type: "message",
      eventId: 2,
      speaker: "interviewer",
      stability: "tentative",
      text: "Thanks, Sam.",
    },
  },
  {
    afterMs: 2_750,
    event: {
      type: "message",
      eventId: 2,
      speaker: "interviewer",
      stability: "tentative",
      text: "Thanks, Sam. Tell me what",
    },
  },
  {
    afterMs: 3_000,
    event: {
      type: "message",
      eventId: 2,
      speaker: "interviewer",
      stability: "tentative",
      text: "Thanks, Sam. Tell me what you would like to focus",
    },
  },
  {
    afterMs: 3_250,
    event: {
      type: "message",
      eventId: 2,
      speaker: "interviewer",
      stability: "tentative",
      text: "Thanks, Sam. Tell me what you would like to focus on today.",
    },
  },
  {
    afterMs: 3_500,
    event: {
      type: "message",
      eventId: 2,
      speaker: "interviewer",
      stability: "final",
      text: "Thanks, Sam. Tell me what you would like to focus on today.",
    },
  },
  {
    afterMs: 3_900,
    event: { type: "mode", mode: "listening" },
  },
] as const satisfies readonly Readonly<{
  afterMs: number;
  event: VoiceSessionEvent;
}>[];

export const FAKE_VOICE_TOOL_TRACE = [
  {
    afterMs: 2_100,
    name: "recordInsight",
    parameters: {
      category: "preferred_name",
      label: INSIGHT_CATEGORY_METADATA.preferred_name.label,
      value: "Sam",
      source: "Candidate",
    },
  },
  {
    afterMs: 2_150,
    name: "markTopic",
    parameters: {
      topicKey: "preferred_name",
      status: "covered",
    },
  },
] as const satisfies readonly Readonly<{
  afterMs: number;
  name: VoiceClientToolName;
  parameters: Record<string, unknown>;
}>[];

export function FakeVoiceSession({
  authorization,
  clientTools,
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
    clientTools,
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
      for (const toolEntry of FAKE_VOICE_TOOL_TRACE) {
        const toolTimerId = window.setTimeout(() => {
          if (endedRef.current) {
            return;
          }
          const clientTool = initialSession.clientTools[toolEntry.name];
          if (!clientTool) {
            initialSession.onEvent({
              type: "error",
              message: "The fake client-tool registration is incomplete.",
            });
            return;
          }
          try {
            void Promise.resolve(clientTool(toolEntry.parameters)).catch(() => {
              initialSession.onEvent({
                type: "error",
                message: "The fake client-tool update failed.",
              });
            });
          } catch {
            initialSession.onEvent({
              type: "error",
              message: "The fake client-tool update failed.",
            });
          }
        }, toolEntry.afterMs);
        traceTimerIdsRef.current.push(toolTimerId);
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
