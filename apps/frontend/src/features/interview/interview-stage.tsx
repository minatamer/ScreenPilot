import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";
import type { InsightCard } from "@screenpilot/contracts/interview/insight-card";
import type { NormalizedCv } from "@screenpilot/contracts/interview/normalized-cv";
import type { TopicProgress } from "@screenpilot/contracts/interview/topic-progress";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";

import { InsightBoard } from "@/features/insights/insight-board";
import { Badge } from "@/shared/ui/badge";
import { DemoStageHeading } from "@/shared/ui/demo-stage-heading";

import {
  CompletedInterviewControls,
  InterviewControls,
} from "./interview-controls";
import { LiveCaptions } from "./live-captions";
import { MicrophoneIcon } from "./microphone-icon";
import type { LiveCaption } from "./normalize-voice-event";
import type { VoiceLatencyStage, VoiceSessionPhase } from "./use-voice-session";
import type { FillerPolicyState } from "./latency-filler-policy";
import { VoicePerformanceDiagnostics } from "./voice-performance-diagnostics";
import type {
  VoicePerformanceBatch,
  VoicePerformanceCollector,
  VoicePerformanceTracker,
} from "./voice-performance";
import { VoiceStatusRail } from "./voice-status-rail";

type InterviewStageProps = Readonly<{
  caption?: LiveCaption | null;
  completed?: boolean | undefined;
  cv?: NormalizedCv | undefined;
  elapsedSeconds: number;
  ending?: boolean | undefined;
  entryMode: EntryMode;
  fillerPolicy?: FillerPolicyState | undefined;
  insights: readonly InsightCard[];
  isMuted?: boolean | undefined;
  latencyStage?: VoiceLatencyStage | undefined;
  onEnd?: (() => void) | undefined;
  onToggleMute?: (() => void) | undefined;
  onViewSummary?: (() => void) | undefined;
  phase?: VoiceSessionPhase | undefined;
  performanceCollector?: VoicePerformanceCollector | undefined;
  performanceSource?: VoicePerformanceBatch["source"] | undefined;
  performanceTracker?: VoicePerformanceTracker | undefined;
  topicProgress: readonly TopicProgress[];
  transcript: readonly TranscriptTurn[];
}>;

function modeLabel(entryMode: EntryMode) {
  return entryMode === "cv_assisted" ? "CV-assisted" : "Conversation-first";
}

export function InterviewStage({
  caption,
  completed = false,
  cv,
  elapsedSeconds,
  ending = false,
  entryMode,
  fillerPolicy,
  insights,
  isMuted = false,
  latencyStage = "idle",
  onEnd,
  onToggleMute,
  onViewSummary,
  phase = "ended",
  performanceCollector,
  performanceSource,
  performanceTracker,
  topicProgress,
  transcript,
}: InterviewStageProps) {
  const statusPhase = completed ? "ended" : ending ? "ending" : phase;

  return (
    <div
      className="sp-interview-stage"
      data-latency-stage={latencyStage}
      data-phase={phase}
    >
      <header className="sp-interview-stage__header">
        <DemoStageHeading
          pretitle="ScreenPilot interview"
          step={4}
          title={completed ? "Interview complete" : "Pilot is interviewing"}
        />
        <Badge tone="coral">{modeLabel(entryMode)}</Badge>
      </header>

      <div className="sp-interview-stage__workspace">
        <section
          aria-labelledby="pilot-voice-status"
          className="sp-interview-stage__voice"
        >
          <div className="sp-interview-transcript" data-phase={statusPhase}>
            {completed ? (
              <div
                aria-live="polite"
                className="sp-interview-status-rail sp-interview-status-rail--complete"
                role="status"
              >
                <MicrophoneIcon muted />
                <strong id="pilot-voice-status">Interview complete</strong>
                <span className="sp-interview-status-rail__detail">
                  Microphone disconnected
                </span>
              </div>
            ) : (
              <VoiceStatusRail
                latencyStage={latencyStage}
                phase={statusPhase}
              />
            )}
            <LiveCaptions
              caption={completed ? null : (caption ?? null)}
              transcript={transcript}
            />
          </div>
          {completed ? (
            <CompletedInterviewControls
              elapsedSeconds={elapsedSeconds}
              onViewSummary={() => {
                onViewSummary?.();
              }}
            />
          ) : (
            <InterviewControls
              elapsedSeconds={elapsedSeconds}
              ending={ending}
              isMuted={isMuted}
              onEnd={() => {
                onEnd?.();
              }}
              onToggleMute={() => {
                onToggleMute?.();
              }}
            />
          )}
        </section>
        <InsightBoard
          {...(cv ? { cv } : {})}
          entryMode={entryMode}
          insights={insights}
          topicProgress={topicProgress}
          transcript={transcript}
        />
      </div>
      {!completed &&
      performanceCollector &&
      performanceSource &&
      performanceTracker &&
      fillerPolicy ? (
        <VoicePerformanceDiagnostics
          collector={performanceCollector}
          fillerPolicy={fillerPolicy}
          source={performanceSource}
          tracker={performanceTracker}
        />
      ) : null}
    </div>
  );
}
