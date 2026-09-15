import { describe, expect, it } from "vitest";

import {
  createFillerPolicyState,
  isStaticLatencyFiller,
  observeLatencyFiller,
} from "./latency-filler-policy";

describe("latency filler policy", () => {
  it("recognizes only the one approved static message", () => {
    expect(isStaticLatencyFiller("Mm-hm…")).toBe(true);
    expect(isStaticLatencyFiller("  Mm-hm...  ")).toBe(true);
    expect(isStaticLatencyFiller("I understand.")).toBe(false);
    expect(isStaticLatencyFiller("Great answer.")).toBe(false);
  });

  it("fails review for repeated, consecutive, and excess fillers", () => {
    let state = observeLatencyFiller(createFillerPolicyState(), 1, 1_500);
    state = observeLatencyFiller(state, 1, 1_501);
    state = observeLatencyFiller(state, 2, 1_500);
    state = observeLatencyFiller(state, 4, 1_500);

    expect(state).toMatchObject({ count: 4, reviewFailed: true });
    expect(state.violations).toEqual(
      expect.arrayContaining([
        "more_than_once_per_turn",
        "consecutive_turns",
        "interview_limit_exceeded",
      ]),
    );
  });

  it("allows no more than three non-consecutive fillers", () => {
    let state = createFillerPolicyState();
    for (const candidateTurn of [1, 3, 5]) {
      state = observeLatencyFiller(state, candidateTurn, 1_500);
    }
    expect(state).toMatchObject({ count: 3, reviewFailed: false });
  });

  it("fails a filler before 1,500 ms and allows the exact boundary", () => {
    const early = observeLatencyFiller(createFillerPolicyState(), 1, 1_499);
    const boundary = observeLatencyFiller(createFillerPolicyState(), 1, 1_500);

    expect(early.violations).toContain("before_threshold");
    expect(boundary.reviewFailed).toBe(false);
  });
});
