# SP-021B — Validate the complete live demo flow

Status: Required; 2026-09-23 live conversation-first attempt failed/incomplete and fake-only blocker fixes require provider synchronization before another authorized run<br>
Milestone: Milestone 3 — same-session review<br>
Last synchronized: 2026-09-23<br>
Depends on: SP-018A, SP-019, SP-020, SP-021, SP-021A<br>
Suggested commit: `SP-021B: validate the complete live demo flow`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)<br>
Ticket index: [`README.md`](README.md)

---

## Objective

After SP-021A has documented the owner's visual feedback, every resulting fix,
and implemented both accepted pre-live behavior specifications, validate both entry
modes from preparation through voice, corrected captions and automatic ending,
summary, evidence-linked review, retry behavior, cleanup, provider usage, and
cost without paying for another partial pre-review smoke test.

## Why this ticket exists

- SP-018A proved the bounded live CV and private voice integrations with
  synthetic data. The owner accepted that smoke as sufficient to unlock SP-019.
- That smoke exposed missing Pilot captions and a missing provider-owned end
  transition. Both defects were fixed and deterministically verified after the
  paid run, but were deliberately not re-observed in another partial paid run.
- SP-018A's unperformed full tool/runtime-variable coverage, post-fix live
  observation, timing diagnostics, provider review, privacy audit, and cleanup
  evidence remain explicitly unchecked. They move here; they are not converted
  into passes.
- SP-020 and SP-021 must remain fake-first. Their first real summary and review
  walkthrough belongs to this complete-flow window rather than a standalone
  summary charge.
- SP-021A owns the visual-review ledger, the owner's explicit visual decisions,
  and deterministic implementation reconciliation for the accepted candidate-
  question fallback/evidence capture and completed-interview hold. Prompt 1 is
  originated in published policy `sp017-2026-09-22.1`; blocker corrections are
  now implemented in unpublished source policy `sp021b-2026-09-23.1`; Prompt 2 is
  implemented and
  deterministically verified locally. SP-021B must not begin while either
  behavior or its record differs from the code/provider revision selected for
  live validation.
- SP-025 may reuse current SP-021B live evidence. It repeats a paid flow only
  when a later code, provider, configuration, hostname, or release-candidate
  change invalidates that evidence.

## Absolute data, credential, and spend boundary

- Use only checked-in synthetic CVs, transcript fixtures, and invented test
  identities. Never use a real CV, candidate detail, interview audio, or data
  copied from a real person.
- The owner alone controls ignored local environment values and both runtime
  switches. The coding agent never reads or prints `.env.local`.
- Agree a maximum number and duration of paid operations before activation.
  Let the two required complete flows produce their timing observations
  naturally; never repeat a provider call merely to increase a measurement
  count or create a performance benchmark.
- Direct OpenAI operations use the locked models/settings, structured output,
  and `store: false`. ElevenLabs audio saving and retention remain at the locked
  privacy settings.
- Keep provider content, credentials, tokens, CV/transcript text, audio, account
  identifiers, and secret-bearing screenshots out of source, logs, reports, and
  chat.

## Preconditions

- [ ] Before any future live-mode switch or paid provider operation, run a fresh
  deterministic fake-mode rehearsal of both SP-021A prompts against the exact
  release candidate. Prompt 1 must show the approved unsupported-employer
  fallback and the paired Candidate question/Human follow-up evidence through
  interview and review. Prompt 2 must show fake agent completion entering the
  disconnected read-only workspace and **View summary** reaching review without
  reconnecting voice or duplicating summary work. If either rehearsal fails,
  stop, fix, document, and revalidate it in fake mode before continuing. The
  earlier run predates the post-live corrections and does not satisfy this gate.
- [ ] In the same post-fix fake-mode rehearsal, prove that preparation, connection,
  eligible TTFA, interruption, and client-tool-to-card observations are captured
  automatically with source `fake`; raw numbers remain viewable after interview
  completion, can be copied as content-free JSON and reset, and disappear on
  refresh or **Clear & exit**. Use the implemented loopback-only
  `/demo?diagnostics=timings` drawer; do not begin live testing until this manual
  fake rehearsal passes.
- [ ] Before that rehearsal, verify the implementation diff/search removed the
  superseded fixed-count constants, minimum-sample and percentile-gate statuses,
  gate-only outlier/report branches, obsolete batch-form UI, and their dedicated
  tests/fixtures. Do not begin live testing with the old benchmark code merely
  hidden from the screen.
- [ ] SP-019, SP-020, and SP-021 are implemented and pass their focused fake-mode
  and deterministic verification without loading `.env.local` or reaching a
  provider.
- [ ] SP-021A is complete: the visual-feedback ledger, resulting implementation
  record, owner decisions, documentation synchronization, and the two pre-live
  behavior specifications match the exact code selected for this paid window.
- [ ] Source policy `sp021b-2026-09-23.1` is not yet provider-published. The last
  verified policy `sp017-2026-09-22.1` was owner-published without Preview or
  a paid conversation to immutable ElevenLabs revision
  `agtvrsn_8901m350e924f2ev7t4pwnvq38b1`. Historical `sp017-2026-09-16.1`
  revision `agtvrsn_1501m2mwx4ffek39r88ygh1ngxq4` remains historical evidence
  only.
- [ ] The exact unchecked SP-018A evidence ledger is reviewed; no deferred item
  is represented as already passed.
- [ ] Repository status contains no local environment file, credential,
  candidate artifact, transcript, audio, or provider response.
- [ ] The owner confirms the required provider groups, balance/allowance, caps,
  published agent revision, Turnstile host/actions, audio-saving state, and
  retention settings without exposing secret values.
- [ ] The owner explicitly authorizes the bounded synthetic paid window and its
  maximum calls/duration.
- [ ] Start with `PROVIDER_MODE=live` and `PAID_DEMO_ENABLED=false`; confirm the
  paid paths remain visibly and technically closed before the owner enables
  them.
- [ ] If the owner elects to isolate summary validation first, use the documented
  local-only `LIVE_INTERVIEW_ENABLED=false` summary rehearsal for exactly one
  synthetic conversation-first run. Confirm its persistent label, disabled CV
  path, fake-labelled voice diagnostics, zero ElevenLabs activity, explicit
  **View summary** gate, and at most one real OpenAI summary. This evidence is
  summary-only and does not satisfy any standard live voice acceptance item.
  The flag is not an independent provider switch: the shared derived
  `effectiveMode` keeps fake mode deterministic, keeps live + paid-disabled
  closed, selects standard live by default for paid live, and selects rehearsal
  only for local paid live with the explicit false override.

Effective-mode behavior for this packet is fixed as follows. Persisted runtime
configuration is never sufficient to activate a restored session; every row
applies only after the current bootstrap refresh succeeds.

| `effectiveMode` | Summary initiation | ElevenLabs | **View summary** |
| --- | --- | --- | --- |
| `deterministic_fake` | One background fake summary may start after normal disconnect. | Never reachable. | Exposes pending or ready review; does not initiate work. |
| `paid_disabled` | Never; no Turnstile or summary request mounts. | Never reachable. | Cannot initiate provider work. |
| `standard_live` | One protected live summary may start after normal disconnect. | Reachable only through the protected standard-live voice path. | Exposes pending or ready review; does not initiate work. |
| `summary_rehearsal` | One protected live summary starts only after the explicit action. | Never reachable; voice is deterministic fake. | Initiates the summary lifecycle. |

While a restored refresh is pending or failed, every provider control in this
table remains closed. A failed refresh requires explicit safety-check retry;
only a later successful eligible response may reopen its row.

## Consolidated live-validation checklist

### 0. Mandatory SP-021A fake-mode and owner-decision gate

- [ ] Keep `PROVIDER_MODE=fake` and `PAID_DEMO_ENABLED=false`, then complete the
  two-prompt fake-mode rehearsal required above. Record the observed Prompt 1
  fallback/evidence path and Prompt 2 completed-workspace/View-summary path
  before changing either switch for live testing.
- [ ] Inspect the post-fix fake-mode raw timing observations, copy one content-free JSON
  snapshot, reset it, and confirm no candidate content, upload, automatic file,
  browser storage, or backend persistence is created.
- [ ] Review SP-021A's complete visual-feedback and defect ledger; do not repeat
  resolved visual iteration merely to recreate its history.
- [ ] Confirm the owner-approved responsive review state, evidence interaction,
  direct-manipulation swipe behavior, and interview workspace match SP-021A's
  documented result at the fake-mode preflight gate.
- [ ] Confirm Prompt 1 still passes deterministic verification, Prompt 2 has
  been implemented and deterministically verified, and the selected Prompt 1
  source policy has been published to the newly recorded immutable revision
  before enabling paid operations; otherwise keep SP-021B open and do not spend
  provider credit.

### 1. CV-assisted complete flow

- [ ] Use the checked-in synthetic text PDF and one fresh `cv_analyze` Turnstile
  challenge; confirm one action creates at most one bounded OpenAI operation.
- [ ] Correct or confirm the suggested role without an allow-list, technical
  assessment, real-vacancy claim, or inferred employer fact.
- [ ] Complete preflight, one private token exchange, and one WebRTC session.
- [ ] Observe candidate and Pilot tentative/final captions, including the
  speaker-scoped deduplication fix, with no duplicate session or final turn.
- [ ] Exercise applicable client tools and confirm valid evidence provenance,
  correction replacement, topic state, candidate questions, and follow-up state.
  Ask one unsupported employer/onboarding question and verify the approved
  exact bounded fallback plus matching Candidate question and Human follow-up
  cards attached to that same final candidate turn.
- [ ] Let the agent close naturally; observe `end_call`, terminal disconnect,
  media release, and the reducer-owned read-only interview-complete workspace.
- [ ] Choose **View summary**, generate one live evidence-grounded summary,
  verify the question/follow-up evidence in Organized notes, linked review, and
  copied review text, and reach the complete review without provider transcript
  or audio retrieval.
- [ ] Confirm the naturally occurring CV-assisted timings are labelled `live`
  and remain available in the completed workspace without affecting the flow.

### 2. Conversation-first complete flow

- [ ] Confirm preparation remains deterministic and makes no direct OpenAI or
  ElevenLabs call before preflight.
- [ ] Complete one synthetic private voice interview with open/undecided or
  candidate-stated role context and Candidate-only provenance.
- [ ] Confirm all eight bounded runtime variables are resolved across the two
  modes and no `{{screenpilot_*}}` placeholder is spoken.
- [ ] Across the two flows, trigger and verify all five client tools exactly once
  per intended action, including `Applied:`/`Rejected:` responses and rejection
  safety.
- [ ] Observe the corrected captions and automatic ending, confirm the completed
  read-only workspace does not reconnect voice, then choose **View summary** and
  generate the conversation-first summary/review with no CV source language.
- [ ] Confirm conversation preparation and the naturally occurring interview
  timings are labelled `live`; do not add turns or another session solely to
  increase the diagnostic count.

### 3. Review, retry, evidence, and cleanup

- [ ] Verify summary and insight evidence chips navigate to real final candidate
  turns; broken evidence stays visibly unavailable.
- [ ] Verify the retry path with a fresh Turnstile token. Use deterministic
  failure injection when a deliberate paid-provider failure would add cost
  without testing a provider-specific question; record which portion was live.
- [ ] Verify Copy, partial/disconnected presentation, and deliberate Clear & exit
  behavior without creating saved history or provider retrieval.
- [ ] End all sessions, stop microphone/media tracks, cancel timers and obsolete
  requests, remove temporary object URLs, and confirm no automatic reconnect.
- [ ] Across focused bounded scenarios, verify agent `end_call`, manual **End
  interview**, and the absolute eight-minute deadline each disconnect voice
  immediately, preserve one terminal reason, enter the same completed workspace,
  and require **View summary**; verify unexpected provider/network interruption
  remains the distinct partial path.
- [ ] Inspect browser storage, URLs, console, application logs, screenshots, and
  temporary files for secrets, tokens, candidate/provider content, or forbidden
  persistence.

### 4. Informational diagnostics, provider, and cost evidence

- [ ] Confirm fake mode captured and exposed the same content-free metric types
  before live activation, then retain only the naturally occurring raw timing
  observations from the two authorized live complete flows.
- [ ] Keep summary-rehearsal observations labelled `fake` for voice diagnostics
  and record any OpenAI usage/cost separately as summary-only evidence; never
  mix them into ElevenLabs or standard-live timing claims.
- [ ] Review TTFA, connection, client-tool-to-card, interruption, waiting-state,
  filler, and eight-minute-stop observations for obvious regressions. Counts and
  p50/p95 aggregates are informational only; there is no minimum sample count,
  pass/fail percentile, or permission to repeat paid work for metrics.
- [ ] If useful for debugging, copy a sanitized in-memory JSON snapshot with its
  fake/live source and observed count. Do not persist it automatically, upload
  it, or present the bounded walkthrough as representative performance evidence.
- [ ] Review the actual OpenAI and ElevenLabs operation counts, model/revision,
  duration, retention/audio state, coarse usage, and cost without copying
  provider content or account identifiers.
- [ ] Create or update the sanitized full-flow cost baseline required by SP-025;
  distinguish measured cost from estimates and applied allowances.

### 5. Close the window

- [ ] The owner restores `LIVE_INTERVIEW_ENABLED=true`,
  `PAID_DEMO_ENABLED=false`, and `PROVIDER_MODE=fake` and explicitly confirms
  those values without exposing the ignored files.
- [ ] Restart in fake mode, run the smallest affected deterministic checks, and
  confirm no secret or candidate/provider content appears in Git status/diff,
  documentation, logs, temporary artifacts, or chat.
- [ ] Record a sanitized handoff with dates, profiles, observed diagnostic counts, provider
  identifiers, request counts, coarse usage/cost, passes, failures, and every
  unperformed item.

## Acceptance criteria

- [ ] The two SP-021A prompt rehearsals pass in fake mode and are recorded before
  the first live-mode switch or paid provider operation; a failure prevents the
  live window from starting.
- [ ] The SP-021A owner-decision and documentation record is complete and still
  matches the release candidate used for this live window.
- [ ] Both entry modes complete through corrected live voice behavior, the
  read-only interview-complete hold, explicit **View summary**, evidence-linked
  review, and cleanup using synthetic data.
- [ ] Unsupported employer/onboarding questions use the approved fallback and
  remain visible as evidence-linked Candidate question and Human follow-up data
  during the interview, in Organized notes/review, and in copied review text.
- [ ] Pilot captions and the provider-owned automatic ending are independently
  observed after their SP-018A fixes.
- [ ] All eight runtime variables and all five client tools are verified without
  unresolved placeholders, duplicate mutations, or invalid evidence.
- [ ] Summary/retry/review behavior preserves local evidence and respects mode
  provenance; any deterministic rather than live retry evidence is labeled.
- [ ] The exact content-free diagnostics path is proven in fake mode before live
  activation, and the two live flows expose their naturally occurring raw
  observations without persistence, extra paid repetitions, or a benchmark
  claim.
- [ ] Provider revision, retention, privacy, usage, operation counts, and actual
  cost are reviewed with content-safe evidence.
- [ ] Both safety switches are restored and fake mode is reverified.
- [ ] No real-person data, secret, provider payload, transcript content, or audio
  is committed, logged, persisted, or placed in the report.

## Focused verification

- [ ] Re-run the smallest checks affected by post-SP-021A changes, complete the
  mandatory fake-mode rehearsal of both accepted prompts, and repeat any other
  invalidated fake-mode visual states before beginning the paid window.
- [ ] Run only the smallest relevant deterministic suites before and after the
  live window; never add paid calls to automated tests or CI.
- [ ] Use browser network, storage, console, accessibility, responsive, and
  media inspection without saving secret- or content-bearing exports.
- [ ] Re-run only the bounded scenario affected by a discovered defect. A new
  paid run requires a defined question, owner authorization, and remaining cap.

## Historical pre-correction fake-mode rehearsal — 2026-09-23

- The owner completed both required fake entry paths before enabling live mode.
  The conversation-first run exercised the without-CV question fallback and the
  normal completed-workspace/**View summary** handoff; the sample-CV run
  exercised the CV-assisted interview path.
- The loopback-only `/demo?diagnostics=timings` drawer captured automatic,
  content-free timing observations in both runs with source `fake`. The
  conversation-first snapshot included one preparation sample, one connection
  sample, six TTFA samples, and ten client-tool-to-card samples. The sample-CV
  snapshot correctly had no preparation sample and included one connection
  sample, six TTFA samples, and ten client-tool-to-card samples.
- Both snapshots contained only metric identifiers and numeric timings; no CV,
  transcript, insight, credential, token, or provider payload appeared. The
  owner confirmed the drawer's completed-state visibility, JSON copy, reset,
  refresh/**Clear & exit** clearing, and end-to-review behavior.
- Neither manual run included a candidate interruption, so the zero interruption
  counts are expected and do not represent audible-overlap evidence. The
  provider listening callback is deterministically covered; the audible
  interruption and overlap check remains explicitly pending in the bounded live
  window.
- Fake timings validate capture behavior only. They are not presented as live
  provider latency, a performance benchmark, or a release gate.
- This rehearsal preceded policy `sp021b-2026-09-23.1`, the final-No fake trace,
  summary-boundary/classifier changes, explicit clock origins, interruption-copy
  correction, and responsive error layout. It remains historical evidence, not
  acceptance of the current exact release candidate.

## Required post-fix fake rehearsal before provider synchronization

- [ ] Conversation-first unsupported employer/team-size question: exact
  fallback, paired Candidate question/Human follow-up cards, and exactly one next
  HR question in the same Pilot response without “Okay”.
- [ ] Final No: one brief close, automatic agent disconnect, completed read-only
  workspace, **View summary**, and `review_ready` without reconnect or duplicate
  summary work.
- [ ] Sample-CV path through summary/review with correct provenance.
- [ ] Diagnostics JSON in fake mode: inspect/copy/reset, explicit
  `performance_time_origin`/`unix_epoch`, no candidate content, and refresh/Clear
  removal. No count or percentile is a gate.
- [ ] Retryable and non-retryable summary failures: evidence preserved, Retry
  only when retryable, and readable error layout at phone, tablet, desktop, and
  one intermediate width.
- [ ] Injected interruption: one stop/unmount, generic partial review with
  evidence preserved, no page-refresh claim, fake fallback, automatic reconnect,
  or duplicate operation.
- [ ] Provider publication/synchronization and every paid live acceptance item
  remain unchecked until separately authorized.

## Deterministic restore and summary-payload closure — 2026-09-23

- `DemoExperience` now treats fresh `runtimeConfigStatus === "ready"` plus an
  eligible current `effectiveMode` as a prerequisite for mounting summary
  preparation. A restored stale standard mode starts no Turnstile or summary
  work while refresh is pending or failed; paid-disabled stays closed after a
  successful refresh. Standard fake/live may begin one background preparation
  only after readiness, while summary rehearsal remains idle until **View
  summary**.
- Restore-focused integration coverage exercises pending refresh, rehearsal,
  both standard modes, paid-disabled, refresh failure, and explicit successful
  retry through the real session provider/bootstrap boundary. It asserts zero
  provider work in every closed state and exactly one summary in each eligible
  state.
- The complete summary-rehearsal browser test now inspects the synthesized
  `/v1/interview/summary` body after the full fake trace. It verifies the
  conversation-first plan and grant/challenge handoff, the final candidate No,
  Candidate question and Human follow-up insights with shared evidence,
  progressed topics, Candidate-only provenance, and absence of any CV payload
  or CV fact reference.
- Fake-only focused verification passed 12 frontend files / 149 tests, 10
  backend files / 177 tests, and 1 contracts file / 7 tests. The previously
  failing completion file also passed alone at 1 file / 6 tests. Frontend plus
  contracts typecheck, targeted lint/formatting, and `git diff --check` passed.
  No `.env.local`, live provider, manual browser rehearsal, provider
  publication, or paid operation was used; every manual/live checklist item
  remains unchecked.

## Failed live conversation-first attempt — 2026-09-23

This attempt is incomplete and does not replace the successful fake rehearsal.
The owner restored `PROVIDER_MODE=fake`; no additional live/provider operation is
authorized by this record.

- Passed observations: the diagnostics source was `live`; preparation,
  connection, TTFA, and card-render timings were captured; the unsupported
  employer question and its follow-up evidence were retained; local evidence
  survived the summary failure; and a visible Retry action was shown.
- Content-free snapshot: 25 samples—preparation 25 ms, connection 2501.5 ms,
  TTFA count 11 (p50 4225 ms, p95 10032 ms), interruption count 1 (0 ms), and
  client-tool-to-card count 11 (p50 6.9 ms, p95 13.4 ms). The 0 ms
  interruption is inconclusive. Samples now label `performance_time_origin` or
  `unix_epoch` explicitly so raw timestamps are not falsely compared across
  clocks.
- Release blockers observed: the interviewer did not invoke `end_call` after a
  declined final question; the unsupported-question fallback waited for an
  acknowledgement before the next HR question; manual End reached the completed
  workspace but summary generation showed `SUMMARY_UNREACHABLE`; TTFA was slow;
  and the responsive summary error heading was squeezed beside Retry.
- The retained backend log starts after the failed attempt because the restart
  truncated the reused log file. No request/status/provider evidence survives,
  so the root provider cause is **unknown** and must not be invented. The exact
  UI copy proves only that a non-`ScreenPilotApiError` crossed the frontend
  summary boundary; plausible layers were local request validation, browser
  fetch/network, or another non-API exception—not proof that OpenAI was called.
- Fake-only corrections: source policy `sp021b-2026-09-23.1` makes a final No a
  same-response closing plus `end_call`, and makes the exact fallback continue
  with one HR question or close/end in the same response. The published revision
  remains mapped honestly to `sp017-2026-09-22.1` and is marked sync-required.
  Fake trace coverage now exercises final question → No → one close → agent
  disconnect. Summary boundaries emit only content-free categories; invalid
  local state is non-retryable, network/transient failures remain retryable,
  and permanent OpenAI billing/account/auth failures are non-retryable. The
  summary error action now wraps below its heading.
- No speculative provider tuning was made. `turnEagerness: normal`, the 12-second
  timeout, provider-default buffering, Flash TTS, and disabled filler remain
  unchanged; changing them requires a synchronized revision and a separately
  authorized bounded live observation.
- Synthetic mid-call failure coverage preserves transcript, insights, and topic
  progress, stops/unmounts voice once, enters partial summarizing/review when
  evidence is usable, and never switches to fake or reconnects automatically.
  The prior incorrect page-refresh end reason is replaced with bounded generic
  connection copy. If OpenAI remains available, partial evidence may still be
  summarized; otherwise it remains local. The current SDK callback does not
  reliably expose an allow-listed insufficient-credit code, so undetectable
  credit exhaustion remains a generic interruption; provider-specific
  ElevenLabs payment/credit classification remains explicitly owned by SP-022.

## Commit boundary

Keep SP-021B reviewable as one logical consolidated live-validation and
sanitized-evidence change represented by
`SP-021B: validate the complete live demo flow`. Do not implement public abuse
controls, deployment, or unrelated release fixes here. Do not create a commit
unless the user asks or the active workflow already authorizes it.

## Precision references

- [SP-018A bounded live-smoke record](SP-018A-verify-live-cv-and-voice-integrations.md)
- [Performance diagnostics](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#performance-diagnostics)
- [Live-provider setup](../operations/live-provider-setup.md)
- [Summary and review](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#stage-9--end-and-summarize)
- [Required manual acceptance](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#required-manual-acceptance-sheet)

## Completion handoff

Reference the completed SP-021A documentation/owner-decision record separately
from every live and deterministic scenario. Report provider operation counts,
sanitized timing/cost/retention evidence, files changed, focused checks, both
restored safety-switch values as owner confirmations, and every unchecked item
with its blocker. Never include credentials, tokens, candidate content, raw
provider payloads, real audio, or a secret-bearing screenshot.
