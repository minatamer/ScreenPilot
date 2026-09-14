import { Button, ButtonGroup } from "@/shared/ui/button";

import { formatInterviewElapsedTime } from "./interview-timer";

type InterviewControlsProps = Readonly<{
  elapsedSeconds: number;
  ending: boolean;
  isMuted: boolean;
  onEnd: () => void;
  onToggleMute: () => void;
}>;

export function InterviewControls({
  elapsedSeconds,
  ending,
  isMuted,
  onEnd,
  onToggleMute,
}: InterviewControlsProps) {
  return (
    <div className="sp-interview-controls">
      <div className="sp-interview-controls__timer">
        <span>Elapsed time</span>
        <time dateTime={`PT${String(elapsedSeconds)}S`}>
          {formatInterviewElapsedTime(elapsedSeconds)}
        </time>
        <small>8-minute session limit</small>
      </div>
      <ButtonGroup className="sp-interview-controls__actions">
        <Button
          aria-label={
            isMuted
              ? "Unmute Pilot's microphone input"
              : "Mute Pilot's microphone input"
          }
          disabled={ending}
          onClick={onToggleMute}
          variant="secondary"
        >
          {isMuted ? "Unmute — Microphone off" : "Mute — Microphone on"}
        </Button>
        <Button
          disabled={ending}
          loading={ending}
          loadingLabel="Ending interview"
          onClick={onEnd}
          variant="danger"
        >
          End interview
        </Button>
      </ButtonGroup>
    </div>
  );
}
