# SP-018 — Tune latency, interruption, and filler behavior

Status: Complete<br>
Milestone: Milestone 2 — browser voice experience  
Last synchronized: 2026-09-21<br>
Depends on: SP-014, SP-015, SP-017  
Suggested commit: `SP-018: enforce conversational latency gates`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Implement and deterministically verify the content-free instrumentation and runtime controls needed to tune latency, interruption, visual waiting states, the single allowed filler, and the eight-minute cap. SP-018A supplied the initial bounded live smoke; SP-021A owns the transferred representative live measurement sample after the complete review flow exists.

## Standalone implementation context

- TTFA is candidate speech end to first substantive agent audio. The browser uses the provider `vad_score` transition from speaking to not speaking at the locked 0.5 threshold as the speech-end timestamp. It does not substitute the later final-transcript callback when VAD is unavailable, and a filler never stops the TTFA timer.
- Targets: TTFA p50 ≤800 ms and p95 ≤1,500 ms; release blocks above 1,200/2,000 ms respectively.
- Interruption-to-audio-stop p95 target is ≤250 ms and blocks above 400 ms.
- Client-tool-to-card p95 target is ≤300 ms and blocks above 600 ms.
- Connect-request-to-ready p95 target is ≤3,000 ms and blocks above 5,000 ms.
- Conversation-first preparation p95 target is ≤500 ms and blocks above 1,000 ms.
- Latency UI: 0–800 ms visual state only; 800–1,500 ms adds **Reviewing your answer…**; above 1,500 ms may play one static **“Mm-hm…”** soft-timeout filler.
- At most one filler per turn; more than three per interview or fillers on consecutive turns fail review. The filler is non-evaluative and never GPT-generated.
- Produce content-free measurement IDs, aggregation, and threshold reporting that SP-021A can use for at least 50 representative live turns and 50 preparation requests across desktop/mobile and normal/throttled profiles.
- Complete SP-015's deliberately deferred active-session browser checks for captions, speaking/listening/reconnect states, mute, End, hard stop, keyboard operation, reduced motion, and sticky safe-area controls across the responsive reference anchors.

## Manual credential gate

- Instrumentation, aggregation, filler limits, and fake timing tests need no credential. Complete them first with the fake voice path.
- This ticket does not activate a live provider or request a credential. The transferred live sample reuses SP-014's ElevenLabs key/agent/voice and Turnstile group only under SP-021A's explicit preconditions and paid-test authorization.
- Do not fabricate live measurements or tune release thresholds against fake latency. Fake traces validate boundaries and deterministic state behavior only.
- Fake traces do not complete SP-015's deferred manual interaction and visual checks; SP-021A owns the remaining controlled active-session checks after the initial SP-018A smoke.

## Scope boundaries

- Do not add a library of fillers, random verbal tics, GPT-generated filler, a second voice path, or fake latency metrics.
- Do not log transcript/CV/insight content while instrumenting.
- Do not fix platform timing by bloating the system prompt.
- Do not relax thresholds merely because local development is slower; measure deployed representative paths.
- Do not let a filler imply agreement, praise, comprehension, or hiring judgment.

## Implementation checklist

- [x] Instrument content-free browser timestamps for preparation, Start/connect, speech end, first substantive audio, interruption/audio stop, and client-tool/card render.
- [x] Define measurement IDs and aggregation that exclude candidate text/audio and do not create an analytics product.
- [x] Tune bounded prompt/runtime context, output ceiling, ElevenLabs turn eagerness/interruption settings, audio buffering, and Flash v2.5 delivery.
- [x] Implement the approved visual latency stages with reduced-motion behavior.
- [x] Implement exactly one static soft-timeout filler path and ensure it does not stop TTFA measurement.
- [x] Enforce per-turn, consecutive-turn, per-interview filler limits and the eight-minute hard stop.
- [x] Provide repeatable content-free aggregation and threshold output for the 50-turn and 50-preparation live sample transferred to SP-021A.
- [x] Document the exact metric boundaries, exclusion rules, device/network profile fields, provider-revision field, and outlier representation without candidate content.
- [x] Encode release-blocking thresholds as failures so SP-021A cannot approve a failing live sample by weakening the gate.

## Acceptance criteria

- [x] All required metric boundaries and content-free aggregation are deterministically verified without content logging.
- [x] SP-021A can collect and evaluate the representative live sample without changing application code or metric definitions during the run.
- [x] Interruption-to-audio-stop is measured through the provider listening callback and exceeding the documented gate blocks the report; SP-021A owns audible overlap verification.
- [x] Fillers are accepted only after the threshold; repeated, consecutive, or excess observations fail local review; filler events never enter captions or evidence.
- [x] The deterministic call path ends reliably at eight minutes and produces the existing partial-review handoff when necessary.
- [x] Fake and live batches cannot be combined in one report, and report metadata retains its source; SP-021A owns the transferred dated live evidence and any portfolio claim.

## Focused verification

- [x] Run focused timer/filler/hard-stop unit tests.
- [x] Use deterministic delayed provider/event fixtures for every latency threshold boundary.
- [x] Run deterministic delayed provider/event fixtures across every threshold boundary and verify the content-free result format expected by SP-021A.
- [x] Inspect the measurement model and diagnostics projection to confirm no candidate text, CV, transcript, insight value, provider payload, credential, or token is captured or uploaded.
- [x] Hand the active-session captions, speaking/listening/reconnect states, mute, End, hard stop, keyboard, sticky safe-area, interruption, slow-turn, cancellation, disconnect, and reduced-motion matrix to SP-021A for the remaining live execution.

## Commit boundary

Keep SP-018 reviewable as one logical change represented by `SP-018: enforce conversational latency gates`. Do not absorb SP-021A's credentialed complete-flow execution merely because the instrumentation is available. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Implementation record — 2026-09-15

- The browser owns a bounded, in-memory-only tracker for conversation
  preparation, Start-to-ready, provider-VAD-speech-end-to-first-substantive-audio
  TTFA, interruption-to-listening, and applied-client-tool-to-committed-card render.
  Samples contain only a content-free ID, metric name, numeric start/end, and
  duration. There is no persistence, analytics transport, console output, or
  candidate/provider-content field.
- TTFA and preparation remain `insufficient_sample` below 50 observations. The
  event metrics evaluate their documented p95 gates when sampled. Repeatable
  reports contain an explicit fake/live source, batch ID, date, desktop/mobile
  profile, normal/throttled profile, provider revision, aggregate p50/p95 and
  status, and content-free target/blocker outliers. Mixed fake/live batches are
  rejected. A local developer/test diagnostics form captures each uncaptured
  batch and exposes the complete content-free JSON report for copying without
  persistence or upload.
- The provider `vad_score` speaking-to-silent transition at 0.5 starts TTFA and
  the visual wait. The candidate final associates the completed turn but is not
  used as a timing proxy. If VAD is unavailable, the candidate final still starts
  the visual state but no TTFA sample is recorded. **Reviewing your answer…**
  begins at 800 ms. The existing reduced-motion policy removes the new pulse.
  The ElevenLabs bridge produces content-free output-audio and filler events,
  excludes the exact static **“Mm-hm…”** filler from transcript/evidence, and
  keeps TTFA open until substantive output audio begins. Interruption timing
  starts from candidate VAD while the provider is speaking and ends when the
  provider reports listening; either callback order produces one sample.
- Provider target `sp018-2026-09-15.1` contains one static 1.5-second soft
  timeout, one maximum per generation, no alternate/randomized messages, and no
  LLM-generated filler. It stays disabled until SP-021A's consolidated deployed evidence
  warrants activation. Early, repeated-turn, consecutive-turn, and fourth
  filler observations fail local review. The exact eight-minute deadline remains
  anchored to the original session start across reconnect authorization/setup;
  an exhausted budget skips the provider request and interrupts locally.
- Deterministic focused coverage exercises preparation, connection, TTFA,
  interruption, card render, visual stages, filler exclusion/limits, aggregate
  thresholds, fake/live report separation, and hard stop. SP-021A owns remaining provider
  synchronization, paid activation, the 50-turn/50-preparation live sample,
  audible interruption/overlap, active microphone, device/responsive matrix,
  live reduced motion, cleanup, retention, usage, cost, and sanitized evidence;
  none is claimed by this ticket.
- Post-fix verification passed with zero-warning repository lint, all package
  typechecks, all 221 frontend tests, all 201 backend tests, all 62 contract
  tests, and a final focused 3-file/24-test collector and UI integration run.
  No production build, active microphone, live voice, provider synchronization,
  paid call, or transferred SP-021A sample is claimed by this verification.

## Precision references

- [Performance gates and latency policy](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#performance-gates)
- [Prompt/platform responsibility boundary](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#prompt-ownership-versus-platform-configuration)
- [Operational logs](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#operational-logs)
- [Cost controls](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#cost-controls)
- [Credential acquisition and paid live-test gate](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)
- [SP-018A controlled live verification](SP-018A-verify-live-cv-and-voice-integrations.md)
- [SP-021A complete-flow live validation](SP-021A-validate-complete-live-demo-flow.md)

## Completion handoff

Report the files changed, targeted deterministic checks, measurement boundaries, and every unchecked item with its blocker. Do not claim live-provider acceptance from this ticket; SP-018A records the bounded initial smoke and SP-021A owns the transferred complete-flow sample and sanitized evidence. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
