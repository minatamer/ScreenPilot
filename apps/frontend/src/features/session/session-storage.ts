import {
  MAX_PERSISTED_SESSION_BYTES,
  PERSISTED_SESSION_SCHEMA_VERSION,
  persistedDemoSessionSchema,
  type PersistedDemoSession,
} from "./persisted-session.schema";

export const SESSION_STORAGE_PREFIX = "screenpilot:";
export const SESSION_STORAGE_KEY = `${SESSION_STORAGE_PREFIX}demo-session:v${String(PERSISTED_SESSION_SCHEMA_VERSION)}`;
const VERSIONED_SESSION_KEY_PATTERN = /^screenpilot:demo-session:v\d+$/u;

export type SessionStorageLike = Pick<
  Storage,
  "getItem" | "key" | "length" | "removeItem" | "setItem"
>;

export type LoadPersistedSessionResult =
  | Readonly<{ status: "empty" }>
  | Readonly<{ status: "restored"; session: PersistedDemoSession }>
  | Readonly<{
      status: "cleared";
      reason: "corrupt" | "expired" | "unsupported_version" | "oversized";
    }>
  | Readonly<{ status: "unavailable" }>;

export type SavePersistedSessionResult =
  | Readonly<{ status: "saved" }>
  | Readonly<{ status: "rejected"; reason: "invalid" | "oversized" }>
  | Readonly<{ status: "unavailable" }>;

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function removeSessionKey(storage: SessionStorageLike): boolean {
  try {
    storage.removeItem(SESSION_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

function clearUnsupportedVersionKeys(
  storage: SessionStorageLike,
): "cleared" | "none" | "unavailable" {
  try {
    const unsupportedKeys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (
        key !== null &&
        key !== SESSION_STORAGE_KEY &&
        VERSIONED_SESSION_KEY_PATTERN.test(key)
      ) {
        unsupportedKeys.push(key);
      }
    }
    for (const key of unsupportedKeys) {
      storage.removeItem(key);
    }
    return unsupportedKeys.length > 0 ? "cleared" : "none";
  } catch {
    return "unavailable";
  }
}

function unsupportedSchemaVersion(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    value.schemaVersion !== PERSISTED_SESSION_SCHEMA_VERSION
  );
}

export function getBrowserSessionStorage(): SessionStorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function loadPersistedSession(
  storage: SessionStorageLike | null,
  now: Date = new Date(),
): LoadPersistedSessionResult {
  if (!storage) {
    return { status: "unavailable" };
  }

  const unsupportedVersionResult = clearUnsupportedVersionKeys(storage);
  if (unsupportedVersionResult === "unavailable") {
    return { status: "unavailable" };
  }

  let serializedSession: string | null;
  try {
    serializedSession = storage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return { status: "unavailable" };
  }

  if (serializedSession === null) {
    if (unsupportedVersionResult === "cleared") {
      return { status: "cleared", reason: "unsupported_version" };
    }
    return { status: "empty" };
  }

  if (utf8ByteLength(serializedSession) > MAX_PERSISTED_SESSION_BYTES) {
    return removeSessionKey(storage)
      ? { status: "cleared", reason: "oversized" }
      : { status: "unavailable" };
  }

  let candidateSession: unknown;
  try {
    candidateSession = JSON.parse(serializedSession);
  } catch {
    return removeSessionKey(storage)
      ? { status: "cleared", reason: "corrupt" }
      : { status: "unavailable" };
  }

  if (unsupportedSchemaVersion(candidateSession)) {
    return removeSessionKey(storage)
      ? { status: "cleared", reason: "unsupported_version" }
      : { status: "unavailable" };
  }

  const parsedSession = persistedDemoSessionSchema.safeParse(candidateSession);
  if (!parsedSession.success) {
    return removeSessionKey(storage)
      ? { status: "cleared", reason: "corrupt" }
      : { status: "unavailable" };
  }

  if (Date.parse(parsedSession.data.createdAt) > now.getTime()) {
    return removeSessionKey(storage)
      ? { status: "cleared", reason: "corrupt" }
      : { status: "unavailable" };
  }

  if (Date.parse(parsedSession.data.expiresAt) <= now.getTime()) {
    return removeSessionKey(storage)
      ? { status: "cleared", reason: "expired" }
      : { status: "unavailable" };
  }

  return { status: "restored", session: parsedSession.data };
}

export function savePersistedSession(
  storage: SessionStorageLike | null,
  session: PersistedDemoSession,
): SavePersistedSessionResult {
  if (!storage) {
    return { status: "unavailable" };
  }

  const parsedSession = persistedDemoSessionSchema.safeParse(session);
  if (!parsedSession.success) {
    return { status: "rejected", reason: "invalid" };
  }

  const serializedSession = JSON.stringify(parsedSession.data);
  if (utf8ByteLength(serializedSession) > MAX_PERSISTED_SESSION_BYTES) {
    return { status: "rejected", reason: "oversized" };
  }

  try {
    storage.setItem(SESSION_STORAGE_KEY, serializedSession);
    return { status: "saved" };
  } catch {
    return { status: "unavailable" };
  }
}

export function clearScreenPilotSession(
  storage: SessionStorageLike | null,
): boolean {
  if (!storage) {
    return false;
  }

  try {
    const sessionKeys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(SESSION_STORAGE_PREFIX)) {
        sessionKeys.push(key);
      }
    }
    for (const key of sessionKeys) {
      storage.removeItem(key);
    }
    return sessionKeys.every((key) => storage.getItem(key) === null);
  } catch {
    return false;
  }
}
