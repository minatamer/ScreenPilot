# SP-013 — Build disclosure, consent, and microphone preflight

Status: Required  
Milestone: Milestone 2 — browser voice experience  
Last synchronized: 2026-08-31  
Depends on: SP-006, SP-011, SP-012  
Suggested commit: `feat(frontend): add voice disclosure and preflight`  
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Create the shared informed-consent and microphone-readiness boundary so no voice token or audio session can begin prematurely in either entry mode.

## Standalone implementation context

- Both entry modes arrive with an unexpired `interviewGrant` and use this exact shared preflight.
- Disclosure identifies OpenAI/ElevenLabs processing, Cloudflare Turnstile anti-abuse verification, no ScreenPilot audio recording, session-only review, eight-minute maximum, and the expectation to use synthetic data.
- The mode badge explains whether the interviewer has CV-derived context or will learn only from spoken answers.
- Consent begins unchecked and requires a deliberate action.
- Microphone readiness includes permission, selected-device label, live input meter, and recovery guidance.
- The Start action requires consent, microphone readiness, valid grant, and Turnstile client readiness. Clicking Start executes action `voice_token`; the token is not persisted.
- No ElevenLabs contact occurs until the later voice-token flow.

## Manual credential gate

- This frontend ticket needs no secret. It consumes the public `TURNSTILE_SITE_KEY` from bootstrap and must never receive `TURNSTILE_SECRET_KEY`.
- Until the user creates a real Turnstile widget and fills the ignored backend configuration, use the fake/widget test path for all consent, microphone, readiness, challenge, and reset tests. Production test keys are forbidden.
- The official creation and test-key steps are linked in the parent [credential guide](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup). A real-host challenge walkthrough remains unchecked while the site key/secret/hostname group is blank.

## Scope boundaries

- Do not auto-check consent, request a voice token on page load, auto-start the microphone, or begin ElevenLabs while measuring the input.
- Do not promise zero third-party processing or imply that Turnstile receives CV/interview content.
- Do not duplicate preflight by entry mode.
- Do not add phone numbers, telephony, device recording, audio upload, or saved test clips.
- Do not hide a required Turnstile interaction in an inaccessible modal.

## Implementation checklist

- [ ] Build the shared dark preflight shell with mode badge and safe Back behavior.
- [ ] Present concise disclosure and privacy/provider roles before consent.
- [ ] State that the candidate-authored role is a synthetic browser-session demo vacancy—not a real opening/application—or that the interview will remain role-neutral when undecided; do not show employer facts or a supported-role list.
- [ ] Implement an unchecked consent control and deliberate continuation.
- [ ] Request microphone permission only from user action; show selected input and a non-recording level meter.
- [ ] Handle denied, unavailable, in-use, removed, and permission-retry states with browser-appropriate guidance.
- [ ] Reuse the managed Turnstile gate for `voice_token`, placing rare interaction inline beside Start with responsive/keyboard support.
- [ ] Enable Start only when consent, microphone, grant, and Turnstile client readiness are valid.
- [ ] Make Start idempotent and expose a connecting/cancel state for SP-014.
- [ ] Preserve prepared mode state on microphone/challenge failure and reset only the failed prerequisite.
- [ ] Test that every blocked state makes zero `POST /v1/voice/token` requests.

## Acceptance criteria

- [ ] Neither entry mode can request a voice token before informed consent and working microphone readiness.
- [ ] Turnstile executes only from the final deliberate Start action and a legitimate visitor normally sees no puzzle.
- [ ] Denied microphone or challenge failure preserves the prepared plan and offers recovery.
- [ ] Back returns to plan preview for CV-assisted and to the mode chooser for conversation-first according to the state contract.
- [ ] The complete preflight is keyboard-operable and responsive at 320 px through large monitors.

## Focused verification

- [ ] Run targeted component/state tests for every gate and idempotent Start.
- [ ] Use browser permission controls to exercise allow, deny, revoke, missing device, and device removal.
- [ ] Exercise Turnstile success, interaction, expiry, error, and reset through test/fake configuration.
- [ ] Inspect the network to prove no ElevenLabs or voice-token request occurs before all gates pass.
- [ ] Manually check keyboard, screen-reader labels/live status, mobile virtual keyboard, and safe-area layout.

## Commit boundary

Keep SP-013 reviewable as one logical change represented by `feat(frontend): add voice disclosure and preflight`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Shared preflight and start stages](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#stage-6--shared-disclosure-and-preflight)
- [Live voice state machine](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#live-voice-state)
- [Preflight design requirements](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#preflight)
- [Browser security and privacy](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#16-security-privacy-and-public-demo-controls)
- [Turnstile acquisition and blank-value rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
