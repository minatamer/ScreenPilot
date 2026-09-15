import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";
import type { InsightCard } from "@screenpilot/contracts/interview/insight-card";
import type { NormalizedCv } from "@screenpilot/contracts/interview/normalized-cv";
import type { TopicProgress } from "@screenpilot/contracts/interview/topic-progress";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";

import { InsightBoard } from "@/features/insights/insight-board";
import { Badge } from "@/shared/ui/badge";
import { DemoStageHeading } from "@/shared/ui/demo-stage-heading";

import { InterviewControls } from "./interview-controls";
import { LiveCaptions } from "./live-captions";
import type { LiveCaption } from "./normalize-voice-event";
import type { VoiceSessionPhase } from "./use-voice-session";
import { VoiceSignal } from "./voice-signal";

type InterviewStageProps = Readonly<{
  caption: LiveCaption | null;
  cv?: NormalizedCv | undefined;
  elapsedSeconds: number;
  entryMode: EntryMode;
  insights: readonly InsightCard[];
  isMuted: boolean;
  onEnd: () => void;
  onToggleMute: () => void;
  phase: VoiceSessionPhase;
  topicProgress: readonly TopicProgress[];
  transcript: readonly TranscriptTurn[];
}>;

function modeLabel(entryMode: EntryMode) {
  return entryMode === "cv_assisted" ? "CV-assisted" : "Conversation-first";
}

function statusLabel(phase: VoiceSessionPhase) {
  switch (phase) {
    case "speaking":
      return "Pilot is speaking…";
    case "listening":
      return "Pilot is listening…";
    case "reconnecting":
      return "Pilot is reconnecting…";
    case "ending":
      return "Ending the interview…";
    case "failed":
      return "The voice connection was interrupted.";
    default:
      return "Pilot is preparing the conversation…";
  }
}

export function InterviewStage({
  caption,
  cv,
  elapsedSeconds,
  entryMode,
  insights,
  isMuted,
  onEnd,
  onToggleMute,
  phase,
  topicProgress,
  transcript,
}: InterviewStageProps) {
  const reconnecting = phase === "reconnecting";
  const ending = phase === "ending";

  return (
    <div className="sp-interview-stage" data-phase={phase}>
      <header className="sp-interview-stage__header">
        <DemoStageHeading
          pretitle="ScreenPilot interview"
          title="Pilot is interviewing"
        />
        <Badge tone="coral">{modeLabel(entryMode)}</Badge>
      </header>

      <div className="sp-interview-stage__workspace">
        <section
          aria-labelledby="pilot-voice-status"
          className="sp-interview-stage__voice"
        >
          <div className="sp-interview-stage__presence">
            <VoiceSignal phase={phase} />
            <div aria-live="polite" role="status">
              <span className="sp-interview-stage__pilot-mark">P</span>
              <div>
                <strong id="pilot-voice-status">{statusLabel(phase)}</strong>
                <span>
                  {isMuted ? "Your microphone is off" : "Your microphone is on"}
                </span>
              </div>
            </div>
          </div>

          <div
            className="sp-interview-connection-banner"
            data-reconnecting={reconnecting}
            role="status"
          >
            <span aria-hidden="true" />
            <p>
              <strong>
                {reconnecting ? "Reconnecting voice" : "Private connection"}
              </strong>
              {reconnecting
                ? "The voice client is making its brief built-in reconnect attempt."
                : "Connected through a private WebRTC session. No recording is created."}
            </p>
          </div>

          <LiveCaptions caption={caption} />
          <InterviewControls
            elapsedSeconds={elapsedSeconds}
            ending={ending}
            isMuted={isMuted}
            onEnd={onEnd}
            onToggleMute={onToggleMute}
          />
        </section>
        <InsightBoard
          {...(cv ? { cv } : {})}
          entryMode={entryMode}
          insights={insights}
          topicProgress={topicProgress}
          transcript={transcript}
        />
      </div>
    </div>
  );
}
