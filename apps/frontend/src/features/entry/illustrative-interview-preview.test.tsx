import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IllustrativeInterviewPreview } from "./illustrative-interview-preview";

function advance(milliseconds: number) {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
}

describe("IllustrativeInterviewPreview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", () => ({
      addEventListener: vi.fn(),
      matches: false,
      media: "(prefers-reduced-motion: reduce)",
      removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("finishes both lines, highlights both keywords together, then creates the note", () => {
    render(<IllustrativeInterviewPreview />);
    advance(0);

    const preview = screen.getByRole("figure", { name: "Example interview" });
    const illustration = screen.getByRole("img", {
      name: /candidate behind a laptop during a Pilot conversation/iu,
    });
    const question = screen.getByLabelText(
      "What are your salary expectations?",
    );
    const answer = screen.getByLabelText("Around 25k–30k.");
    const firstNote = screen.getByText("Salary expectation").closest("li");

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
  });
});
