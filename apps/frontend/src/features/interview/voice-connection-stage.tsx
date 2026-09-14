"use client";

import type {
  VoiceMetadata,
  VoiceTokenResponse,
} from "@screenpilot/contracts/api/voice-token";
import type { PublicRoleNeutralDemoContext } from "@screenpilot/contracts/interview/demo-context";
import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";
import type { NormalizedCv } from "@screenpilot/contracts/interview/normalized-cv";
import type { ScreeningPlan } from "@screenpilot/contracts/interview/screening-plan";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";

import type {
  RolePreference,
  SessionFailure,
} from "@/features/session/demo-session.types";
import {
  isAbortError,
  requestVoiceToken,
  ScreenPilotApiError,
} from "@/shared/api/screenpilot-api";
import { Button, ButtonGroup } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ErrorPanel } from "@/shared/ui/error-panel";

import { FakeVoiceSession } from "./fake-voice-session";
import { InterviewStage } from "./interview-stage";
import {
  createDeferredVoiceClientTools,
  createVoiceSessionContext,
} from "./voice-session-context";
import type {
  VoiceSessionAuthorization,
  VoiceSessionBridgeProps,
} from "./voice-session-bridge";
import { useVoiceSession } from "./use-voice-session";

const LazyElevenLabsVoiceSession = lazy(async () => {
  const voiceSession = await import("./elevenlabs-voice-session");
  return { default: voiceSession.ElevenLabsVoiceSession };
});

export type VoiceStartRequest = Readonly<{
  interviewGrant: string;
  turnstileToken: string;
}>;

export type VoiceTokenRequester = typeof requestVoiceToken;

type VoiceConnectionStageProps = Readonly<{
  cv?: NormalizedCv | undefined;
  demoContext: PublicRoleNeutralDemoContext;
  entryMode: EntryMode;
  failure?: SessionFailure | undefined;
  onCancel: () => void;
  onConnected: (voice: VoiceMetadata) => void;
  onEnded: (voice: VoiceMetadata) => void;
  onEnding: () => void;
  onFailure: (failure: SessionFailure) => void;
  onFinalTranscriptTurn: (turn: TranscriptTurn) => void;
  onGrantRejected: () => void;
  onInterrupted: () => void;
  onRetry: () => void;
  onSensitiveValuesCleared: () => void;
  liveSessionBridge?: ComponentType<VoiceSessionBridgeProps>;
  liveVoiceEnabled: boolean;
  plan: ScreeningPlan;
  requestToken?: VoiceTokenRequester;
  rolePreference?: RolePreference | undefined;
  stage: "connecting" | "ending" | "live";
  startRequest: VoiceStartRequest | null;
}>;

function voiceConnectionFailure(error: unknown): SessionFailure {
  if (error instanceof ScreenPilotApiError) {
    return {
      stage: "connecting",
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    };
  }
  return {
    stage: "connecting",
    code: "VOICE_CONNECTION_UNREACHABLE",
    message:
      "ScreenPilot could not reach the secure voice service. Check the connection and try again.",
    retryable: true,
  };
}

export function VoiceConnectionStage({
  cv,
  demoContext,
  entryMode,
  failure,
  onCancel,
  onConnected,
  onEnded,
  onEnding,
  onFailure,
  onFinalTranscriptTurn,
  onGrantRejected,
  onInterrupted,
  onRetry,
  onSensitiveValuesCleared,
  liveSessionBridge: LiveSessionBridge = LazyElevenLabsVoiceSession,
  liveVoiceEnabled,
  plan,
  requestToken = requestVoiceToken,
  rolePreference,
  stage,
  startRequest,
}: VoiceConnectionStageProps) {
  const initialStartRequestRef = useRef(startRequest);
  const requestStartedRef = useRef(false);
  const requestAbortControllerRef = useRef<AbortController | null>(null);
  const cleanupTimerRef = useRef<number | null>(null);
  const sensitiveValuesClearedRef = useRef(false);
  const initialRequestRef = useRef({
    onFailure,
    onGrantRejected,
    onSensitiveValuesCleared,
    requestToken,
  });
  const [authorization, setAuthorization] =
    useState<VoiceSessionAuthorization>();
  const [expectedConversationId, setExpectedConversationId] = useState<
    string | undefined
  >();
  const [sessionBridgeMounted, setSessionBridgeMounted] = useState(false);
  const dynamicVariables = useMemo(
    () =>
      createVoiceSessionContext({
        ...(cv ? { cv } : {}),
        demoContext,
        entryMode,
        plan,
        ...(rolePreference ? { rolePreference } : {}),
      }),
    [cv, demoContext, entryMode, plan, rolePreference],
  );
  const clientTools = useMemo(() => createDeferredVoiceClientTools(), []);
  const handleConnectionFailure = useCallback(
    (message: string) => {
      setAuthorization(undefined);
      setSessionBridgeMounted(false);
      onFailure({
        stage: "connecting",
        code: "VOICE_PROVIDER_REJECTED",
        message: message || "The voice provider rejected the connection.",
        retryable: true,
      });
    },
    [onFailure],
  );
  const handleInterrupted = useCallback(() => {
    setAuthorization(undefined);
    setSessionBridgeMounted(false);
    onInterrupted();
  }, [onInterrupted]);
  const handleEnded = useCallback(
    (voice: VoiceMetadata) => {
      setAuthorization(undefined);
      setSessionBridgeMounted(false);
      onEnded(voice);
    },
    [onEnded],
  );
  const voiceSession = useVoiceSession({
    onConnected,
    onConnectionFailure: handleConnectionFailure,
    onEnded: handleEnded,
    onEnding,
    onFinalTranscriptTurn,
    onInterrupted: handleInterrupted,
  });
  const { markConnecting } = voiceSession;

  useEffect(() => {
    if (cleanupTimerRef.current !== null) {
      window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
    const initialStartRequest = initialStartRequestRef.current;
    const initialRequest = initialRequestRef.current;
    const clearSensitiveValues = () => {
      if (sensitiveValuesClearedRef.current) {
        return;
      }
      sensitiveValuesClearedRef.current = true;
      initialRequest.onSensitiveValuesCleared();
    };

    let startTimer: number | undefined;
    if (initialStartRequest && !requestStartedRef.current) {
      const abortController = new AbortController();
      requestAbortControllerRef.current = abortController;
      startTimer = window.setTimeout(() => {
        if (requestStartedRef.current) {
          return;
        }
        requestStartedRef.current = true;
        void initialRequest
          .requestToken(
            {
              interviewGrant: initialStartRequest.interviewGrant,
              turnstileToken: initialStartRequest.turnstileToken,
            },
            abortController.signal,
          )
          .then((response: VoiceTokenResponse) => {
            initialStartRequestRef.current = null;
            clearSensitiveValues();
            if (abortController.signal.aborted) {
              return;
            }
            setExpectedConversationId(response.conversationId);
            setAuthorization({
              conversationId: response.conversationId,
              conversationToken: response.conversationToken,
            });
            markConnecting();
            setSessionBridgeMounted(true);
          })
          .catch((error: unknown) => {
            initialStartRequestRef.current = null;
            clearSensitiveValues();
            if (abortController.signal.aborted || isAbortError(error)) {
              return;
            }
            if (
              error instanceof ScreenPilotApiError &&
              (error.code === "INTERVIEW_GRANT_EXPIRED" ||
                error.code === "INTERVIEW_GRANT_INVALID")
            ) {
              initialRequest.onGrantRejected();
              return;
            }
            initialRequest.onFailure(voiceConnectionFailure(error));
          });
      }, 0);
    }

    return () => {
      if (startTimer !== undefined) {
        window.clearTimeout(startTimer);
      }
      cleanupTimerRef.current = window.setTimeout(() => {
        cleanupTimerRef.current = null;
        requestAbortControllerRef.current?.abort();
        requestAbortControllerRef.current = null;
        if (requestStartedRef.current) {
          initialStartRequestRef.current = null;
          clearSensitiveValues();
        }
      }, 0);
    };
  }, [markConnecting]);

  const handleAuthorizationConsumed = useCallback(() => {
    setAuthorization(undefined);
  }, []);
  const SessionBridge = liveVoiceEnabled ? LiveSessionBridge : FakeVoiceSession;

  return (
    <div
      className={`sp-demo-stage sp-voice-connection-stage${
        stage === "connecting" ? "" : " sp-voice-connection-stage--live"
      }`}
    >
      {stage === "connecting" ? (
        <>
          <div className="sp-demo-stage__heading">
            <p className="sp-eyebrow">Secure connection</p>
            <h1>Connecting your AI interview.</h1>
            <p className="sp-demo-stage__lead">
              ScreenPilot is authorizing one private WebRTC session. No
              recording is created.
            </p>
          </div>

          <Card as="section" className="sp-voice-connection-card" tone="soft">
            {failure ? (
              <ErrorPanel title="The voice connection could not start">
                <p>{failure.message}</p>
              </ErrorPanel>
            ) : (
              <div aria-live="polite" className="sp-voice-connection-status">
                <span aria-hidden="true" className="sp-button__spinner" />
                <div>
                  <strong>Authorizing voice</strong>
                  <span>
                    You can cancel while the connection is being prepared.
                  </span>
                </div>
              </div>
            )}

            <ButtonGroup>
              {failure?.retryable ? (
                <Button onClick={onRetry}>Retry from preflight</Button>
              ) : null}
              <Button onClick={onCancel} variant="secondary">
                {failure ? "Return to preflight" : "Cancel connection"}
              </Button>
            </ButtonGroup>
          </Card>
        </>
      ) : (
        <InterviewStage
          caption={voiceSession.caption}
          elapsedSeconds={voiceSession.elapsedSeconds}
          entryMode={entryMode}
          isMuted={voiceSession.isMuted}
          onEnd={voiceSession.requestEnd}
          onToggleMute={voiceSession.toggleMuted}
          phase={voiceSession.phase}
        />
      )}

      {sessionBridgeMounted ? (
        <Suspense fallback={null}>
          <SessionBridge
            authorization={authorization}
            clientTools={clientTools}
            dynamicVariables={dynamicVariables}
            endRequested={voiceSession.endRequested}
            expectedConversationId={expectedConversationId}
            isMuted={voiceSession.isMuted}
            onAuthorizationConsumed={handleAuthorizationConsumed}
            onEvent={voiceSession.onSessionEvent}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
