import { z } from "zod";

export const ANONYMOUS_SESSION_COOKIE_NAME = "sp_anonymous_session";

const anonymousSessionIdSchema = z.uuid();

export type AnonymousSessionCookieOptions = Readonly<{
  httpOnly: true;
  maxAge: number;
  path: "/";
  sameSite: "lax";
  secure: boolean;
  signed: true;
}>;

export function parseAnonymousSessionId(value: unknown): string | null {
  const result = anonymousSessionIdSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function createAnonymousSessionId(idGenerator: () => string): string {
  return anonymousSessionIdSchema.parse(idGenerator());
}

export function createAnonymousSessionCookieOptions(input: {
  appEnvironment: "local" | "test" | "production";
  ttlSeconds: number;
}): AnonymousSessionCookieOptions {
  return Object.freeze({
    httpOnly: true,
    maxAge: input.ttlSeconds * 1_000,
    path: "/",
    sameSite: "lax",
    secure: input.appEnvironment === "production",
    signed: true,
  });
}
