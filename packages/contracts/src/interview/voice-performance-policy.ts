export const VOICE_LATENCY_REVIEWING_THRESHOLD_MS = 800;
export const VOICE_STATIC_FILLER_THRESHOLD_MS = 1_500;
export const VOICE_STATIC_FILLER_MESSAGE = "Mm-hm\u2026";
export const VOICE_MAX_FILLERS_PER_TURN = 1;
export const VOICE_MAX_FILLERS_PER_INTERVIEW = 3;
export const VOICE_VAD_SPEECH_PROBABILITY_THRESHOLD = 0.5;

export const VOICE_PERFORMANCE_GATES = Object.freeze({
  conversation_preparation: Object.freeze({
    percentile: "p95",
    targetMs: 500,
    releaseBlockerMs: 1_000,
  }),
  connect_request_to_ready: Object.freeze({
    percentile: "p95",
    targetMs: 3_000,
    releaseBlockerMs: 5_000,
  }),
  ttfa_p50: Object.freeze({
    percentile: "p50",
    targetMs: 800,
    releaseBlockerMs: 1_200,
  }),
  ttfa_p95: Object.freeze({
    percentile: "p95",
    targetMs: 1_500,
    releaseBlockerMs: 2_000,
  }),
  interruption_to_audio_stop: Object.freeze({
    percentile: "p95",
    targetMs: 250,
    releaseBlockerMs: 400,
  }),
  client_tool_to_card: Object.freeze({
    percentile: "p95",
    targetMs: 300,
    releaseBlockerMs: 600,
  }),
});
