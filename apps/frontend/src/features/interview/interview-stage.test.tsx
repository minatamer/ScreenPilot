import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InterviewStage } from "./interview-stage";
import { createFillerPolicyState } from "./latency-filler-policy";
import {
  createVoicePerformanceCollector,
  createVoicePerformanceTracker,
} from "./voice-performance";

describe("InterviewStage", () => {
  it("shows an understandable status, final caption, timer, and controls", () => {
    const onEnd = vi.fn();
    const onToggleMute = vi.fn();
    render(
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

    expect(screen.getByText("ScreenPilot interview")).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Pilot is interviewing",
      }),
    ).toBeVisible();
    expect(screen.getByText("Pilot is listening…")).toBeVisible();
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

    fireEvent.click(
      screen.getByRole("button", { name: "Mute Pilot's microphone input" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "End interview" }));
    expect(onToggleMute).toHaveBeenCalledOnce();
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it("keeps the early wait visual-only and announces review text later", () => {
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
    ).toHaveAttribute("aria-hidden", "true");

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
    expect(screen.getByText("Reviewing your answer…")).toHaveAttribute(
      "role",
      "status",
    );
  });

  it("announces reconnecting and disables terminal controls while ending", () => {
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

    expect(screen.getByText("Reconnecting voice")).toBeVisible();
    expect(screen.getByText("Pilot is reconnecting…")).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Unmute Pilot's microphone input",
      }),
    ).toBeEnabled();

    rendered.rerender(
      <InterviewStage
        caption={null}
        elapsedSeconds={12}
        entryMode="cv_assisted"
        insights={[]}
        isMuted
        onEnd={vi.fn()}
        onToggleMute={vi.fn()}
        phase="ending"
        topicProgress={[]}
        transcript={[]}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Ending interview" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: "Unmute Pilot's microphone input",
      }),
    ).toBeDisabled();
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
