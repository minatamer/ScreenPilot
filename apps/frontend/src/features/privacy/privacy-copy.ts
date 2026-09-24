export const PRIVACY_NOTICE_COPY = Object.freeze({
  eyebrow: "Your privacy",
  title: "What happens to your information",
  details: Object.freeze({
    sessionBeforeAction:
      "ScreenPilot does not create an account or candidate profile. Structured demo notes stay in this browser tab for at most two hours and are removed when you choose",
    sessionAfterAction: ".",
    cv: "A CV and its extracted text stay in memory only while preparing the screening. The original file is never uploaded or saved by ScreenPilot.",
    conversationFirst:
      "If you start without a CV, Pilot learns only from the answers you give during the conversation.",
    voice:
      "During the interview, an AI voice processes microphone audio for live transcription and responses. ScreenPilot does not record or save your audio.",
    review:
      "The resulting notes are AI-organized for a person to review. ScreenPilot does not score candidates or make an automated hiring decision.",
  }),
  preflight: Object.freeze({
    processing:
      "An AI voice uses your microphone for live transcription and responses. ScreenPilot does not record or save your audio; structured notes stay in this tab for at most two hours and require human review.",
    syntheticData: "Use made-up information.",
    consent:
      "I understand how AI voice, my microphone, transcription, and notes will be used for this demo.",
  }),
});
