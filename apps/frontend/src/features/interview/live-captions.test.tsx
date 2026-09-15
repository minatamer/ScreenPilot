import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LiveCaptions } from "./live-captions";

describe("LiveCaptions", () => {
  const pilotTurn: TranscriptTurn = {
    id: "voice-interviewer-1",
    occurredAt: "2026-09-15T12:00:00.000Z",
    sequence: 1,
    speaker: "interviewer",
    status: "final",
    text: "What would you like to explore?",
  };

  it("renders Pilot text on the left and the candidate in a right-side bubble", () => {
    const rendered = render(
      <LiveCaptions
        caption={{
          speaker: "candidate",
          stability: "tentative",
          text: "I would like to explore",
          turnId: "voice-candidate-2",
        }}
        transcript={[pilotTurn]}
      />,
    );

    const panel = screen.getByRole("log");
    expect(panel).toHaveAttribute("aria-live", "off");
    expect(panel).toHaveAttribute("data-speaker", "candidate");
    expect(
      screen.queryByText(
        "Final captions become local review evidence in this tab.",
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Pilot")).toBeVisible();
    expect(screen.getByText("You")).toBeVisible();
    expect(screen.getByText("Listening…")).toBeVisible();
    expect(screen.getByText("I would like to explore")).toBeVisible();

    const pilotMessage = rendered.container.querySelector(
      '.sp-live-captions__message[data-speaker="interviewer"]',
    );
    const candidateMessage = rendered.container.querySelector(
      '.sp-live-captions__message[data-speaker="candidate"]',
    );
    const words =
      pilotMessage?.querySelectorAll(".sp-live-captions__word") ?? [];
    expect(words).toHaveLength(6);
    expect(words[5]?.getAttribute("style")).toContain("375ms");
    expect(
      candidateMessage?.querySelectorAll(".sp-live-captions__word"),
    ).toHaveLength(0);
    expect(candidateMessage).toHaveAttribute("data-current", "true");
  });

  it("auto-scrolls when either speaker adds caption text", async () => {
    const rendered = render(
      <LiveCaptions caption={null} transcript={[pilotTurn]} />,
    );
    const panel = screen.getByRole("log");
    Object.defineProperty(panel, "scrollHeight", {
      configurable: true,
      value: 480,
    });

    rendered.rerender(
      <LiveCaptions
        caption={{
          speaker: "candidate",
          stability: "tentative",
          text: "A newly received candidate caption",
          turnId: "voice-candidate-2",
        }}
        transcript={[pilotTurn]}
      />,
    );

    await waitFor(() => {
      expect(panel.scrollTop).toBe(480);
    });
  });

  it("labels a tentative Pilot caption as speaking", () => {
    render(
      <LiveCaptions
        caption={{
          speaker: "interviewer",
          stability: "tentative",
          text: "Tell me more",
          turnId: "voice-interviewer-3",
        }}
        transcript={[]}
      />,
    );

    expect(screen.getByText("Speaking…")).toBeVisible();
  });

  it("preserves tentative-to-final words but restarts a repeated same-speaker turn", () => {
    const rendered = render(
      <LiveCaptions
        caption={{
          speaker: "interviewer",
          stability: "tentative",
          text: "Tell me more",
          turnId: "voice-interviewer-7",
        }}
        transcript={[]}
      />,
    );

    const tentativeFirstWord = rendered.container.querySelector(
      ".sp-live-captions__word",
    );
    rendered.rerender(
      <LiveCaptions
        caption={{
          speaker: "interviewer",
          stability: "final",
          text: "Tell me more about that.",
          turnId: "voice-interviewer-7",
        }}
        transcript={[]}
      />,
    );
    expect(rendered.container.querySelector(".sp-live-captions__word")).toBe(
      tentativeFirstWord,
    );

    rendered.rerender(
      <LiveCaptions
        caption={{
          speaker: "interviewer",
          stability: "final",
          text: "Tell me more about your goals.",
          turnId: "voice-interviewer-8",
        }}
        transcript={[]}
      />,
    );
    expect(
      rendered.container.querySelector(".sp-live-captions__word"),
    ).not.toBe(tentativeFirstWord);
  });
});
