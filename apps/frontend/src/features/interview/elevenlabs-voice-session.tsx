"use client";

import {
  ConversationProvider,
  useConversationControls,
  type DisconnectionDetails,
  type HookCallbacks,
  type Mode,
  type Status,
} from "@elevenlabs/react";
import { VOICE_VAD_SPEECH_PROBABILITY_THRESHOLD } from "@screenpilot/contracts/interview/voice-performance-policy";
import { useCallback, useEffect, useRef } from "react";

import { isStaticLatencyFiller } from "./latency-filler-policy";
import {
  MAX_LIVE_CAPTION_CHARACTERS,
  MAX_NORMALIZED_FINAL_EVENTS,
} from "./normalize-voice-event";
import type { VoiceSessionBridgeProps } from "./voice-session-bridge";

type MessagePayload = Parameters<NonNullable<HookCallbacks["onMessage"]>>[0];
type AgentChatResponsePartPayload = Parameters<
  NonNullable<HookCallbacks["onAgentChatResponsePart"]>
>[0];

function retainBoundedEventId(eventIds: Set<number>, eventId: number) {
  if (eventIds.has(eventId)) {
    return;
  }
  if (eventIds.size >= MAX_NORMALIZED_FINAL_EVENTS) {
    const oldestEventId = eventIds.values().next().value;
    if (oldestEventId !== undefined) {
      eventIds.delete(oldestEventId);
    }
  }
  eventIds.add(eventId);
}

function VoiceSessionStarter({
  authorization,
  dynamicVariables,
  endRequested,
  onAuthorizationConsumed,
  onEvent,
  terminationRef,
}: Pick<
  VoiceSessionBridgeProps,
  | "authorization"
  | "dynamicVariables"
  | "endRequested"
  | "onAuthorizationConsumed"
  | "onEvent"
> & {
  terminationRef: { current: (() => void) | null };
}) {
  const { endSession, startSession } = useConversationControls();
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const cleanupTimerRef = useRef<number | null>(null);
  const endSessionOnce = useCallback(() => {
    if (!startedRef.current || endedRef.current) {
      return;
    }
    endedRef.current = true;
    endSession();
  }, [endSession]);
  const initialSessionRef = useRef({
    authorization,
    dynamicVariables,
    endSessionOnce,
    onAuthorizationConsumed,
    onEvent,
    startSession,
  });

  useEffect(() => {
    terminationRef.current = endSessionOnce;
    return () => {
      if (terminationRef.current === endSessionOnce) {
        terminationRef.current = null;
      }
    };
  }, [endSessionOnce, terminationRef]);

  useEffect(() => {
    if (cleanupTimerRef.current !== null) {
      window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
    const initialSession = initialSessionRef.current;
    let startTimer: number | undefined;
    if (initialSession.authorization && !startedRef.current) {
      const initialAuthorization = initialSession.authorization;
      startTimer = window.setTimeout(() => {
        if (startedRef.current) {
          return;
        }
        startedRef.current = true;
        try {
          initialSession.startSession({
            connectionType: "webrtc",
            conversationToken: initialAuthorization.conversationToken,
            dynamicVariables: initialSession.dynamicVariables,
          });
          initialSession.onAuthorizationConsumed();
        } catch {
          initialSession.onAuthorizationConsumed();
          initialSession.endSessionOnce();
          initialSession.onEvent({
            type: "error",
            message: "The voice session could not start.",
          });
        }
      }, 0);
    }

    return () => {
      if (startTimer !== undefined) {
        window.clearTimeout(startTimer);
      }
      cleanupTimerRef.current = window.setTimeout(() => {
        cleanupTimerRef.current = null;
        initialSession.endSessionOnce();
      }, 0);
    };
  }, []);

  useEffect(() => {
    if (endRequested) {
      endSessionOnce();
    }
  }, [endRequested, endSessionOnce]);

  return null;
}

export function ElevenLabsVoiceSession({
  authorization,
  clientTools,
  dynamicVariables,
  endRequested,
  expectedConversationId,
  isMuted,
  onAuthorizationConsumed,
  onEvent,
}: VoiceSessionBridgeProps) {
  const connectedRef = useRef(false);
  const failedRef = useRef(false);
  const audioStartedRef = useRef(false);
  const candidateSpeechActiveRef = useRef(false);
  const terminationRef = useRef<(() => void) | null>(null);
  const partialAgentMessagesRef = useRef(new Map<number, string>());
  const finalizedAgentMessageIdsRef = useRef(new Set<number>());

  const handleConnect = useCallback(
    ({ conversationId }: { conversationId: string }) => {
      if (failedRef.current || connectedRef.current) {
        return;
      }
      if (
        expectedConversationId !== undefined &&
        conversationId !== expectedConversationId
      ) {
        failedRef.current = true;
        terminationRef.current?.();
        onEvent({
          type: "error",
          message: "The voice-session identifier could not be verified.",
        });
        return;
      }
      connectedRef.current = true;
      onEvent({ type: "connected", conversationId });
    },
    [expectedConversationId, onEvent],
  );
  const handleDisconnect = useCallback(
    (details: DisconnectionDetails) => {
      if (failedRef.current || details.reason === "user") {
        if (!failedRef.current && details.reason === "user") {
          onEvent({ type: "disconnected", reason: "user" });
        }
        return;
      }
      const message =
        details.reason === "error"
          ? details.message
          : "The voice provider ended the session.";
      onEvent({ type: "disconnected", reason: details.reason, message });
    },
    [onEvent],
  );
  const handleError = useCallback(
    (message: string) => {
      if (failedRef.current) {
        return;
      }
      failedRef.current = true;
      terminationRef.current?.();
      onEvent({
        type: "error",
        message: message || "The voice provider rejected the connection.",
      });
    },
    [onEvent],
  );
  const handleMessage = useCallback(
    (message: MessagePayload) => {
      // The installed conversational SDK exposes completed turns through its
      // typed onMessage callback and has no typed interim-transcript callback.
      // Do not inspect the untyped debug/incoming-event payloads for captions.
      if (message.role !== "user" && isStaticLatencyFiller(message.message)) {
        audioStartedRef.current = false;
        onEvent({ type: "latency_filler" });
        return;
      }
      if (message.role === "agent" && message.event_id !== undefined) {
        if (finalizedAgentMessageIdsRef.current.has(message.event_id)) {
          return;
        }
        partialAgentMessagesRef.current.delete(message.event_id);
        retainBoundedEventId(
          finalizedAgentMessageIdsRef.current,
          message.event_id,
        );
      }
      onEvent({
        type: "message",
        ...(message.event_id === undefined
          ? {}
          : { eventId: message.event_id }),
        speaker: message.role === "user" ? "candidate" : "interviewer",
        stability: "final",
        text: message.message,
      });
    },
    [onEvent],
  );
  const handleAgentChatResponsePart = useCallback(
    (part: AgentChatResponsePartPayload) => {
      const { event_id: eventId, text, type } = part;
      if (type === "start") {
        finalizedAgentMessageIdsRef.current.delete(eventId);
        if (
          !partialAgentMessagesRef.current.has(eventId) &&
          partialAgentMessagesRef.current.size >= MAX_NORMALIZED_FINAL_EVENTS
        ) {
          const oldestEventId = partialAgentMessagesRef.current
            .keys()
            .next().value;
          if (oldestEventId !== undefined) {
            partialAgentMessagesRef.current.delete(oldestEventId);
          }
        }
        partialAgentMessagesRef.current.set(eventId, "");
        return;
      }
      if (finalizedAgentMessageIdsRef.current.has(eventId)) {
        return;
      }
      const currentText = partialAgentMessagesRef.current.get(eventId) ?? "";
      if (type === "delta") {
        const accumulatedText = `${currentText}${text}`.slice(
          0,
          MAX_LIVE_CAPTION_CHARACTERS,
        );
        partialAgentMessagesRef.current.set(eventId, accumulatedText);
        if (accumulatedText.trim()) {
          onEvent({
            type: "message",
            eventId,
            speaker: "interviewer",
            stability: "tentative",
            text: accumulatedText,
          });
        }
        return;
      }
      partialAgentMessagesRef.current.delete(eventId);
      if (!currentText.trim()) {
        return;
      }
      retainBoundedEventId(finalizedAgentMessageIdsRef.current, eventId);
      if (isStaticLatencyFiller(currentText)) {
        audioStartedRef.current = false;
        onEvent({ type: "latency_filler" });
        return;
      }
      onEvent({
        type: "message",
        eventId,
        speaker: "interviewer",
        stability: "final",
        text: currentText,
      });
    },
    [onEvent],
  );
  const handleModeChange = useCallback(
    ({ mode }: { mode: Mode }) => {
      if (mode === "listening") {
        audioStartedRef.current = false;
      }
      onEvent({ type: "mode", mode });
    },
    [onEvent],
  );
  const handleAudio = useCallback(() => {
    if (audioStartedRef.current) {
      return;
    }
    audioStartedRef.current = true;
    onEvent({ type: "agent_audio_started" });
  }, [onEvent]);
  const handleVadScore = useCallback(
    ({ vadScore }: { vadScore: number }) => {
      if (!Number.isFinite(vadScore)) {
        return;
      }
      const active = vadScore >= VOICE_VAD_SPEECH_PROBABILITY_THRESHOLD;
      if (candidateSpeechActiveRef.current === active) {
        return;
      }
      candidateSpeechActiveRef.current = active;
      onEvent({ type: "candidate_speech_activity", active });
    },
    [onEvent],
  );
  const handleStatusChange = useCallback(
    ({ status }: { status: Status }) => {
      if (status === "connecting") {
        onEvent({
          type: "connection_status",
          status: connectedRef.current ? "reconnecting" : "connecting",
        });
      } else if (status === "connected" && connectedRef.current) {
        onEvent({ type: "connection_status", status: "reconnected" });
      } else if (status === "disconnecting") {
        onEvent({ type: "connection_status", status: "disconnecting" });
      }
    },
    [onEvent],
  );
  const handleInterruption = useCallback(
    ({ event_id: eventId }: { event_id: number }) => {
      onEvent({ type: "interruption", eventId });
    },
    [onEvent],
  );

  return (
    <ConversationProvider
      clientTools={clientTools}
      isMuted={isMuted}
      onAgentChatResponsePart={handleAgentChatResponsePart}
      onAudio={handleAudio}
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
      onError={handleError}
      onInterruption={handleInterruption}
      onMessage={handleMessage}
      onModeChange={handleModeChange}
      onStatusChange={handleStatusChange}
      onVadScore={handleVadScore}
    >
      <VoiceSessionStarter
        authorization={authorization}
        dynamicVariables={dynamicVariables}
        endRequested={endRequested}
        onAuthorizationConsumed={onAuthorizationConsumed}
        onEvent={onEvent}
        terminationRef={terminationRef}
      />
    </ConversationProvider>
  );
}
