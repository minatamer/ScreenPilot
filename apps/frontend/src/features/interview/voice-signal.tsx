import type { VoiceSessionPhase } from "./use-voice-session";
import { MicrophoneIcon } from "./microphone-icon";

type VoiceSignalProps = Readonly<{
  phase: VoiceSessionPhase;
}>;

export function VoiceSignal({ phase }: VoiceSignalProps) {
  if (phase !== "speaking" && phase !== "listening") {
    return null;
  }

  return (
    <span
      aria-hidden="true"
      className="sp-interview-signal"
      data-active={phase === "speaking"}
      data-phase={phase}
    >
      {phase === "speaking" ? (
        <>
          <span />
          <span />
          <span />
          <span />
        </>
      ) : (
        <MicrophoneIcon />
      )}
    </span>
  );
}
