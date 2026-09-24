import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InterviewStage } from "./interview-stage";
import { createFillerPolicyState } from "./latency-filler-policy";
import { createVoicePerformanceTracker } from "./voice-performance";
import { isVoicePerformanceDiagnosticsEnabled } from "./voice-performance-diagnostics";

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
  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

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

  it("keeps View summary disabled with a spinner while background preparation is active", () => {
    const onViewSummary = vi.fn();
    const rendered = render(
      <InterviewStage
        completed
        elapsedSeconds={84}
        entryMode="cv_assisted"
        insights={[]}
        onViewSummary={onViewSummary}
        summaryPreparing
        topicProgress={[]}
        transcript={[]}
      />,
    );

    const waitingButton = screen.getByRole("button", {
      name: "Preparing summary. View summary will be available when ready.",
    });
    expect(waitingButton).toBeDisabled();
    expect(waitingButton).toHaveAttribute("aria-busy", "true");
    expect(waitingButton).toHaveTextContent("View summary");
    expect(
      waitingButton.querySelector(".sp-button__spinner"),
    ).toBeInTheDocument();
    fireEvent.click(waitingButton);
    expect(onViewSummary).not.toHaveBeenCalled();

    rendered.rerender(
      <InterviewStage
        completed
        elapsedSeconds={84}
        entryMode="cv_assisted"
        insights={[]}
        onViewSummary={onViewSummary}
        topicProgress={[]}
        transcript={[]}
      />,
    );

    const readyButton = screen.getByRole("button", { name: "View summary" });
    expect(readyButton).toBeEnabled();
    expect(readyButton).not.toHaveAttribute("aria-busy");
    fireEvent.click(readyButton);
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

  it("keeps local raw timing diagnostics available after fake completion", async () => {
    window.history.replaceState({}, "", "/?diagnostics=timings");
    let now = 100;
    const performanceTracker = createVoicePerformanceTracker(() => now);
    const measurementId = performanceTracker.begin("connect_request_to_ready");
    now = 450;
    performanceTracker.complete(measurementId);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <InterviewStage
        completed
        elapsedSeconds={12}
        entryMode="conversation_first"
        fillerPolicy={createFillerPolicyState()}
        insights={[]}
        onViewSummary={vi.fn()}
        performanceSource="fake"
        performanceTracker={performanceTracker}
        topicProgress={[]}
        transcript={[]}
      />,
    );

    expect(
      await screen.findByText("Local voice timing diagnostics"),
    ).toBeVisible();

    const diagnostics = JSON.parse(
      screen.getByLabelText<HTMLTextAreaElement>("Raw timing JSON").value,
    ) as {
      sampleCount: number;
      source: string;
    };
    expect(diagnostics).toMatchObject({
      sampleCount: 1,
      source: "fake",
    });
    expect(JSON.stringify(diagnostics)).not.toMatch(
      /candidate|transcript|cvText/i,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy JSON" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining('"source": "fake"'),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Reset timings" }));
    expect(
      JSON.parse(
        screen.getByLabelText<HTMLTextAreaElement>("Raw timing JSON").value,
      ),
    ).toMatchObject({ sampleCount: 0, source: "fake" });
  });

  it("keeps the timing query disabled away from loopback hosts", () => {
    expect(
      isVoicePerformanceDiagnosticsEnabled({
        hostname: "demo.example.com",
        search: "?diagnostics=timings",
      }),
    ).toBe(false);
  });
});
