# SP-015 — Normalize live events, captions, and controls

Status: Required  
Milestone: Milestone 2 — browser voice experience  
Last synchronized: 2026-08-31  
Depends on: SP-006, SP-014  
Suggested commit: `feat(voice): normalize local conversation events`  
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Translate ElevenLabs SDK callbacks into one deterministic browser call state, live captions, final local transcript, and reliable interview controls.

## Standalone implementation context

- The live state machine is `idle → requesting_token → connecting → listening ↔ speaking → ending → ended`, with explicit failed/reconnecting paths.
- Tentative user text drives only the current live caption line. Only final user text becomes evidence.
- Final user and agent messages become bounded `TranscriptTurn` objects with browser-generated stable IDs.
- Events may repeat or arrive out of order; normalize them through one adapter/reducer before UI or evidence tools consume them.
- The UI includes voice signal, speaking/listening status, captions, elapsed timer, mute, End interview, and connection/reconnect banner.
- An eight-minute hard stop ends the call. Refresh during a call never auto-reconnects the microphone.
- The transcript is same-tab review evidence, not a certified verbatim recording.

## Manual credential gate

- This ticket introduces no new key. Callback normalization, captions, controls, transcript bounds, and recovery tests use checked-in fake ElevenLabs event traces.
- A live SDK verification reuses SP-014's user-filled ElevenLabs/Turnstile group and private agent. No provider secret enters the frontend; it receives only the short-lived conversation token.
- If live values or paid-test permission are missing, complete every fake/event-state acceptance item and leave only the real-session callback inspection unchecked with the credential blocker.

## Scope boundaries

- Do not implement insight-card tool behavior; SP-016 owns it.
- Do not implement conversation policy or latency filler tuning; SP-017/SP-018 own them.
- Do not persist tentative text, audio, provider tokens, or raw SDK payloads.
- Do not retrieve provider transcripts or recordings after the call.
- Do not let duplicate callbacks create duplicate transcript turns or duplicate end actions.

## Implementation checklist

- [ ] Wrap/map ElevenLabs status, mode, message, error, disconnect, and reconnect callbacks behind a typed frontend adapter.
- [ ] Define stable event IDs/sequence handling and explicit deduplication/reordering rules.
- [ ] Keep tentative captions replaceable and outside transcript/evidence history.
- [ ] Create final user/agent transcript turns with stable local IDs, bounded text, speaker, sequence, and local time metadata.
- [ ] Build the approved voice signal, caption line, timer, mute, End, and connection banner from shared components.
- [ ] Make mute/end controls keyboard accessible, safe-area aware, and idempotent.
- [ ] Enforce the eight-minute end and preserve usable final turns on disconnect.
- [ ] Prevent refresh auto-reconnect; convert an interrupted live state into partial-review eligibility.
- [ ] Bound retained event/transcript data and ignore content-free malformed/late events safely.
- [ ] Test fake normal, tentative-to-final, interruption, duplicate, out-of-order, reconnect, disconnect, repeated-End, and time-limit traces.

## Acceptance criteria

- [ ] Tentative text can change without creating transcript history.
- [ ] Every final turn appears once in deterministic order with a stable local ID.
- [ ] Duplicate/out-of-order provider callbacks cannot corrupt call state.
- [ ] Mute and End remain reachable and understandable at all supported viewport sizes.
- [ ] Disconnect/refresh preserves usable local evidence but never silently reconnects.
- [ ] No audio or provider artifact is saved.

## Focused verification

- [ ] Run focused event-adapter/reducer/component tests with deterministic SDK fixtures.
- [ ] Manually simulate listening, speaking, interruption, mute, End, reconnect, disconnect, and hard stop.
- [ ] Inspect `sessionStorage` and logs to confirm tentative text/raw events/audio are absent.
- [ ] Check long captions, keyboard control, reduced motion, mobile portrait/landscape, and sticky safe-area controls.

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
