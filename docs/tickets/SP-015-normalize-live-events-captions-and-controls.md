# SP-015 — Normalize live events, captions, and controls

Status: Implementation complete; remaining live/manual interaction verification deferred to SP-021B<br>
Milestone: Milestone 2 — browser voice experience  
Last synchronized: 2026-09-22<br>
Depends on: SP-006, SP-014  
Suggested commit: `SP-015: normalize local conversation events`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Translate ElevenLabs SDK callbacks into one deterministic browser call state, live captions, final local transcript, and reliable interview controls.

## Standalone implementation context

- The live state machine is `idle → requesting_token → connecting → listening ↔ speaking → ending → ended`, with explicit failed/reconnecting paths.
- The installed ElevenLabs conversational SDK exposes completed user/agent text through typed `onMessage` callbacks and no typed interim-transcript callback. The live bridge therefore maps those messages as final. The provider-neutral adapter still accepts typed tentative events for deterministic fixtures or a future typed provider capability; tentative text remains caption-only and never becomes evidence.
- Final user and agent messages become bounded `TranscriptTurn` objects with browser-generated stable IDs.
- Events may repeat or arrive out of order; normalize them through one adapter/reducer before UI or evidence tools consume them. Tentative events require a usable provider sequence; those sequences finalize message identity and advance captions monotonically, so late tentative callbacks are rejected and older finals can enter sorted evidence without replacing newer captions. An ID-less final receives the next bounded local sequence; only an immediately adjacent final with the same speaker and normalized text is considered an indistinguishable duplicate, while distinct provider IDs or an intervening accepted final preserve legitimate repetitions.
- The live UI includes voice signal, speaking/listening status, captions, elapsed timer, mute, End interview, and connection/reconnect banner. After normal shutdown, the same transcript workspace becomes read-only, reports the disconnected microphone, freezes elapsed time, and exposes **View summary** without live controls.
- A five-minute hard stop, reduced from the original eight minutes by SP-028, ends the call through the same first-reason-wins path as agent/manual completion and freezes the completed timer at `05:00`. Refresh during a call never auto-reconnects the microphone; refresh after normal completion restores the completed workspace without reconnecting.
- The transcript is same-tab review evidence, not a certified verbatim recording.

## Manual credential gate

- This ticket introduces no new key. Callback normalization, captions, controls, transcript bounds, and recovery tests use checked-in fake ElevenLabs event traces.
- A live SDK verification reuses SP-014's user-filled ElevenLabs/Turnstile group and private agent. No provider secret enters the frontend; it receives only the short-lived conversation token.
- SP-018A supplied the initial owner-controlled live CV-assisted voice smoke. Its unperformed active-session browser interaction, responsive, reduced-motion, complete callback, cleanup, and post-fix observations move unchanged to SP-021B after summary/review and the SP-021A documentation gate exist. Complete every fake/event-state acceptance item here without treating fake coverage as manual or live verification.

## Scope boundaries

- Do not implement insight-card tool behavior; SP-016 owns it.
- Do not implement conversation policy or latency filler tuning; SP-017/SP-018 own them.
- Do not persist tentative text, audio, provider tokens, or raw SDK payloads.
- Do not retrieve provider transcripts or recordings after the call.
- Do not let duplicate callbacks create duplicate transcript turns or duplicate end actions.

## Implementation checklist

- [x] Wrap/map ElevenLabs status, mode, message, error, disconnect, and reconnect callbacks behind a typed frontend adapter.
- [x] Define stable event IDs/sequence handling, monotonic caption ordering, provider-sequence finalization, and the conservative adjacent-fingerprint fallback for ID-less finals.
- [x] Keep provider-neutral tentative captions replaceable and outside transcript/evidence history; document that the installed live SDK's typed message callback supplies final messages only.
- [x] Create final user/agent transcript turns with stable local IDs, bounded text, speaker, sequence, and local time metadata.
- [x] Build the approved voice signal, caption line, timer, mute, End, and connection banner from shared components.
- [x] Make mute/end controls keyboard accessible, safe-area aware, and idempotent.
- [x] Enforce the current five-minute end, preserve usable final turns, and converge agent/manual/deadline completion on one reducer-owned completed workspace after immediate cleanup.
- [x] Prevent refresh auto-reconnect; convert an interrupted live state into partial-review eligibility.
- [x] Bound retained event/transcript data and ignore content-free malformed/late events safely.
- [x] Test fake normal, tentative-to-final, interruption, duplicate, out-of-order, reconnect, disconnect, repeated-End, time-limit, completed-state restore, and first-terminal-reason traces.

## Acceptance criteria

- [x] Provider-neutral tentative text can change without creating transcript history; the installed live bridge is final-only at its supported typed SDK boundary.
- [x] Every final turn appears once in deterministic order with a stable local ID.
- [x] Duplicate/out-of-order provider callbacks cannot corrupt call state in deterministic adapter/state coverage.
- [ ] Mute and End remain reachable and understandable at all supported viewport sizes; implementation and component coverage are complete, while active-session viewport verification is deferred to SP-018.
- [x] Disconnect/refresh preserves usable local evidence but never silently reconnects.
- [x] Normal completion removes mute/dynamic voice controls, freezes elapsed time, and requires explicit **View summary**; unexpected interruption remains partial.
- [x] No audio or provider artifact is saved.

## Focused verification

- [x] Run focused event-adapter/reducer/component tests with deterministic SDK fixtures.
- [ ] Manually verify listening, speaking, interruption, mute, End, reconnect, disconnect, and hard stop; deterministic automated traces pass, while the remaining active-session evidence is deliberately deferred to SP-021B.
- [x] Inspect deterministic `sessionStorage` and logging behavior to confirm tentative text/raw events/audio are absent; the fake browser reached preflight with no console warnings/errors. Active-session browser inspection is deferred to SP-018.
- [ ] Check long captions, keyboard control, reduced motion, mobile portrait/landscape, and sticky safe-area controls in the running browser; component coverage and responsive CSS are in place, while active-session visual verification is deliberately deferred to SP-018.

## Commit boundary

Keep SP-015 reviewable as one logical change represented by `feat(voice): normalize local conversation events`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Live voice state and rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#live-voice-state)
- [Captions and local transcript contract](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#captions-and-local-transcript)
- [Active interview design](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#active-interview)
- [Reliability failures](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#graceful-failures)
- [Credential acquisition and fake-first voice gate](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
