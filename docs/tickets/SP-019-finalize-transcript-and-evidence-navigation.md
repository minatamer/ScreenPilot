# SP-019 — Finalize local transcript and evidence navigation

Status: Required  
Milestone: Milestone 3 — same-session review  
Last synchronized: 2026-08-26  
Depends on: SP-015, SP-016  
Suggested commit: `feat(review): link local transcript evidence`  
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Turn bounded final local turns into an accessible review timeline and let insight/source chips navigate to their supporting evidence without provider retrieval.

## Standalone implementation context

- Only final user and agent text belongs in the transcript. Tentative captions are not review evidence.
- Each final turn has a stable browser-generated ID used by insight cards and later summary evidence.
- The transcript is stored only in the current tab's bounded `sessionStorage` and may be incomplete after disconnect.
- Evidence navigation must work with keyboard/focus and long transcripts on desktop and mobile.
- The review is not a recording, certified transcript, searchable archive, editable case file, or provider conversation lookup.
- Conversation-first evidence is Candidate-only; CV-assisted may distinguish CV, Candidate, and CV + Candidate on cards.

## Scope boundaries

- Do not fetch ElevenLabs transcripts/audio, store server-side history, add audio playback, transcript editing, full-text search, word-level timestamps, speaker diarization, or shareable URLs.
- Do not manufacture missing turn references or silently hide broken evidence.
- Do not let quota failure destroy the currently visible in-memory evidence.
- Do not add review summaries; SP-020/SP-021 own them.

## Implementation checklist

- [ ] Finalize the bounded `TranscriptTurn` shape and chronological timeline rendering.
- [ ] Show speaker, local time metadata, final/partial status, and stable DOM anchors.
- [ ] Connect insight/source chips to existing eligible turn IDs and focus/scroll the referenced turn.
- [ ] Provide visible fallback for missing or invalid evidence references.
- [ ] Mark disconnected/partial transcripts honestly and never imply completeness.
- [ ] Bound stored turns/characters, validate restore, and handle `sessionStorage` quota/serialization failures.
- [ ] Implement keyboard navigation, focus return, screen-reader labels, long-text wrapping, and mobile sticky-control avoidance.
- [ ] Test duplicate-event recovery, missing references, long turns, partial calls, restore, quota failure, and mode provenance.

## Acceptance criteria

- [ ] Every valid Candidate evidence chip navigates to a real final candidate turn.
- [ ] Broken references are visible as unavailable evidence rather than crashing or pointing elsewhere.
- [ ] A disconnected call can enter an honest partial review.
- [ ] Transcript content remains readable at 320 px, 200% zoom, long text, and keyboard-only navigation.
- [ ] No provider retrieval or new persistence layer exists.

## Focused verification

- [ ] Run focused transcript/evidence/restore component and reducer tests.
- [ ] Manually navigate several insight chips by mouse, keyboard, and screen reader.
- [ ] Exercise missing IDs, duplicate events, disconnect, long transcript, quota failure, refresh, and mobile layout.
- [ ] Inspect network/storage to prove no provider transcript retrieval or extra persistence.

## Commit boundary

Keep SP-019 reviewable as one logical change represented by `feat(review): link local transcript evidence`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Captions and transcript contract](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#captions-and-local-transcript)
- [Insight evidence rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#card-lifecycle)
- [Review design](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#review)
- [Same-session review definition of done](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#review-1)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.

