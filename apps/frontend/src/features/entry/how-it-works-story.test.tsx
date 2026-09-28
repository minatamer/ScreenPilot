import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HowItWorksStory } from "./how-it-works-story";

function bounds(top: number, bottom: number): DOMRect {
  return {
    bottom,
    height: bottom - top,
    left: 0,
    right: 600,
    toJSON: () => ({}),
    top,
    width: 600,
    x: 0,
    y: top,
  };
}

function stubIntersectionObserver() {
  let callback: IntersectionObserverCallback | undefined;
  const disconnect = vi.fn();
  const observe = vi.fn();

  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(nextCallback: IntersectionObserverCallback) {
        callback = nextCallback;
      }

      disconnect = disconnect;
      observe = observe;
      takeRecords = vi.fn(() => []);
      unobserve = vi.fn();
    },
  );

  return {
    disconnect,
    refresh() {
      act(() => {
        callback?.([], {} as IntersectionObserver);
      });
    },
    observe,
  };
}

describe("HowItWorksStory", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reuses one visual model for the wide scene and four compact scenes", () => {
    const { container } = render(<HowItWorksStory />);

    expect(
      container.querySelectorAll(".sp-scroll-story__scene--shared"),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll(".sp-scroll-story__scene--inline"),
    ).toHaveLength(4);
    expect(container.querySelector(".sp-scroll-story")).toHaveAttribute(
      "data-story-mode",
      "static",
    );
    container
      .querySelectorAll(".sp-scroll-story__steps > li")
      .forEach((step) => {
        expect(step).toBeVisible();
      });
  });

  it("updates deterministically from measured center position and cleans up", () => {
    vi.stubGlobal("innerHeight", 800);
    const observer = stubIntersectionObserver();
    const { container, unmount } = render(<HowItWorksStory />);
    const steps = Array.from(
      container.querySelectorAll<HTMLElement>(".sp-scroll-story__steps > li"),
    );

    expect(observer.observe).toHaveBeenCalledTimes(4);
    expect(container.querySelector(".sp-scroll-story")).toHaveAttribute(
      "data-story-mode",
      "observing",
    );

    const firstPositions = [
      bounds(-500, -100),
      bounds(100, 700),
      bounds(700, 1_300),
      bounds(1_300, 1_900),
    ];
    const boundsSpies = steps.map((step, index) =>
      vi
        .spyOn(step, "getBoundingClientRect")
        .mockReturnValue(firstPositions[index] ?? bounds(0, 0)),
    );
    observer.refresh();
    expect(steps[1]).toHaveAttribute("data-active", "true");

    const reversePositions = [
      bounds(-1_100, -500),
      bounds(-500, -100),
      bounds(100, 700),
      bounds(700, 1_300),
    ];
    boundsSpies.forEach((boundsSpy, index) => {
      boundsSpy.mockReturnValue(reversePositions[index] ?? bounds(0, 0));
    });
    observer.refresh();
    expect(steps[2]).toHaveAttribute("data-active", "true");

    unmount();
    expect(observer.disconnect).toHaveBeenCalledOnce();
  });
});
