export type VoicePerformanceMetric =
  | "conversation_preparation"
  | "connect_request_to_ready"
  | "ttfa"
  | "interruption_to_audio_stop"
  | "client_tool_to_card";

export type VoicePerformanceSource = "fake" | "live";

export type VoicePerformanceClockOrigin =
  "performance_time_origin" | "unix_epoch";

export type VoicePerformanceSample = Readonly<{
  completedAtMs: number;
  clockOrigin: VoicePerformanceClockOrigin;
  durationMs: number;
  id: string;
  metric: VoicePerformanceMetric;
  startedAtMs: number;
}>;

export type VoicePerformanceAggregate = Readonly<{
  count: number;
  metric: VoicePerformanceMetric;
  p50Ms: number | null;
  p95Ms: number | null;
}>;

export type VoicePerformanceSnapshot = Readonly<{
  aggregates: readonly VoicePerformanceAggregate[];
  samples: readonly VoicePerformanceSample[];
}>;

export type VoicePerformanceDiagnosticsExport = Readonly<{
  aggregates: readonly VoicePerformanceAggregate[];
  sampleCount: number;
  samples: readonly VoicePerformanceSample[];
  source: VoicePerformanceSource;
}>;

export type VoicePerformanceTracker = Readonly<{
  begin: (
    metric: VoicePerformanceMetric,
    startedAtMs?: number,
    clockOrigin?: VoicePerformanceClockOrigin,
  ) => string;
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
  reset: () => void;
  subscribe: (listener: () => void) => () => void;
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

export function aggregateVoicePerformance(
  samples: readonly VoicePerformanceSample[],
): readonly VoicePerformanceAggregate[] {
  return METRIC_ORDER.map((metric) => {
    const durations = samples
      .filter((sample) => sample.metric === metric)
      .map((sample) => sample.durationMs)
      .sort((left, right) => left - right);
    return {
      count: durations.length,
      metric,
      p50Ms: percentile(durations, 0.5),
      p95Ms: percentile(durations, 0.95),
    };
  });
}

export function createVoicePerformanceDiagnosticsExport(
  source: VoicePerformanceSource,
  snapshot: VoicePerformanceSnapshot,
): VoicePerformanceDiagnosticsExport {
  return {
    aggregates: snapshot.aggregates,
    sampleCount: snapshot.samples.length,
    samples: snapshot.samples,
    source,
  };
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
    Readonly<{
      clockOrigin: VoicePerformanceClockOrigin;
      metric: VoicePerformanceMetric;
      startedAtMs: number;
    }>
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
      clockOrigin: measurement.clockOrigin,
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
    begin: (
      metric: VoicePerformanceMetric,
      startedAtMs = now(),
      clockOrigin: VoicePerformanceClockOrigin = "performance_time_origin",
    ) => {
      sequence += 1;
      const measurementId = `voice-performance-${metric}-${String(sequence)}`;
      if (pending.size >= MAX_PENDING_MEASUREMENTS) {
        const oldestMeasurementId = pending.keys().next().value;
        if (oldestMeasurementId) {
          pending.delete(oldestMeasurementId);
        }
      }
      pending.set(measurementId, {
        clockOrigin,
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
    reset: () => {
      samples = [];
      publish();
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  });
}
