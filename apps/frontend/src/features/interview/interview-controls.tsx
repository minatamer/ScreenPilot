import { Button, ButtonGroup } from "@/shared/ui/button";
import { INTERVIEW_LIMIT_MINUTES } from "@/features/session/interview-completion";

import { formatInterviewElapsedTime } from "./interview-timer";
import { MicrophoneIcon } from "./microphone-icon";

type InterviewControlsProps = Readonly<{
  elapsedSeconds: number;
  ending: boolean;
  isMuted: boolean;
  onEnd: () => void;
  onToggleMute: () => void;
}>;

type CompletedInterviewControlsProps = Readonly<{
  elapsedSeconds: number;
  onViewSummary: () => void;
  summaryPreparing: boolean;
}>;

function StopIcon() {
  return (
    <svg
      aria-hidden="true"
      className="sp-interview-controls__stop-icon"
      viewBox="0 0 24 24"
    >
      <rect
        fill="currentColor"
        height="11"
        rx="1.5"
        width="11"
        x="6.5"
        y="6.5"
      />
    </svg>
  );
}

function InterviewTimer({
  elapsedSeconds,
}: Readonly<{ elapsedSeconds: number }>) {
  return (
    <div className="sp-interview-controls__timer">
      <span>Elapsed time</span>
      <time dateTime={`PT${String(elapsedSeconds)}S`}>
        {formatInterviewElapsedTime(elapsedSeconds)}
      </time>
      <small>{INTERVIEW_LIMIT_MINUTES}-minute session limit</small>
    </div>
  );
}

export function InterviewControls({
  elapsedSeconds,
  ending,
  isMuted,
  onEnd,
  onToggleMute,
}: InterviewControlsProps) {
  return (
    <div className="sp-interview-controls">
      <InterviewTimer elapsedSeconds={elapsedSeconds} />
      <ButtonGroup className="sp-interview-controls__actions">
        <Button
          aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
          aria-pressed={isMuted}
          className="sp-interview-controls__mic-button"
          data-microphone-state={isMuted ? "off" : "on"}
          disabled={ending}
          onClick={onToggleMute}
          title={isMuted ? "Unmute microphone" : "Mute microphone"}
          variant="secondary"
        >
          <MicrophoneIcon muted={isMuted} />
        </Button>
        <Button
          className="sp-interview-controls__end-button"
          disabled={ending}
          loading={ending}
          loadingLabel="Ending interview"
          onClick={onEnd}
          variant="danger"
        >
          <StopIcon />
          <span>End interview</span>
        </Button>
      </ButtonGroup>
    </div>
  );
}

export function CompletedInterviewControls({
  elapsedSeconds,
  onViewSummary,
  summaryPreparing,
}: CompletedInterviewControlsProps) {
  return (
    <div className="sp-interview-controls" data-state="complete">
      <InterviewTimer elapsedSeconds={elapsedSeconds} />
      <ButtonGroup className="sp-interview-controls__actions">
        <Button
          aria-label={
            summaryPreparing
              ? "Preparing summary. View summary will be available when ready."
              : undefined
          }
          loading={summaryPreparing}
          loadingLabel="View summary"
          onClick={onViewSummary}
        >
          View summary
        </Button>
      </ButtonGroup>
    </div>
  );
}
