# SP-021B — Validate the complete live demo flow

Status: Required; corrected policy/tools, user-facing fake flows, the corrected summary boundary, and one complete synthetic CV-assisted standard-live flow passed; the conversation-first live flow and remaining failure, cleanup, privacy, diagnostics, provider, cost, and safety-restoration checks remain open<br>
Milestone: Milestone 3 — same-session review<br>
Last synchronized: 2026-09-24<br>
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
  implemented in source policy `sp021b-2026-09-23.1` and owner-published to
  private Main at immutable revision
  `agtvrsn_9501m39701mmet6av5bz53yk6ggp`; Prompt 2 is implemented and
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
- [x] Before that rehearsal, verify the implementation diff/search removed the
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
- [x] The owner published source policy `sp021b-2026-09-23.1` with built-in
  `end_call` enabled as the sole active system tool on private Main on
  2026-09-24 at immutable ElevenLabs revision
  `agtvrsn_9501m39701mmet6av5bz53yk6ggp`.
  Main branch ID `agtbrch_8401m2ar2j6nfshaa5wg31f0j654` is branch identity,
  not revision evidence. No Preview or paid/live behavior is claimed by this
  publication. Previous revision `agtvrsn_8901m350e924f2ev7t4pwnvq38b1`
  remains mapped only to `sp017-2026-09-22.1`; historical revision
  `agtvrsn_1501m2mwx4ffek39r88ygh1ngxq4` remains mapped only to
  `sp017-2026-09-16.1`.
- [x] The owner reconfirmed `end_call` as the sole active system tool and all
  five saved client tools as matching their source-controlled descriptions,
  required parameters, enums, character-bound descriptions, and
  Wait-for-response behavior.
- [x] On 2026-09-24 the owner reopened `end_call` and separately confirmed its
  custom description exactly matches
  `SCREENPILOT_ELEVENLABS_AGENT_CONFIG.systemTools.endCall.description`:
  “End the conversation immediately after ScreenPilot's brief closing sentence
  when screening is complete, the final candidate-question opportunity is
  resolved or declined, or the candidate asks to stop. Never wait for another
  user turn after closing.”
- [ ] The exact unchecked SP-018A evidence ledger is reviewed; no deferred item
  is represented as already passed.
- [ ] Repository status contains no local environment file, credential,
  candidate artifact, transcript, audio, or provider response.
- [x] The owner confirms the provider balance/allowance and caps, published agent
  revision, Turnstile hostname/actions, audio-saving-off state, and zero-day
  retention setting without exposing secret values. This is configuration and
  safety evidence, not live behavior acceptance.
- [ ] Validate the complete standard-live runtime configuration groups through
  the normal bootstrap/preflight boundary without reading or exposing ignored
  local values; the earlier summary-rehearsal path does not exercise live voice.
- [ ] The owner explicitly authorizes the bounded synthetic paid window and its
  maximum calls/duration.
- [x] Start with `PROVIDER_MODE=live` and `PAID_DEMO_ENABLED=false`; confirm the
  paid paths remain visibly and technically closed before the owner enables
  them. The owner confirmed this order on 2026-09-24; it does not authorize a
  further paid operation.
- [ ] If the owner elects to isolate summary validation first, use the documented
  local-only `LIVE_INTERVIEW_ENABLED=false` summary rehearsal for exactly one
  synthetic run through either entry mode. Confirm its persistent label,
  simulated CV-analysis and voice boundaries, fake-labelled voice diagnostics,
  zero ElevenLabs activity, disabled/spinning **View summary** action while the
  automatic background summary is pending, and at most one real OpenAI summary.
  This evidence is summary-only and does not satisfy any standard live voice
  acceptance item.
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
| `summary_rehearsal` | One protected live summary may start in the background after normal fake-voice disconnect. | Never reachable; CV analysis and voice are deterministic fake. | Disabled with a spinner while pending; then exposes ready review or failure/retry without initiating work. |

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

- [x] Use the checked-in synthetic text PDF and one fresh `cv_analyze` Turnstile
  challenge; confirm one action creates at most one bounded OpenAI operation.
- [ ] Correct or confirm the suggested role without an allow-list, technical
  assessment, real-vacancy claim, or inferred employer fact.
- [x] Complete preflight, one private token exchange, and one WebRTC session.
- [ ] Observe candidate and Pilot tentative/final captions, including the
  speaker-scoped deduplication fix, with no duplicate session or final turn.
- [ ] Exercise applicable client tools and confirm valid evidence provenance,
  correction replacement, topic state, candidate questions, and follow-up state.
  Ask one unsupported employer/onboarding question and verify the approved
  exact bounded fallback plus matching Candidate question and Human follow-up
  cards attached to that same final candidate turn.
- [x] Let the agent close naturally; observe `end_call`, terminal disconnect,
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

## Remaining post-fix fake gates and sequencing record

- [x] Conversation-first scripted unsupported-employer question: exact fallback
  and exactly one next HR question in the same Pilot response without “Okay”.
- [x] Separately confirm the paired Candidate question/Human follow-up cards and
  their final-review evidence.
- [x] Final No: one brief close, automatic agent disconnect, completed read-only
  workspace, **View summary**, and review reached.
- [x] Separately confirm no voice reconnection or duplicate summary work during
  that completed-workspace/review handoff.
- [x] Sample-CV scripted path completed through summary/review.
- [ ] Separately confirm the sample-CV review's exact evidence provenance.
- [ ] After the Team/work-style reconciliation change, run one affected fake
  review and confirm a covered candidate-backed Team/work-style insight appears
  as one visible evidence-linked confirmed fact without personality, culture-
  fit, suitability, or employer inference.
- [x] Diagnostics JSON in fake mode: inspect/copy/reset, explicit
  `performance_time_origin`/`unix_epoch`, no candidate content, and refresh/Clear
  removal. No count or percentile is a gate.
- [ ] Retryable and non-retryable summary failures: evidence preserved, Retry
  only when retryable, and readable error layout at phone, tablet, desktop, and
  one intermediate width.
- [ ] Injected interruption: one stop/unmount, generic partial review with
  evidence preserved, no page-refresh claim, fake fallback, automatic reconnect,
  or duplicate operation.
- [x] Provider publication/synchronization is recorded at immutable revision
  `agtvrsn_9501m39701mmet6av5bz53yk6ggp`; paid live acceptance items remain
  individually evidenced and separately authorized.

The owner published the corrected policy on 2026-09-24 before completing this
section's post-fix manual fake rehearsal. The owner subsequently reported every
available user-facing deterministic fake flow working in both current entry
paths through completion and review. That report does not convert deliberately
injected summary-failure/interruption scenarios, exact provenance assertions,
or the affected post-Team/work-style-change fake review into passes. The owner
later proceeded with the bounded CV-assisted standard-live rerun recorded below;
that result does not retroactively satisfy these sequencing items. Keep future
paid operations disabled until the remaining checklist is completed and
recorded.

### Post-fix scripted fake observations — 2026-09-24

- The owner ran both current scripted entry paths with `PROVIDER_MODE=fake` and
  `PAID_DEMO_ENABLED=false`. `LIVE_INTERVIEW_ENABLED` is ignored in
  `deterministic_fake` mode and is not treated as a separate fake-mode gate.
- The conversation-first script completed successfully. Its scripted
  unsupported-employer counterquestion produced the approved fallback and
  continued directly with one next HR question in the same Pilot response
  rather than waiting for an acknowledgement. This was observation of the
  deterministic script; the owner did not manually ask the counterquestion.
- The same script exercised the final No, one closing, automatic agent
  disconnect, completed workspace, **View summary**, and review. The owner then
  separately confirmed that voice stayed disconnected, the interview did not
  reconnect, and the review was generated only once.
- The owner separately confirmed that the Candidate question and Human follow-up
  cards both appeared and cited the same candidate turn in review. They are
  intentionally separate: the first preserves what the candidate asked and the
  second preserves the recruiter action. The observation also exposed a visual
  mismatch—Confirmed versus Needs clarification—so paired unsupported Candidate
  questions now derive the same visible clarification state without changing
  stored summary classification. Focused component coverage passes; recheck only
  this affected visual state in fake mode before spending provider credit.
- The sample-CV scripted path also completed successfully through summary and
  review. Exact CV/Candidate provenance in that review was not separately
  reported and remains open.
- The copied content-free diagnostics snapshot contained 19 samples with source
  `fake`: one conversation-preparation observation, one connection observation,
  seven TTFA observations, and ten client-tool-to-card observations. It used
  explicit `performance_time_origin` and `unix_epoch` labels and contained no
  candidate content. Interruption count was zero. The owner confirmed that
  **Reset** removed the observations and they remained absent after refresh;
  another run followed by **Clear & exit** also removed them.
- These observations verify deterministic fake behavior and instrumentation
  only. They are not ElevenLabs latency evidence and do not establish that the
  newly published agent will follow the prompt or invoke `end_call` in live
  voice.
- The paired-status presentation correction passed 3 focused frontend files / 21
  tests, the full frontend suite at 38 files / 288 tests, frontend typecheck and
  lint, contracts/backend/frontend production builds, and `git diff --check`
  under Node 24.19. The restarted local runtime remains
  `deterministic_fake`; its affected paired-card visual state is the only new
  manual observation introduced by that correction.
- The owner later reconfirmed the provider tool surface without starting a
  Preview or paid conversation: built-in `end_call` is the sole active system
  tool, and all five saved client tools match their source-controlled
  descriptions, parameters, bounds, and Wait-for-response behavior. The owner
  also reopened `end_call` and confirmed its custom description exactly matches
  `ELEVENLABS_END_CALL_TOOL_DESCRIPTION`.
- The owner reported every available user-facing deterministic fake flow working
  in both current entry paths through completion and review. This records manual
  user-facing coverage only; it does not claim that deliberately injected
  summary failure or interruption scenarios passed.
- Immediately before live work, the owner confirmed provider balance/caps,
  ElevenLabs audio saving off with retention at zero, correct Turnstile
  hostname/actions, and the paid-disabled state proved before paid mode was
  enabled. These are configuration/safety observations, not live behavior
  acceptance or authorization for another provider operation.

## Controlled summary-rehearsal diagnosis and correction — 2026-09-24

- The owner enabled the local `summary_rehearsal` combination and authorized one
  paid summary attempt while interview voice remained deterministic. Bootstrap
  publicly confirmed `effectiveMode=summary_rehearsal` and paid operations
  enabled; no live ElevenLabs session was used.
- The single summary request reached OpenAI and failed before generation with
  HTTP 400, provider type `invalid_request_error`, provider code
  `invalid_json_schema`, failure class `request_configuration`, and
  `providerRetryable=false`. The route returned the bounded `SUMMARY_FAILED`
  response and no retry was attempted.
- Root cause was the provider-facing nullable `rolePreferenceSchema`: its Zod
  discriminated union emitted nested `oneOf`, which OpenAI strict Structured
  Outputs does not support. This is the proven cause of this rehearsal failure.
  The retained 2026-09-23 failure remains historically unproven because its log
  was lost, although the shared schema makes the same cause plausible.
- The provider-facing summary schema now wraps the same canonical variants in a
  plain Zod union, producing supported `anyOf` while preserving domain parsing,
  normalization, safety, and evidence validation. A regression test rejects
  unsupported composition keywords.
- The owner made one fresh summary request after that schema correction. It
  passed the provider schema boundary but returned `SUMMARY_FAILED` with
  provider type `semantic_output_unusable` after 12,465 ms. That retired error
  type could only be raised after the initial structured output and its one
  automatic model-to-model repair both failed local evidence/safety validation,
  so one UI action caused two paid model operations. The old logger retained no
  validation rule IDs or paths, and provider content is deliberately not
  retained, so the exact failed rule cannot be recovered or honestly claimed.
- The deeper defect was architectural rather than another prompt omission: the
  model was being asked to reproduce role, topic partition, evidence IDs,
  candidate questions, recruiter follow-ups, compensation/availability
  evidence, and limitations that the server already owns exactly. Any mismatch
  could buy a second generation and still fail the request.
- The corrected adapter now makes exactly one OpenAI request per summary action.
  A local reconciliation step projects those exact fields from the validated
  browser evidence ledger, keeps model-authored narrative only when the complete
  domain/evidence/safety validator accepts it, and otherwise returns the same
  grounded server summary used by deterministic mode. There is no automatic
  paid repair. Structurally unusable provider output still fails closed after
  that one operation; its bounded validation rule IDs and field paths are now
  present in content-free backend diagnostics.
- With `PROVIDER_MODE=fake` and `PAID_DEMO_ENABLED=false` explicitly set, the
  contracts suite passed 6 files / 49 tests and the backend suite passed 23
  files / 303 tests under Node 24.19. Contracts/backend typechecks, lint,
  production builds, targeted formatting, the strict-schema keyword guard, and
  one-call local-reconciliation cases for invalid evidence, omitted/collapsed
  facts, unsafe narrative, and changed question/follow-up text all passed.
  These checks made no provider call.
- The owner then completed two separate summary-rehearsal sessions against the
  corrected adapter. Content-free backend logs show one successful
  `interview_summary` request per session, HTTP 200 in 4,738 ms and 5,360 ms,
  each with its own preceding bootstrap, preparation, and simulated-voice
  sequence. No live ElevenLabs conversation ran, no duplicate summary request
  occurred within either session, and no further summary-only rerun is required.
- The copied successful review marked **Team and work style** covered but did
  not show a corresponding confirmed-fact statement. Reconciliation now upserts
  exactly one server-owned `Team and work preference` fact when the topic is
  covered and the latest applicable Candidate or CV + Candidate insight is
  confirmed/corrected. Evidence sets are classified as disjoint, exact, or
  ambiguous: disjoint model narrative remains eligible; every exact-set variant
  collapses to one canonical fact; any subset, superset, merged overlap, or
  grounded shared-category turn returns the complete grounded summary. Absent,
  uncovered, CV-only, and clarification-only states also return the complete
  grounded summary because untyped model facts cannot safely classify an
  invented Team/work-style statement on another valid candidate turn. This
  introduces no personality, culture-fit, suitability, or employer inference.
  The focused fake-only summarizer regression passes 23/23
  under Node 24.19 with paid mode disabled, covering earlier/latest correction
  subsets, several overlapping facts, exact multi-ID paraphrases, supersets,
  duplicate variants, disjoint narrative, shared multi-category evidence, and
  adversarial model inventions for missing, CV-only, uncovered, and
  clarification-only states; every case asserts one model request. Backend
  typecheck and targeted lint pass. One affected manual fake review is still
  required before the consolidated paid flow.

## Deterministic restore and summary-payload closure — 2026-09-23

- `DemoExperience` now treats fresh `runtimeConfigStatus === "ready"` plus an
  eligible current `effectiveMode` as a prerequisite for mounting summary
  preparation. A restored stale standard mode starts no Turnstile or summary
  work while refresh is pending or failed; paid-disabled stays closed after a
  successful refresh. Deterministic fake, standard live, and summary rehearsal
  may begin one background preparation only after readiness.
- Restore-focused integration coverage exercises pending refresh, rehearsal,
  both standard modes, paid-disabled, refresh failure, and explicit successful
  retry through the real session provider/bootstrap boundary. It asserts zero
  provider work in every closed state and exactly one summary in each eligible
  state.
- The complete summary-rehearsal browser test now exercises the synthetic
  CV-assisted path and inspects the synthesized `/v1/interview/summary` body
  after the full fake trace. It verifies simulated CV analysis, the
  grant/challenge handoff, the final candidate No, Candidate question and Human
  follow-up insights with shared evidence, progressed topics, and the expected
  CV evidence/provenance. It also proves that summary preparation starts once in
  the completed workspace, passive checking copy stays hidden, **View summary**
  is disabled with a spinner until the response settles, and the action does
  not buy a second summary.
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
  with one HR question or close/end in the same response. On 2026-09-24 the
  owner published that source policy and the sole `end_call` system tool to
  private Main at immutable revision
  `agtvrsn_9501m39701mmet6av5bz53yk6ggp`; live observation remains pending.
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

## Partial CV-assisted live run and summary-boundary correction — 2026-09-24

- The owner completed one bounded synthetic sample-CV live interview against
  immutable agent revision `agtvrsn_9501m39701mmet6av5bz53yk6ggp` and reported
  the corrected interview behavior working. The completed workspace then showed
  the non-retryable local message “The saved interview evidence could not be
  prepared for summary.” This partial run does not satisfy the complete
  CV-assisted acceptance path because no summary or review was produced.
- Content-free backend logs contain one successful `cv_analyze` and one
  successful `voice_token` request, but no `interview_summary` request. Both
  local services remained healthy. The exact UI message maps to the frontend
  `summarizeInterviewRequestSchema` boundary, proving that neither Turnstile nor
  OpenAI summary generation ran for the failed handoff; no summary credit was
  consumed.
- Root cause was a contract mismatch left behind by the earlier Pilot-caption
  correction. Live normalization correctly retains candidate and interviewer
  turns that share a numeric ElevenLabs event ID, using speaker plus provider
  sequence as local identity. The summary request instead required the numeric
  sequence alone to be globally unique and rejected that valid live transcript.
- The shared transcript identity is now explicit and reused by reducer/tool
  reconciliation, persistence, and summary validation. Unique turn IDs and
  same-speaker sequence uniqueness still fail closed; only legitimate
  cross-speaker reuse is accepted. Browser and backend regression fixtures now
  carry the provider-shaped shared sequences through one valid summary POST,
  while corrupt persisted duplicates remain rejected.
- Initial fake-only focused verification passed the contracts summary request,
  five frontend transcript/session/API files, and the backend summary route at
  7 files / 112 tests under Node 24.19 with `PROVIDER_MODE=fake` and
  `PAID_DEMO_ENABLED=false`. No provider operation ran. The corrected production
  builds had not yet been restarted at this checkpoint, and this partial-run
  record did not authorize an additional live voice or summary operation.

## Successful CV-assisted standard-live rerun — 2026-09-24

- After the speaker-scoped transcript-identity correction, both production
  applications were rebuilt with Node 24.19 and restarted without stale port
  listeners. The backend `live` and `ready` checks and the frontend `/demo`
  route all returned HTTP 200 before the owner began the next run.
- The owner then completed one bounded standard-live run using the checked-in
  synthetic sample CV and immutable ElevenLabs agent revision
  `agtvrsn_9501m39701mmet6av5bz53yk6ggp`. The owner explicitly reported the
  candidate-question flow, Team/work-style question flow, brief closing,
  provider-owned automatic interview ending, completed-workspace handoff, and
  live summary/review all working.
- The retained content-free backend log corroborates exactly one successful
  `cv_analyze` request (HTTP 200, 9,894 ms), one successful `voice_token`
  request (HTTP 200, 664 ms), and one successful `interview_summary` request
  (HTTP 200, 4,848 ms). No second summary request appears for the session.
- This closes the prior CV-assisted summary-handoff regression on a real live
  transcript: the legitimate candidate/interviewer reuse of numeric provider
  sequences crossed browser validation, reached the backend once, and produced
  review. The log contains no CV, transcript, summary body, provider payload,
  token, credential, or audio.
- This evidence validates one CV-assisted standard-live path only. It does not
  convert the conversation-first live flow, injected interruption and summary-
  failure/retry paths, manual and eight-minute endings, responsive/device
  matrix, raw live diagnostics review, browser-storage/privacy cleanup,
  provider-dashboard usage/cost/retention review, or restored fake/paid-disabled
  safety state into passes. Composite checklist items covering those additional
  assertions therefore remain unchecked.
- The owner proceeded with this bounded live rerun while several packet-level
  free/manual preconditions were still recorded as open, including the affected
  post-reconciliation fake Team/work-style review. The successful live result
  is retained as genuine evidence, but it does not retroactively satisfy those
  sequencing gates; they remain explicit follow-up checks before SP-021B can
  close.

## Completed-workspace summary-progress correction — 2026-09-24

- Repository investigation confirmed that the completed workspace's visible
  “Checking this request before it continues” state came from the managed
  Turnstile gate mounted for background summary preparation. It was not an
  ElevenLabs reconnection or interview-status transition.
- While background preparation is pending, the completed workspace now hides
  passive Turnstile status, disables **View summary**, and keeps a continuous
  spinner beside the unchanged button label. A genuinely interactive Turnstile
  challenge remains visible. Success enables the action for ready review;
  failure also releases it so the preserved-evidence failure/retry state can be
  shown. Clicking the action never initiates or duplicates summary work.
- Local `summary_rehearsal` now mirrors that handoff for both entry modes. CV
  analysis and interview voice use deterministic fakes, including provider-
  shaped CV evidence for the bundled synthetic sample, while normal fake-voice
  disconnect automatically begins at most one protected live OpenAI summary.
  The rehearsal therefore spends no CV-analysis or ElevenLabs credit, but it
  can spend its single summary operation before **View summary** is clicked.
- Focused automated coverage verifies the disabled/spinning action, hidden
  passive status, enabled post-success action, failure handoff, CV-assisted
  rehearsal payload, single-flight summary request, restored-session safety,
  and fake provider selection. All automated processes explicitly force fake
  mode with paid operations disabled; no provider request or credit was used.
- Owner inspection then exposed that the global reduced-motion rule collapsed
  the functional button spinner to a single static frame. The loading button is
  now explicitly retained as a slower continuous rotation under reduced-motion,
  matching the existing CV-processing busy-indicator exception while decorative
  motion remains collapsed.

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
