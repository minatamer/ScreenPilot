import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { interviewGrantSchema } from "@screenpilot/contracts/api/interview-preparation";
import { entryModeSchema } from "@screenpilot/contracts/interview/entry-mode";
import { z } from "zod";

const GRANT_VERSION = 2;
const HASH_PATTERN = /^[A-Za-z\d_-]{43}$/;

const interviewGrantClaimsSchema = z
  .strictObject({
    anonymousSessionId: z.uuid(),
    cvAnalysisHash: z.string().regex(HASH_PATTERN).optional(),
    entryMode: entryModeSchema,
    expiresAtEpochSeconds: z.number().int().positive(),
    grantId: z.uuid(),
    issuedAtEpochSeconds: z.number().int().nonnegative(),
    planHash: z.string().regex(HASH_PATTERN),
    planVersion: z.string().trim().min(1).max(64),
    version: z.literal(GRANT_VERSION),
  })
  .superRefine((claims, context) => {
    if (
      claims.entryMode === "conversation_first" &&
      claims.cvAnalysisHash !== undefined
    ) {
      context.addIssue({
        code: "custom",
        message: "Conversation-first grants cannot bind CV analysis.",
        path: ["cvAnalysisHash"],
      });
    }
    if (
      claims.entryMode === "cv_assisted" &&
      claims.cvAnalysisHash === undefined
    ) {
      context.addIssue({
        code: "custom",
        message: "CV-assisted grants must bind CV analysis.",
        path: ["cvAnalysisHash"],
      });
    }
    if (claims.expiresAtEpochSeconds <= claims.issuedAtEpochSeconds) {
      context.addIssue({
        code: "custom",
        message: "Grant expiry must follow issue time.",
        path: ["expiresAtEpochSeconds"],
      });
    }
  });

export type InterviewGrantClaims = z.infer<typeof interviewGrantClaimsSchema>;

type SharedInterviewGrantBinding = Readonly<{
  anonymousSessionId: string;
  grantId: string;
  planHash: string;
  planVersion: string;
  ttlSeconds: number;
}>;

export type InterviewGrantBinding = SharedInterviewGrantBinding &
  (
    | Readonly<{
        cvAnalysisHash?: never;
        entryMode: "conversation_first";
      }>
    | Readonly<{
        cvAnalysisHash: string;
        entryMode: "cv_assisted";
      }>
  );

type SharedExpectedInterviewGrantBinding = Readonly<{
  anonymousSessionId: string;
  planHash?: string;
  planVersion?: string;
}>;

export type ExpectedInterviewGrantBinding =
  SharedExpectedInterviewGrantBinding &
    (
      | Readonly<{
          cvAnalysisHash?: never;
          entryMode: "conversation_first";
        }>
      | Readonly<{
          cvAnalysisHash: string;
          entryMode: "cv_assisted";
        }>
    );

export class InterviewGrantError extends Error {
  readonly code: "INTERVIEW_GRANT_EXPIRED" | "INTERVIEW_GRANT_INVALID";

  constructor(
    code: "INTERVIEW_GRANT_EXPIRED" | "INTERVIEW_GRANT_INVALID",
    cause?: unknown,
  ) {
    super(
      code === "INTERVIEW_GRANT_EXPIRED"
        ? "The interview preparation has expired. Prepare it again."
        : "The interview preparation could not be verified.",
      cause === undefined ? undefined : { cause },
    );
    this.name = "InterviewGrantError";
    this.code = code;
  }
}

function canonicalJson(value: unknown): string {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }
  if (typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  }
  throw new TypeError("Interview grant bindings must be JSON-compatible.");
}

export function hashInterviewGrantValue(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("base64url");
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function signaturesMatch(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "ascii");
  const rightBytes = Buffer.from(right, "ascii");
  return (
    leftBytes.length === rightBytes.length &&
    leftBytes.length > 0 &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}

export function createInterviewGrantService(input: {
  clock: () => Date;
  secret: string;
}) {
  if (input.secret.length < 32) {
    throw new TypeError(
      "Interview grant signing secret must contain 32 characters.",
    );
  }

  const issue = (binding: InterviewGrantBinding) => {
    const issuedAtEpochSeconds = Math.floor(input.clock().getTime() / 1_000);
    const { ttlSeconds, ...claimsBinding } = binding;
    const claims = interviewGrantClaimsSchema.parse({
      ...claimsBinding,
      expiresAtEpochSeconds: issuedAtEpochSeconds + ttlSeconds,
      issuedAtEpochSeconds,
      version: GRANT_VERSION,
    });
    const payload = Buffer.from(JSON.stringify(claims), "utf8").toString(
      "base64url",
    );
    const token = interviewGrantSchema.parse(
      `${payload}.${signPayload(payload, input.secret)}`,
    );

    return Object.freeze({
      expiresAt: new Date(claims.expiresAtEpochSeconds * 1_000).toISOString(),
      token,
    });
  };

  const verifySignedClaims = (token: string): InterviewGrantClaims => {
    try {
      const validatedToken = interviewGrantSchema.parse(token);
      const segments = validatedToken.split(".");
      if (segments.length !== 2) {
        throw new InterviewGrantError("INTERVIEW_GRANT_INVALID");
      }
      const [payload, signature] = segments;
      if (
        payload === undefined ||
        signature === undefined ||
        !signaturesMatch(signature, signPayload(payload, input.secret))
      ) {
        throw new InterviewGrantError("INTERVIEW_GRANT_INVALID");
      }

      const claims = interviewGrantClaimsSchema.parse(
        JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
      );
      const nowEpochSeconds = Math.floor(input.clock().getTime() / 1_000);
      if (claims.expiresAtEpochSeconds <= nowEpochSeconds) {
        throw new InterviewGrantError("INTERVIEW_GRANT_EXPIRED");
      }

      return claims;
    } catch (error: unknown) {
      if (error instanceof InterviewGrantError) {
        throw error;
      }
      throw new InterviewGrantError("INTERVIEW_GRANT_INVALID", error);
    }
  };

  const verify = (
    token: string,
    expected: ExpectedInterviewGrantBinding,
  ): InterviewGrantClaims => {
    const claims = verifySignedClaims(token);
    const bindingMatches =
      claims.anonymousSessionId === expected.anonymousSessionId &&
      claims.entryMode === expected.entryMode &&
      claims.cvAnalysisHash === expected.cvAnalysisHash &&
      (expected.planHash === undefined ||
        claims.planHash === expected.planHash) &&
      (expected.planVersion === undefined ||
        claims.planVersion === expected.planVersion);
    if (!bindingMatches) {
      throw new InterviewGrantError("INTERVIEW_GRANT_INVALID");
    }
    return claims;
  };

  const verifyForAnonymousSession = (
    token: string,
    anonymousSessionId: string,
  ): InterviewGrantClaims => {
    const claims = verifySignedClaims(token);
    if (claims.anonymousSessionId !== anonymousSessionId) {
      throw new InterviewGrantError("INTERVIEW_GRANT_INVALID");
    }
    return claims;
  };

  return Object.freeze({ issue, verify, verifyForAnonymousSession });
}

export type InterviewGrantService = ReturnType<
  typeof createInterviewGrantService
>;
