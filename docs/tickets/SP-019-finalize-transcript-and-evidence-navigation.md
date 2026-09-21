# SP-019 — Finalize the local transcript evidence foundation

Status: Implementation complete; timeline UI superseded by SP-021; evidence-map screen-reader and responsive visual approval pending<br>
Milestone: Milestone 3 — same-session review  
Last synchronized: 2026-09-21<br>
Depends on: SP-015, SP-016, SP-018A<br>
Suggested commit: `SP-019: link local transcript evidence`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Create bounded final local turns with stable evidence references for same-session review without provider retrieval. SP-019 originally exposed those turns through a chronological timeline; the owner-directed SP-021 review intentionally supersedes that presentation with a centered evidence preview while preserving this ticket's transcript, storage, validation, and broken-reference foundation.

## Standalone implementation context

- Only final user and agent text belongs in the transcript. Tentative captions are not review evidence.
- Each final turn has a stable browser-generated ID used by insight cards and later summary evidence.
- The transcript is stored only in the current tab's bounded `sessionStorage` and may be incomplete after disconnect.
- Evidence inspection must work with keyboard/focus and long selected excerpts on desktop and mobile.
- The review is not a recording, certified transcript, searchable archive, editable case file, or provider conversation lookup.
- SP-018A is finalized by explicit owner scope decision after the bounded live
  CV/voice smoke. Its exact unchecked full-flow ledger moves to SP-021A, so no
  additional paid provider run blocks this ticket.
- Conversation-first evidence is Candidate-only; CV-assisted may distinguish CV, Candidate, and CV + Candidate on cards.
- Transcript-backed evidence inspection remains inside SP-011A's centralized dark `/demo` workspace with the same inert stage status, compact context band, home/exit behavior, and natural page-scroll fallback for long content; review does not switch to a white document shell. SP-021 is the presentation authority: the full transcript is no longer rendered, and selecting an insight replaces the center overview with its bounded question/answer evidence.

## Scope boundaries

- Do not fetch ElevenLabs transcripts/audio, store server-side history, add audio playback, transcript editing, full-text search, word-level timestamps, speaker diarization, or shareable URLs.
- Do not manufacture missing turn references or silently hide broken evidence.
- Do not let quota failure destroy the currently visible in-memory evidence.
- Do not add review summaries; SP-020/SP-021 own them.

## Implementation checklist

- [x] Finalize the bounded `TranscriptTurn` shape and chronological evidence ordering.
- [x] Retain speaker, local time metadata, final/partial status, and stable turn IDs for evidence resolution.
- [x] Resolve insight/source references only to existing eligible turn IDs. SP-021 supersedes scroll-to-timeline navigation with a keyboard-operable center preview and focus return.
- [x] Provide visible fallback for missing or invalid evidence references.
- [x] Mark disconnected/partial transcripts honestly and never imply completeness.
- [x] Bound stored turns/characters, validate restore, and handle `sessionStorage` quota/serialization failures.
- [x] Implement keyboard evidence selection, focus return, screen-reader labels, long-text wrapping, and mobile control avoidance in the final SP-021 map.
- [x] Test duplicate-event recovery, missing references, long turns, partial calls, restore, quota failure, and mode provenance.

## Acceptance criteria

- [x] Every valid Candidate evidence node resolves to a real final candidate turn and exposes that bounded excerpt in the center preview.
- [x] Broken references are visible as unavailable evidence rather than crashing or pointing elsewhere.
- [x] A disconnected call can enter an honest partial review.
- [ ] Selected transcript evidence remains readable at 320 px, 200% zoom, long text, and keyboard-only navigation.
- [x] No provider retrieval or new persistence layer exists.

## Focused verification

- [x] Run focused transcript/evidence/restore component and reducer tests.
- [ ] Manually inspect several evidence nodes and center previews by mouse, keyboard, and screen reader.
- [ ] Exercise missing IDs, duplicate events, disconnect, long transcript, quota failure, refresh, and mobile layout. Deterministic coverage passes for the state and responsive-class boundaries; human phone/tablet/desktop layout remains in the manual ledger.
- [x] Inspect network/storage to prove no provider transcript retrieval or extra persistence.

## Commit boundary

Keep SP-019 reviewable as one logical change represented by `SP-019: link local transcript evidence`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Captions and transcript contract](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#captions-and-local-transcript)
- [Insight evidence rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#card-lifecycle)
- [Review design](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#review)
- [Same-session review definition of done](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#review-1)

## Implementation record — 2026-09-21

- Orderly completion now moves from `ending` to the canonical persistable
  `review_ready` stage with final voice metadata, bounded transcript turns, and
  grounded insight cards intact. Refresh or disconnect recovery uses the same
  surface; SP-021 replaces the former long partial-transcript disclosure with a
  concise **Partial review** badge, and a second refresh still derives that
  status from persisted failed voice metadata.
- The persisted-session boundary now requires every `review_ready` record to
  include terminal `ended` or `failed` voice metadata. Missing and `connected`
  voice states are cleared as corrupt restores, while a restored `failed` voice
  remains visibly partial instead of being labelled **Interview ended**.
- The browser validates every final turn before insertion, ignores repeated IDs
  and same-speaker sequences, sorts deterministically, caps the local projection
  at 160 turns and 30,000 characters, and rechecks both limits during restore.
  Quota/rejected storage writes leave the current in-memory review visible and
  show a warning rather than clearing it.
- Review cards retain Candidate, CV, or CV + Candidate provenance. Candidate
  evidence is eligible only when it resolves to an existing final candidate
  turn. SP-019 originally scrolled to a stable transcript anchor; SP-021 now
  opens the selected question/answer inside the center evidence preview and
  restores focus to its node on minimize. Missing, partial, wrong-speaker, or
  absent references remain visible as unavailable evidence.
- Review adds a state-specific natural-flow shell override at the fixed-height
  tablet/desktop breakpoint. Long evidence now grows the page rather than being
  clipped by the generic workspace/task overflow rules, keeping later turns and
  **Clear & return home** reachable at 1024 × 768 and wider layouts by design.
- The final focused review/normalization/reducer/restore/storage run passes 6
  files and 68 tests.
  The complete frontend suite passes 35 files and 238 tests; frontend lint,
  typecheck, production build, formatting, and whitespace checks pass. Backend
  and contract builds also pass. The host currently runs Node 22.23.2 rather
  than the repository's declared Node 24 range, so every pnpm command reports
  that engine warning even though these checks completed successfully.
- A local production frontend/backend smoke returned `200` for the frontend,
  `/health/live`, and `/health/ready`; the only backend application request made
  by the browser was the public demo bootstrap. No interview, transcript, voice,
  summary, or paid-provider request was made. The temporary app processes were
  stopped and both ports were confirmed without listeners afterward.
- SP-021's owner-directed centered preview supersedes the temporary
  `TranscriptTimeline` component and full transcript section. The bounded
  transcript remains browser-only evidence for association, summary retry,
  correction history, and clearing; this ticket no longer claims a persistent
  user-facing timeline or scroll navigation.
- Manual review-state inspection was deliberately not forced through a storage
  backdoor or microphone/provider flow. A real 320 px/200% zoom visual pass,
  several mouse/keyboard chip journeys, and screen-reader output remain
  unchecked for SP-024/SP-021A or an owner-approved browser session. Long text,
  focus transfer/return, accessible labels, natural review page flow across the
  responsive breakpoints, and safe-area spacing have deterministic
  component/CSS coverage but are not represented as human visual or
  assistive-technology approval.

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
