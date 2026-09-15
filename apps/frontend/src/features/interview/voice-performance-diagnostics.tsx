"use client";

import { useState, useSyncExternalStore, type SyntheticEvent } from "react";

import type { FillerPolicyState } from "./latency-filler-policy";
import type {
  VoicePerformanceBatch,
  VoicePerformanceCollector,
  VoicePerformanceReport,
  VoicePerformanceTracker,
} from "./voice-performance";

type VoicePerformanceDiagnosticsProps = Readonly<{
  collector: VoicePerformanceCollector;
  fillerPolicy: FillerPolicyState;
  source: VoicePerformanceBatch["source"];
  tracker: VoicePerformanceTracker;
}>;

const METRIC_LABELS = Object.freeze({
  conversation_preparation: "Conversation preparation",
  connect_request_to_ready: "Connect request to ready",
  ttfa: "Speech end to substantive audio",
  interruption_to_audio_stop: "Interruption to audio stop",
  client_tool_to_card: "Client tool to card",
});

function formatMilliseconds(value: number | null) {
  return value === null ? "\u2014" : `${String(Math.round(value))} ms`;
}

export function VoicePerformanceDiagnostics({
  collector,
  fillerPolicy,
  source,
  tracker,
}: VoicePerformanceDiagnosticsProps) {
  const snapshot = useSyncExternalStore(
    tracker.subscribe,
    tracker.getSnapshot,
    tracker.getSnapshot,
  );
  const [batchId, setBatchId] = useState("");
  const [deviceProfile, setDeviceProfile] =
    useState<VoicePerformanceBatch["deviceProfile"]>("desktop");
  const [networkProfile, setNetworkProfile] =
    useState<VoicePerformanceBatch["networkProfile"]>("normal");
  const [providerRevision, setProviderRevision] = useState("");
  const [sampleDate, setSampleDate] = useState("");
  const [report, setReport] = useState<VoicePerformanceReport | null>(() =>
    collector.getReport(),
  );
  const [reportError, setReportError] = useState<string | null>(null);

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const captureBatch = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const nextReport = collector.captureBatch({
        batchId: batchId.trim(),
        deviceProfile,
        networkProfile,
        providerRevision: providerRevision.trim(),
        sampleDate,
        source,
      });
      setReport(nextReport);
      setReportError(null);
    } catch (error) {
      setReportError(
        error instanceof Error
          ? error.message
          : "The timing batch could not be captured.",
      );
    }
  };

  const resetCapturedBatches = () => {
    collector.reset();
    setReport(null);
    setReportError(null);
  };

  return (
    <details className="sp-voice-performance-diagnostics">
      <summary>Local voice timing diagnostics</summary>
      <p>
        Content-free browser timings only. Nothing in this panel is uploaded or
        persisted.
      </p>
      <dl>
        {snapshot.aggregates.map((aggregate) => (
          <div key={aggregate.metric}>
            <dt>{METRIC_LABELS[aggregate.metric]}</dt>
            <dd>
              {String(aggregate.count)} samples · p50{" "}
              {formatMilliseconds(aggregate.p50Ms)} · p95{" "}
              {formatMilliseconds(aggregate.p95Ms)} · {aggregate.status}
            </dd>
          </div>
        ))}
        <div>
          <dt>Static fillers observed</dt>
          <dd>
            {String(fillerPolicy.count)} ·{" "}
            {fillerPolicy.reviewFailed ? "review failed" : "within policy"}
          </dd>
        </div>
      </dl>
      <form className="sp-voice-performance-report" onSubmit={captureBatch}>
        <p>
          Capture each device/network run before changing profiles. The report
          includes only uncaptured timing samples and remains in memory until
          selected and copied from this panel.
        </p>
        <div className="sp-voice-performance-report__fields">
          <label>
            Batch ID
            <input
              maxLength={64}
              onChange={(event) => {
                setBatchId(event.target.value);
              }}
              pattern="[a-z0-9][a-z0-9-]{0,63}"
              placeholder="desktop-normal-01"
              required
              value={batchId}
            />
          </label>
          <label>
            Sample date
            <input
              onChange={(event) => {
                setSampleDate(event.target.value);
              }}
              required
              type="date"
              value={sampleDate}
            />
          </label>
          <label>
            Device profile
            <select
              onChange={(event) => {
                setDeviceProfile(
                  event.target.value as VoicePerformanceBatch["deviceProfile"],
                );
              }}
              value={deviceProfile}
            >
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
            </select>
          </label>
          <label>
            Network profile
            <select
              onChange={(event) => {
                setNetworkProfile(
                  event.target.value as VoicePerformanceBatch["networkProfile"],
                );
              }}
              value={networkProfile}
            >
              <option value="normal">Normal</option>
              <option value="throttled">Throttled</option>
            </select>
          </label>
          <label>
            Provider revision ID
            <input
              maxLength={128}
              onChange={(event) => {
                setProviderRevision(event.target.value);
              }}
              pattern="[A-Za-z0-9][A-Za-z0-9._-]{0,127}"
              placeholder="agtvrsn_…"
              required
              value={providerRevision}
            />
          </label>
        </div>
        <p>
          Source: <strong>{source}</strong> · uncaptured samples:{" "}
          <strong>{String(collector.getUncapturedSampleCount())}</strong>
        </p>
        <div className="sp-voice-performance-report__actions">
          <button type="submit">Capture batch and build report</button>
          <button onClick={resetCapturedBatches} type="button">
            Reset captured batches
          </button>
        </div>
        {reportError ? <p role="alert">{reportError}</p> : null}
        {report ? (
          <label>
            Content-free performance report
            <textarea
              aria-label="Content-free performance report"
              readOnly
              rows={14}
              value={JSON.stringify(report, null, 2)}
            />
          </label>
        ) : null}
      </form>
    </details>
  );
}
