import type { InterviewGrant } from "@screenpilot/contracts/api/interview-preparation";
import type { ProviderUsage } from "@screenpilot/contracts/api/cv-analysis";
import type { PublicRuntimeConfig } from "@screenpilot/contracts/api/public-runtime-config";
import type { VoiceMetadata } from "@screenpilot/contracts/api/voice-token";
import type {
  PublicRoleNeutralDemoContext,
  RolePreference as ContractRolePreference,
} from "@screenpilot/contracts/interview/demo-context";
import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";
import type { InsightCard } from "@screenpilot/contracts/interview/insight-card";
import type { NormalizedCv } from "@screenpilot/contracts/interview/normalized-cv";
import type { ScreeningPlan } from "@screenpilot/contracts/interview/screening-plan";
import type { ScreeningSummary } from "@screenpilot/contracts/interview/screening-summary";
import type { TopicProgress } from "@screenpilot/contracts/interview/topic-progress";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";

export const DEMO_STAGES = [
  "empty",
  "bootstrapping",
  "choosing_entry_mode",
  "awaiting_cv",
  "extracting_cv",
  "analyzing_cv",
  "plan_ready",
  "preparing_conversation",
  "preflight",
  "ready",
  "connecting",
  "live",
  "ending",
  "interview_complete",
  "summarizing",
  "review_ready",
  "cleared",
] as const;

export const FAILURE_STAGES = [
  "bootstrapping",
  "extracting_cv",
  "analyzing_cv",
  "preparing_conversation",
  "preflight",
  "connecting",
  "live",
  "summarizing",
] as const;

export type DemoStage = (typeof DEMO_STAGES)[number];
export type FailureStage = (typeof FAILURE_STAGES)[number];

export type PreferredName = Readonly<{
  value: string;
  source: "CV" | "Candidate" | "CV + Candidate";
  evidenceTurnIds: readonly string[];
}>;

export type RolePreference = ContractRolePreference;

export type SessionFailure = Readonly<{
  stage: FailureStage;
  code: string;
  message: string;
  retryable: boolean;
}>;

export const INTERVIEW_TERMINAL_REASONS = [
  "candidate_ended",
  "agent_completed",
  "time_limit",
] as const;

export type InterviewTerminalReason =
  (typeof INTERVIEW_TERMINAL_REASONS)[number];

export type InterviewCompletion = Readonly<{
  reason: InterviewTerminalReason;
  elapsedSeconds: number;
}>;

export type SessionRestoreNotice =
  | "corrupt_session_cleared"
  | "expired_session_cleared"
  | "incompatible_session_cleared"
  | "oversized_session_cleared"
  | "storage_unavailable"
  | "call_interrupted"
  | "cv_file_required_after_refresh"
  | "summary_interrupted"
  | "interview_grant_expired";

export type DemoSessionState = Readonly<{
  schemaVersion: 3;
  hydrationStatus: "pending" | "ready";
  stage: DemoStage;
  entryMode: EntryMode | null;
  createdAt: string | null;
  expiresAt: string | null;
  runtimeConfig: PublicRuntimeConfig | null;
  demoContext: PublicRoleNeutralDemoContext | null;
  preferredName?: PreferredName | undefined;
  rolePreference?: RolePreference | undefined;
  cv?: NormalizedCv | undefined;
  screeningPlan?: ScreeningPlan | undefined;
  interviewGrant?: InterviewGrant | undefined;
  interviewGrantExpiresAt?: string | undefined;
  cvAnalysisUsage?: ProviderUsage | undefined;
  voice?: VoiceMetadata | undefined;
  interviewCompletion?: InterviewCompletion | undefined;
  transcript: readonly TranscriptTurn[];
  insights: readonly InsightCard[];
  topicProgress: readonly TopicProgress[];
  summary?: ScreeningSummary | undefined;
  failure?: SessionFailure | undefined;
  restoreNotice?: SessionRestoreNotice | undefined;
}>;

export type DemoSessionRuntimeState = Readonly<{
  cvFile: File | null;
  rawCvText: string | null;
  turnstileToken: string | null;
  voiceConversationToken: string | null;
}>;

export function createEmptyRuntimeState(): DemoSessionRuntimeState {
  return {
    cvFile: null,
    rawCvText: null,
    turnstileToken: null,
    voiceConversationToken: null,
  };
}
