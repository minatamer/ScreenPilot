"use client";

import {
  ConversationProvider,
  useConversationControls,
  type DisconnectionDetails,
} from "@elevenlabs/react";
import { useCallback, useEffect, useRef } from "react";

import type { VoiceSessionBridgeProps } from "./voice-session-bridge";

function VoiceSessionStarter({
  authorization,
  dynamicVariables,
  onAuthorizationConsumed,
  onFailure,
  terminationRef,
}: Pick<
  VoiceSessionBridgeProps,
  "authorization" | "dynamicVariables" | "onAuthorizationConsumed" | "onFailure"
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
    onFailure,
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
          initialSession.onFailure("The voice session could not start.");
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

  return null;
}

export function ElevenLabsVoiceSession({
  authorization,
  clientTools,
  dynamicVariables,
  expectedConversationId,
  onAuthorizationConsumed,
  onConnected,
  onFailure,
  onInterrupted,
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
        onFailure("The voice-session identifier could not be verified.");
        return;
      }
      connectedRef.current = true;
      onConnected(conversationId);
    },
    [expectedConversationId, onConnected, onFailure],
  );
  const handleDisconnect = useCallback(
    (details: DisconnectionDetails) => {
      if (failedRef.current || details.reason === "user") {
        return;
      }
      if (connectedRef.current) {
        onInterrupted();
        return;
      }
      failedRef.current = true;
      onFailure("The voice provider ended the connection before it was ready.");
    },
    [onFailure, onInterrupted],
  );
  const handleError = useCallback(() => {
    if (failedRef.current) {
      return;
    }
    failedRef.current = true;
    terminationRef.current?.();
    if (connectedRef.current) {
      onInterrupted();
      return;
    }
    onFailure("The voice provider rejected the connection.");
  }, [onFailure, onInterrupted]);

  return (
    <ConversationProvider
      clientTools={clientTools}
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
      onError={handleError}
    >
      <VoiceSessionStarter
        authorization={authorization}
        dynamicVariables={dynamicVariables}
        onAuthorizationConsumed={onAuthorizationConsumed}
        onFailure={onFailure}
        terminationRef={terminationRef}
      />
    </ConversationProvider>
  );
}
