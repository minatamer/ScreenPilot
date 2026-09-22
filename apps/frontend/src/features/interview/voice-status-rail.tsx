import type { VoiceLatencyStage, VoiceSessionPhase } from "./use-voice-session";
import { VoiceSignal } from "./voice-signal";

type VoiceStatusRailProps = Readonly<{
  latencyStage: VoiceLatencyStage;
  phase: VoiceSessionPhase;
}>;

function statusLabel(
  phase: VoiceSessionPhase,
  latencyStage: VoiceLatencyStage,
) {
  switch (phase) {
    case "speaking":
      return "Pilot speaking";
    case "listening":
      return latencyStage === "reviewing"
        ? "Reviewing your answer"
        : "Listening to you";
    case "reconnecting":
      return "Reconnecting";
    case "ending":
      return "Ending interview";
    case "failed":
      return "Voice connection interrupted";
    default:
      return "Preparing conversation";
  }
}

export function VoiceStatusRail({ latencyStage, phase }: VoiceStatusRailProps) {
  const showVoiceIndicator =
    phase === "speaking" ||
    (phase === "listening" && latencyStage !== "reviewing");

  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="sp-interview-status-rail"
      role="status"
    >
      {showVoiceIndicator ? <VoiceSignal phase={phase} /> : null}
      <strong id="pilot-voice-status">
        {statusLabel(phase, latencyStage)}
      </strong>
    </div>
  );
}
