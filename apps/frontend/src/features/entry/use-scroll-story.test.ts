import { describe, expect, it } from "vitest";

import { selectClosestStoryStep } from "./use-scroll-story";

describe("selectClosestStoryStep", () => {
  const positions = [
    { bottom: 300, index: 0, top: -100 },
    { bottom: 780, index: 1, top: 300 },
    { bottom: 1_260, index: 2, top: 780 },
    { bottom: 1_740, index: 3, top: 1_260 },
  ] as const;

  it("selects the visible step nearest the viewport center", () => {
    expect(selectClosestStoryStep(positions, 800)).toBe(1);
  });

  it("is deterministic regardless of observer callback order", () => {
    expect(selectClosestStoryStep([...positions].reverse(), 800)).toBe(1);
  });

  it("selects the nearest step after every step leaves the viewport", () => {
    expect(
      selectClosestStoryStep(
        positions.map((position) => ({
          ...position,
          bottom: position.bottom - 2_000,
          top: position.top - 2_000,
        })),
        800,
      ),
    ).toBe(3);
  });
});
