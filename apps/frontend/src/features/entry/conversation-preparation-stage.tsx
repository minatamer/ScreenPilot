"use client";

import { useEffect } from "react";

import type { PrepareInterviewResponse } from "@screenpilot/contracts/api/interview-preparation";

import type { SessionFailure } from "@/features/session/demo-session.types";
import {
  isAbortError,
  prepareConversationFirst,
  ScreenPilotApiError,
} from "@/shared/api/screenpilot-api";
import { Button, ButtonGroup } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
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
  requestIdFactory = createClientRequestId,
}: ConversationPreparationStageProps) {
  useEffect(() => {
    if (failure) {
      return;
    }

    const controller = new AbortController();
    const startTimer = window.setTimeout(() => {
      const clientRequestId = requestIdFactory();
      void prepare(clientRequestId, controller.signal)
        .then(onPrepared)
        .catch((error: unknown) => {
          if (!controller.signal.aborted && !isAbortError(error)) {
            onFailure(preparationFailure(error));
          }
        });
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      controller.abort();
    };
  }, [failure, onFailure, onPrepared, prepare, requestIdFactory]);

  return (
    <div className="sp-demo-stage sp-conversation-preparation">
      <p className="sp-eyebrow">Conversation-first path</p>
      {failure ? (
        <>
          <h1>The open conversation is not prepared yet.</h1>
          <p className="sp-demo-stage__lead">
            No candidate details were collected and no provider interview was
            started.
          </p>
          <ErrorPanel
            actions={
              <ButtonGroup>
                {failure.retryable ? (
                  <Button onClick={onRetry} variant="secondary">
                    Retry
                  </Button>
                ) : null}
                <Button onClick={onBack} variant="quiet">
                  Change starting option
                </Button>
              </ButtonGroup>
            }
            title="Preparation could not finish"
          >
            <p>{failure.message}</p>
          </ErrorPanel>
        </>
      ) : (
        <Card aria-live="polite" className="sp-preparation-card">
          <span aria-hidden="true" className="sp-open-conversation-signal">
            <span />
            <span />
            <span />
          </span>
          <div>
            <h1>
              {isRefreshingExpiredGrant
                ? "Refreshing your open conversation"
                : "Preparing an open conversation"}
            </h1>
            <p>
              Pilot is setting up a role-neutral first interview. No CV is being
              analyzed and no candidate facts are being invented.
            </p>
          </div>
          <Button onClick={onBack} variant="quiet">
            Change starting option
          </Button>
        </Card>
      )}
    </div>
  );
}
