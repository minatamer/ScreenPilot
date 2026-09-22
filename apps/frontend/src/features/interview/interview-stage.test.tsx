import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InterviewStage } from "./interview-stage";
import { createFillerPolicyState } from "./latency-filler-policy";
import {
  createVoicePerformanceCollector,
  createVoicePerformanceTracker,
} from "./voice-performance";

function getStatusRail(label: string): HTMLElement {
  const statusRail = screen
    .getAllByText(label)
    .map((element) => element.closest(".sp-interview-status-rail"))
    .find((element): element is HTMLElement => element instanceof HTMLElement);
  if (!(statusRail instanceof HTMLElement)) {
    throw new Error(`Expected the ${label} transcript status rail.`);
  }
  return statusRail;
}

describe("InterviewStage", () => {
  it("shows an understandable status, final caption, timer, and controls", () => {
    const onEnd = vi.fn();
    const onToggleMute = vi.fn();
    const rendered = render(
      <InterviewStage
        caption={{
          speaker: "candidate",
          stability: "final",
          text: "I am interested in a general first-stage conversation.",
          turnId: "voice-candidate-1",
        }}
        elapsedSeconds={65}
        entryMode="conversation_first"
        insights={[]}
        isMuted={false}
        onEnd={onEnd}
        onToggleMute={onToggleMute}
        phase="listening"
        topicProgress={[]}
        transcript={[]}
      />,
    );

    expect(
      screen.getByText("Step 4 of 5 · ScreenPilot interview"),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Pilot is interviewing",
      }),
    ).toBeVisible();
    const statusRail = getStatusRail("Listening to you");
    expect(within(statusRail).getByText("Listening to you")).toBeVisible();
    expect(statusRail).toHaveClass("sp-interview-status-rail");
    expect(statusRail.parentElement).toHaveClass("sp-interview-transcript");
    expect(
      statusRail.querySelector(".sp-interview-signal svg"),
    ).toBeInTheDocument();
    expect(
      rendered.container.querySelector(".sp-interview-stage__presence"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Your microphone is/iu)).not.toBeInTheDocument();
    expect(screen.getByText("Conversation-first")).toBeVisible();
    expect(screen.getByText("What ScreenPilot understood")).toBeVisible();
    expect(screen.getByText("Ready for candidate evidence")).toBeVisible();
    expect(screen.getByText("01:05")).toBeVisible();
    expect(
      screen.getByText(
        (_content, element) =>
          element?.tagName === "P" &&
          element.textContent ===
            "I am interested in a general first-stage conversation.",
      ),
    ).toBeVisible();

    const muteButton = screen.getByRole("button", { name: "Mute microphone" });
    expect(muteButton).toHaveAttribute("data-microphone-state", "on");
    expect(muteButton).toHaveTextContent("");
    fireEvent.click(muteButton);
    const endButton = screen.getByRole("button", { name: "End interview" });
    expect(
      endButton.querySelector(".sp-interview-controls__stop-icon"),
    ).toHaveAttribute("aria-hidden", "true");
    fireEvent.click(endButton);
    expect(onToggleMute).toHaveBeenCalledOnce();
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it("keeps the early wait free of a separate indicator and announces review text later", () => {
    const rendered = render(
      <InterviewStage
        caption={null}
        elapsedSeconds={2}
        entryMode="conversation_first"
        insights={[]}
        isMuted={false}
        latencyStage="visual"
        onEnd={vi.fn()}
        onToggleMute={vi.fn()}
        phase="listening"
        topicProgress={[]}
        transcript={[]}
      />,
    );

    expect(
      screen.queryByText("Reviewing your answer…"),
    ).not.toBeInTheDocument();
    expect(
      rendered.container.querySelector(".sp-interview-latency--visual"),
    ).not.toBeInTheDocument();

    rendered.rerender(
      <InterviewStage
        caption={null}
        elapsedSeconds={3}
        entryMode="conversation_first"
        insights={[]}
        isMuted={false}
        latencyStage="reviewing"
        onEnd={vi.fn()}
        onToggleMute={vi.fn()}
        phase="listening"
        topicProgress={[]}
        transcript={[]}
      />,
    );
    expect(
      within(getStatusRail("Reviewing your answer")).getByText(
        "Reviewing your answer",
      ),
    ).toBeVisible();
    expect(
      getStatusRail("Reviewing your answer").querySelector(
        ".sp-interview-signal",
      ),
    ).not.toBeInTheDocument();
  });

  it("keeps the interview surface stable and shows only the ending button spinner", () => {
    const rendered = render(
      <InterviewStage
        caption={null}
        elapsedSeconds={12}
        entryMode="cv_assisted"
        insights={[]}
        isMuted
        onEnd={vi.fn()}
        onToggleMute={vi.fn()}
        phase="reconnecting"
        topicProgress={[]}
        transcript={[]}
      />,
    );

    expect(
      within(getStatusRail("Reconnecting")).getByText("Reconnecting"),
    ).toBeVisible();
    expect(screen.queryByText("Reconnecting voice")).not.toBeInTheDocument();
    expect(
      getStatusRail("Reconnecting").querySelector(".sp-interview-signal"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Unmute microphone",
      }),
    ).toHaveAttribute("data-microphone-state", "off");

    rendered.rerender(
      <InterviewStage
        caption={null}
        elapsedSeconds={12}
        ending
        entryMode="cv_assisted"
        insights={[]}
        isMuted
        onEnd={vi.fn()}
        onToggleMute={vi.fn()}
        phase="listening"
        topicProgress={[]}
        transcript={[]}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Ending interview" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Ending interview" }),
    ).toHaveAttribute("aria-busy", "true");
    expect(
      screen
        .getByRole("button", { name: "Ending interview" })
        .querySelector(".sp-button__spinner"),
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole("button", { name: "Ending interview" })
        .querySelector(".sp-interview-controls__stop-icon"),
    ).not.toBeInTheDocument();
    expect(
      within(getStatusRail("Ending interview")).getByText("Ending interview"),
    ).toBeVisible();
    expect(
      getStatusRail("Ending interview").querySelector(".sp-interview-signal"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Unmute microphone",
      }),
    ).toBeDisabled();
  });

  it("renders the completed transcript and evidence as a read-only handoff", () => {
    const onViewSummary = vi.fn();
    render(
      <InterviewStage
        completed
        elapsedSeconds={480}
        entryMode="conversation_first"
        insights={[]}
        onViewSummary={onViewSummary}
        topicProgress={[]}
        transcript={[
          {
            id: "candidate-final",
            sequence: 0,
            speaker: "candidate",
            status: "final",
            text: "Keep this final answer visible after disconnect.",
            occurredAt: "2026-09-22T09:08:00.000Z",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Interview complete" }),
    ).toBeVisible();
    expect(getStatusRail("Interview complete")).toHaveTextContent(
      "Interview completeMicrophone disconnected",
    );
    expect(
      screen.getByText("Keep this final answer visible after disconnect."),
    ).toBeVisible();
    expect(screen.getByText("08:00")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /microphone/iu }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "End interview" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Pilot speaking")).not.toBeInTheDocument();
    expect(screen.queryByText("Listening to you")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View summary" }));
    expect(onViewSummary).toHaveBeenCalledOnce();
  });

  it("uses the compact waveform and speaking emphasis inside the transcript", () => {
    const rendered = render(
      <InterviewStage
        caption={{
          speaker: "interviewer",
          stability: "tentative",
          text: "Tell me what matters in your next role.",
          turnId: "pilot-live-1",
        }}
        elapsedSeconds={24}
        entryMode="conversation_first"
        insights={[]}
        isMuted={false}
        onEnd={vi.fn()}
        onToggleMute={vi.fn()}
        phase="speaking"
        topicProgress={[]}
        transcript={[]}
      />,
    );

    const statusRail = getStatusRail("Pilot speaking");
    const transcriptSurface = statusRail.parentElement;
    expect(within(statusRail).getByText("Pilot speaking")).toBeVisible();
    expect(
      statusRail.querySelectorAll(".sp-interview-signal > span"),
    ).toHaveLength(4);
    expect(transcriptSurface).toHaveAttribute("data-phase", "speaking");
    expect(
      rendered.container.querySelector(
        '.sp-live-captions__message[data-current="true"][data-speaker="interviewer"]',
      ),
    ).toBeInTheDocument();
  });

  it("captures an app-reachable content-free performance report", () => {
    let now = 100;
    const performanceTracker = createVoicePerformanceTracker(() => now);
    const measurementId = performanceTracker.begin("connect_request_to_ready");
    now = 450;
    performanceTracker.complete(measurementId);
    const performanceCollector =
      createVoicePerformanceCollector(performanceTracker);

    render(
      <InterviewStage
        caption={null}
        elapsedSeconds={12}
        entryMode="conversation_first"
        fillerPolicy={createFillerPolicyState()}
        insights={[]}
        isMuted={false}
        onEnd={vi.fn()}
        onToggleMute={vi.fn()}
        performanceCollector={performanceCollector}
        performanceSource="live"
        performanceTracker={performanceTracker}
        phase="listening"
        topicProgress={[]}
        transcript={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Batch ID"), {
      target: { value: "desktop-normal-01" },
    });
    fireEvent.change(screen.getByLabelText("Sample date"), {
      target: { value: "2026-09-15" },
    });
    fireEvent.change(screen.getByLabelText("Provider revision ID"), {
      target: { value: "agtvrsn_synthetic018" },
    });
    fireEvent.click(screen.getByText("Capture batch and build report"));

    const report = JSON.parse(
      screen.getByLabelText<HTMLTextAreaElement>(
        "Content-free performance report",
      ).value,
    ) as {
      batches: readonly { sampleCount: number }[];
      source: string;
    };
    expect(report).toMatchObject({
      batches: [{ sampleCount: 1 }],
      source: "live",
    });
    expect(JSON.stringify(report)).not.toMatch(/candidate|transcript|cvText/i);
  });
});
