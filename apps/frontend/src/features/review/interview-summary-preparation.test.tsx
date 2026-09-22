import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ExecuteTurnstileChallenge } from "@/features/abuse-protection/turnstile-client";
import { createConversationFirstPlanFixture } from "@/test/conversation-first-plan.fixture";

import {
  InterviewSummaryPreparation,
  type SummaryRequester,
} from "./interview-summary-preparation";

describe("InterviewSummaryPreparation", () => {
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
    const rendered = render(<InterviewSummaryPreparation {...props} />);

    await waitFor(() => {
      expect(summarize).toHaveBeenCalledOnce();
    });
    expect(onPendingChange).toHaveBeenCalledWith(true);
    expect(requestSignal?.aborted).toBe(false);

    rendered.rerender(
      <InterviewSummaryPreparation {...props} active={false} />,
    );
    rendered.rerender(<InterviewSummaryPreparation {...props} active />);
    await waitFor(() => {
      expect(executeChallenge).toHaveBeenCalledTimes(2);
    });
    expect(summarize).toHaveBeenCalledOnce();

    rendered.unmount();
    expect(requestSignal?.aborted).toBe(true);
  });
});
