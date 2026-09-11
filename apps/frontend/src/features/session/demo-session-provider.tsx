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

export type DemoSessionContextValue = Readonly<{
  state: DemoSessionState;
  dispatch: Dispatch<DemoSessionEvent>;
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

  const clearSession = useCallback(() => {
    clearScreenPilotSession(storageRef.current);
    dispatch({ type: "CLEAR_SESSION" });
  }, []);

  const startOver = useCallback(() => {
    dispatch({ type: "START_OVER" });
  }, []);

  const value = useMemo<DemoSessionContextValue>(
    () => ({ state, dispatch, clearSession, startOver, storageStatus }),
    [clearSession, startOver, state, storageStatus],
  );

  return (
    <DemoSessionContext.Provider value={value}>
      {children}
    </DemoSessionContext.Provider>
  );
}
