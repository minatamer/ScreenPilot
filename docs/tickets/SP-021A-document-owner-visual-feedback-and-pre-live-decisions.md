# SP-021A — Document owner visual feedback and pre-live decisions

Status: Required; both prompts implemented and deterministically verified locally; Prompt 1 owner-published; live observation pending<br>
Milestone: Milestone 3 — same-session review<br>
Last synchronized: 2026-09-23<br>
Depends on: SP-019, SP-020, SP-021<br>
Suggested commit: `SP-021A: document owner visual review findings`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)<br>
Ticket index: [`README.md`](README.md)<br>
Next packet: [`SP-021B — Validate the complete live demo flow`](SP-021B-validate-complete-live-demo-flow.md)

---

## Objective

Create one source-controlled record of the owner's fake-mode visual review, the
defects discovered during that review, the implemented fixes and verification
boundaries, and the two accepted pre-live behavior specifications. Both prompts
are implemented and deterministically verified here before SP-021B may spend
provider credit.

This packet separates deterministic implementation/documentation reconciliation
from credentialed validation. It does not start a provider, read `.env.local`,
publish an ElevenLabs revision, or claim live acceptance.

## Ticket split decision

- The former SP-021A live-validation packet moved to SP-021B without converting
  any unchecked live item into a pass.
- SP-021A owns the documentation/owner-decision record and deterministic
  implementation reconciliation for its accepted prompts, one prompt at a
  time.
- SP-021B depends on SP-021A and remains the consolidated paid, synthetic,
  complete-flow validation gate.
- Later tickets that consume live evidence depend on or reference SP-021B, not
  this documentation packet.

## Documentation truth rules

- Record implemented visual fixes as implemented only when the working tree and
  focused checks support that statement.
- Record owner visual approval only where the owner explicitly supplied it.
- Keep unimplemented decisions labelled **accepted target; implementation
  pending**. Distinguish deterministic source implementation from provider
  publication and live acceptance; none may imply another.
- Preserve the repository's fake-first, paid-disabled, stateless, role-neutral,
  and no-real-candidate-data boundaries.
- Do not record secrets, account identifiers, candidate/provider content, audio,
  raw transcripts, or secret-bearing screenshots.

## Owner visual-feedback and defect ledger

The numbers preserve the review order used during the owner walkthrough.

### Entry, preparation, and shared presentation

1. **Journey prompt removed.** Removed “Scroll to see the journey.”
2. **Ultrawide landing clarity.** Corrected hazy landing cards on wide monitors.
3. **Story-caption wrapping.** Kept the desktop caption on one line while
   allowing a clean mobile wrap.
4. **Stage progress simplified.** Replaced the progress bar with “Step X of 5”
   headings.
5. **Review-heading wrapping.** Kept the review heading on one desktop line.
6. **Redundant evidence-map headings removed.**
7. **Header badge reduction.** Removed node-count and redundant status badges.
8. **Stable evidence center.** Added a consistent bounded height and internal
   scrolling.
9. **Review actions regrouped.** Grouped and right-aligned review footer CTAs.
10. **Review footer simplified.** Removed redundant footer messages.
11. **CV privacy copy shortened.**
12. **Role suggestion clarified.** A CV may suggest but does not finalize a role.
13. **Redundant application disclaimer removed.** Removed “This is not a real
    application.” from the reviewed surface while retaining the required
    synthetic/session-only disclosure elsewhere.
14. **Duplicate role explanation removed.**

### Live interview workspace

15. **Microphone controls simplified.** Replaced microphone button text with
    accessible mic/muted icons.
16. **Muted state clarified.** Muted uses a subdued slate-gray treatment while
    active remains coral and Unmute remains visibly available.
17. **End action clarified.** Added the stop icon to **End interview**.
18. **Insight-card separators removed.**
19. **Evidence disclosure stabilized.** Anchored the Evidence CTA and renders
    expanded evidence as a separate full-width row.
20. **Redundant microphone status copy removed.**
21. **Review modes introduced.** Added **Evidence map** and **Organized notes**
    tabs.
22. **Review tab state/accessibility.** Tabs preserve map selection and support
    pointer, focus, Home/End, and arrow-key operation.
23. **Confirmation palette corrected.** Replaced green completion badges with
    plum/lilac; green remains reserved for live operational state.
24. **Review overview simplified.** Removed the bottom disclaimer and redundant
    overview content.
25. **Latency ornament removed.** Removed the separate three-dot indicator.
26. **Transcript status rail added.** Replaced the large waveform/avatar area
    with a compact integrated rail.
27. **Glass rail corrected.** Rail and captions share one scrolling layer; a
    single owning pseudo-layer provides the frosted treatment, with a `3rem`
    blur and 82% ink tint after the Chromium compositor-layer defect was found.
28. **Artificial ending page removed.** The implementation keeps the workspace
    stable during pending shutdown, then retains it as the read-only completed
    interview until the user chooses **View summary**.

### Review and organized-note composition

29. **Tab placement refined.** Moved the switch into the former header-tag
    position.
30. **Center summary made tag-free.** Role context remains plain readable text.
31. **Dense notes generalized.** Any section with four or more entries spans the
    grid and balances into two internal columns; narrow screens return to one.
32. **Center-card height increased.** Overview and selected-node states share a
    viewport-responsive `448px–576px` height with internal detail scrolling.
33. **Remaining long-card empty-space cases covered.**
34. **Large-laptop workspace balanced.** Interview and Insight Board cards share
    one stretched row and retain internal scrolling.
35. **Compact orphan panels packed.** Compact cards may pair across intervening
    full-width sections without changing semantic/DOM order.

### Accepted behavior specifications

36. **Prompt 1 implemented locally.** Unsupported employer/onboarding questions
    use the approved fallback and become paired candidate-question and human-
    follow-up evidence. Deterministic fake/provider-shaped verification is
    complete. The owner published the exact policy to private ScreenPilot/Main
    without Preview; live observation remains pending.
37. **Prompt 2 implemented locally.** Normal interview completion disconnects
    voice first, retains a completed read-only interview workspace, and waits
    for an explicit **View summary** action. Deterministic lifecycle verification
    is complete; live observation remains pending.

### Mobile defects and corrections

38. **Shared badge responsiveness.** Prevented mid-word/wrapped pills and added
    bounded phone typography, height, padding, and gap scaling.
39. **Mobile transcript viewport.** Added an `18rem–28rem` bound targeting
    `48dvh` and moved auto-follow to the layout phase against the real scroll
    owner.
40. **Initial mobile Insight Board carousel rejected.** Automated checks passed,
    but owner inspection found the composition still broken; this is retained as
    a discovered/rejected iteration rather than represented as an accepted fix.
41. **Mobile review switcher fixed.** Reset the desktop `30rem` row-axis basis
    after the heading stacks; mobile uses two equal, single-line 44 px tabs.
42. **Mobile Insight Board correction approved.** Fixed the tablet breakpoint
    that forced half-width cards, restored full-width evidence/expansion, added
    explicit carousel controls, and removed the temporary verification scaffold.
43. **Coverage density increased.** Phone coverage uses four topics in a `2×2`
    page rather than leaving a dead third-card gap.
44. **Direct-manipulation swipe added.** Evidence and coverage tracks follow the
    finger, reveal the neighbor, resist edge overscroll, and settle or return on
    release; arrows use the same track and reduced motion remains supported.
45. **Evidence-click regression fixed.** Swipe capture ignores interactive
    controls, waits for a genuine horizontal touch drag, and is disabled for
    desktop mouse input. The owner confirmed Evidence works on desktop and
    mobile while mobile swipe remains intact.
46. **Landing routes kept clean.** The product mark returns to `/`, while the
    visible same-page landing CTAs retain smooth deliberate scrolling without
    adding `#top`, `#how-it-works`, or `#start` to the address during ordinary
    activation.

## Prompt 1 documentation — candidate-question fallback and evidence

Status: **Implemented, deterministically verified, and owner-published; live observation pending.**

### Context that must travel with Prompt 1

- The former SP-021A paid complete-flow packet has moved to SP-021B. The new
  SP-021A is the documentation and implementation-reconciliation packet for the
  owner's UI/UX review, discovered bugs, and resulting fixes.
- Prompt 1 is implemented with deterministic fake/provider-adapter coverage
  only. Do not begin SP-021B, read `.env.local`, enable paid mode, make a live
  provider call, or claim live behavior.
- Preserve every already-approved visual change in the 46-item ledger. Keep the
  implementation role-neutral, stateless, evidence-linked, and safe against
  invented employer facts.
- After implementation, reconcile SP-021A's implementation status and the
  affected source-of-truth/ticket/runbook text. SP-021B must remain a separate,
  later owner-authorized paid validation packet.

### Prompt 1 — three main implementation tasks

1. **Implement the bounded interview response and tool capture.**
   - Use the exact approved spoken fallback below for unsupported employer,
     vacancy, onboarding, or work-arrangement questions.
   - For the same eligible final candidate turn, invoke
     `recordCandidateQuestion` with the actual question and `requestFollowup`
     with the bounded reason a human recruiter must answer it.
   - Continue the role-neutral interview naturally, remain idempotent under
     duplicate callbacks, and never infer employer facts.
2. **Expose the evidence consistently across the UI.**
   - Show Candidate question and Human follow-up cards during the interview.
   - Preserve both in Organized notes, the evidence-linked review, and copied
     review text with valid final-transcript evidence.
   - Keep fake and live-shaped state behavior aligned without adding durable
     storage or provider transcript retrieval.
3. **Verify and reconcile the implementation without performing live work.**
   - Add focused policy, tool-dispatch, reducer/component, summary, evidence,
     duplicate-callback, and copy-output coverage as appropriate.
   - Update the source-controlled adaptive policy, fixtures, provider-sync
     runbook, source of truth, SP-017, SP-021, SP-021A, and SP-021B.
   - If the ElevenLabs prompt must change, prepare the source-controlled change
     but do not publish or change the recorded immutable revision until the
     owner explicitly authorizes and confirms it. Leave actual paid/live
     observation to SP-021B.

### Required behavior

- For an unsupported employer, vacancy, onboarding, or work-arrangement
  question, the spoken fallback is:

  > “I don’t have confirmed onboarding or work-arrangement details in this demo.
  > A human recruiter would need to confirm that, so I’ll include your question
  > in this session’s review.”

- For the same final candidate turn, invoke `recordCandidateQuestion` with the
  actual question and `requestFollowup` with the reason a human recruiter must
  answer it.
- Show both Candidate question and Human follow-up cards during the interview.
- Preserve both in Organized notes, the evidence-linked review, and copied
  review text with valid final transcript evidence.
- Continue the interview naturally after the bounded fallback.
- Never infer employer facts from a role label, CV, general knowledge, or
  candidate wording.
- Keep fake and live-shaped behavior aligned and idempotent under duplicate
  callbacks.

### Documentation synchronization required with implementation

- Update the adaptive interviewer policy, its fixtures/tests, the provider-sync
  runbook, the source of truth, SP-017, SP-021, SP-021A, and SP-021B.
- If the live ElevenLabs prompt changes, follow the immutable-version/publication
  policy. Do not change the recorded published revision or claim live behavior
  until the owner confirms publication and a later authorized observation.

### Prompt 1 implementation record — 2026-09-22

- The source-controlled adaptive policy and transcript fixtures advance to
  `sp017-2026-09-22.1`. Its exact spoken fallback is paired with
  `recordCandidateQuestion` and `requestFollowup` on the same eligible final
  candidate turn, then the role-neutral interview may continue with at most one
  relevant HR question.
- The browser requires a complete normalized question segment, so a verbatim
  question inside a compound candidate turn is accepted while arbitrary
  fragments and unrelated questions are rejected. Duplicate question/follow-up
  callbacks do not create duplicate cards.
- Fake interview events exercise the same provider-shaped dispatch path. The
  reducer and live Insight Board retain both cards. Summary validation accepts
  a captured item only when its exact value and complete insight evidence-ID
  set survive; same-ID paraphrases trigger the one bounded repair and otherwise
  fail closed. Organized notes, the selected evidence node, and copied review
  text therefore preserve both authoritative values with the same valid final-
  turn evidence. No durable storage or provider transcript retrieval was added.
- Focused verification passes 4 backend files / 73 tests and 5 frontend files /
  61 tests with `PROVIDER_MODE=fake` and `PAID_DEMO_ENABLED=false`. Relevant
  contracts, backend, and frontend typechecks pass under Node 24.19.0; targeted
  ESLint and Prettier checks plus repository-wide `git diff --check` also pass.
- On 2026-09-22 the owner copied the exact rendered source prompt to the existing
  private ScreenPilot/Main branch, saved the changed `recordCandidateQuestion`
  and `requestFollowup` descriptions, reviewed the prompt diff, and published
  without Preview or a paid conversation. Immutable revision
  `agtvrsn_8901m350e924f2ev7t4pwnvq38b1` is mapped to policy
  `sp017-2026-09-22.1`; Main branch ID
  `agtbrch_8401m2ar2j6nfshaa5wg31f0j654` is not used as revision evidence.
  Historical revision `agtvrsn_1501m2mwx4ffek39r88ygh1ngxq4` remains mapped
  only to `sp017-2026-09-16.1`. SP-021B still owns live observation.

## Prompt 2 documentation — completed-interview hold and View summary

Status: **Implemented and deterministically verified; live observation pending.**

### Context that must travel with Prompt 2

- The former SP-021A paid complete-flow packet has moved to SP-021B. The new
  SP-021A owns the owner's UI/UX feedback, discovered bugs, accepted visual
  fixes, and the implementation reconciliation for this completed-interview UX.
- Prompt 2 is the second SP-021A product/UX fix. It is implemented and verified
  in fake mode with deterministic lifecycle coverage; do not begin SP-021B,
  read `.env.local`, enable paid mode, make a live provider call, or treat fake
  evidence as paid acceptance.
- Preserve the approved interview workspace, transcript rail, Insight Board,
  mobile interaction, review tabs, evidence map, and Organized notes behavior
  recorded in the 46-item ledger.
- After implementation, reconcile SP-021A's implementation status and all
  affected workflow/persistence/cost-control documentation. SP-021B remains the
  separate owner-authorized gate that later observes the three completion
  routes against the real provider.

### Prompt 2 — four main implementation tasks

1. **Introduce one canonical completed-interview lifecycle.**
   - Add one reducer-owned `post_interview` or `interview_complete` state between
     active/shutdown behavior and summary/review.
   - Route agent `end_call`, manual **End interview**, and the absolute
     eight-minute deadline through one idempotent termination path that
     preserves the first terminal reason.
   - Immediately terminate provider/WebRTC/media work, release tracks and
     authorization, cancel timers/requests/measurements, and unmount the bridge;
     retain the bounded two-second local fallback when the provider omits its
     terminal disconnect.
2. **Render the completed workspace and explicit View summary handoff.**
   - Keep transcript and Insight Board visible but read-only after cleanup.
   - Freeze elapsed time (`08:00` for the hard stop), remove dynamic voice and
     mute controls, state that the microphone is disconnected, and replace
     **End interview** with **View summary**.
   - The original Prompt 2 target kept summary preparation idle after
     disconnect and let **View summary** begin the single lifecycle. The later
     owner-directed local summary-rehearsal decision narrowed that global rule:
     only `summary_rehearsal` still waits to initiate work; freshly validated
     standard fake/live may prepare once behind the hold, while paid-disabled,
     pending, and failed runtime validation remain closed. **View summary**
     always controls review exposure and never reconnects voice or duplicates a
     summary call.
3. **Align fake mode, restore behavior, and failure semantics.**
   - Emit an agent-owned fake disconnect after all final transcript/tool events
     and enter the same completed workspace.
   - Restore completed state without requesting a voice token or reconnecting;
     keep persistence allow-listed and free of tokens, audio, provider objects,
     and microphone state.
   - Keep unexpected provider/network interruption as the existing distinct
     partial path rather than presenting it as successful completion.
4. **Verify and reconcile the implementation without performing live work.**
   - Add focused reducer, voice-hook, cleanup, fake-trace, timeout, UI,
     persistence/refresh, accessibility, and duplicate-action coverage for all
     three normal triggers plus the partial-interruption distinction.
   - Update source-of-truth Stages 8–10 and workflow/persistence/cost-control
     sections, plus SP-015, SP-018, SP-021, SP-021A, and SP-021B.
   - Do not perform the paid observations here. SP-021B must later validate all
     three normal completion routes as immediate voice disconnects followed by
     the read-only completed workspace and explicit **View summary** action.

### Implementation record — 2026-09-22

- The reducer owns `interview_complete` plus allow-listed completion metadata:
  `candidate_ended`, `agent_completed`, or `time_limit` and bounded frozen
  elapsed seconds. Agent completion, manual End, and the absolute deadline enter
  the same idempotent shutdown; duplicate terminal callbacks keep the first
  reason.
- Shutdown immediately clears authorization, timers, requests, content-free
  measurements, provider/WebRTC/media work, and the mounted provider bridge.
  The bounded two-second local fallback remains when the provider omits its
  terminal callback.
- The completed workspace keeps the final transcript and Insight Board
  read-only, freezes elapsed time (`08:00` for the deadline), removes mute and
  dynamic voice status, states **Microphone disconnected**, and replaces End
  with **View summary**.
- The original 2026-09-23 Prompt 2 implementation started its one managed
  summary lifecycle only after disconnect plus explicit **View summary**. That
  historical global rule was later superseded only as to initiation timing by
  local summary rehearsal: freshly bootstrap-validated `deterministic_fake` and
  `standard_live` may prepare once while the completed workspace remains
  visible; `summary_rehearsal` still waits for **View summary**;
  `paid_disabled`, pending, and failed refresh start nothing. **View summary**
  continues to be the only action that exposes pending or ready review.
- The fake trace emits an agent-owned disconnect after every final transcript
  and client-tool event. Restored completed state never requests a token or
  reconnects. Unexpected provider/network interruption still uses the existing
  partial path rather than normal completion.
- Persistence contains only validated terminal reason/frozen time and ended
  voice metadata; it excludes provider objects, tokens, audio, microphone state,
  and other runtime authorization.
- Focused completion verification passes 8 frontend files / 72 tests; the full
  frontend regression suite passes 37 files / 268 tests. Frontend typecheck,
  targeted ESLint, targeted Prettier checks, and repository-wide
  `git diff --check` also pass. The local runtime is Node 22.23.2 while the
  repository requires Node 24, so the engine warning remains an environment
  blocker rather than a claimed Node-24 verification.
- Deterministic implementation and documentation work used
  `PROVIDER_MODE=fake` and `PAID_DEMO_ENABLED=false`. No `.env.local`, live
  provider, provider publication, or paid operation was used.

### Required target behavior

- Add one reducer-owned `post_interview` or `interview_complete` stage between
  shutdown and summary/review.
- Agent `end_call`, manual End, and the eight-minute deadline must immediately
  terminate WebRTC/provider work, release microphone/media tracks, clear
  authorization, cancel timers/requests/measurements, unmount the provider
  bridge, and preserve exactly one first terminal reason.
- After cleanup, keep the transcript and Insight Board visible and read-only,
  freeze elapsed time (showing `08:00` for the hard stop), remove dynamic
  speaking/listening/reconnect UI and mute, replace **End interview** with
  **View summary**, and state that the microphone is disconnected.
- **View summary** must never reconnect voice. It reveals the existing organizing
  state while summary work is pending or the completed review when ready.
- After fresh bootstrap validation, standard fake/live summary preparation may
  begin after voice disconnect while the completed workspace remains visible so
  the existing 15-minute grant does not expire unnecessarily. Summary rehearsal
  begins only after **View summary**; paid-disabled, pending, and failed refresh
  begin nothing. Preserve local evidence on summary failure/expiry and prevent
  duplicate summary calls.
- After all final fake transcript/tool events, fake mode emits an agent-owned
  disconnect and enters the same completed workspace until **View summary**.
- Unexpected provider/network interruption remains a distinct partial path.
- Restoring the completed stage must never request a token, reconnect voice, or
  mount summary preparation from persisted configuration; fresh bootstrap
  validation must authorize any standard background behavior. Persistence
  remains allow-listed and excludes tokens, audio, provider objects, and
  microphone state.

### Documentation synchronization required with implementation

- Update source-of-truth Stages 8–10 and the workflow/persistence/cost-control
  sections, plus SP-015, SP-018, SP-021, SP-021A, and SP-021B.
- SP-021B must validate all three normal completion routes as immediate voice
  disconnects followed by the read-only completed workspace and explicit
  **View summary** action.

## Documentation checklist

- [x] Preserve the former SP-021A paid/live packet as SP-021B without converting
  unchecked evidence into passes.
- [x] Create the SP-021A reconciliation packet and record the complete owner
  feedback/defect ledger.
- [x] Record both prompts as locally implemented and deterministically verified.
- [x] Reconcile Prompt 1 across the source of truth, SP-017, SP-021, SP-021A,
  SP-021B, and the provider-sync runbook, then record the separate
  owner-authorized publication without claiming live behavior.
- [x] Reconcile the same required surfaces after Prompt 2 implementation.
- [x] Record Prompt 1 focused verification, owner-confirmed publication, and the
  remaining live-observation blocker without claiming live behavior.
- [x] Confirm SP-021B's candidate-question and completed-interview preconditions
  match both implemented prompts while keeping paid/live work open.
- [x] Run a final repository-wide SP-021A/SP-021B reference audit and correct
  every dependency, milestone, handoff, and live-evidence consumer.

## Acceptance criteria

- [x] Every visual change and discovered regression is represented without
  erasing rejected iterations or overstating browser/live coverage.
- [x] Prompt 1 documentation matches its implementation, fixtures, tests, and
  owner-confirmed immutable provider revision.
- [x] Prompt 2 documentation matches the deterministically verified
  implementation; live observation remains pending.
- [x] The source of truth, affected tickets, ticket index, and downstream
  dependencies distinguish deterministic SP-021A reconciliation from paid
  live-validation SP-021B.
- [x] No secret, candidate/provider content, real-person data, audio, or ignored
  environment value appears in the documentation or diff.

## Commit boundary

Keep SP-021A limited to its accepted deterministic implementation and
documentation reconciliation. Do not publish an agent revision, enable paid
operations, run a live provider, or absorb SP-021B validation. Do not create a
commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [SP-021 review implementation](SP-021-build-review-retry-and-clear-session.md)
- [SP-021B complete-flow live validation](SP-021B-validate-complete-live-demo-flow.md)
- [SP-017 adaptive interviewer policy](SP-017-write-and-evaluate-adaptive-interview-policy.md)
- [SP-018 voice timing and hard stop](SP-018-tune-latency-interruption-and-filler.md)
- [Source-of-truth live interview](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#stage-8--live-interview)
- [Source-of-truth review](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#stage-10--local-review-and-clear)

## Completion handoff

Report which documentation surfaces were reconciled, the exact implementation
and owner evidence supporting each claim, both prompt statuses, every
remaining mismatch/blocker, and confirmation that SP-021B remains closed until
this record matches the selected live-validation candidate.
