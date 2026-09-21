"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";

import type { VoiceMetadata } from "@screenpilot/contracts/api/voice-token";

import {
  createInitialDemoSessionState,
  demoSessionReducer,
  type DemoSessionEvent,
} from "./demo-session.reducer";
import type {
  DemoSessionState,
  SessionRestoreNotice,
} from "./demo-session.types";
import { projectPersistedDemoSession } from "./persisted-session.schema";
import {
  clearScreenPilotSession,
  getBrowserSessionStorage,
  loadPersistedSession,
  savePersistedSession,
  type SavePersistedSessionResult,
  type SessionStorageLike,
} from "./session-storage";

const MAX_BROWSER_TIMEOUT_MS = 2_147_483_647;

export type DemoSessionContextValue = Readonly<{
  state: DemoSessionState;
  dispatch: Dispatch<DemoSessionEvent>;
  completeInterview: (voice: VoiceMetadata) => void;
  clearSession: () => void;
  startOver: () => void;
  storageStatus: SavePersistedSessionResult["status"] | "idle";
}>;

export const DemoSessionContext = createContext<DemoSessionContextValue | null>(
  null,
);

type DemoSessionProviderProps = Readonly<{
  children: ReactNode;
  storage?: SessionStorageLike | null;
}>;

function noticeForClearedSession(
  reason: "corrupt" | "expired" | "unsupported_version" | "oversized",
): SessionRestoreNotice {
  const notices = {
    corrupt: "corrupt_session_cleared",
    expired: "expired_session_cleared",
    unsupported_version: "incompatible_session_cleared",
    oversized: "oversized_session_cleared",
  } as const;
  return notices[reason];
}

export function DemoSessionProvider({
  children,
  storage,
}: DemoSessionProviderProps) {
  const [state, dispatch] = useReducer(
    demoSessionReducer,
    undefined,
    createInitialDemoSessionState,
  );
  const [storageStatus, setStorageStatus] = useState<
    SavePersistedSessionResult["status"] | "idle"
  >("idle");
  const hydrationStartedRef = useRef(false);
  const storageRef = useRef<SessionStorageLike | null>(null);

  useEffect(() => {
    if (hydrationStartedRef.current) {
      return;
    }
    hydrationStartedRef.current = true;

    const activeStorage =
      storage === undefined ? getBrowserSessionStorage() : storage;
    storageRef.current = activeStorage;
    const now = new Date();
    const loadResult = loadPersistedSession(activeStorage, now);

    if (loadResult.status === "restored") {
      dispatch({
        type: "RESTORE_SESSION",
        session: loadResult.session,
        now: now.toISOString(),
      });
      return;
    }

    if (loadResult.status === "cleared") {
      dispatch({
        type: "HYDRATION_FINISHED",
        now: now.toISOString(),
        notice: noticeForClearedSession(loadResult.reason),
      });
      return;
    }

    dispatch({
      type: "HYDRATION_FINISHED",
      now: now.toISOString(),
      ...(loadResult.status === "unavailable"
        ? { notice: "storage_unavailable" as const }
        : {}),
    });
  }, [storage]);

  useEffect(() => {
    if (state.hydrationStatus !== "ready") {
      return;
    }
    if (state.stage === "cleared") {
      setStorageStatus(
        clearScreenPilotSession(storageRef.current) ? "idle" : "unavailable",
      );
      return;
    }

    const persistedSession = projectPersistedDemoSession(state);
    if (!persistedSession) {
      return;
    }
    setStorageStatus(
      savePersistedSession(storageRef.current, persistedSession).status,
    );
  }, [state]);

  useEffect(() => {
    if (
      state.hydrationStatus !== "ready" ||
      state.stage === "cleared" ||
      state.expiresAt === null
    ) {
      return;
    }

    const expireSession = () => {
      clearScreenPilotSession(storageRef.current);
      dispatch({ type: "SESSION_EXPIRED" });
    };
    const remainingLifetimeMs = Date.parse(state.expiresAt) - Date.now();
    if (remainingLifetimeMs <= 0) {
      expireSession();
      return;
    }

    const expiryTimer = window.setTimeout(expireSession, remainingLifetimeMs);
    return () => {
      window.clearTimeout(expiryTimer);
    };
  }, [state.expiresAt, state.hydrationStatus, state.stage]);

  useEffect(() => {
    // The mounted preflight owns grant expiry there so it can release
    // microphone resources before the mode-specific recovery transition.
    if (
      state.entryMode !== "cv_assisted" ||
      state.stage !== "plan_ready" ||
      !state.interviewGrantExpiresAt
    ) {
      return;
    }

    const expireGrant = () => {
      dispatch({ type: "CV_GRANT_EXPIRED" });
    };
    const remainingGrantLifetimeMs =
      Date.parse(state.interviewGrantExpiresAt) - Date.now();
    if (remainingGrantLifetimeMs <= 0) {
      expireGrant();
      return;
    }

    const grantExpiryTimer = window.setTimeout(
      expireGrant,
      Math.min(remainingGrantLifetimeMs, MAX_BROWSER_TIMEOUT_MS),
    );
    return () => {
      window.clearTimeout(grantExpiryTimer);
    };
  }, [state.entryMode, state.interviewGrantExpiresAt, state.stage]);

  const clearSession = useCallback(() => {
    clearScreenPilotSession(storageRef.current);
    dispatch({ type: "CLEAR_SESSION" });
  }, []);

  const completeInterview = useCallback((voice: VoiceMetadata) => {
    dispatch({ type: "DEMO_INTERVIEW_COMPLETED", voice });
  }, []);

  const startOver = useCallback(() => {
    dispatch({ type: "START_OVER" });
  }, []);

  const value = useMemo<DemoSessionContextValue>(
    () => ({
      state,
      dispatch,
      completeInterview,
      clearSession,
      startOver,
      storageStatus,
    }),
    [clearSession, completeInterview, startOver, state, storageStatus],
  );

  return (
    <DemoSessionContext.Provider value={value}>
      {children}
    </DemoSessionContext.Provider>
  );
}
