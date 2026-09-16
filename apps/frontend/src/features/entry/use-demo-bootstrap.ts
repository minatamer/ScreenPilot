"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

type BootstrapRequestOwnership = Readonly<{
  controller: AbortController;
  generation: number;
}>;

export function useDemoBootstrap(restartClearedSession = false) {
  const { dispatch, state } = useDemoSession();
  const clearedSessionRestartedRef = useRef(false);
  const bootstrapGenerationRef = useRef(0);
  const activeBootstrapRequestRef = useRef<BootstrapRequestOwnership | null>(
    null,
  );
  const currentRuntimeConfigValidatedRef = useRef(false);
  const [runtimeConfigStatus, setRuntimeConfigStatus] = useState<
    "failed" | "pending" | "ready"
  >("pending");
  const beginBootstrapRequest = useCallback((): BootstrapRequestOwnership => {
    activeBootstrapRequestRef.current?.controller.abort();
    const request = {
      controller: new AbortController(),
      generation: bootstrapGenerationRef.current + 1,
    };
    bootstrapGenerationRef.current = request.generation;
    activeBootstrapRequestRef.current = request;
    return request;
  }, []);
  const ownsBootstrapRequest = useCallback(
    (request: BootstrapRequestOwnership): boolean =>
      activeBootstrapRequestRef.current?.generation === request.generation,
    [],
  );
  const releaseBootstrapRequest = useCallback(
    (request: BootstrapRequestOwnership) => {
      if (ownsBootstrapRequest(request)) {
        activeBootstrapRequestRef.current = null;
      }
    },
    [ownsBootstrapRequest],
  );
  const cancelBootstrapRequest = useCallback(
    (request: BootstrapRequestOwnership) => {
      request.controller.abort();
      releaseBootstrapRequest(request);
    },
    [releaseBootstrapRequest],
  );

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

    let request: BootstrapRequestOwnership | null = null;
    const startTimer = window.setTimeout(() => {
      setRuntimeConfigStatus("pending");
      const currentRequest = beginBootstrapRequest();
      request = currentRequest;
      void fetchDemoBootstrap(currentRequest.controller.signal)
        .then((response) => {
          if (
            currentRequest.controller.signal.aborted ||
            !ownsBootstrapRequest(currentRequest)
          ) {
            return;
          }
          const { demoContext, ...runtimeConfig } = response;
          currentRuntimeConfigValidatedRef.current = true;
          releaseBootstrapRequest(currentRequest);
          dispatch({
            type: "BOOTSTRAP_SUCCEEDED",
            demoContext,
            runtimeConfig,
          });
          setRuntimeConfigStatus("ready");
        })
        .catch((error: unknown) => {
          if (
            currentRequest.controller.signal.aborted ||
            isAbortError(error) ||
            !ownsBootstrapRequest(currentRequest)
          ) {
            return;
          }
          releaseBootstrapRequest(currentRequest);
          setRuntimeConfigStatus("failed");
          dispatch({
            type: "SESSION_FAILED",
            failure: bootstrapFailure(error),
          });
        });
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      if (request) {
        cancelBootstrapRequest(request);
      }
    };
  }, [
    beginBootstrapRequest,
    cancelBootstrapRequest,
    dispatch,
    ownsBootstrapRequest,
    releaseBootstrapRequest,
    state.failure,
    state.stage,
  ]);

  const shouldRefreshRestoredSession =
    state.hydrationStatus === "ready" &&
    state.stage !== "empty" &&
    state.stage !== "bootstrapping" &&
    state.stage !== "cleared";

  useEffect(() => {
    if (
      !shouldRefreshRestoredSession ||
      runtimeConfigStatus !== "pending" ||
      currentRuntimeConfigValidatedRef.current ||
      activeBootstrapRequestRef.current !== null
    ) {
      return;
    }

    const request = beginBootstrapRequest();
    void fetchDemoBootstrap(request.controller.signal)
      .then((response) => {
        if (
          request.controller.signal.aborted ||
          !ownsBootstrapRequest(request)
        ) {
          return;
        }
        const { demoContext, ...runtimeConfig } = response;
        currentRuntimeConfigValidatedRef.current = true;
        releaseBootstrapRequest(request);
        dispatch({
          type: "RUNTIME_CONFIG_REFRESHED",
          demoContext,
          runtimeConfig,
        });
        setRuntimeConfigStatus("ready");
      })
      .catch((error: unknown) => {
        if (
          request.controller.signal.aborted ||
          isAbortError(error) ||
          !ownsBootstrapRequest(request)
        ) {
          return;
        }
        releaseBootstrapRequest(request);
        setRuntimeConfigStatus("failed");
      });

    return () => {
      cancelBootstrapRequest(request);
    };
  }, [
    beginBootstrapRequest,
    cancelBootstrapRequest,
    dispatch,
    ownsBootstrapRequest,
    releaseBootstrapRequest,
    runtimeConfigStatus,
    shouldRefreshRestoredSession,
  ]);

  const retryRuntimeConfig = useCallback(() => {
    if (runtimeConfigStatus !== "failed") {
      return;
    }
    currentRuntimeConfigValidatedRef.current = false;
    setRuntimeConfigStatus("pending");
  }, [runtimeConfigStatus]);

  return { retryRuntimeConfig, runtimeConfigStatus } as const;
}
