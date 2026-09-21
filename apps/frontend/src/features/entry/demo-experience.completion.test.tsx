import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createInitialDemoSessionState } from "@/features/session/demo-session.reducer";

import { DemoExperience } from "./demo-experience";

const sessionActions = vi.hoisted(() => ({
  clearSession: vi.fn(),
  completeInterview: vi.fn(),
  dispatch: vi.fn(),
  startOver: vi.fn(),
}));
const reviewFixture = vi.hoisted(() => ({
  voiceStatus: "ended",
}));
const router = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/features/session/use-demo-session", () => ({
  useDemoSession: () => ({
    ...sessionActions,
    state: {
      ...createInitialDemoSessionState(),
      hydrationStatus: "ready",
      stage: "review_ready",
      entryMode: "conversation_first",
      voice: {
        status: reviewFixture.voiceStatus,
        endedAt: "2026-09-21T09:15:00.000Z",
        ...(reviewFixture.voiceStatus === "failed"
          ? { endReason: "The voice connection was interrupted." }
          : {}),
      },
      transcript: [
        {
          id: "candidate-turn-1",
          sequence: 0,
          speaker: "candidate",
          status: "final",
          text: "I am looking for a collaborative product team.",
          occurredAt: "2026-09-21T09:10:00.000Z",
        },
      ],
    },
    storageStatus: "saved",
  }),
}));

describe("DemoExperience completion stage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reviewFixture.voiceStatus = "ended";
  });

  it("renders the reducer-owned local evidence review at the Review step", () => {
    render(<DemoExperience />);

    const workspace = screen
      .getByRole("region", { name: "Current demo stage" })
      .closest("section");
    expect(workspace).toHaveAttribute("data-stage", "review_ready");
    expect(document.querySelector(".sp-demo-shell")).toHaveClass(
      "sp-demo-shell--review",
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Review the evidence saved in this tab.",
      }),
    ).toBeVisible();
    expect(screen.getByText("Interview ended")).toBeVisible();
    expect(
      screen.getByText("I am looking for a collaborative product team."),
    ).toBeVisible();
    expect(screen.getByText("Review").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(router.replace).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Clear & return home" }),
    );
    expect(sessionActions.clearSession).toHaveBeenCalledOnce();
    expect(router.replace).toHaveBeenCalledWith("/");

    const header = document.querySelector(".sp-site-header");
    expect(header).not.toBeNull();
    expect(
      within(header as HTMLElement).getByRole("button", {
        name: "Clear & exit",
      }),
    ).toBeEnabled();
  });

  it("keeps a restored failed voice session visibly partial", () => {
    reviewFixture.voiceStatus = "failed";
    render(<DemoExperience />);

    expect(screen.getByText("Partial transcript")).toBeVisible();
    expect(
      screen.getByText(
        "The connection ended before a complete transcript was received.",
      ),
    ).toBeVisible();
    expect(screen.queryByText("Interview ended")).not.toBeInTheDocument();
  });
});
