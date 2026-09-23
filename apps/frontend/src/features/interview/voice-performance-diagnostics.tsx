"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import { Button } from "@/shared/ui/button";

import type { FillerPolicyState } from "./latency-filler-policy";
import {
  createVoicePerformanceDiagnosticsExport,
  type VoicePerformanceSource,
  type VoicePerformanceTracker,
} from "./voice-performance";

type VoicePerformanceDiagnosticsProps = Readonly<{
  fillerPolicy?: FillerPolicyState;
  source: VoicePerformanceSource;
  tracker: VoicePerformanceTracker;
}>;

type DiagnosticsLocation = Readonly<{
  hostname: string;
  search: string;
}>;

const LOCAL_DIAGNOSTICS_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
]);

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

export function isVoicePerformanceDiagnosticsEnabled(
  location: DiagnosticsLocation,
) {
  return (
    LOCAL_DIAGNOSTICS_HOSTS.has(location.hostname.toLowerCase()) &&
    new URLSearchParams(location.search).get("diagnostics") === "timings"
  );
}

function subscribeToDiagnosticsLocation(listener: () => void) {
  window.addEventListener("popstate", listener);
  return () => {
    window.removeEventListener("popstate", listener);
  };
}

function getDiagnosticsLocationSnapshot() {
  return isVoicePerformanceDiagnosticsEnabled(window.location);
}

function getServerDiagnosticsLocationSnapshot() {
  return false;
}

export function VoicePerformanceDiagnostics({
  fillerPolicy,
  source,
  tracker,
}: VoicePerformanceDiagnosticsProps) {
  const snapshot = useSyncExternalStore(
    tracker.subscribe,
    tracker.getSnapshot,
    tracker.getSnapshot,
  );
  const enabled = useSyncExternalStore(
    subscribeToDiagnosticsLocation,
    getDiagnosticsLocationSnapshot,
    getServerDiagnosticsLocationSnapshot,
  );
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const diagnosticsExport = useMemo(
    () => createVoicePerformanceDiagnosticsExport(source, snapshot),
    [snapshot, source],
  );
  const rawJson = useMemo(
    () => JSON.stringify(diagnosticsExport, null, 2),
    [diagnosticsExport],
  );

  if (!enabled) {
    return null;
  }

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(rawJson);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  };

  const resetTimings = () => {
    tracker.reset();
    setCopyStatus("idle");
  };

  return (
    <details className="sp-voice-performance-diagnostics">
      <summary>Local voice timing diagnostics</summary>
      <p>
        Raw, content-free {source} timings for this tab only. Refreshing or
        resetting clears them; nothing is uploaded or persisted.
      </p>
      <dl>
        {snapshot.aggregates.map((aggregate) => (
          <div key={aggregate.metric}>
            <dt>{METRIC_LABELS[aggregate.metric]}</dt>
            <dd>
              {String(aggregate.count)} samples · p50{" "}
              {formatMilliseconds(aggregate.p50Ms)} · p95{" "}
              {formatMilliseconds(aggregate.p95Ms)}
            </dd>
          </div>
        ))}
        {fillerPolicy ? (
          <div>
            <dt>Static fillers observed</dt>
            <dd>
              {String(fillerPolicy.count)} ·{" "}
              {fillerPolicy.reviewFailed ? "review needed" : "within policy"}
            </dd>
          </div>
        ) : null}
      </dl>
      <div className="sp-voice-performance-diagnostics__actions">
        <Button onClick={() => void copyJson()} variant="secondary">
          Copy JSON
        </Button>
        <Button onClick={resetTimings} variant="quiet">
          Reset timings
        </Button>
        <span aria-live="polite">
          {copyStatus === "copied"
            ? "JSON copied."
            : copyStatus === "failed"
              ? "Copy failed; select the JSON below."
              : ""}
        </span>
      </div>
      <label>
        Raw timing JSON
        <textarea readOnly rows={12} value={rawJson} />
      </label>
    </details>
  );
}
