import { describe, expect, it } from "vitest";

import { createSpendCapacityGate } from "./spend-cap.js";

describe("per-instance spend capacity gate", () => {
  it("enforces route and global in-flight ceilings with idempotent release", () => {
    const gate = createSpendCapacityGate({
      globalMaximum: 2,
      routeMaximums: {
        cv_analyze: 1,
        interview_summary: 2,
        voice_token: 1,
      },
    });

    const cvLease = gate.acquire("cv_analyze");
    expect(cvLease).not.toBeNull();
    expect(gate.acquire("cv_analyze")).toBeNull();
    const summaryLease = gate.acquire("interview_summary");
    expect(summaryLease).not.toBeNull();
    expect(gate.acquire("voice_token")).toBeNull();

    cvLease?.release();
    cvLease?.release();
    const voiceLease = gate.acquire("voice_token");
    expect(voiceLease).not.toBeNull();

    summaryLease?.release();
    voiceLease?.release();
    expect(gate.acquire("cv_analyze")).not.toBeNull();
  });
});
