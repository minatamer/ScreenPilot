export const INTERVIEW_HARD_STOP_MS = 8 * 60 * 1_000;

export function elapsedInterviewSeconds(startedAt: number, now: number) {
  return Math.max(0, Math.floor((now - startedAt) / 1_000));
}

export function remainingInterviewMilliseconds(
  startedAt: number,
  now: number,
  durationMs = INTERVIEW_HARD_STOP_MS,
) {
  return Math.max(0, durationMs - Math.max(0, now - startedAt));
}

export function formatInterviewElapsedTime(elapsedSeconds: number) {
  const boundedSeconds = Math.max(0, Math.floor(elapsedSeconds));
  const minutes = Math.floor(boundedSeconds / 60);
  const seconds = boundedSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
