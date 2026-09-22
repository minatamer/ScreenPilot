import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDeliberateAnchorScroll } from "./use-deliberate-anchor-scroll";

function SharedAnchorHarness() {
  const onClick = useDeliberateAnchorScroll("how-it-works");

  return (
    <>
      <a href="#how-it-works" onClick={onClick}>
        How it works
      </a>
      <a href="#how-it-works" onClick={onClick}>
        See it step by step
      </a>
      <section data-testid="how-it-works-target" id="how-it-works">
        How it works
      </section>
    </>
  );
}

describe("useDeliberateAnchorScroll", () => {
  const animationFrames: FrameRequestCallback[] = [];
  const scrollTo = vi.fn();

  beforeEach(() => {
    animationFrames.length = 0;
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    scrollTo.mockReset();
    vi.stubGlobal("scrollTo", scrollTo);
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 100,
    });
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("eases the primary click to the target without changing the route", () => {
    render(<SharedAnchorHarness />);
    const target = screen.getByTestId("how-it-works-target");
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 900,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    });

    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      button: 0,
      cancelable: true,
    });
    fireEvent(
      screen.getByRole("link", { name: "See it step by step" }),
      clickEvent,
    );

    expect(clickEvent.defaultPrevented).toBe(true);
    expect(window.location.hash).toBe("");

    animationFrames.shift()?.(0);
    animationFrames.shift()?.(450);
    expect(scrollTo).toHaveBeenLastCalledWith({
      behavior: "instant",
      left: 0,
      top: 550,
    });
    expect(window.location.hash).toBe("");

    animationFrames.shift()?.(900);
    expect(scrollTo).toHaveBeenLastCalledWith({
      behavior: "instant",
      left: 0,
      top: 1_000,
    });
    expect(window.location.hash).toBe("");
  });

  it("keeps the explicitly requested CTA journey when reduced motion is reported", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    render(<SharedAnchorHarness />);
    const target = screen.getByTestId("how-it-works-target");
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 900,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    });

    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      button: 0,
      cancelable: true,
    });
    fireEvent(screen.getByRole("link", { name: "How it works" }), clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
    expect(animationFrames).toHaveLength(1);

    animationFrames.shift()?.(0);
    animationFrames.shift()?.(450);
    expect(scrollTo).toHaveBeenLastCalledWith({
      behavior: "instant",
      left: 0,
      top: 550,
    });
  });
});
