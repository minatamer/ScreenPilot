import { describe, expect, it } from "vitest";

import {
  aggregateVoicePerformance,
  createVoicePerformanceCollector,
  createVoicePerformanceReport,
  createVoicePerformanceTracker,
  type VoicePerformanceMetric,
  type VoicePerformanceSample,
} from "./voice-performance";

function samples(
  metric: VoicePerformanceMetric,
  durationMs: number,
  count = 50,
): readonly VoicePerformanceSample[] {
  return Array.from({ length: count }, (_, index) => ({
    completedAtMs: durationMs,
    durationMs,
    id: `voice-performance-${metric}-${String(index + 1)}`,
    metric,
    startedAtMs: 0,
  }));
}

function aggregateFor(
  metric: VoicePerformanceMetric,
  durationMs: number,
  count = 50,
) {
  return aggregateVoicePerformance(samples(metric, durationMs, count)).find(
    (aggregate) => aggregate.metric === metric,
  );
}

describe("voice performance measurements", () => {
  it("uses content-free identifiers and retains only timing fields", () => {
    let now = 100;
    const tracker = createVoicePerformanceTracker(() => now);
    const measurementId = tracker.begin("ttfa");
    now = 420;
    const sample = tracker.complete(measurementId);

    expect(measurementId).toBe("voice-performance-ttfa-1");
    expect(sample).toEqual({
      completedAtMs: 420,
      durationMs: 320,
      id: "voice-performance-ttfa-1",
      metric: "ttfa",
      startedAtMs: 100,
    });
    expect(Object.keys(sample ?? {}).sort()).toEqual([
      "completedAtMs",
      "durationMs",
      "id",
      "metric",
      "startedAtMs",
    ]);
  });

  it("requires the full deployed sample before assigning a release status", () => {
    expect(aggregateFor("ttfa", 700, 49)?.status).toBe("insufficient_sample");
    expect(aggregateFor("conversation_preparation", 400, 49)?.status).toBe(
      "insufficient_sample",
    );
  });

  it("evaluates event gates without inventing a 50-event requirement", () => {
    expect(aggregateFor("connect_request_to_ready", 3_000, 1)?.status).toBe(
      "target",
    );
    expect(aggregateFor("interruption_to_audio_stop", 401, 1)?.status).toBe(
      "release_blocked",
    );
  });

  it("applies TTFA target and release-blocker boundaries exactly", () => {
    expect(aggregateFor("ttfa", 800)?.status).toBe("target");
    expect(aggregateFor("ttfa", 801)?.status).toBe("needs_tuning");
    expect(aggregateFor("ttfa", 1_200)?.status).toBe("needs_tuning");
    expect(aggregateFor("ttfa", 1_201)?.status).toBe("release_blocked");

    const p95BlockedSamples = [
      ...samples("ttfa", 700, 47),
      ...samples("ttfa", 2_001, 3),
    ];
    expect(
      aggregateVoicePerformance(p95BlockedSamples).find(
        (aggregate) => aggregate.metric === "ttfa",
      ),
    ).toMatchObject({ p50Ms: 700, p95Ms: 2_001, status: "release_blocked" });
  });

  it.each([
    ["conversation_preparation", 500, 1_000],
    ["connect_request_to_ready", 3_000, 5_000],
    ["interruption_to_audio_stop", 250, 400],
    ["client_tool_to_card", 300, 600],
  ] as const)(
    "applies the %s p95 boundaries",
    (metric, targetMs, releaseBlockerMs) => {
      expect(aggregateFor(metric, targetMs)?.status).toBe("target");
      expect(aggregateFor(metric, targetMs + 1)?.status).toBe("needs_tuning");
      expect(aggregateFor(metric, releaseBlockerMs)?.status).toBe(
        "needs_tuning",
      );
      expect(aggregateFor(metric, releaseBlockerMs + 1)?.status).toBe(
        "release_blocked",
      );
    },
  );

  it("builds a repeatable profile report without candidate content", () => {
    const report = createVoicePerformanceReport([
      {
        batchId: "desktop-normal-01",
        deviceProfile: "desktop",
        networkProfile: "normal",
        providerRevision: "agtvrsn_synthetic018",
        sampleDate: "2026-09-15",
        samples: [
          ...samples("ttfa", 800),
          ...samples("conversation_preparation", 500),
          ...samples("connect_request_to_ready", 3_001, 1),
          ...samples("interruption_to_audio_stop", 401, 1),
          ...samples("client_tool_to_card", 300, 1),
        ],
        source: "live",
      },
    ]);

    expect(report).toMatchObject({
      batches: [
        {
          batchId: "desktop-normal-01",
          deviceProfile: "desktop",
          networkProfile: "normal",
          providerRevision: "agtvrsn_synthetic018",
          sampleDate: "2026-09-15",
        },
      ],
      source: "live",
      status: "release_blocked",
    });
    expect(report.outliers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: "connect_request_to_ready",
          severity: "above_target",
        }),
        expect.objectContaining({
          metric: "interruption_to_audio_stop",
          severity: "release_blocker",
        }),
      ]),
    );
    expect(JSON.stringify(report)).not.toMatch(
      /candidateText|transcript|cvText|insightValue|credential|token|payload/i,
    );
  });

  it("captures each completed timing sample into exactly one in-memory batch", () => {
    let now = 100;
    const tracker = createVoicePerformanceTracker(() => now);
    const collector = createVoicePerformanceCollector(tracker);
    const firstMeasurement = tracker.begin("connect_request_to_ready");
    now = 450;
    tracker.complete(firstMeasurement);

    const firstReport = collector.captureBatch({
      batchId: "desktop-normal-01",
      deviceProfile: "desktop",
      networkProfile: "normal",
      providerRevision: "agtvrsn_synthetic018",
      sampleDate: "2026-09-15",
      source: "fake",
    });

    expect(firstReport.batches).toEqual([
      expect.objectContaining({
        batchId: "desktop-normal-01",
        sampleCount: 1,
        samples: [
          expect.objectContaining({
            durationMs: 350,
            id: "voice-performance-connect_request_to_ready-1",
          }),
        ],
      }),
    ]);
    expect(collector.getUncapturedSampleCount()).toBe(0);

    const secondMeasurement = tracker.begin("client_tool_to_card");
    now = 700;
    tracker.complete(secondMeasurement);
    const secondReport = collector.captureBatch({
      batchId: "desktop-throttled-01",
      deviceProfile: "desktop",
      networkProfile: "throttled",
      providerRevision: "agtvrsn_synthetic018",
      sampleDate: "2026-09-15",
      source: "fake",
    });

    expect(secondReport.batches).toHaveLength(2);
    expect(secondReport.batches[1]).toMatchObject({
      batchId: "desktop-throttled-01",
      sampleCount: 1,
      samples: [
        expect.objectContaining({
          id: "voice-performance-client_tool_to_card-2",
        }),
      ],
    });
    expect(collector.getBatches()[0]?.samples).toHaveLength(1);
    expect(collector.getUncapturedSampleCount()).toBe(0);
  });

  it("refuses to blend fake samples into a live report", () => {
    const baseBatch = {
      batchId: "desktop-normal-01",
      deviceProfile: "desktop" as const,
      networkProfile: "normal" as const,
      providerRevision: "agtvrsn_synthetic018",
      sampleDate: "2026-09-15",
      samples: samples("ttfa", 800),
    };

    expect(() =>
      createVoicePerformanceReport([
        { ...baseBatch, source: "fake" },
        { ...baseBatch, batchId: "desktop-normal-02", source: "live" },
      ]),
    ).toThrow("Fake and live measurement batches cannot be mixed.");
  });

  it("rejects content-bearing IDs and incoherent timing samples", () => {
    const baseBatch = {
      batchId: "desktop-normal-01",
      deviceProfile: "desktop" as const,
      networkProfile: "normal" as const,
      providerRevision: "agtvrsn_synthetic018",
      sampleDate: "2026-09-15",
      source: "fake" as const,
    };
    const [ttfaSample] = samples("ttfa", 800, 1);
    if (!ttfaSample) {
      throw new Error("Expected a deterministic TTFA sample fixture.");
    }

    expect(() =>
      createVoicePerformanceReport([
        {
          ...baseBatch,
          samples: [
            {
              ...ttfaSample,
              id: "candidate-answer-was-great",
            },
          ],
        },
      ]),
    ).toThrow("Invalid content-free measurement ID.");

    expect(() =>
      createVoicePerformanceReport([
        {
          ...baseBatch,
          samples: [
            {
              ...ttfaSample,
              durationMs: 801,
            },
          ],
        },
      ]),
    ).toThrow("Invalid voice-performance timing sample.");
  });
});
