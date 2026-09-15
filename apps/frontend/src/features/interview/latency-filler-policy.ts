import {
  VOICE_MAX_FILLERS_PER_INTERVIEW,
  VOICE_STATIC_FILLER_THRESHOLD_MS,
  VOICE_STATIC_FILLER_MESSAGE,
} from "@screenpilot/contracts/interview/voice-performance-policy";

export type FillerPolicyViolation =
  | "before_candidate_turn"
  | "missing_speech_end_boundary"
  | "before_threshold"
  | "more_than_once_per_turn"
  | "consecutive_turns"
  | "interview_limit_exceeded";

export type FillerPolicyState = Readonly<{
  count: number;
  lastFillerTurn: number | null;
  reviewFailed: boolean;
  violations: readonly FillerPolicyViolation[];
}>;

export function createFillerPolicyState(): FillerPolicyState {
  return {
    count: 0,
    lastFillerTurn: null,
    reviewFailed: false,
    violations: [],
  };
}

export function isStaticLatencyFiller(message: string): boolean {
  return (
    message.trim().replace(/\.\.\.$/u, "\u2026") === VOICE_STATIC_FILLER_MESSAGE
  );
}

export function observeLatencyFiller(
  state: FillerPolicyState,
  candidateTurn: number,
  waitedMs: number | null,
): FillerPolicyState {
  const violations = [...state.violations];
  const addViolation = (violation: FillerPolicyViolation) => {
    if (!violations.includes(violation)) {
      violations.push(violation);
    }
  };

  if (candidateTurn < 1) {
    addViolation("before_candidate_turn");
  }
  if (waitedMs === null) {
    addViolation("missing_speech_end_boundary");
  } else if (waitedMs < VOICE_STATIC_FILLER_THRESHOLD_MS) {
    addViolation("before_threshold");
  }
  if (state.lastFillerTurn === candidateTurn) {
    addViolation("more_than_once_per_turn");
  }
  if (
    state.lastFillerTurn !== null &&
    state.lastFillerTurn === candidateTurn - 1
  ) {
    addViolation("consecutive_turns");
  }
  if (state.count >= VOICE_MAX_FILLERS_PER_INTERVIEW) {
    addViolation("interview_limit_exceeded");
  }

  return {
    count: state.count + 1,
    lastFillerTurn: candidateTurn,
    reviewFailed: violations.length > 0,
    violations,
  };
}
