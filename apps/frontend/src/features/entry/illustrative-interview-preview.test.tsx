import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IllustrativeInterviewPreview } from "./illustrative-interview-preview";

function advance(milliseconds: number) {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
}

function stubMotionPreference(matches: boolean) {
  vi.stubGlobal("matchMedia", () => ({
    addEventListener: vi.fn(),
    matches,
    media: "(prefers-reduced-motion: reduce)",
    removeEventListener: vi.fn(),
  }));
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

  const setIntersection = (target: Element, isIntersecting: boolean) => {
    act(() => {
      callback?.(
        [{ isIntersecting, target } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
  };

  return { disconnect, observe, setIntersection };
}

describe("IllustrativeInterviewPreview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each([
    { preference: "no-preference", reduced: false },
    { preference: "reduce", reduced: true },
  ])(
    "waits for real viewport entry, then completes the first note with $preference",
    ({ reduced }) => {
      stubMotionPreference(reduced);
      const observer = stubIntersectionObserver();
      const { unmount } = render(<IllustrativeInterviewPreview />);
      advance(10_000);

      const preview = screen.getByRole("figure", {
        name: "Example interview",
      });
      const illustration = screen.getByRole("img", {
        name: /candidate behind a laptop during a Pilot conversation/iu,
      });
      const question = screen.getByLabelText(
        "What are your salary expectations?",
      );
      const answer = screen.getByLabelText("Around 25k–30k.");
      const firstNote = screen.getByText("Salary expectation").closest("li");

      expect(observer.observe).toHaveBeenCalledWith(preview);
      expect(preview).toHaveAttribute("data-entered-viewport", "false");
      expect(preview).toHaveAttribute("data-running", "false");
      expect(preview).toHaveAttribute("data-phase", "note");
      expect(firstNote).toHaveAttribute("data-created", "true");

      observer.setIntersection(preview, true);
      advance(0);

      expect(preview).toHaveAttribute("data-entered-viewport", "true");
      expect(preview).toHaveAttribute("data-running", "true");
      expect(preview).toHaveAttribute("data-phase", "question");
      expect(illustration).toHaveAttribute("data-pilot-speaking", "true");
      expect(illustration).toHaveAttribute("data-candidate-speaking", "false");
      expect(question.querySelector("mark")).toBeNull();
      expect(answer.querySelector("mark")).toBeNull();
      expect(firstNote).toHaveAttribute("data-created", "false");

      for (let word = 0; word < 5; word += 1) {
        advance(200);
      }
      advance(800);
      expect(preview).toHaveAttribute("data-phase", "answer");
      expect(illustration).toHaveAttribute("data-pilot-speaking", "false");
      expect(illustration).toHaveAttribute("data-candidate-speaking", "true");
      const questionHighlight = question.querySelector("mark");
      expect(questionHighlight).toHaveAttribute("data-highlighted", "false");

      for (let word = 0; word < 2; word += 1) {
        advance(200);
      }
      const answerHighlight = answer.querySelector("mark");
      expect(questionHighlight).toHaveAttribute("data-highlighted", "false");
      expect(answerHighlight).toHaveAttribute("data-highlighted", "false");

      advance(800);
      expect(preview).toHaveAttribute("data-phase", "highlight");
      expect(questionHighlight).toHaveAttribute("data-highlighted", "true");
      expect(answerHighlight).toHaveAttribute("data-highlighted", "true");
      expect(firstNote).toHaveAttribute("data-created", "false");

      advance(1_100);
      expect(preview).toHaveAttribute("data-phase", "note");
      expect(firstNote).toHaveAttribute("data-created", "true");

      unmount();
      expect(observer.disconnect).toHaveBeenCalledOnce();
    },
  );

  it("pauses the current phase offscreen and resumes it without resetting", () => {
    stubMotionPreference(false);
    const observer = stubIntersectionObserver();
    render(<IllustrativeInterviewPreview />);
    const preview = screen.getByRole("figure", { name: "Example interview" });

    observer.setIntersection(preview, true);
    advance(0);
    advance(200);
    const questionBeforePause = screen.getByLabelText(
      "What are your salary expectations?",
    ).textContent;

    observer.setIntersection(preview, false);
    advance(5_000);
    expect(preview).toHaveAttribute("data-phase", "question");
    expect(
      screen.getByLabelText("What are your salary expectations?").textContent,
    ).toBe(questionBeforePause);

    observer.setIntersection(preview, true);
    advance(200);
    expect(
      screen.getByLabelText("What are your salary expectations?").textContent,
    ).not.toBe(questionBeforePause);
  });

  it("keeps the truthful completed static frame when observers are unavailable", () => {
    stubMotionPreference(false);
    render(<IllustrativeInterviewPreview />);
    const preview = screen.getByRole("figure", { name: "Example interview" });
    const firstNote = screen.getByText("Salary expectation").closest("li");

    advance(30_000);

    expect(preview).toHaveAttribute("data-entered-viewport", "false");
    expect(preview).toHaveAttribute("data-running", "false");
    expect(preview).toHaveAttribute("data-phase", "note");
    expect(firstNote).toHaveAttribute("data-created", "true");
  });
});
