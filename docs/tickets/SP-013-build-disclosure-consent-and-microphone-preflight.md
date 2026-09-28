# SP-013 — Build disclosure, consent, and microphone preflight

Status: Required  
Implementation state: Completed in deterministic fake mode; user-owned microphone and credential-gated live verification remain pending<br>
Milestone: Milestone 2 — browser voice experience  
Last synchronized: 2026-09-14<br>
Depends on: SP-006, SP-011, SP-011A, SP-012  
Suggested commit: `SP-013: add voice disclosure and preflight`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Create the shared informed-consent and microphone-readiness boundary so no voice token or audio session can begin prematurely in either entry mode.

## Standalone implementation context

- Both entry modes arrive with an unexpired `interviewGrant` and use this exact shared preflight.
- SP-011A's compact in-workspace Privacy/session/human-decision context band remains visible inside the centralized dark `/demo` shell, but it does not replace this ticket's plain-language interview, microphone, and consent explanation immediately before voice begins.
- Preflight presents exactly two stacked cards in candidate-friendly language: a short explanation of how the interview works, then privacy/consent with the microphone check. It explains microphone use, adaptive questions, human-reviewed notes, no ScreenPilot audio recording, session-only review, the five-minute maximum selected in SP-028, and the expectation to use synthetic data without exposing provider names, tokens, anti-abuse implementation, or other infrastructure details.
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

- [x] Build preflight inside the shared centralized dark workspace with mode badge, inert stage status, **Clear & exit**, and reducer-valid Back behavior; do not add white panels or a second shell.
- [x] Present the interview explanation and privacy/consent as two stacked cards using concise candidate language; keep provider and infrastructure details out of visible preflight copy.
- [x] State that the candidate-authored role is a synthetic browser-session demo vacancy—not a real opening/application—or that the interview will remain role-neutral when undecided; do not show employer facts or a supported-role list.
- [x] Implement an unchecked consent control; **Check microphone** deliberately accepts the selected consent before requesting permission, avoiding a redundant intermediate confirmation action.
- [x] Request microphone permission only from user action; show selected input and a non-recording level meter.
- [x] Handle denied, unavailable, in-use, removed, and permission-retry states with browser-appropriate guidance.
- [x] Reuse the managed Turnstile gate for `voice_token`, placing rare interaction inline beside Start with responsive/keyboard support.
- [x] Enable Start only when consent, microphone, grant, and Turnstile client readiness are valid.
- [x] Make Start idempotent and expose a connecting/cancel state for SP-014.
- [x] Preserve prepared mode state on microphone/challenge failure and reset only the failed prerequisite.
- [x] Test that every blocked state makes zero `POST /v1/voice/token` requests.

## Acceptance criteria

- [x] Neither entry mode can request a voice token before informed consent and working microphone readiness.
- [x] Turnstile executes only from the final deliberate Start action and a legitimate visitor normally sees no puzzle.
- [x] Denied microphone or challenge failure preserves the prepared plan and offers recovery.
- [x] Back returns to plan preview for CV-assisted and to the mode chooser for conversation-first according to the state contract.
- [x] The complete preflight is keyboard-operable and responsive at 320 px through large monitors.

## Focused verification

- [x] Run targeted component/state tests for every gate and idempotent Start.
- [ ] Use browser permission controls to exercise allow, deny, revoke, missing device, and device removal.
- [x] Exercise Turnstile success, interaction, expiry, error, and reset through test/fake configuration.
- [x] Inspect the network to prove no ElevenLabs or voice-token request occurs before all gates pass.
- [x] Manually check keyboard, screen-reader labels/live status, mobile virtual keyboard, and safe-area layout. Preflight has no text-entry control that can summon a virtual keyboard.

## Implemented result

- One shared preflight now uses two stacked cards: **How the interview works** and **Your privacy and consent**. Candidate-facing copy describes only the experience and data boundaries—microphone use, adaptive questions, human-reviewed notes, no ScreenPilot audio recording, session-only review, duration, and synthetic data—without naming infrastructure or providers. Candidate-stated role labels remain untrusted, synthetic, and session-scoped; an undecided session stays role-neutral.
- Browser microphone access lives behind a deliberate action and a dedicated hook/service boundary. It reports the selected track, computes an RMS level locally through Web Audio, maps browser failures to recovery guidance, distinguishes observable permission revocation from track/device removal through the Permissions API with a conservative fallback, and releases media tracks, graph nodes, animation frames, listeners, pending requests, and the audio context on retry, cancellation, expiry, or unmount.
- Consent, microphone readiness, grant validity, and browser challenge capability jointly drive the reducer's `preflight`/`ready` boundary. While preflight is mounted, its local expiry path releases microphone/readiness resources before dispatching the mode-specific `CONVERSATION_GRANT_EXPIRED` or `CV_GRANT_EXPIRED` recovery event; CV plan preview retains the provider-level timer. Persisted `ready` state restores as preflight because consent and device readiness are deliberately non-persistent.
- The final Start action alone mounts the reusable managed Turnstile gate with action `voice_token`. The response token is handed off synchronously in memory, repeated Start actions are ignored, challenge-only retry preserves preparation and microphone state, and the connecting/cancel seam is ready for SP-014 without adding a voice-token request or ElevenLabs client early.
- The presentation keeps the same gates but removes the four-step implementation walkthrough. The microphone check lives inside the consent card, and the single **Start interview** action is anchored at the lower right.

## Verification evidence

- The 2026-09-14 presentation refinement passed all 21 focused preflight and entry-flow tests, frontend lint, frontend typecheck, targeted formatting, and `git diff --check`. The running fake-mode route showed exactly two preflight cards, no provider or infrastructure names, and a lower-right **Start interview** action at the default desktop viewport; 390 × 844 and 768 × 1024 checks retained two cards with no horizontal overflow.
- Passed 54 focused preflight/microphone/reducer/provider/entry tests after the validation fixes. The focused coverage exercises expiry from `preflight` and `ready` for both modes, mode-specific grant cleanup, observable permission revocation versus removal fallback, every Start prerequisite, idempotent Start, memory-only Turnstile tokens, challenge retry/reset, and low-level media/Web Audio cleanup.
- Passed the complete frontend gate using the pinned toolchain: targeted formatting verification, zero-warning frontend ESLint, frontend typecheck, all 114 frontend unit tests, and the optimized production build. `git diff --check` also passed.
- Browser-checked the conversation-first path, unchecked disclosure, keyboard-only consent, disabled gate states, mode-aware Back, accessibility names/live regions, and the shared dark composition at 320 px, 768 px, 913 px, 1280 px, 1440 px, and 1920 px. Every checked width had no horizontal overflow; the 320 px progress labels were tightened after visual inspection.
- The fake backend log contained only `GET /v1/demo/bootstrap` and `POST /v1/interview/prepare` through preflight. No voice-token or ElevenLabs operation was made.

## Unchecked gates

- All real microphone and browser-permission checks remain user-owned, per the user's request. They are blocked for automated verification because they depend on the user's hardware, browser permission UI, OS routing, and physical device changes. Deterministic component and service tests cover the corresponding state transitions and cleanup without accessing hardware:
  - [ ] Allow microphone access and confirm the selected device label.
  - [ ] Speak into the selected device and confirm the live input meter responds without creating a recording or upload.
  - [ ] Deny access and confirm permission-specific recovery and retry.
  - [ ] Revoke previously granted access and confirm permission-specific recovery where the browser exposes that state.
  - [ ] Test a missing device and a physically removed device.
  - [ ] Test a device already in use by another application.
  - [ ] Repeat permission recovery in every supported browser.
- A real-host Turnstile success/interaction/replay walkthrough remains unchecked because the public site key, secret, and hostname group are blank. The fake path and injected client tests cover success, interaction, expiry, error, cancellation, retry, and token lifetime without provider spend.

## Commit boundary

Keep SP-013 reviewable as one logical change represented by `SP-013: add voice disclosure and preflight`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Shared preflight and start stages](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#stage-6--shared-disclosure-and-preflight)
- [Live voice state machine](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#live-voice-state)
- [Preflight design requirements](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#preflight)
- [Browser security and privacy](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#16-security-privacy-and-public-demo-controls)
- [Turnstile acquisition and blank-value rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
