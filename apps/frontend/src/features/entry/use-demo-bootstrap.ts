"use client";

import { useEffect, useRef } from "react";

import type { SessionFailure } from "@/features/session/demo-session.types";
import { useDemoSession } from "@/features/session/use-demo-session";
import {
  fetchDemoBootstrap,
  isAbortError,
  ScreenPilotApiError,
} from "@/shared/api/screenpilot-api";

function bootstrapFailure(error: unknown): SessionFailure {
  if (error instanceof ScreenPilotApiError) {
    return {
      stage: "bootstrapping",
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    };
  }
  return {
    stage: "bootstrapping",
    code: "BOOTSTRAP_UNREACHABLE",
    message:
      "ScreenPilot could not open the private demo session. Check the connection and try again.",
    retryable: true,
  };
}

export function useDemoBootstrap(restartClearedSession = false) {
  const { dispatch, state } = useDemoSession();
  const clearedSessionRestartedRef = useRef(false);

  useEffect(() => {
    if (state.hydrationStatus !== "ready") {
      return;
    }
    if (state.stage === "cleared" && restartClearedSession) {
      if (clearedSessionRestartedRef.current) {
        return;
      }
      clearedSessionRestartedRef.current = true;
      dispatch({ type: "BEGIN_NEW_SESSION", now: new Date().toISOString() });
      return;
    }
    if (state.stage !== "cleared") {
      clearedSessionRestartedRef.current = false;
    }
    if (state.stage === "empty") {
      dispatch({ type: "BOOTSTRAP_STARTED" });
    }
  }, [dispatch, restartClearedSession, state.hydrationStatus, state.stage]);

  useEffect(() => {
    if (state.stage !== "bootstrapping" || state.failure) {
      return;
    }

    const controller = new AbortController();
    const startTimer = window.setTimeout(() => {
      void fetchDemoBootstrap(controller.signal)
        .then((response) => {
          dispatch({
            type: "BOOTSTRAP_SUCCEEDED",
            demoContext: response.demoContext,
          });
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted && !isAbortError(error)) {
            dispatch({
              type: "SESSION_FAILED",
              failure: bootstrapFailure(error),
            });
          }
        });
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      controller.abort();
    };
  }, [dispatch, state.failure, state.stage]);
}
