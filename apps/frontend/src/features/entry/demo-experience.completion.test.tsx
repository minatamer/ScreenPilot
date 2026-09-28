import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ScreeningSummary } from "@screenpilot/contracts/interview/screening-summary";

import { createInitialDemoSessionState } from "@/features/session/demo-session.reducer";
import { createConversationFirstPlanFixture } from "@/test/conversation-first-plan.fixture";
import { TEST_PUBLIC_RUNTIME_CONFIG } from "@/test/cv-analysis.fixture";

import { DemoExperience } from "./demo-experience";

interface ReviewFixture {
  effectiveMode: "deterministic_fake" | "summary_rehearsal";
  runtimeConfigStatus: "failed" | "pending" | "ready";
  summaryReady: boolean;
  stage: "interview_complete" | "review_ready" | "summarizing";
  voiceStatus: "ended" | "failed";
}

const sessionActions = vi.hoisted(() => ({
  clearSession: vi.fn(),
  completeInterview: vi.fn(),
  dispatch: vi.fn(),
  startOver: vi.fn(),
}));
const reviewFixture = vi.hoisted((): ReviewFixture => ({
  effectiveMode: "deterministic_fake",
  runtimeConfigStatus: "ready",
  summaryReady: false,
  stage: "review_ready",
  voiceStatus: "ended",
}));
const summaryPreparationRender = vi.hoisted(() => vi.fn());
const retryRuntimeConfig = vi.hoisted(() => vi.fn());
const router = vi.hoisted(() => ({
  replace: vi.fn(),
}));
const completedSummary: ScreeningSummary = {
  overview: "Key conversation points, organized for review.",
  confirmedFacts: [],
  clarifications: [],
  topicsCovered: [],
  topicsNotCovered: [],
  communicationNotes: [],
  candidateQuestions: [],
  humanFollowups: [],
  limitations: ["These AI-organized notes require human review."],
};

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/features/review/interview-summary-preparation", () => ({
  InterviewSummaryPreparation: (props: { active: boolean }) => {
    summaryPreparationRender(props);
    return null;
  },
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
      runtimeConfig:
        reviewFixture.effectiveMode === "summary_rehearsal"
          ? {
              ...TEST_PUBLIC_RUNTIME_CONFIG,
              abuseProtection: {
                ...TEST_PUBLIC_RUNTIME_CONFIG.abuseProtection,
                siteKey: "summary-rehearsal-site-key",
              },
              effectiveMode: "summary_rehearsal",
              paidOperationsEnabled: true,
              providerMode: "live",
            }
          : TEST_PUBLIC_RUNTIME_CONFIG,
      screeningPlan: createConversationFirstPlanFixture(),
      ...(reviewFixture.summaryReady ? { summary: completedSummary } : {}),
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
              elapsedSeconds: 300,
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

vi.mock("./use-demo-bootstrap", () => ({
  useDemoBootstrap: () => ({
    retryRuntimeConfig,
    runtimeConfigStatus: reviewFixture.runtimeConfigStatus,
  }),
}));

describe("DemoExperience completion stage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionActions.clearSession.mockReturnValue(true);
    reviewFixture.effectiveMode = "deterministic_fake";
    reviewFixture.runtimeConfigStatus = "ready";
    reviewFixture.summaryReady = false;
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

  it("keeps completed evidence visible and disables View summary until background preparation finishes", () => {
    reviewFixture.stage = "interview_complete";
    const rendered = render(<DemoExperience />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Interview complete" }),
    ).toBeVisible();
    expect(screen.getByText("Microphone disconnected")).toBeVisible();
    expect(screen.getByText("05:00")).toBeVisible();
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
    expect(summaryPreparationRender).toHaveBeenCalledOnce();
    expect(summaryPreparationRender).toHaveBeenCalledWith(
      expect.objectContaining({ active: true }),
    );

    const waitingButton = screen.getByRole("button", {
      name: "Preparing summary. View summary will be available when ready.",
    });
    expect(waitingButton).toBeDisabled();
    expect(waitingButton).toHaveTextContent("View summary");
    expect(
      waitingButton.querySelector(".sp-button__spinner"),
    ).toBeInTheDocument();
    fireEvent.click(waitingButton);
    expect(sessionActions.dispatch).not.toHaveBeenCalledWith({
      type: "VIEW_SUMMARY",
    });

    reviewFixture.summaryReady = true;
    rendered.rerender(<DemoExperience />);
    fireEvent.click(screen.getByRole("button", { name: "View summary" }));
    expect(sessionActions.dispatch).toHaveBeenCalledWith({
      type: "VIEW_SUMMARY",
    });
    expect(summaryPreparationRender).toHaveBeenLastCalledWith(
      expect.objectContaining({ active: false }),
    );
  });

  it("uses the same silent background preparation in summary rehearsal", () => {
    reviewFixture.effectiveMode = "summary_rehearsal";
    reviewFixture.stage = "interview_complete";

    render(<DemoExperience />);

    expect(summaryPreparationRender).toHaveBeenCalledOnce();
    expect(summaryPreparationRender).toHaveBeenCalledWith(
      expect.objectContaining({ active: true, hidePassiveStatus: true }),
    );
    expect(
      screen.getByRole("button", {
        name: "Preparing summary. View summary will be available when ready.",
      }),
    ).toBeDisabled();
  });

  it("starts summary rehearsal only after the reducer enters summarizing", () => {
    reviewFixture.effectiveMode = "summary_rehearsal";
    reviewFixture.stage = "summarizing";

    render(<DemoExperience />);

    expect(summaryPreparationRender).toHaveBeenCalledOnce();
    expect(summaryPreparationRender).toHaveBeenCalledWith(
      expect.objectContaining({ active: true }),
    );
  });
});
