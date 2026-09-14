"use client";

import {
  ConversationProvider,
  useConversationControls,
  type DisconnectionDetails,
  type HookCallbacks,
  type Mode,
  type Status,
} from "@elevenlabs/react";
import { useCallback, useEffect, useRef } from "react";

import type { VoiceSessionBridgeProps } from "./voice-session-bridge";

type MessagePayload = Parameters<NonNullable<HookCallbacks["onMessage"]>>[0];

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
  const terminationRef = useRef<(() => void) | null>(null);

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
  const handleModeChange = useCallback(
    ({ mode }: { mode: Mode }) => {
      onEvent({ type: "mode", mode });
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
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
      onError={handleError}
      onInterruption={handleInterruption}
      onMessage={handleMessage}
      onModeChange={handleModeChange}
      onStatusChange={handleStatusChange}
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
