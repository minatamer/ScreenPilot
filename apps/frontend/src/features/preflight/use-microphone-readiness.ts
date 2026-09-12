"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  isMicrophoneAbortError,
  MicrophoneReadinessError,
  normalizeMicrophoneError,
  openBrowserMicrophoneMonitor,
  type ActiveMicrophoneMonitor,
  type MicrophoneFailureCode,
  type OpenMicrophoneMonitor,
} from "./microphone-readiness";

export type MicrophoneReadinessState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "requesting" }>
  | Readonly<{
      status: "ready";
      deviceLabel: string;
      level: number;
    }>
  | Readonly<{
      status: "error";
      error: MicrophoneReadinessError;
    }>;

interface UseMicrophoneReadinessOptions {
  onUnavailable?: (() => void) | undefined;
  openMicrophoneMonitor?: OpenMicrophoneMonitor | undefined;
}

export function useMicrophoneReadiness({
  onUnavailable,
  openMicrophoneMonitor = openBrowserMicrophoneMonitor,
}: UseMicrophoneReadinessOptions = {}) {
  const [state, setState] = useState<MicrophoneReadinessState>({
    status: "idle",
  });
  const requestControllerRef = useRef<AbortController | null>(null);
  const monitorRef = useRef<ActiveMicrophoneMonitor | null>(null);

  const releaseMicrophone = useCallback(() => {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    monitorRef.current?.stop();
    monitorRef.current = null;
  }, []);

  const resetMicrophone = useCallback(() => {
    releaseMicrophone();
    setState({ status: "idle" });
  }, [releaseMicrophone]);

  useEffect(
    () => () => {
      releaseMicrophone();
    },
    [releaseMicrophone],
  );

  const requestMicrophone = useCallback(async () => {
    releaseMicrophone();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    setState({ status: "requesting" });
    const requestState: {
      unavailableBeforeReady: MicrophoneFailureCode | null;
    } = { unavailableBeforeReady: null };

    try {
      const monitor = await openMicrophoneMonitor({
        signal: controller.signal,
        onLevel: (level) => {
          if (!controller.signal.aborted) {
            setState((currentState) =>
              currentState.status === "ready"
                ? {
                    ...currentState,
                    level: Math.max(0, Math.min(1, level)),
                  }
                : currentState,
            );
          }
        },
        onUnavailable: (code) => {
          requestState.unavailableBeforeReady =
            monitorRef.current === null ? code : null;
          if (controller.signal.aborted) {
            return;
          }
          monitorRef.current?.stop();
          monitorRef.current = null;
          setState({
            status: "error",
            error: new MicrophoneReadinessError(code),
          });
          onUnavailable?.();
        },
      });
      if (controller.signal.aborted) {
        monitor.stop();
        return;
      }
      if (requestState.unavailableBeforeReady) {
        monitor.stop();
        return;
      }

      monitorRef.current = monitor;
      setState({
        status: "ready",
        deviceLabel: monitor.deviceLabel,
        level: 0,
      });
    } catch (error) {
      if (!controller.signal.aborted && !isMicrophoneAbortError(error)) {
        setState({ status: "error", error: normalizeMicrophoneError(error) });
        onUnavailable?.();
      }
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
    }
  }, [onUnavailable, openMicrophoneMonitor, releaseMicrophone]);

  return {
    releaseMicrophone,
    resetMicrophone,
    requestMicrophone,
    state,
  };
}
