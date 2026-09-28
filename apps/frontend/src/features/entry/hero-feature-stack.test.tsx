import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HeroFeatureStack } from "./hero-feature-stack";

function stubIntersectionObserver() {
  let callback: IntersectionObserverCallback | undefined;
  const disconnect = vi.fn();
  const observe = vi.fn();
  const unobserve = vi.fn();

  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(nextCallback: IntersectionObserverCallback) {
        callback = nextCallback;
      }

      disconnect = disconnect;
      observe = observe;
      takeRecords = vi.fn(() => []);
      unobserve = unobserve;
    },
  );

  return {
    disconnect,
    reveal(targets: readonly Element[]) {
      act(() => {
        callback?.(
          targets.map(
            (target) =>
              ({ isIntersecting: true, target }) as IntersectionObserverEntry,
          ),
          {} as IntersectionObserver,
        );
      });
    },
    unobserve,
  };
}

describe("HeroFeatureStack", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reveals only intersecting cards once and disconnects on unmount", () => {
    const observer = stubIntersectionObserver();
    const { container, unmount } = render(<HeroFeatureStack />);
    const cards = Array.from(
      container.querySelectorAll<HTMLElement>(".sp-hero-feature-stack__card"),
    );

    expect(cards).toHaveLength(4);
    cards.forEach((card) => {
      expect(card).toHaveAttribute("data-reveal-state", "pending");
    });

    const firstCard = cards[0];
    if (!firstCard) {
      throw new Error("Expected the first feature card.");
    }
    observer.reveal([firstCard]);
    expect(firstCard).toHaveAttribute("data-reveal-state", "revealed");
    expect(cards[1]).toHaveAttribute("data-reveal-state", "pending");
    expect(observer.unobserve).toHaveBeenCalledWith(firstCard);

    observer.reveal(cards.slice(1));
    cards.forEach((card) => {
      expect(card).toHaveAttribute("data-reveal-state", "revealed");
    });

    unmount();
    expect(observer.disconnect).toHaveBeenCalledOnce();
  });

  it("leaves every card statically visible when observers are unavailable", () => {
    render(<HeroFeatureStack />);

    screen.getAllByRole("listitem").forEach((card) => {
      expect(card).toHaveAttribute("data-reveal-state", "static");
    });
  });

  it("starts from pending again after a real remount", () => {
    stubIntersectionObserver();
    const firstRender = render(<HeroFeatureStack />);
    firstRender.unmount();
    const secondRender = render(<HeroFeatureStack />);

    secondRender.container
      .querySelectorAll(".sp-hero-feature-stack__card")
      .forEach((card) => {
        expect(card).toHaveAttribute("data-reveal-state", "pending");
      });
  });
});
