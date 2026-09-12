export const TURNSTILE_ACTIONS = Object.freeze({
  cvAnalyze: "cv_analyze",
  interviewSummary: "interview_summary",
  voiceToken: "voice_token",
} as const);

export type TurnstileAction =
  (typeof TURNSTILE_ACTIONS)[keyof typeof TURNSTILE_ACTIONS];
