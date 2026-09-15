import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createVoicePerformanceTracker } from "@/features/interview/voice-performance";
import { createConversationFirstPlanFixture } from "@/test/conversation-first-plan.fixture";

import { ConversationPreparationStage } from "./conversation-preparation-stage";

describe("ConversationPreparationStage timing", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("measures request invocation through the preparation response", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T10:00:00.000Z"));
    const performanceTracker = createVoicePerformanceTracker(() => Date.now());
    const response = {
      plan: createConversationFirstPlanFixture(),
      interviewGrant: "signed-synthetic-grant",
      expiresAt: "2026-09-15T10:15:00.000Z",
    };
    const onPrepared = vi.fn();
    const prepare = vi.fn(
      () =>
        new Promise<typeof response>((resolve) => {
          window.setTimeout(() => {
            resolve(response);
          }, 500);
        }),
    );

    render(
      <ConversationPreparationStage
        onBack={vi.fn()}
        onFailure={vi.fn()}
        onPrepared={onPrepared}
        onRetry={vi.fn()}
        performanceTracker={performanceTracker}
        prepare={prepare}
        requestIdFactory={() => "00000000-0000-4000-8000-000000000018"}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(onPrepared).toHaveBeenCalledWith(response);
    expect(
      performanceTracker
        .getSnapshot()
        .samples.find((sample) => sample.metric === "conversation_preparation"),
    ).toMatchObject({ durationMs: 500 });
  });
});
