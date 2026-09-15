import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InsightCard } from "@screenpilot/contracts/interview/insight-card";

import { useInsightClientTools } from "./use-insight-client-tools";
import { createVoicePerformanceTracker } from "@/features/interview/voice-performance";

describe("useInsightClientTools", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the immediate final turn eligible and confirms an appearing card", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T08:00:00.000Z"));
    const onFinalTranscriptTurn = vi.fn();
    const onInsight = vi.fn();
    const rendered = renderHook(() =>
      useInsightClientTools({
        entryMode: "conversation_first",
        insights: [],
        onFinalTranscriptTurn,
        onInsight,
        onTopicProgress: vi.fn(),
        topicProgress: [],
        transcript: [],
      }),
    );

    act(() => {
      rendered.result.current.onFinalTranscriptTurn({
        id: "turn-1",
        sequence: 1,
        speaker: "candidate",
        status: "final",
        text: "I can start in four weeks.",
        occurredAt: "2026-09-15T08:00:00.000Z",
      });
      void rendered.result.current.clientTools.recordInsight({
        category: "availability",
        label: "Availability",
        value: "Available in four weeks",
        source: "Candidate",
      });
    });

    expect(onFinalTranscriptTurn).toHaveBeenCalledOnce();
    expect(onInsight).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "appearing" }),
    );

    act(() => {
      vi.advanceTimersByTime(420);
    });
    expect(onInsight).toHaveBeenLastCalledWith(
      expect.objectContaining({
        category: "availability",
        status: "confirmed",
      }),
    );
  });

  it("measures an applied client tool through the committed card render", () => {
    let now = 100;
    const performanceTracker = createVoicePerformanceTracker(() => now);
    let publishedInsight: InsightCard | undefined;
    const onInsight = vi.fn((insight: InsightCard) => {
      publishedInsight = insight;
    });
    const sharedOptions = {
      entryMode: "conversation_first" as const,
      onFinalTranscriptTurn: vi.fn(),
      onInsight,
      onTopicProgress: vi.fn(),
      performanceTracker,
      topicProgress: [],
      transcript: [],
    };
    const rendered = renderHook(
      ({ insights }: { insights: readonly InsightCard[] }) =>
        useInsightClientTools({ ...sharedOptions, insights }),
      {
        initialProps: { insights: [] as readonly InsightCard[] },
      },
    );

    act(() => {
      rendered.result.current.onFinalTranscriptTurn({
        id: "turn-1",
        sequence: 1,
        speaker: "candidate",
        status: "final",
        text: "I can start in four weeks.",
        occurredAt: "2026-09-15T08:00:00.000Z",
      });
      void rendered.result.current.clientTools.recordInsight({
        category: "availability",
        label: "Availability",
        value: "Available in four weeks",
        source: "Candidate",
      });
    });
    expect(performanceTracker.getSnapshot().samples).toHaveLength(0);

    now = 220;
    expect(publishedInsight).toBeDefined();
    rendered.rerender({ insights: publishedInsight ? [publishedInsight] : [] });

    expect(
      performanceTracker
        .getSnapshot()
        .samples.find((sample) => sample.metric === "client_tool_to_card"),
    ).toMatchObject({ durationMs: 120 });
  });
});
