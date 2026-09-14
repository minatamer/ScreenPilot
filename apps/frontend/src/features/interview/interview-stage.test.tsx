import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InterviewStage } from "./interview-stage";

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
        }}
        elapsedSeconds={65}
        entryMode="conversation_first"
        isMuted={false}
        onEnd={onEnd}
        onToggleMute={onToggleMute}
        phase="listening"
      />,
    );

    expect(screen.getByText("Pilot is listening…")).toBeVisible();
    expect(screen.getByText("Conversation-first")).toBeVisible();
    expect(screen.getByText("01:05")).toBeVisible();
    expect(
      screen.getByText(
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

  it("announces reconnecting and disables terminal controls while ending", () => {
    const rendered = render(
      <InterviewStage
        caption={null}
        elapsedSeconds={12}
        entryMode="cv_assisted"
        isMuted
        onEnd={vi.fn()}
        onToggleMute={vi.fn()}
        phase="reconnecting"
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
        isMuted
        onEnd={vi.fn()}
        onToggleMute={vi.fn()}
        phase="ending"
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
});
