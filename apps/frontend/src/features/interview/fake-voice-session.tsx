"use client";

import { useEffect, useRef } from "react";

import type { VoiceSessionBridgeProps } from "./voice-session-bridge";

export function FakeVoiceSession({
  authorization,
  expectedConversationId,
  onAuthorizationConsumed,
  onConnected,
  onFailure,
}: VoiceSessionBridgeProps) {
  const startedRef = useRef(false);
  const initialSessionRef = useRef({
    authorization,
    expectedConversationId,
    onAuthorizationConsumed,
    onConnected,
    onFailure,
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
        initialSession.onFailure(
          "The fake voice-session identifier could not be verified.",
        );
        return;
      }
      initialSession.onConnected(initialSession.expectedConversationId);
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
    };
  }, []);

  return null;
}
