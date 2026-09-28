import { PUBLIC_RUNTIME_LIMITS } from "@screenpilot/contracts/api/public-runtime-config";

export const INTERVIEW_HARD_STOP_MS = PUBLIC_RUNTIME_LIMITS.callSeconds * 1_000;

export function formatInterviewElapsedTime(elapsedSeconds: number) {
  const boundedSeconds = Math.max(0, Math.floor(elapsedSeconds));
  const minutes = Math.floor(boundedSeconds / 60);
  const seconds = boundedSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
