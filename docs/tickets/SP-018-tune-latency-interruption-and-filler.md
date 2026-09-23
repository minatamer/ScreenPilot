# SP-018 — Tune latency, interruption, and filler behavior

Status: Implemented and deterministically verified; manual fake rehearsal passed, live observation deferred to SP-021B<br>
Milestone: Milestone 2 — browser voice experience  
Last synchronized: 2026-09-23<br>
Depends on: SP-014, SP-015, SP-017  
Suggested commit: `SP-018: simplify local voice diagnostics`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Implement and deterministically verify the content-free instrumentation and runtime controls needed to tune latency, interruption, visual waiting states, the single allowed filler, and the eight-minute cap. SP-018A supplied the initial bounded live smoke. The implemented 2026-09-23 follow-up simplifies the original report into fake-first, memory-only informational diagnostics with no fixed sample quota or percentile release gate.

## Standalone implementation context

- TTFA is candidate speech end to first substantive agent audio. The browser uses the provider `vad_score` transition from speaking to not speaking at the locked 0.5 threshold as the speech-end timestamp. It does not substitute the later final-transcript callback when VAD is unavailable, and a filler never stops the TTFA timer.
- TTFA, interruption, client-tool-to-card, connection, and preparation reference
  values remain useful for investigating an obvious regression, but observed
  p50/p95 values are informational and do not block release.
- Latency UI: 0–800 ms relies on the transcript's compact **Listening to you** / **Pilot speaking** status rail without a separate waiting ornament; 800–1,500 ms changes that same rail to **Reviewing your answer**; above 1,500 ms may play one static **“Mm-hm…”** soft-timeout filler.
- At most one filler per turn; more than three per interview or fillers on consecutive turns fail review. The filler is non-evaluative and never GPT-generated.
- Produce content-free measurement IDs and source-labelled raw/aggregate
  diagnostics for every eligible fake or live observation without requiring a
  minimum count or repeating a paid action to increase that count.
- Complete SP-015's deliberately deferred active-session browser checks for captions, speaking/listening/reconnect states, mute, End, hard stop, keyboard operation, reduced motion, and sticky safe-area controls across the responsive reference anchors.

## Manual credential gate

- Instrumentation, aggregation, filler limits, and fake timing tests need no
  credential. Fake mode must prove automatic capture, raw display, JSON copy,
  reset, and memory-only clearing before any live-provider test begins.
- This ticket does not activate a live provider or request a credential. The two
  bounded live flows reuse SP-014's ElevenLabs key/agent/voice and Turnstile
  group only under SP-021B's explicit preconditions and paid-test authorization.
- Do not present fake timings as live timings. Fake mode validates the exact
  diagnostics mechanism first; live mode then adds only its naturally occurring
  source-labelled observations.
- Fake traces do not complete SP-015's deferred manual interaction and visual checks; SP-021B owns the remaining controlled active-session checks after the initial SP-018A smoke.

## Scope boundaries

- Do not add a library of fillers, random verbal tics, GPT-generated filler, a second voice path, or fake latency metrics.
- Do not log transcript/CV/insight content while instrumenting.
- Do not fix platform timing by bloating the system prompt.
- Do not turn informational timing observations into a public performance claim
  or repeat paid calls merely to increase their count.
- Do not let a filler imply agreement, praise, comprehension, or hiring judgment.

## Implementation checklist

- [x] Instrument content-free browser timestamps for preparation, Start/connect, speech end, first substantive audio, interruption/audio stop, and client-tool/card render.
- [x] Define measurement IDs and aggregation that exclude candidate text/audio and do not create an analytics product.
- [x] Tune bounded prompt/runtime context, output ceiling, ElevenLabs turn eagerness/interruption settings, audio buffering, and Flash v2.5 delivery.
- [x] Implement the approved latency feedback with reduced-motion behavior and no dedicated ornament during the initial interval.
- [x] Implement exactly one static soft-timeout filler path and ensure it does not stop TTFA measurement.
- [x] Enforce per-turn, consecutive-turn, per-interview filler limits and the eight-minute hard stop.
- [x] Provide repeatable content-free aggregation with explicit fake/live source
  metadata.
- [x] Document the exact metric boundaries, exclusion rules, and fake/live
  source metadata without candidate content.
- [x] Remove the fixed-minimum and release-gate statuses from the diagnostics
  report; retain raw values, counts, and informational aggregates only.
- [x] Delete the code that existed only for the removed benchmark: deployed-
  sample constants, minimum-count branches, `insufficient_sample` and
  `release_blocked` status types/labels, overall pass/fail report status,
  gate-only outlier classification, and their dedicated tests/fixtures.
- [x] Remove or simplify manual batch/profile/report form fields and the
  collector/batch abstraction when they no longer serve the raw in-memory
  diagnostics. Do not retain dead compatibility exports or duplicate report
  models.
- [x] Expose an opt-in local diagnostics drawer during both active and completed
  fake/live interview workspaces with **Copy JSON** and **Reset**. Keep it
  browser-memory-only and clear it on refresh or **Clear & exit**.

## Acceptance criteria

- [x] All required metric boundaries and content-free aggregation are deterministically verified without content logging.
- [x] The owner rehearsed the exact capture/view/copy/reset path in fake mode
  across both conversation-first and sample-CV entry paths. Applicable samples
  were labelled `fake`, remained content-free, and stayed available through the
  completed workspace without a fixed sample requirement.
- [ ] SP-021B observes the same source-labelled metrics during its two bounded
  live flows without changing code or repeating a paid action for measurement
  volume.
- [x] Repository search and focused tests confirm that no fixed-quota constant,
  gate-only branch/status, obsolete diagnostics copy, or quota-specific fixture
  remains after the simplification.
- [x] Interruption-to-audio-stop is measured through the provider listening callback; SP-021B owns audible overlap verification.
- [x] Fillers are accepted only after the threshold; repeated, consecutive, or excess observations fail local review; filler events never enter captions or evidence.
- [x] The deterministic call path ends reliably at eight minutes, disconnects immediately, freezes the completed workspace at `08:00`, and waits for explicit **View summary**; unexpected interruption alone uses the partial-review handoff.
- [x] Fake and live observations retain explicit source metadata and cannot be
  confused with one another.

## Focused verification

- [x] Run focused timer/filler/hard-stop unit tests.
- [x] Use deterministic delayed provider/event fixtures for every latency and
  filler boundary.
- [x] Update deterministic coverage for the simplified informational diagnostics
  contract before SP-021B begins.
- [x] Remove superseded quota/gate tests instead of rewriting them to assert
  unreachable compatibility behavior; add only focused coverage for retained
  raw capture, source labelling, copy/reset, bounds, and cleanup.
- [x] Inspect the measurement model and diagnostics projection to confirm no candidate text, CV, transcript, insight value, provider payload, credential, or token is captured or uploaded.
- [x] Hand the active-session captions, speaking/listening/reconnect states, mute, End, hard stop, keyboard, sticky safe-area, interruption, slow-turn, cancellation, disconnect, and reduced-motion matrix to SP-021B for the remaining live execution.

## Commit boundary

Keep SP-018 reviewable as one logical change represented by `SP-018: simplify local voice diagnostics`. Do not absorb SP-021B's credentialed complete-flow execution merely because the instrumentation is available. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Implementation record — 2026-09-15

- The browser owns a bounded, in-memory-only tracker for conversation
  preparation, Start-to-ready, provider-VAD-speech-end-to-first-substantive-audio
  TTFA, interruption-to-listening, and applied-client-tool-to-committed-card render.
  Samples contain only a content-free ID, metric name, numeric start/end, and
  duration. There is no persistence, analytics transport, console output, or
  candidate/provider-content field.
- The owner removed the original report's fixed-minimum and percentile gate
  statuses on 2026-09-23. The implemented replacement keeps explicit fake/live
  source, raw observations, counts, and informational aggregates. On a loopback
  host, `/demo?diagnostics=timings` exposes **Copy JSON** and **Reset** during
  active and completed interviews without persistence or upload; public
  hostnames cannot enable the drawer. **Clear & exit** resets the tracker before
  leaving the demo.
- The provider `vad_score` speaking-to-silent transition at 0.5 starts TTFA and
  the latency interval. The candidate final associates the completed turn but is not
  used as a timing proxy. If VAD is unavailable, the candidate final still starts
  the interval but no TTFA sample is recorded. The integrated transcript status
  is the only feedback before 800 ms; **Reviewing your answer** begins at 800 ms.
  The ElevenLabs bridge produces content-free output-audio and filler events,
  excludes the exact static **“Mm-hm…”** filler from transcript/evidence, and
  keeps TTFA open until substantive output audio begins. Interruption timing
  starts from candidate VAD while the provider is speaking and ends when the
  provider reports listening; either callback order produces one sample.
- Agent completion, manual End, and the absolute deadline now share one
  first-reason-wins shutdown path. Cleanup cancels active timers and
  measurements immediately, so the two-second missing-disconnect fallback does
  not extend elapsed time or create another performance sample. The deadline
  records exactly 480 seconds in the read-only completed workspace.
- Owner visual feedback later compressed the redundant large waveform/avatar
  header into the transcript itself. A 44 px polite live-region rail now uses
  four compact bars for **Pilot speaking**, a static microphone for **Listening
  to you**, and plain text for review/reconnect/end states; the active Pilot turn
  receives a restrained emphasis, and reduced motion freezes the bars. A later
  visual refinement makes the rail a translucent blurred ink/plum overlay so
  scrolling captions remain softly visible beneath it without obscuring the
  transcript's initial message. The muted microphone toggle now changes from
  coral to a subdued gray treatment so its inactive input state is immediately
  distinct while the Unmute action remains available.
- Follow-up visual feedback strengthened the glass rail to a 76% ink base with
  a 28 px backdrop blur and removed the transcript's local isolation boundary.
  No other status-rail selector, opacity rule, or responsive override controls
  its transparency or blur; the standard and WebKit filter declarations remain
  colocated in the one owning rule.
- Provider target `sp018-2026-09-15.1` contains one static 1.5-second soft
  timeout, one maximum per generation, no alternate/randomized messages, and no
  LLM-generated filler. It stays disabled until SP-021B's consolidated deployed evidence
  warrants activation. Early, repeated-turn, consecutive-turn, and fourth
  filler observations fail local review. The exact eight-minute deadline remains
  anchored to the original session start across reconnect authorization/setup;
  an exhausted budget skips the provider request and enters the same completed-
  interview hold after local cleanup.
- Deterministic focused coverage exercises preparation, connection, TTFA,
  interruption, card render, visual stages, filler exclusion/limits, aggregate
  calculations, fake/live source labelling, raw JSON copy/reset, and hard stop.
  SP-021B owns remaining provider
  synchronization, paid activation, fake-first/live diagnostic observation,
  audible interruption/overlap, active microphone, device/responsive matrix,
  live reduced motion, cleanup, retention, usage, cost, and sanitized evidence;
  none is claimed by this ticket.
- Post-fix verification passed with zero-warning repository lint, all package
  typechecks, all 221 frontend tests, all 201 backend tests, all 62 contract
  tests, and a final focused 3-file/24-test collector and UI integration run.
  No production build, active microphone, live voice, provider synchronization,
  paid call, or transferred SP-021B sample is claimed by this verification.
- The 2026-09-23 diagnostics follow-up passed changed-file ESLint,
  frontend/contracts typechecks, and 35 focused tests across the tracker,
  active/completed interview UI, deterministic fake bridge, and demo workflow.
  Repository
  search found no remaining production reference to the deleted quota/gate,
  collector, batch, report, or outlier models. A manual responsive/browser
  rehearsal remains with SP-021B. Both production-like builds passed; detached
  local apps returned backend live/readiness 200 and served the diagnostics URL,
  and fake conversation-first preparation reached preflight. The current host
  warned that Node 22 is outside the repository's required Node 24 range. The
  in-app browser blocked microphone access, so no active/completed manual drawer
  or responsive visual pass is claimed. No paid provider was invoked.
- Later on 2026-09-23, the owner completed the fake-mode browser rehearsal on
  the local diagnostics route for both entry paths. Conversation-first captured
  preparation, connection, TTFA, and client-tool-to-card samples; sample-CV
  correctly omitted conversation preparation while capturing connection, TTFA,
  and client-tool-to-card samples. Both JSON snapshots used source `fake`,
  contained only metric identifiers and numeric timing data, and exposed no CV,
  transcript, insight, credential, or provider content. No manual interruption
  occurred in either run, so an interruption sample was correctly absent; the
  audible overlap observation remains part of SP-021B's live validation. The
  completed-workspace/View-summary and local copy/reset/clearing behavior also
  passed the owner's fake rehearsal. These fake timings are deterministic-demo
  observations, not live-provider performance evidence.

## Precision references

- [Performance diagnostics and latency policy](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#performance-diagnostics)
- [Prompt/platform responsibility boundary](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#prompt-ownership-versus-platform-configuration)
- [Operational logs](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#operational-logs)
- [Cost controls](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#cost-controls)
- [Credential acquisition and paid live-test gate](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)
- [SP-018A controlled live verification](SP-018A-verify-live-cv-and-voice-integrations.md)
- [SP-021B complete-flow live validation](SP-021B-validate-complete-live-demo-flow.md)

## Completion handoff

Report the files changed, targeted deterministic checks, measurement boundaries,
and every unchecked item with its blocker. Do not claim live-provider acceptance
from this ticket; SP-018A records the bounded initial smoke and SP-021B owns the
two complete-flow observations and sanitized provider evidence. If implementation
changes a material product or architecture decision, update the parent source of
truth and every affected packet before declaring completion.
