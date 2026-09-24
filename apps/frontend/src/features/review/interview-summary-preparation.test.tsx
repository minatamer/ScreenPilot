import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ExecuteTurnstileChallenge } from "@/features/abuse-protection/turnstile-client";
import { createConversationFirstPlanFixture } from "@/test/conversation-first-plan.fixture";

import {
  InterviewSummaryPreparation,
  type SummaryRequester,
} from "./interview-summary-preparation";

describe("InterviewSummaryPreparation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps one request alive while the completed workspace changes to review", async () => {
    const executeChallenge = vi.fn<ExecuteTurnstileChallenge>(() =>
      Promise.resolve("fresh-summary-token"),
    );
    let requestSignal: AbortSignal | undefined;
    const summarize = vi.fn<SummaryRequester>((_input, signal) => {
      requestSignal = signal;
      return new Promise(() => undefined);
    });
    const onPendingChange = vi.fn();
    const props = {
      active: true,
      entryMode: "conversation_first" as const,
      executeChallenge,
      insights: [],
      interviewGrant: "signed-interview-grant",
      onFailure: vi.fn(),
      onPendingChange,
      onSummarySucceeded: vi.fn(),
      plan: createConversationFirstPlanFixture(),
      siteKey: "test-site-key",
      summarize,
      topicProgress: [],
      transcript: [
        {
          id: "candidate-turn-1",
          sequence: 0,
          speaker: "candidate" as const,
          status: "final" as const,
          text: "I prefer collaborative teams.",
          occurredAt: "2026-09-22T09:00:00.000Z",
        },
      ],
    };
    const rendered = render(
      <InterviewSummaryPreparation {...props} hidePassiveStatus />,
    );

    expect(
      screen.queryByText("Checking this request before it continues."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Anti-abuse check" }),
    ).toHaveAttribute("data-pending-status-hidden", "true");

    await waitFor(() => {
      expect(summarize).toHaveBeenCalledOnce();
    });
    expect(onPendingChange).toHaveBeenCalledWith(true);
    expect(requestSignal?.aborted).toBe(false);

    rendered.rerender(
      <InterviewSummaryPreparation
        {...props}
        active={false}
        hidePassiveStatus
      />,
    );
    rendered.rerender(
      <InterviewSummaryPreparation {...props} active hidePassiveStatus />,
    );
    await waitFor(() => {
      expect(executeChallenge).toHaveBeenCalledTimes(2);
    });
    expect(summarize).toHaveBeenCalledOnce();

    rendered.unmount();
    expect(requestSignal?.aborted).toBe(true);
  });

  it("preserves evidence and records only a sanitized category for an unknown requester failure", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {
      // The assertion below inspects the intentionally content-free payload.
    });
    const executeChallenge = vi.fn<ExecuteTurnstileChallenge>(() =>
      Promise.resolve("fresh-summary-token"),
    );
    const summarize = vi.fn<SummaryRequester>(() =>
      Promise.reject(new Error("PRIVATE PROVIDER OR CANDIDATE DETAIL")),
    );
    const onFailure = vi.fn();

    render(
      <InterviewSummaryPreparation
        active
        entryMode="conversation_first"
        executeChallenge={executeChallenge}
        insights={[]}
        interviewGrant="signed-interview-grant"
        onFailure={onFailure}
        onSummarySucceeded={vi.fn()}
        plan={createConversationFirstPlanFixture()}
        siteKey="test-site-key"
        summarize={summarize}
        topicProgress={[]}
        transcript={[
          {
            id: "candidate-turn-1",
            occurredAt: "2026-09-23T09:00:00.000Z",
            sequence: 0,
            speaker: "candidate",
            status: "final",
            text: "PRIVATE CANDIDATE EVIDENCE",
          },
        ]}
      />,
    );

    await waitFor(() => {
      expect(onFailure).toHaveBeenCalledWith({
        code: "SUMMARY_UNREACHABLE",
        message:
          "ScreenPilot could not organize the conversation. Your local evidence is still available.",
        retryable: true,
        stage: "summarizing",
      });
    });
    expect(consoleError).toHaveBeenCalledWith(
      "screenpilot_api_boundary_failure",
      { category: "unclassified", operation: "interview_summary" },
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("PRIVATE");
  });
});
