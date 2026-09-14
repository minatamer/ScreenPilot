import type { VoiceSessionPhase } from "./use-voice-session";

type VoiceSignalProps = Readonly<{
  phase: VoiceSessionPhase;
}>;

const ACTIVE_PHASES = new Set<VoiceSessionPhase>(["listening", "speaking"]);

function signalLabel(phase: VoiceSessionPhase) {
  switch (phase) {
    case "speaking":
      return "Pilot is speaking";
    case "listening":
      return "Pilot is listening";
    case "reconnecting":
      return "Pilot is reconnecting";
    case "ending":
      return "The interview is ending";
    case "failed":
      return "The voice connection was interrupted";
    default:
      return "Pilot is preparing the voice connection";
  }
}

export function VoiceSignal({ phase }: VoiceSignalProps) {
  return (
    <div
      aria-label={signalLabel(phase)}
      className="sp-interview-signal"
      data-active={ACTIVE_PHASES.has(phase)}
      data-phase={phase}
      role="img"
    >
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}
