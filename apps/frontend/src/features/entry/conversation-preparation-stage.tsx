"use client";

import { useEffect } from "react";

import type { PrepareInterviewResponse } from "@screenpilot/contracts/api/interview-preparation";

import type { SessionFailure } from "@/features/session/demo-session.types";
import type { VoicePerformanceTracker } from "@/features/interview/voice-performance";
import {
  isAbortError,
  prepareConversationFirst,
  ScreenPilotApiError,
} from "@/shared/api/screenpilot-api";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { DemoActionFooter } from "@/shared/ui/demo-action-footer";
import { DemoStageHeading } from "@/shared/ui/demo-stage-heading";
import { ErrorPanel } from "@/shared/ui/error-panel";

type PrepareConversation = typeof prepareConversationFirst;

type ConversationPreparationStageProps = Readonly<{
  failure?: SessionFailure | undefined;
  isRefreshingExpiredGrant?: boolean;
  onBack: () => void;
  onFailure: (failure: SessionFailure) => void;
  onPrepared: (response: PrepareInterviewResponse) => void;
  onRetry: () => void;
  prepare?: PrepareConversation;
  performanceTracker?: VoicePerformanceTracker;
  requestIdFactory?: () => string;
}>;

function preparationFailure(error: unknown): SessionFailure {
  if (error instanceof ScreenPilotApiError) {
    const missingSession = error.code === "ANONYMOUS_SESSION_REQUIRED";
    return {
      stage: "preparing_conversation",
      code: error.code,
      message: missingSession
        ? "Your private demo session is missing. Return to the choices and try again."
        : error.message,
      retryable: missingSession ? false : error.retryable,
    };
  }
  return {
    stage: "preparing_conversation",
    code: "PREPARATION_UNREACHABLE",
    message:
      "ScreenPilot could not reach the preparation service. Check the connection and try again.",
    retryable: true,
  };
}

function createClientRequestId(): string {
  return globalThis.crypto.randomUUID();
}

export function ConversationPreparationStage({
  failure,
  isRefreshingExpiredGrant = false,
  onBack,
  onFailure,
  onPrepared,
  onRetry,
  prepare = prepareConversationFirst,
  performanceTracker,
  requestIdFactory = createClientRequestId,
}: ConversationPreparationStageProps) {
  useEffect(() => {
    if (failure) {
      return;
    }

    const controller = new AbortController();
    let measurementId: string | null = null;
    const startTimer = window.setTimeout(() => {
      const clientRequestId = requestIdFactory();
      measurementId =
        performanceTracker?.begin("conversation_preparation") ?? null;
      void prepare(clientRequestId, controller.signal)
        .then((response) => {
          if (measurementId) {
            performanceTracker?.complete(measurementId);
            measurementId = null;
          }
          onPrepared(response);
        })
        .catch((error: unknown) => {
          if (measurementId) {
            performanceTracker?.cancel(measurementId);
            measurementId = null;
          }
          if (!controller.signal.aborted && !isAbortError(error)) {
            onFailure(preparationFailure(error));
          }
        });
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      controller.abort();
      if (measurementId) {
        performanceTracker?.cancel(measurementId);
      }
    };
  }, [
    failure,
    onFailure,
    onPrepared,
    performanceTracker,
    prepare,
    requestIdFactory,
  ]);

  return (
    <div className="sp-demo-stage sp-demo-stage--with-footer sp-conversation-preparation">
      <DemoStageHeading
        pretitle="Conversation-first path"
        title={
          failure
            ? "The open conversation is not prepared yet."
            : isRefreshingExpiredGrant
              ? "Refreshing your open conversation."
              : "Preparing an open conversation."
        }
      />
      {failure ? (
        <ErrorPanel
          actions={
            failure.retryable ? (
              <Button onClick={onRetry} variant="secondary">
                Retry
              </Button>
            ) : undefined
          }
          title="Preparation could not finish"
        >
          <p>{failure.message}</p>
          <p>No interview was started.</p>
        </ErrorPanel>
      ) : (
        <Card aria-live="polite" className="sp-preparation-card">
          <span aria-hidden="true" className="sp-open-conversation-signal">
            <span />
            <span />
            <span />
          </span>
          <div>
            <h2>No CV needed</h2>
            <p>
              Pilot starts role-neutral and learns from your answers. It does
              not invent candidate facts.
            </p>
          </div>
        </Card>
      )}
      <DemoActionFooter>
        <Button onClick={onBack} variant="quiet">
          Change starting option
        </Button>
      </DemoActionFooter>
    </div>
  );
}
