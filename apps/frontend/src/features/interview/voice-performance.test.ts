import { describe, expect, it, vi } from "vitest";

import {
  aggregateVoicePerformance,
  createVoicePerformanceDiagnosticsExport,
  createVoicePerformanceTracker,
  type VoicePerformanceMetric,
  type VoicePerformanceSample,
} from "./voice-performance";

function sample(
  metric: VoicePerformanceMetric,
  durationMs: number,
  index: number,
): VoicePerformanceSample {
  return {
    completedAtMs: durationMs,
    clockOrigin: "performance_time_origin",
    durationMs,
    id: `voice-performance-${metric}-${String(index)}`,
    metric,
    startedAtMs: 0,
  };
}

describe("voice performance measurements", () => {
  it("uses content-free identifiers and retains only timing fields", () => {
    let now = 100;
    const tracker = createVoicePerformanceTracker(() => now);
    const measurementId = tracker.begin("ttfa");
    now = 420;
    const completedSample = tracker.complete(measurementId);

    expect(measurementId).toBe("voice-performance-ttfa-1");
    expect(completedSample).toEqual({
      completedAtMs: 420,
      clockOrigin: "performance_time_origin",
      durationMs: 320,
      id: "voice-performance-ttfa-1",
      metric: "ttfa",
      startedAtMs: 100,
    });
    expect(Object.keys(completedSample ?? {}).sort()).toEqual([
      "clockOrigin",
      "completedAtMs",
      "durationMs",
      "id",
      "metric",
      "startedAtMs",
    ]);
  });

  it("labels provider event timings with their Unix-epoch clock origin", () => {
    const tracker = createVoicePerformanceTracker();
    const measurementId = tracker.begin(
      "ttfa",
      1_790_155_000_000,
      "unix_epoch",
    );

    expect(tracker.complete(measurementId, 1_790_155_004_225)).toMatchObject({
      clockOrigin: "unix_epoch",
      durationMs: 4_225,
    });
  });

  it("reports informational aggregates for however many samples exist", () => {
    const aggregates = aggregateVoicePerformance([
      sample("ttfa", 900, 1),
      sample("ttfa", 100, 2),
      sample("ttfa", 500, 3),
      sample("conversation_preparation", 250, 4),
    ]);

    expect(aggregates.find(({ metric }) => metric === "ttfa")).toEqual({
      count: 3,
      metric: "ttfa",
      p50Ms: 500,
      p95Ms: 900,
    });
    expect(
      aggregates.find(({ metric }) => metric === "conversation_preparation"),
    ).toEqual({
      count: 1,
      metric: "conversation_preparation",
      p50Ms: 250,
      p95Ms: 250,
    });
    expect(
      aggregates.find(({ metric }) => metric === "client_tool_to_card"),
    ).toEqual({
      count: 0,
      metric: "client_tool_to_card",
      p50Ms: null,
      p95Ms: null,
    });
  });

  it("exports source-labelled raw timings without a quota or release verdict", () => {
    const tracker = createVoicePerformanceTracker();
    const measurementId = tracker.begin("connect_request_to_ready", 100);
    tracker.complete(measurementId, 450);

    const diagnosticsExport = createVoicePerformanceDiagnosticsExport(
      "fake",
      tracker.getSnapshot(),
    );

    expect(diagnosticsExport).toMatchObject({
      sampleCount: 1,
      source: "fake",
      samples: [
        {
          durationMs: 350,
          id: "voice-performance-connect_request_to_ready-1",
        },
      ],
    });
    expect(JSON.stringify(diagnosticsExport)).not.toMatch(
      /candidateText|transcript|cvText|insightValue|credential|token|payload|quota|release_blocked|insufficient_sample|status/i,
    );
  });

  it("clears observed samples while allowing an active timing to finish", () => {
    const tracker = createVoicePerformanceTracker();
    const listener = vi.fn();
    tracker.subscribe(listener);
    const completedMeasurement = tracker.begin("ttfa", 100);
    tracker.complete(completedMeasurement, 200);
    const activeMeasurement = tracker.begin("ttfa", 300);

    tracker.reset();

    expect(tracker.getSnapshot().samples).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(tracker.complete(activeMeasurement, 550)?.durationMs).toBe(250);
    expect(tracker.getSnapshot().samples).toHaveLength(1);
  });

  it("bounds retained timings and ignores canceled measurements", () => {
    const tracker = createVoicePerformanceTracker();
    for (let index = 0; index < 321; index += 1) {
      const measurementId = tracker.begin("client_tool_to_card", index);
      tracker.complete(measurementId, index + 1);
    }
    const canceledMeasurement = tracker.begin("ttfa", 1_000);
    tracker.cancel(canceledMeasurement);

    expect(tracker.complete(canceledMeasurement, 1_500)).toBeNull();
    expect(tracker.getSnapshot().samples).toHaveLength(320);
    expect(tracker.getSnapshot().samples[0]?.id).toBe(
      "voice-performance-client_tool_to_card-2",
    );
  });
});
