import { VOICE_PERFORMANCE_GATES } from "@screenpilot/contracts/interview/voice-performance-policy";

export type VoicePerformanceMetric =
  | "conversation_preparation"
  | "connect_request_to_ready"
  | "ttfa"
  | "interruption_to_audio_stop"
  | "client_tool_to_card";

export type VoicePerformanceSample = Readonly<{
  completedAtMs: number;
  durationMs: number;
  id: string;
  metric: VoicePerformanceMetric;
  startedAtMs: number;
}>;

export type VoicePerformanceStatus =
  "insufficient_sample" | "target" | "needs_tuning" | "release_blocked";

export type VoicePerformanceAggregate = Readonly<{
  count: number;
  metric: VoicePerformanceMetric;
  p50Ms: number | null;
  p95Ms: number | null;
  status: VoicePerformanceStatus;
}>;

export type VoicePerformanceSnapshot = Readonly<{
  aggregates: readonly VoicePerformanceAggregate[];
  samples: readonly VoicePerformanceSample[];
}>;

export type VoicePerformanceBatch = Readonly<{
  batchId: string;
  deviceProfile: "desktop" | "mobile";
  networkProfile: "normal" | "throttled";
  providerRevision: string;
  sampleDate: string;
  samples: readonly VoicePerformanceSample[];
  source: "fake" | "live";
}>;

export type VoicePerformanceBatchMetadata = Omit<
  VoicePerformanceBatch,
  "samples"
>;

export type VoicePerformanceOutlier = Readonly<{
  batchId: string;
  durationMs: number;
  measurementId: string;
  metric: VoicePerformanceMetric;
  severity: "above_target" | "release_blocker";
}>;

export type VoicePerformanceReport = Readonly<{
  aggregates: readonly VoicePerformanceAggregate[];
  batches: readonly Readonly<{
    batchId: string;
    deviceProfile: VoicePerformanceBatch["deviceProfile"];
    networkProfile: VoicePerformanceBatch["networkProfile"];
    providerRevision: string;
    sampleCount: number;
    sampleDate: string;
    samples: readonly VoicePerformanceSample[];
  }>[];
  outliers: readonly VoicePerformanceOutlier[];
  source: VoicePerformanceBatch["source"];
  status: "insufficient_sample" | "pass" | "needs_tuning" | "release_blocked";
}>;

export type VoicePerformanceTracker = Readonly<{
  begin: (metric: VoicePerformanceMetric, startedAtMs?: number) => string;
  cancel: (measurementId: string) => void;
  complete: (
    measurementId: string,
    completedAtMs?: number,
  ) => VoicePerformanceSample | null;
  completeOldest: (
    metric: VoicePerformanceMetric,
    completedAtMs?: number,
  ) => VoicePerformanceSample | null;
  getSnapshot: () => VoicePerformanceSnapshot;
  subscribe: (listener: () => void) => () => void;
}>;

export type VoicePerformanceCollector = Readonly<{
  captureBatch: (
    metadata: VoicePerformanceBatchMetadata,
  ) => VoicePerformanceReport;
  getBatches: () => readonly VoicePerformanceBatch[];
  getReport: () => VoicePerformanceReport | null;
  getUncapturedSampleCount: () => number;
  reset: () => void;
}>;

const METRIC_ORDER = [
  "conversation_preparation",
  "connect_request_to_ready",
  "ttfa",
  "interruption_to_audio_stop",
  "client_tool_to_card",
] as const satisfies readonly VoicePerformanceMetric[];

const MAX_RETAINED_SAMPLES = 320;
const MAX_PENDING_MEASUREMENTS = 32;
const MAX_REPORT_BATCHES = 16;
const MAX_REPORT_SAMPLES_PER_BATCH = 320;
const REQUIRED_DEPLOYED_TURN_SAMPLE = 50;
const REQUIRED_DEPLOYED_PREPARATION_SAMPLE = 50;

function percentile(
  sortedDurations: readonly number[],
  percentileValue: number,
): number | null {
  if (sortedDurations.length === 0) {
    return null;
  }
  const rank = Math.max(
    0,
    Math.ceil(percentileValue * sortedDurations.length) - 1,
  );
  return sortedDurations[rank] ?? null;
}

function aggregateStatus(
  metric: VoicePerformanceMetric,
  count: number,
  p50Ms: number | null,
  p95Ms: number | null,
): VoicePerformanceStatus {
  const requiredSample =
    metric === "ttfa"
      ? REQUIRED_DEPLOYED_TURN_SAMPLE
      : metric === "conversation_preparation"
        ? REQUIRED_DEPLOYED_PREPARATION_SAMPLE
        : 1;
  if (count < requiredSample || p50Ms === null || p95Ms === null) {
    return "insufficient_sample";
  }
  if (metric === "ttfa") {
    if (
      p50Ms > VOICE_PERFORMANCE_GATES.ttfa_p50.releaseBlockerMs ||
      p95Ms > VOICE_PERFORMANCE_GATES.ttfa_p95.releaseBlockerMs
    ) {
      return "release_blocked";
    }
    if (
      p50Ms <= VOICE_PERFORMANCE_GATES.ttfa_p50.targetMs &&
      p95Ms <= VOICE_PERFORMANCE_GATES.ttfa_p95.targetMs
    ) {
      return "target";
    }
    return "needs_tuning";
  }

  const gate = VOICE_PERFORMANCE_GATES[metric];
  if (p95Ms > gate.releaseBlockerMs) {
    return "release_blocked";
  }
  return p95Ms <= gate.targetMs ? "target" : "needs_tuning";
}

function metricOutlierThresholds(metric: VoicePerformanceMetric) {
  if (metric === "ttfa") {
    return {
      releaseBlockerMs: VOICE_PERFORMANCE_GATES.ttfa_p95.releaseBlockerMs,
      targetMs: VOICE_PERFORMANCE_GATES.ttfa_p95.targetMs,
    };
  }
  return VOICE_PERFORMANCE_GATES[metric];
}

function assertReportField(value: string, name: string, pattern: RegExp) {
  if (!pattern.test(value)) {
    throw new TypeError(`Invalid content-free ${name}.`);
  }
}

function assertReportSample(sample: VoicePerformanceSample) {
  if (!METRIC_ORDER.some((metric) => metric === sample.metric)) {
    throw new TypeError("Invalid voice-performance metric.");
  }
  const measurementPrefix = `voice-performance-${sample.metric}-`;
  if (
    !sample.id.startsWith(measurementPrefix) ||
    !/^[1-9]\d*$/u.test(sample.id.slice(measurementPrefix.length))
  ) {
    throw new TypeError("Invalid content-free measurement ID.");
  }
  if (
    !Number.isFinite(sample.startedAtMs) ||
    !Number.isFinite(sample.completedAtMs) ||
    !Number.isFinite(sample.durationMs) ||
    sample.completedAtMs < sample.startedAtMs ||
    sample.durationMs < 0 ||
    sample.durationMs !== sample.completedAtMs - sample.startedAtMs
  ) {
    throw new TypeError("Invalid voice-performance timing sample.");
  }
}

export function createVoicePerformanceReport(
  batches: readonly VoicePerformanceBatch[],
): VoicePerformanceReport {
  if (batches.length === 0) {
    throw new TypeError("At least one measurement batch is required.");
  }
  if (batches.length > MAX_REPORT_BATCHES) {
    throw new RangeError("Too many measurement batches.");
  }
  const source = batches[0]?.source;
  if (source !== "fake" && source !== "live") {
    throw new TypeError("Invalid measurement source.");
  }
  if (batches.some((batch) => batch.source !== source)) {
    throw new TypeError("Fake and live measurement batches cannot be mixed.");
  }
  const batchIds = new Set<string>();
  for (const batch of batches) {
    assertReportField(batch.batchId, "batch ID", /^[a-z0-9][a-z0-9-]{0,63}$/u);
    if (batchIds.has(batch.batchId)) {
      throw new TypeError("Measurement batch IDs must be unique.");
    }
    batchIds.add(batch.batchId);
    assertReportField(
      batch.providerRevision,
      "provider revision",
      /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u,
    );
    assertReportField(batch.sampleDate, "sample date", /^\d{4}-\d{2}-\d{2}$/u);
    const deviceProfile: unknown = batch.deviceProfile;
    if (deviceProfile !== "desktop" && deviceProfile !== "mobile") {
      throw new TypeError("Invalid device profile.");
    }
    const networkProfile: unknown = batch.networkProfile;
    if (networkProfile !== "normal" && networkProfile !== "throttled") {
      throw new TypeError("Invalid network profile.");
    }
    const normalizedSampleDate = new Date(`${batch.sampleDate}T00:00:00.000Z`);
    if (
      Number.isNaN(normalizedSampleDate.valueOf()) ||
      normalizedSampleDate.toISOString().slice(0, 10) !== batch.sampleDate
    ) {
      throw new TypeError("Invalid content-free sample date.");
    }
    if (batch.samples.length > MAX_REPORT_SAMPLES_PER_BATCH) {
      throw new RangeError("Too many measurement samples in one batch.");
    }
    for (const sample of batch.samples) {
      assertReportSample(sample);
    }
  }

  const samples = batches.flatMap((batch) => batch.samples);
  const aggregates = aggregateVoicePerformance(samples);
  const outliers = batches.flatMap((batch) =>
    batch.samples.flatMap<VoicePerformanceOutlier>((sample) => {
      const thresholds = metricOutlierThresholds(sample.metric);
      if (sample.durationMs > thresholds.releaseBlockerMs) {
        return [
          {
            batchId: batch.batchId,
            durationMs: sample.durationMs,
            measurementId: sample.id,
            metric: sample.metric,
            severity: "release_blocker",
          },
        ];
      }
      return sample.durationMs > thresholds.targetMs
        ? [
            {
              batchId: batch.batchId,
              durationMs: sample.durationMs,
              measurementId: sample.id,
              metric: sample.metric,
              severity: "above_target",
            },
          ]
        : [];
    }),
  );
  const statuses = aggregates.map((aggregate) => aggregate.status);
  const status: VoicePerformanceReport["status"] = statuses.includes(
    "release_blocked",
  )
    ? "release_blocked"
    : statuses.includes("insufficient_sample")
      ? "insufficient_sample"
      : statuses.includes("needs_tuning")
        ? "needs_tuning"
        : "pass";

  return {
    aggregates,
    batches: batches.map((batch) => ({
      batchId: batch.batchId,
      deviceProfile: batch.deviceProfile,
      networkProfile: batch.networkProfile,
      providerRevision: batch.providerRevision,
      sampleCount: batch.samples.length,
      sampleDate: batch.sampleDate,
      samples: batch.samples,
    })),
    outliers,
    source,
    status,
  };
}

export function createVoicePerformanceCollector(
  tracker: VoicePerformanceTracker,
): VoicePerformanceCollector {
  let batches: readonly VoicePerformanceBatch[] = [];
  let capturedMeasurementIds = new Set<string>();

  return Object.freeze({
    captureBatch: (metadata: VoicePerformanceBatchMetadata) => {
      const uncapturedSamples = tracker
        .getSnapshot()
        .samples.filter((sample) => !capturedMeasurementIds.has(sample.id));
      if (uncapturedSamples.length === 0) {
        throw new TypeError("No new content-free timing samples to capture.");
      }
      const nextBatch: VoicePerformanceBatch = {
        ...metadata,
        samples: uncapturedSamples,
      };
      const nextBatches = [...batches, nextBatch];
      const report = createVoicePerformanceReport(nextBatches);
      batches = nextBatches;
      capturedMeasurementIds = new Set([
        ...capturedMeasurementIds,
        ...uncapturedSamples.map((sample) => sample.id),
      ]);
      return report;
    },
    getBatches: () => batches,
    getReport: () =>
      batches.length === 0 ? null : createVoicePerformanceReport(batches),
    getUncapturedSampleCount: () =>
      tracker
        .getSnapshot()
        .samples.filter((sample) => !capturedMeasurementIds.has(sample.id))
        .length,
    reset: () => {
      batches = [];
      capturedMeasurementIds = new Set(
        tracker.getSnapshot().samples.map((sample) => sample.id),
      );
    },
  });
}

export function aggregateVoicePerformance(
  samples: readonly VoicePerformanceSample[],
): readonly VoicePerformanceAggregate[] {
  return METRIC_ORDER.map((metric) => {
    const durations = samples
      .filter((sample) => sample.metric === metric)
      .map((sample) => sample.durationMs)
      .sort((left, right) => left - right);
    const p50Ms = percentile(durations, 0.5);
    const p95Ms = percentile(durations, 0.95);
    return {
      count: durations.length,
      metric,
      p50Ms,
      p95Ms,
      status: aggregateStatus(metric, durations.length, p50Ms, p95Ms),
    };
  });
}

export function createVoicePerformanceTracker(
  now: () => number = () => performance.now(),
): VoicePerformanceTracker {
  let sequence = 0;
  let samples: readonly VoicePerformanceSample[] = [];
  let snapshot: VoicePerformanceSnapshot = {
    aggregates: aggregateVoicePerformance(samples),
    samples,
  };
  const pending = new Map<
    string,
    Readonly<{ metric: VoicePerformanceMetric; startedAtMs: number }>
  >();
  const listeners = new Set<() => void>();

  const publish = () => {
    snapshot = {
      aggregates: aggregateVoicePerformance(samples),
      samples,
    };
    for (const listener of listeners) {
      listener();
    }
  };

  const complete = (measurementId: string, completedAtMs = now()) => {
    const measurement = pending.get(measurementId);
    if (!measurement || !Number.isFinite(completedAtMs)) {
      return null;
    }
    pending.delete(measurementId);
    const boundedCompletedAtMs = Math.max(
      measurement.startedAtMs,
      completedAtMs,
    );
    const sample: VoicePerformanceSample = {
      completedAtMs: boundedCompletedAtMs,
      durationMs: boundedCompletedAtMs - measurement.startedAtMs,
      id: measurementId,
      metric: measurement.metric,
      startedAtMs: measurement.startedAtMs,
    };
    samples = [...samples, sample].slice(-MAX_RETAINED_SAMPLES);
    publish();
    return sample;
  };

  return Object.freeze({
    begin: (metric: VoicePerformanceMetric, startedAtMs = now()) => {
      sequence += 1;
      const measurementId = `voice-performance-${metric}-${String(sequence)}`;
      if (pending.size >= MAX_PENDING_MEASUREMENTS) {
        const oldestMeasurementId = pending.keys().next().value;
        if (oldestMeasurementId) {
          pending.delete(oldestMeasurementId);
        }
      }
      pending.set(measurementId, {
        metric,
        startedAtMs: Number.isFinite(startedAtMs) ? startedAtMs : now(),
      });
      return measurementId;
    },
    cancel: (measurementId: string) => {
      pending.delete(measurementId);
    },
    complete,
    completeOldest: (metric: VoicePerformanceMetric, completedAtMs = now()) => {
      const oldest = [...pending.entries()].find(
        ([, measurement]) => measurement.metric === metric,
      );
      return oldest ? complete(oldest[0], completedAtMs) : null;
    },
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  });
}
