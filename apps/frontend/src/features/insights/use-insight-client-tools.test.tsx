import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useInsightClientTools } from "./use-insight-client-tools";

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
});
