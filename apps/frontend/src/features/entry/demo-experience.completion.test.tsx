import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createInitialDemoSessionState } from "@/features/session/demo-session.reducer";
import { createConversationFirstPlanFixture } from "@/test/conversation-first-plan.fixture";
import { TEST_PUBLIC_RUNTIME_CONFIG } from "@/test/cv-analysis.fixture";

import { DemoExperience } from "./demo-experience";

const sessionActions = vi.hoisted(() => ({
  clearSession: vi.fn(),
  completeInterview: vi.fn(),
  dispatch: vi.fn(),
  startOver: vi.fn(),
}));
const reviewFixture = vi.hoisted(() => ({
  stage: "review_ready",
  voiceStatus: "ended",
}));
const router = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/features/review/interview-summary-preparation", () => ({
  InterviewSummaryPreparation: () => null,
}));

vi.mock("@/features/session/use-demo-session", () => ({
  useDemoSession: () => ({
    ...sessionActions,
    state: {
      ...createInitialDemoSessionState(),
      hydrationStatus: "ready",
      stage: reviewFixture.stage,
      entryMode: "conversation_first",
      interviewGrant: "signed-interview-grant",
      runtimeConfig: TEST_PUBLIC_RUNTIME_CONFIG,
      screeningPlan: createConversationFirstPlanFixture(),
      voice: {
        status: reviewFixture.voiceStatus,
        endedAt: "2026-09-21T09:15:00.000Z",
        ...(reviewFixture.voiceStatus === "failed"
          ? { endReason: "The voice connection was interrupted." }
          : {}),
      },
      ...(reviewFixture.stage === "interview_complete"
        ? {
            interviewCompletion: {
              reason: "time_limit",
              elapsedSeconds: 480,
            },
          }
        : {}),
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
    sessionActions.clearSession.mockReturnValue(true);
    reviewFixture.voiceStatus = "ended";
    reviewFixture.stage = "review_ready";
  });

  it("keeps the review open and reports when browser cleanup fails", () => {
    sessionActions.clearSession.mockReturnValue(false);
    render(<DemoExperience />);

    const footerClear = screen
      .getAllByRole("button", { name: "Clear & exit" })
      .at(-1);
    if (!footerClear) {
      throw new Error("Expected the review Clear & exit action.");
    }
    fireEvent.click(footerClear);
    fireEvent.click(screen.getByRole("button", { name: "Clear session" }));

    expect(sessionActions.clearSession).toHaveBeenCalledOnce();
    expect(router.replace).not.toHaveBeenCalled();
    expect(
      screen.getByText(/could not remove this session from the browser/u),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Your conversation, organized as connected evidence.",
      }),
    ).toBeVisible();
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
        name: "Your conversation, organized as connected evidence.",
      }),
    ).toBeVisible();
    expect(
      screen.queryByText("I am looking for a collaborative product team."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "No insight nodes were finalized before the interview ended. The local evidence available for this review is limited.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Step 5 of 5 · Interview review")).toBeVisible();
    expect(router.replace).not.toHaveBeenCalled();

    const clearActions = screen.getAllByRole("button", {
      name: "Clear & exit",
    });
    const footerClear = clearActions.at(-1);
    if (!footerClear) {
      throw new Error("Expected the review Clear & exit action.");
    }
    fireEvent.click(footerClear);
    expect(sessionActions.clearSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Clear session" }));
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

    expect(
      screen.getByText("Step 5 of 5 · Partial interview review"),
    ).toBeVisible();
    expect(
      screen.queryByText(/The connection ended before complete interview/u),
    ).not.toBeInTheDocument();
  });

  it("keeps completed evidence visible with a disconnected microphone until summary is requested", () => {
    reviewFixture.stage = "interview_complete";
    render(<DemoExperience />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Interview complete" }),
    ).toBeVisible();
    expect(screen.getByText("Microphone disconnected")).toBeVisible();
    expect(screen.getByText("08:00")).toBeVisible();
    expect(
      screen.getByText("I am looking for a collaborative product team."),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "What ScreenPilot understood" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Mute microphone" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "End interview" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View summary" }));
    expect(sessionActions.dispatch).toHaveBeenCalledWith({
      type: "VIEW_SUMMARY",
    });
  });
});
