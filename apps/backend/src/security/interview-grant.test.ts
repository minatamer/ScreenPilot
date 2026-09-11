import { describe, expect, it } from "vitest";

import {
  createInterviewGrantService,
  hashInterviewGrantValue,
} from "./interview-grant.js";

const ANONYMOUS_SESSION_ID = "00000000-0000-4000-8000-000000000001";
const GRANT_ID = "00000000-0000-4000-8000-000000000002";
const SIGNING_SECRET = "unit-test-grant-secret-0000000000000";

function createFixture() {
  let now = new Date("2026-09-09T12:00:00.000Z");
  const service = createInterviewGrantService({
    clock: () => now,
    secret: SIGNING_SECRET,
  });
  const planHash = hashInterviewGrantValue({
    entryMode: "conversation_first",
    topics: ["preferred_name", "role_preference"],
  });
  const issue = () =>
    service.issue({
      anonymousSessionId: ANONYMOUS_SESSION_ID,
      entryMode: "conversation_first",
      grantId: GRANT_ID,
      planHash,
      planVersion: "test-plan-v1",
      ttlSeconds: 900,
    });
  const expected = {
    anonymousSessionId: ANONYMOUS_SESSION_ID,
    entryMode: "conversation_first" as const,
    planHash,
    planVersion: "test-plan-v1",
  };

  return {
    advanceTo(value: string) {
      now = new Date(value);
    },
    expected,
    issue,
    service,
  };
}

describe("interview grants", () => {
  it("signs an expiring content-free conversation-first binding", () => {
    const fixture = createFixture();
    const grant = fixture.issue();
    const claims = fixture.service.verify(grant.token, fixture.expected);

    expect(grant.expiresAt).toBe("2026-09-09T12:15:00.000Z");
    expect(claims).toMatchObject({
      anonymousSessionId: ANONYMOUS_SESSION_ID,
      entryMode: "conversation_first",
      grantId: GRANT_ID,
      version: 2,
    });
    expect(JSON.stringify(claims)).not.toMatch(
      /candidate|transcript|cvText|question|roleLabel|vacancy/i,
    );
  });

  it("rejects token mutation and expiry", () => {
    const fixture = createFixture();
    const grant = fixture.issue();
    const tamperedToken = `${grant.token.slice(0, -1)}${grant.token.endsWith("A") ? "B" : "A"}`;

    expect(() =>
      fixture.service.verify(tamperedToken, fixture.expected),
    ).toThrow(expect.objectContaining({ code: "INTERVIEW_GRANT_INVALID" }));

    fixture.advanceTo("2026-09-09T12:15:00.000Z");
    expect(() => fixture.service.verify(grant.token, fixture.expected)).toThrow(
      expect.objectContaining({ code: "INTERVIEW_GRANT_EXPIRED" }),
    );
  });

  it.each([
    [
      "session correlation",
      { anonymousSessionId: "00000000-0000-4000-8000-000000000099" },
    ],
    ["plan version", { planVersion: "wrong-plan" }],
    ["plan hash", { planHash: hashInterviewGrantValue("wrong-plan") }],
  ])("rejects a mismatched %s binding", (_name, mismatch) => {
    const fixture = createFixture();
    const grant = fixture.issue();
    const expected = { ...fixture.expected, ...mismatch };

    expect(() => fixture.service.verify(grant.token, expected)).toThrow(
      expect.objectContaining({ code: "INTERVIEW_GRANT_INVALID" }),
    );
  });

  it("rejects a grant used for the wrong entry mode", () => {
    const fixture = createFixture();
    const grant = fixture.issue();

    expect(() =>
      fixture.service.verify(grant.token, {
        anonymousSessionId: ANONYMOUS_SESSION_ID,
        cvAnalysisHash: hashInterviewGrantValue({ facts: ["fact-1"] }),
        entryMode: "cv_assisted",
      }),
    ).toThrow(expect.objectContaining({ code: "INTERVIEW_GRANT_INVALID" }));
  });

  it("binds CV-assisted grants to the exact CV analysis hash", () => {
    const service = createInterviewGrantService({
      clock: () => new Date("2026-09-09T12:00:00.000Z"),
      secret: SIGNING_SECRET,
    });
    const cvAnalysisHash = hashInterviewGrantValue({ facts: ["fact-1"] });
    const grant = service.issue({
      anonymousSessionId: ANONYMOUS_SESSION_ID,
      cvAnalysisHash,
      entryMode: "cv_assisted",
      grantId: GRANT_ID,
      planHash: hashInterviewGrantValue({ entryMode: "cv_assisted" }),
      planVersion: "test-cv-plan-v1",
      ttlSeconds: 900,
    });

    expect(() =>
      service.verify(grant.token, {
        anonymousSessionId: ANONYMOUS_SESSION_ID,
        cvAnalysisHash: hashInterviewGrantValue({ facts: ["other"] }),
        entryMode: "cv_assisted",
      }),
    ).toThrow(expect.objectContaining({ code: "INTERVIEW_GRANT_INVALID" }));
  });

  it("hashes equivalent object key order identically", () => {
    expect(hashInterviewGrantValue({ a: 1, b: [2, 3] })).toBe(
      hashInterviewGrantValue({ b: [2, 3], a: 1 }),
    );
  });
});
