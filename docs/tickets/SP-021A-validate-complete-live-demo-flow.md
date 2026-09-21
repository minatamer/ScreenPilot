# SP-021A — Validate the complete live demo flow

Status: Required; deferred live evidence gate<br>
Milestone: Milestone 3 — same-session review<br>
Last synchronized: 2026-09-21<br>
Depends on: SP-018A, SP-019, SP-020, SP-021<br>
Suggested commit: `SP-021A: validate the complete live demo flow`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)<br>
Ticket index: [`README.md`](README.md)

---

## Objective

Run one consolidated, owner-authorized live validation window after the complete
same-session review exists. Validate both entry modes from preparation through
voice, corrected captions and automatic ending, summary, evidence-linked review,
retry behavior, cleanup, provider usage, and cost without paying for another
partial pre-review smoke test.

## Why this ticket exists

- SP-018A proved the bounded live CV and private voice integrations with
  synthetic data. The owner accepted that smoke as sufficient to unlock SP-019.
- That smoke exposed missing Pilot captions and a missing provider-owned end
  transition. Both defects were fixed and deterministically verified after the
  paid run, but were deliberately not re-observed in another partial paid run.
- SP-018A's unperformed full tool/runtime-variable coverage, post-fix live
  observation, performance samples, provider review, privacy audit, and cleanup
  evidence remain explicitly unchecked. They move here; they are not converted
  into passes.
- SP-020 and SP-021 must remain fake-first. Their first real summary and review
  walkthrough belongs to this complete-flow window rather than a standalone
  summary charge.
- SP-025 may reuse current SP-021A live evidence. It repeats a paid flow only
  when a later code, provider, configuration, hostname, or release-candidate
  change invalidates that evidence.

## Absolute data, credential, and spend boundary

- Use only checked-in synthetic CVs, transcript fixtures, and invented test
  identities. Never use a real CV, candidate detail, interview audio, or data
  copied from a real person.
- The owner alone controls ignored local environment values and both runtime
  switches. The coding agent never reads or prints `.env.local`.
- Agree a maximum number and duration of paid operations before activation.
  Reuse each eligible full-flow turn for performance evidence and never repeat a
  provider call merely to increase confidence without a defined acceptance gap.
- Direct OpenAI operations use the locked models/settings, structured output,
  and `store: false`. ElevenLabs audio saving and retention remain at the locked
  privacy settings.
- Keep provider content, credentials, tokens, CV/transcript text, audio, account
  identifiers, and secret-bearing screenshots out of source, logs, reports, and
  chat.

## Preconditions

- [ ] SP-019, SP-020, and SP-021 are implemented and pass their focused fake-mode
  and deterministic verification without loading `.env.local` or reaching a
  provider.
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

## Consolidated live-validation checklist

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
- [ ] Let the agent close naturally; observe `end_call`, terminal disconnect,
  media release, and the canonical transition into summary/review.
- [ ] Generate one live evidence-grounded summary, inspect evidence navigation,
  and reach the complete review without provider transcript/audio retrieval.

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
- [ ] Observe the corrected captions and automatic ending, then generate the
  conversation-first summary and review with no CV source language.

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
- [ ] Inspect browser storage, URLs, console, application logs, screenshots, and
  temporary files for secrets, tokens, candidate/provider content, or forbidden
  persistence.

### 4. Retained performance, provider, and cost evidence

- [ ] Collect the deferred 50 content-free conversation-preparation measurements
  across the documented profiles; these remain free and deterministic.
- [ ] Collect the deferred 50 eligible live-turn measurements during the bounded
  complete-flow window, reusing turns across the approved synthetic sessions and
  stopping when the agreed paid cap is reached. Do not invent missing samples or
  weaken a threshold.
- [ ] Evaluate TTFA, connection, client-tool-to-card, interruption, waiting-state,
  filler, and eight-minute-stop evidence against SP-018's locked thresholds.
- [ ] If the authorized cap ends before 50 live turns, report the actual sample
  size, keep the 50-turn item unchecked, and leave SP-021A incomplete unless the
  owner later makes an explicit scope decision; do not publish representative
  p50/p95 claims from an undersized sample.
- [ ] Review the actual OpenAI and ElevenLabs operation counts, model/revision,
  duration, retention/audio state, coarse usage, and cost without copying
  provider content or account identifiers.
- [ ] Create or update the sanitized full-flow cost baseline required by SP-025;
  distinguish measured cost from estimates and applied allowances.

### 5. Close the window

- [ ] The owner restores `PAID_DEMO_ENABLED=false` and `PROVIDER_MODE=fake` and
  explicitly confirms both values without exposing the ignored files.
- [ ] Restart in fake mode, run the smallest affected deterministic checks, and
  confirm no secret or candidate/provider content appears in Git status/diff,
  documentation, logs, temporary artifacts, or chat.
- [ ] Record a sanitized handoff with dates, profiles, sample sizes, provider
  identifiers, request counts, coarse usage/cost, passes, failures, and every
  unperformed item.

## Acceptance criteria

- [ ] Both entry modes complete through corrected live voice behavior, summary,
  evidence-linked review, and cleanup using synthetic data.
- [ ] Pilot captions and the provider-owned automatic ending are independently
  observed after their SP-018A fixes.
- [ ] All eight runtime variables and all five client tools are verified without
  unresolved placeholders, duplicate mutations, or invalid evidence.
- [ ] Summary/retry/review behavior preserves local evidence and respects mode
  provenance; any deterministic rather than live retry evidence is labeled.
- [ ] The 50-preparation and 50-live-turn content-free samples are complete and
  meet SP-018's locked targets and release-blocking thresholds.
- [ ] Retained performance evidence is reported honestly and every locked
  release-blocking threshold is enforced; no undersized sample is represented
  as complete.
- [ ] Provider revision, retention, privacy, usage, operation counts, and actual
  cost are reviewed with content-safe evidence.
- [ ] Both safety switches are restored and fake mode is reverified.
- [ ] No real-person data, secret, provider payload, transcript content, or audio
  is committed, logged, persisted, or placed in the report.

## Focused verification

- [ ] Run only the smallest relevant deterministic suites before and after the
  live window; never add paid calls to automated tests or CI.
- [ ] Use browser network, storage, console, accessibility, responsive, and
  media inspection without saving secret- or content-bearing exports.
- [ ] Re-run only the bounded scenario affected by a discovered defect. A new
  paid run requires a defined question, owner authorization, and remaining cap.

## Commit boundary

Keep SP-021A reviewable as one logical consolidated live-validation and
sanitized-evidence change represented by
`SP-021A: validate the complete live demo flow`. Do not implement public abuse
controls, deployment, or unrelated release fixes here. Do not create a commit
unless the user asks or the active workflow already authorizes it.

## Precision references

- [SP-018A bounded live-smoke record](SP-018A-verify-live-cv-and-voice-integrations.md)
- [Performance gates](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#performance-gates)
- [Live-provider setup](../operations/live-provider-setup.md)
- [Summary and review](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#stage-9--end-and-summarize)
- [Required manual acceptance](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#required-manual-acceptance-sheet)

## Completion handoff

Report every live and deterministic scenario separately, provider operation
counts, sanitized timing/cost/retention evidence, files changed, focused checks,
both restored safety-switch values as owner confirmations, and every unchecked
item with its blocker. Never include credentials, tokens, candidate content,
raw provider payloads, real audio, or a secret-bearing screenshot.
