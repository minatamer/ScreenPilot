import { PUBLIC_RUNTIME_LIMITS } from "@screenpilot/contracts/api/public-runtime-config";

import type { InterviewTerminalReason } from "./demo-session.types";

export const INTERVIEW_LIMIT_MINUTES = PUBLIC_RUNTIME_LIMITS.callSeconds / 60;

export function describeInterviewTerminalReason(
  reason: InterviewTerminalReason,
): string {
  if (reason === "agent_completed") {
    return "Interview completed by the interviewer.";
  }
  if (reason === "time_limit") {
    return `The ${String(INTERVIEW_LIMIT_MINUTES)}-minute interview limit was reached.`;
  }
  return "Interview ended by the candidate.";
}
