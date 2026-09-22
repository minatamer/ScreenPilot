import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { SummarizeInterviewResponse } from "@screenpilot/contracts/api/interview-summary";
import type { InsightCard } from "@screenpilot/contracts/interview/insight-card";
import {
  SCREENING_SUMMARY_LIMITATIONS,
  SCREENING_SUMMARY_OVERVIEW,
  type ScreeningSummary,
} from "@screenpilot/contracts/interview/screening-summary";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";

import {
  TurnstileClientError,
  type ExecuteTurnstileChallenge,
} from "@/features/abuse-protection/turnstile-client";
import { createConversationFirstPlanFixture } from "@/test/conversation-first-plan.fixture";
import { TEST_PUBLIC_RUNTIME_CONFIG } from "@/test/cv-analysis.fixture";

import {
  InterviewEvidenceReview,
  type SummaryRequester,
} from "./interview-evidence-review";

const interviewerTurn: TranscriptTurn = {
  id: "pilot-turn-1",
  sequence: 0,
  speaker: "interviewer",
  status: "final",
  text: "What matters most in your next role?",
  occurredAt: "2026-09-21T09:09:55.000Z",
};

const candidateTurn: TranscriptTurn = {
  id: "candidate/turn 1",
  sequence: 1,
  speaker: "candidate",
  status: "final",
  text: "I want a collaborative role with room to keep learning.",
  occurredAt: "2026-09-21T09:10:00.000Z",
};

function candidateInsight(
  evidenceTurnIds: readonly string[] = [candidateTurn.id],
): InsightCard {
  return {
    id: "insight-1",
    category: "motivation",
    label: "Motivation / next role",
    value: "Collaborative team and continued learning",
    source: "Candidate",
    status: "confirmed",
    evidenceTurnIds: [...evidenceTurnIds],
    cvFactIds: [],
    createdAt: "2026-09-21T09:10:10.000Z",
    updatedAt: "2026-09-21T09:10:10.000Z",
  };
}

function availabilityInsight(): InsightCard {
  return {
    ...candidateInsight(),
    id: "insight-2",
    category: "availability",
    label: "Availability",
    value: "Available in four weeks",
  };
}

const plan = createConversationFirstPlanFixture();

const summary: ScreeningSummary = {
  overview: SCREENING_SUMMARY_OVERVIEW,
  rolePreference: {
    label: "Graphic Designer",
    status: "candidate_stated",
    evidenceTurnIds: [candidateTurn.id],
  },
  confirmedFacts: [
    {
      statement: "The candidate described collaboration as a priority.",
      evidenceTurnIds: [candidateTurn.id],
    },
  ],
  clarifications: [],
  topicsCovered: [
    {
      topicKey: "motivation_and_next_role",
      evidenceTurnIds: [candidateTurn.id],
    },
  ],
  topicsNotCovered: ["compensation_expectation"],
  communicationNotes: [],
  candidateQuestions: [],
  humanFollowups: [],
  limitations: [SCREENING_SUMMARY_LIMITATIONS[0]],
};

function baseProps() {
  return {
    entryMode: "conversation_first" as const,
    insights: [candidateInsight()],
    interviewGrant: "signed-interview-grant",
    isPartial: false,
    onFailure: vi.fn(),
    onRetry: vi.fn(),
    onReturnHome: vi.fn(() => true),
    onSummarySucceeded: vi.fn(),
    plan,
    runtimeConfig: TEST_PUBLIC_RUNTIME_CONFIG,
    stage: "review_ready" as const,
    storageStatus: "saved" as const,
    summary,
    topicProgress: [],
    transcript: [candidateTurn, interviewerTurn],
  };
}

describe("InterviewEvidenceReview", () => {
  it("previews the selected node in the center until another node replaces it or it is minimized", async () => {
    render(
      <InterviewEvidenceReview
        {...baseProps()}
        insights={[candidateInsight(), availabilityInsight()]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Conversation evidence map" }),
    ).toBeVisible();
    expect(
      screen.queryByText(/This review contains evidence captured/u),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/held only in this browser tab/u),
    ).not.toBeInTheDocument();
    const node = screen.getByRole("button", {
      name: /Motivation \/ next role.*Collaborative team/u,
    });
    expect(node).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByRole("heading", { name: "Conversation summary" }),
    ).toBeVisible();
    expect(screen.queryByText(interviewerTurn.text)).not.toBeInTheDocument();

    fireEvent.click(node);

    expect(node).toHaveAttribute("aria-expanded", "true");
    const detail = screen.getByRole("region", {
      name: "Expanded evidence for Motivation / next role",
    });
    expect(within(detail).getByText(interviewerTurn.text)).toBeVisible();
    expect(within(detail).getByText(candidateTurn.text)).toBeVisible();
    expect(
      within(detail).getByText(
        "The candidate described collaboration as a priority.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Conversation evidence map" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Conversation summary" }),
    ).not.toBeInTheDocument();

    const nextNode = screen.getByRole("button", {
      name: /Availability.*Available in four weeks/u,
    });
    fireEvent.click(nextNode);
    expect(node).toHaveAttribute("aria-expanded", "false");
    expect(nextNode).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("region", {
        name: "Expanded evidence for Availability",
      }),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Minimize evidence preview" }),
    );
    expect(nextNode).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByRole("heading", { name: "Conversation summary" }),
    ).toBeVisible();
    await waitFor(() => {
      expect(nextNode).toHaveFocus();
    });
    expect(screen.queryByText(/gpt/iu)).not.toBeInTheDocument();
  });

  it("labels missing question, answer, and related summary relationships instead of inferring them", () => {
    const partialTurn: TranscriptTurn = {
      ...candidateTurn,
      id: "partial-turn",
      status: "partial",
    };
    render(
      <InterviewEvidenceReview
        {...baseProps()}
        insights={[candidateInsight(["missing-turn", partialTurn.id])]}
        summary={undefined}
        transcript={[candidateTurn, partialTurn]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Motivation \/ next role/u }),
    );

    expect(screen.getByText("Question unavailable")).toBeVisible();
    expect(screen.getAllByText("Evidence unavailable").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("No connected summary note")).toBeVisible();
  });

  it("previews the latest correction turn while retaining earlier role evidence as history", () => {
    const originalQuestion: TranscriptTurn = {
      ...interviewerTurn,
      id: "pilot-role-original",
      sequence: 0,
      text: "Which role should this session use?",
    };
    const originalAnswer: TranscriptTurn = {
      ...candidateTurn,
      id: "candidate-role-original",
      sequence: 1,
      text: "Use Product Designer.",
    };
    const correctionQuestion: TranscriptTurn = {
      ...interviewerTurn,
      id: "pilot-role-correction",
      sequence: 2,
      text: "What should I correct about the role?",
    };
    const correctionAnswer: TranscriptTurn = {
      ...candidateTurn,
      id: "candidate-role-correction",
      sequence: 3,
      text: "Please correct that to Product Designer and Researcher.",
    };
    const correctedRole: InsightCard = {
      ...candidateInsight(),
      id: "insight-role",
      category: "role_preference",
      label: "Role preference",
      value: "Product Designer and Researcher",
      status: "corrected",
      evidenceTurnIds: [originalAnswer.id, correctionAnswer.id],
      correctionReason: "Candidate corrected the requested role wording.",
    };

    render(
      <InterviewEvidenceReview
        {...baseProps()}
        insights={[correctedRole]}
        summary={{
          ...summary,
          rolePreference: {
            label: correctedRole.value,
            status: "candidate_stated",
            evidenceTurnIds: [correctionAnswer.id],
          },
        }}
        transcript={[
          originalQuestion,
          originalAnswer,
          correctionQuestion,
          correctionAnswer,
        ]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Role preference.*Product Designer and Researcher/u,
      }),
    );

    const detail = screen.getByRole("region", {
      name: "Expanded evidence for Role preference",
    });
    expect(within(detail).getByText(correctionQuestion.text)).toBeVisible();
    expect(within(detail).getByText(correctionAnswer.text)).toBeVisible();
    expect(
      within(detail).queryByText(originalAnswer.text),
    ).not.toBeInTheDocument();
    expect(within(detail).getByText("Candidate · turn 2")).toBeVisible();
    expect(
      within(detail).getAllByText("Product Designer and Researcher"),
    ).toHaveLength(2);
  });

  it("executes a fresh summary challenge and sends the bounded local evidence", async () => {
    const executeChallenge = vi.fn<ExecuteTurnstileChallenge>((input) => {
      expect(input.action).toBe("interview_summary");
      return Promise.resolve("fresh-summary-token");
    });
    const response: SummarizeInterviewResponse = {
      summary,
      limitations: [],
      usage: {
        inputTokens: 500,
        outputTokens: 240,
        cachedInputTokens: 0,
        estimatedCostUsd: 0.001,
      },
    };
    let requestSignal: AbortSignal | undefined;
    let resolveSummary:
      ((value: SummarizeInterviewResponse) => void) | undefined;
    const summarize = vi.fn<SummaryRequester>((_input, signal) => {
      requestSignal = signal;
      return new Promise((resolve) => {
        resolveSummary = resolve;
      });
    });
    const props = baseProps();

    render(
      <InterviewEvidenceReview
        {...props}
        executeChallenge={executeChallenge}
        stage="summarizing"
        summary={undefined}
        summarize={summarize}
      />,
    );

    await waitFor(() => {
      expect(summarize).toHaveBeenCalledOnce();
    });
    expect(requestSignal?.aborted).toBe(false);
    expect(summarize).toHaveBeenCalledWith(
      expect.objectContaining({
        entryMode: "conversation_first",
        insights: props.insights,
        interviewGrant: "signed-interview-grant",
        transcript: props.transcript,
        turnstileToken: "fresh-summary-token",
      }),
      expect.any(AbortSignal),
    );
    resolveSummary?.(response);
    await waitFor(() => {
      expect(props.onSummarySucceeded).toHaveBeenCalledWith(response);
    });
  });

  it("preserves the map without exposing the full transcript when summary generation fails", () => {
    const props = baseProps();
    render(
      <InterviewEvidenceReview
        {...props}
        failure={{
          stage: "summarizing",
          code: "SUMMARY_FAILED",
          message: "The summary provider was unavailable.",
          retryable: true,
        }}
        stage="summarizing"
        summary={undefined}
      />,
    );

    expect(
      screen.getByText("The summary provider was unavailable."),
    ).toBeVisible();
    expect(screen.queryByText(candidateTurn.text)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Motivation \/ next role/u }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retry summary" }));
    expect(props.onRetry).toHaveBeenCalledOnce();
  });

  it("keeps evidence visible when the summary challenge fails", async () => {
    const executeChallenge = vi.fn<ExecuteTurnstileChallenge>(() =>
      Promise.reject(
        new TurnstileClientError(
          "TURNSTILE_REJECTED",
          "The anti-abuse check expired. Try it again.",
        ),
      ),
    );
    const props = baseProps();
    render(
      <InterviewEvidenceReview
        {...props}
        executeChallenge={executeChallenge}
        stage="summarizing"
        summary={undefined}
      />,
    );

    await waitFor(() => {
      expect(props.onFailure).toHaveBeenCalledWith({
        stage: "summarizing",
        code: "TURNSTILE_REJECTED",
        message: "The anti-abuse check expired. Try it again.",
        retryable: true,
      });
    });
    expect(screen.queryByText(candidateTurn.text)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Motivation \/ next role/u }),
    ).toBeVisible();
  });

  it("copies the human-readable review and confirms before clearing the session", async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: clipboard,
    });
    const props = baseProps();
    render(<InterviewEvidenceReview {...props} />);

    expect(
      within(
        screen.getByLabelText("Evidence for synthetic session role"),
      ).getByText("Candidate · turn 2"),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Copy summary" }));
    await waitFor(() => {
      expect(clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining(
          [
            "AI-organized notes — human interpretation required.",
            "",
            SCREENING_SUMMARY_OVERVIEW,
            "",
            "Synthetic session role",
            "- Graphic Designer",
            "- Candidate-stated context for this session, not a real vacancy.",
            "- Evidence: Candidate · turn 2",
          ].join("\n"),
        ),
      );
    });
    expect(screen.getByText("Summary copied to the clipboard.")).toBeVisible();

    const footerClear = screen.getAllByRole("button", {
      name: "Clear & exit",
    })[0];
    if (!footerClear) {
      throw new Error("Expected a Clear & exit action.");
    }
    fireEvent.click(footerClear);
    expect(
      screen.getByRole("heading", { name: "Clear this interview and exit?" }),
    ).toBeVisible();
    expect(props.onReturnHome).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Clear session" }));
    expect(props.onReturnHome).toHaveBeenCalledOnce();
  });

  it("keeps an absent partial-summary role distinct from an explicit undecided role", async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: clipboard,
    });
    const summaryWithoutRole = { ...summary };
    Reflect.deleteProperty(summaryWithoutRole, "rolePreference");

    render(
      <InterviewEvidenceReview
        {...baseProps()}
        isPartial
        summary={summaryWithoutRole}
      />,
    );

    expect(screen.getByText("Not established")).toBeVisible();
    expect(
      screen.getByText(
        "Role preference was not established in the available interview evidence.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Evidence unavailable")).toBeVisible();
    expect(screen.queryByText("Undecided")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy summary" }));
    await waitFor(() => {
      expect(clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining(
          [
            "Synthetic session role",
            "- Not established",
            "- Role preference was not established in the available interview evidence.",
            "- Evidence: Evidence unavailable",
          ].join("\n"),
        ),
      );
    });
    expect(clipboard.writeText).not.toHaveBeenCalledWith(
      expect.stringContaining("\n- Undecided\n"),
    );
  });

  it("shows explicit undecided role evidence in the review and copied summary", async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: clipboard,
    });

    render(
      <InterviewEvidenceReview
        {...baseProps()}
        summary={{
          ...summary,
          rolePreference: {
            label: null,
            status: "undecided",
            evidenceTurnIds: [candidateTurn.id],
          },
        }}
      />,
    );

    expect(screen.getByText("Undecided")).toBeVisible();
    expect(
      screen.getByText(
        "The candidate explicitly remained undecided for this session; no real vacancy is implied.",
      ),
    ).toBeVisible();
    expect(
      within(
        screen.getByLabelText("Evidence for synthetic session role"),
      ).getByText("Candidate · turn 2"),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Copy summary" }));
    await waitFor(() => {
      expect(clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining(
          [
            "Synthetic session role",
            "- Undecided",
            "- The candidate explicitly remained undecided for this session; no real vacancy is implied.",
            "- Evidence: Candidate · turn 2",
          ].join("\n"),
        ),
      );
    });
  });

  it("keeps CV-assisted provenance distinct without adding CV language to conversation-first", () => {
    const combinedInsight: InsightCard = {
      ...candidateInsight(),
      source: "CV + Candidate",
      cvFactIds: ["fact-1"],
    };
    render(
      <InterviewEvidenceReview
        {...baseProps()}
        cv={{
          displayName: "Synthetic Candidate",
          displayNameEvidence: "Synthetic Candidate",
          headline: "Product contributor",
          experienceLevel: "experienced",
          facts: [
            {
              id: "fact-1",
              category: "experience",
              statement: "Worked with cross-functional product teams.",
              evidenceExcerpt: "cross-functional product teams",
            },
          ],
          ambiguities: [],
          suggestedRole: null,
        }}
        entryMode="cv_assisted"
        insights={[combinedInsight]}
        plan={{ ...plan, entryMode: "cv_assisted" }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Motivation \/ next role/u }),
    );
    expect(screen.getAllByText("CV-assisted").length).toBeGreaterThan(0);
    expect(screen.getAllByText("CV + Candidate").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "CV source · Worked with cross-functional product teams.",
      ),
    ).toBeVisible();
  });
});
