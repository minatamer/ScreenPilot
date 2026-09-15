# SP-018A — Verify live CV and voice integrations

Status: Required<br>
Milestone: Milestone 2 — browser voice experience<br>
Last synchronized: 2026-09-15<br>
Depends on: SP-014A, SP-018<br>
Suggested commit: `SP-018A: verify live CV and voice integrations`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)<br>
Ticket index: [`README.md`](README.md)

---

## Objective

Safely activate the already-implemented live provider paths with owner-supplied
credentials and exclusively synthetic candidate data, then verify real
Turnstile, OpenAI CV analysis, private ElevenLabs WebRTC voice, adaptive
conversation behavior, client tools, latency, interruption, filler, cleanup,
privacy, usage, and cost before implementation continues into same-session
review.

## Why this ticket exists

- Fake mode is the deterministic contract and regression harness. It proves
  state transitions, schemas, failure handling, and cleanup, but it does not
  prove real model behavior, tool selection, STT/TTS quality, WebRTC behavior,
  provider latency, interruption, or dashboard/source synchronization.
- SP-018 owns content-free instrumentation and the runtime behavior being
  measured. This packet owns the first controlled live feedback loop and the
  representative performance sample.
- SP-020 owns the live OpenAI summary route and SP-021 owns the browser
  summary/review/retry experience. Do not call or simulate a live summary in
  this ticket.
- This is a local, owner-controlled engineering test, not public-demo approval.
  SP-022 through SP-025 still own public abuse controls, privacy hardening, and
  release QA.

## Absolute data and credential boundary

- Use only the checked-in synthetic CVs, transcript cases, and invented test
  identities. Never use a real CV, real candidate detail, real interview audio,
  or data copied from a real person.
- The owner enters credentials and identifiers manually in ignored
  `apps/backend/.env.local`. The coding agent may verify the committed
  `.env.example` schema and ignore rules but never reads or prints `.env.local`.
- Keep `apps/frontend/.env.local` limited to the local backend origin. Provider
  keys, Turnstile secret, signing secrets, agent IDs, and voice IDs never enter
  frontend code, browser storage, screenshots, documentation, logs, or chat.
- Direct OpenAI calls must use GPT-5.4 Mini, reasoning `none`, structured output,
  and `store: false`. The private ElevenLabs agent owns its native live LLM;
  never configure ScreenPilot's OpenAI key as ElevenLabs BYOK.
- If OpenAI input/output sharing is enabled, this ticket may proceed only under
  the documented selected-project, synthetic-only exception. Before any real
  candidate data, external tester, or public use, stop and require the owner to
  disable sharing and verify the disabled dashboard state.

## Preconditions — complete before any paid operation

### A. Repository and deterministic readiness

- [ ] SP-018's content-free instrumentation, threshold aggregation, latency UI,
  filler limits, interruption handling, and eight-minute hard stop are
  implemented and pass their focused fake-mode tests.
- [ ] `git status` contains no `.env.local`, credential file, candidate artifact,
  generated transcript, audio, or live-provider response.
- [ ] Git ignore evidence confirms both application `.env.local` paths are
  ignored, while both committed `.env.example` files retain blank credential
  and identifier values.
- [ ] The frontend local environment contains only the documented local backend
  origin; this is owner-confirmed without exposing its contents.
- [ ] The relevant SP-010, SP-014, SP-015, SP-016, SP-017, and SP-018 focused
  deterministic checks pass before live mode is selected.

### B. ElevenLabs dashboard synchronization

- [ ] The existing **private** ScreenPilot agent still requires signed
  authentication; widget/public access, client overrides, backup LLM, webhooks,
  extra tools, call queuing, and burst pricing are disabled.
- [ ] ScreenPilot/Main contains the exact rendered source-controlled prompt at
  policy version `sp017-2026-09-15.1`, not the older placeholder prompt.
- [ ] The exact eight case-sensitive dynamic variables are present:
  `screenpilot_policy_version`, `screenpilot_entry_mode`,
  `screenpilot_demo_disclosure`, `screenpilot_screening_plan`,
  `screenpilot_role_context`, `screenpilot_cv_context`,
  `screenpilot_known_state`, and `screenpilot_remaining_seconds`.
- [ ] The exact five case-sensitive client tools are present:
  `recordInsight`, `correctInsight`, `markTopic`,
  `recordCandidateQuestion`, and `requestFollowup`.
- [ ] Every dashboard tool parameter, required flag, enum, bound, and description
  matches `packages/contracts/src/interview/client-tools.ts`; there are no
  placeholder parameterless tools or extra server/webhook/system tools.
- [ ] **Wait for response** is enabled for all five client tools so the agent
  receives the browser handler's `Applied:` or `Rejected:` result. Dynamic
  assignments and response mocks remain absent unless a later source-controlled
  contract explicitly requires them.
- [ ] GPT-5.4 Mini, reasoning None, 160-token output ceiling, Scribe v2 Realtime,
  Flash v2.5, the selected voice, English-only mode, interruptions, timing, and
  SP-018 tuning values match the source-controlled configuration.
- [ ] Audio saving is off, retention is zero days, debug mode is off, and Zero
  Retention Mode remains in the documented compatible state.
- [ ] The synchronized configuration is published only to ScreenPilot/Main; its
  immutable agent revision and matching policy version are recorded in
  `apps/backend/src/providers/elevenlabs/elevenlabs-agent-config.ts` before a
  conversation starts.

### C. Provider account and spend readiness

- [ ] The owner confirms the required OpenAI, ElevenLabs, Turnstile, signing,
  and cookie values exist in the ignored backend environment without sharing
  their values.
- [ ] The owner confirms current provider access, available balance or included
  allowance, and the existing ElevenLabs daily/concurrent limits immediately
  before testing.
- [ ] The local Turnstile widget permits only the intended `localhost` hostname,
  and the configured backend hostname allow-list matches it exactly.
- [ ] A maximum number and duration of paid calls for this test window are
  agreed before activation. Begin with short one-to-two-minute sessions; run one
  full-duration session only for the explicit eight-minute hard-stop check.
- [ ] The owner explicitly authorizes this bounded synthetic paid test. Merely
  completing configuration or this packet does not imply authorization.

### D. Live wiring with the paid kill switch still closed

- [ ] Set `PROVIDER_MODE=live` while keeping `PAID_DEMO_ENABLED=false`.
- [ ] Start the backend and frontend without printing environment values.
- [ ] Confirm backend configuration accepts the complete live group and the
  browser receives only public runtime configuration.
- [ ] Confirm bootstrap, health, and free conversation-first preparation work,
  while CV analysis and voice-token requests fail closed before Turnstile,
  OpenAI, or ElevenLabs is called.
- [ ] Confirm no provider request, credit spend, microphone request, Turnstile
  challenge, or WebRTC connection occurred during this no-spend phase.
- [ ] Stop and resolve every configuration, origin, revision, or kill-switch
  error before enabling paid operations.

## Controlled live-testing checklist

### 1. Activate the bounded test window

- [ ] Record the non-secret start time, intended synthetic scenario, provider
  revision, browser/device profile, and maximum permitted calls.
- [ ] With `PROVIDER_MODE=live`, temporarily set
  `PAID_DEMO_ENABLED=true`, restart cleanly, and verify the UI exposes the paid
  paths only for this test window.
- [ ] Keep browser developer tools available for content-free request counts,
  timing, console errors, storage inspection, and media-track cleanup. Do not
  save a network archive containing provider tokens or candidate content.

### 2. Live CV-assisted preparation

- [ ] Use an approved synthetic text PDF and complete a real Turnstile
  `cv_analyze` challenge on the allowed hostname.
- [ ] Confirm one user action produces at most one bounded OpenAI operation and
  returns grounded facts plus the universal HR screening plan.
- [ ] Confirm the candidate can correct the suggested role and that arbitrary,
  compound, or undecided role wording does not create an allow-list branch or
  technical assessment.
- [ ] Confirm invalid, expired, replayed, and wrong-action Turnstile results fail
  before OpenAI; use a fresh token for an authorized retry. Verify wrong-host
  rejection through the existing deterministic boundary and the exact dashboard
  hostname allow-list without authorizing another live hostname.
- [ ] Confirm raw CV text, the original PDF, provider payloads, and the Turnstile
  token are absent from logs, URLs, durable storage, and documentation.
- [ ] Record only coarse OpenAI usage, request count, duration, outcome, model,
  and cost; never record CV text or model output content.

### 3. Live conversation-first preparation

- [ ] Start without a CV and confirm preparation remains fast, deterministic,
  role-neutral, and free of direct OpenAI or ElevenLabs calls.
- [ ] Confirm the resulting grant and dynamic context contain no CV provenance
  and begin with an undecided/open synthetic role when no role has been stated.
- [ ] Run at least 50 content-free preparation measurements across the ticket's
  normal/throttled and desktop/mobile profiles; p95 must be at most 500 ms and
  release blocks above 1,000 ms.

### 4. Private ElevenLabs token and WebRTC connection

- [ ] From shared preflight, grant microphone permission intentionally, verify
  the intended input device and level meter, and complete a fresh real
  Turnstile `voice_token` challenge.
- [ ] Confirm one Start action produces at most one backend token request, one
  ElevenLabs conversation-token operation, and one WebRTC session.
- [ ] Confirm the ElevenLabs API key remains backend-only and the browser uses
  only the short-lived conversation token in memory.
- [ ] Confirm the exact first message is audible, candidate speech is
  intelligible, tentative/final captions behave correctly, and the UI reaches
  the connected listening/speaking states without a duplicate session.
- [ ] Confirm all eight dynamic variables reach the published agent with bounded
  synthetic values and no unresolved `{{screenpilot_*}}` placeholder is spoken.

### 5. Real conversation and Insight Board behavior

- [ ] Exercise at least one short CV-assisted session and one short
  conversation-first session using only synthetic identities and answers.
- [ ] Verify natural, concise HR questions; adaptive ordering; role-neutral
  treatment; corrections; refusals; unclear audio; counterquestions; stop; and
  unsupported employer questions without technical or hiring-suitability
  assessment.
- [ ] Trigger and verify `recordInsight`, `correctInsight`, `markTopic`,
  `recordCandidateQuestion`, and `requestFollowup` from real provider calls.
- [ ] Confirm tool parameters match the shared schemas, callbacks occur once,
  `Applied:`/`Rejected:` responses return to the agent, and rejected calls do
  not create or corrupt local evidence.
- [ ] Confirm cards attach only to eligible final candidate turns, corrections
  replace rather than duplicate values, and conversation-first remains
  Candidate-only.
- [ ] Verify captions, Insight Board updates, evidence chips, mute, End,
  cancellation, disconnect, reconnect state, keyboard controls, sticky safe-area
  controls, and reduced-motion behavior at representative phone, tablet,
  laptop/desktop, large-monitor, and intermediate resized widths.

### 6. SP-018 live performance and interruption sample

- [ ] Measure at least 50 representative live turns across desktop/mobile and
  normal/throttled profiles using content-free measurement IDs.
- [ ] TTFA, measured from candidate speech end to first substantive agent audio,
  meets p50 at most 800 ms and p95 at most 1,500 ms; a filler never stops TTFA.
- [ ] Connect-request-to-ready p95 is at most 3,000 ms.
- [ ] Client-tool-to-card p95 is at most 300 ms.
- [ ] Interruption-to-audio-stop p95 is at most 250 ms, with no overlapping
  residual agent speech.
- [ ] The visual waiting state appears from 0–800 ms, **Reviewing your answer…**
  appears from 800–1,500 ms, and the one allowed static **“Mm-hm…”** filler is
  eligible only above 1,500 ms.
- [ ] A filler occurs at most once per turn, never on consecutive turns, never
  more than three times per interview, never changes evidence, and never implies
  praise, agreement, comprehension, or hiring judgment.
- [ ] Run one explicitly authorized eight-minute synthetic session and confirm
  the hard stop ends voice, prevents further tool mutations, releases media,
  and preserves only the bounded partial local result.
- [ ] Treat TTFA above 1,200 ms p50 or 2,000 ms p95, interruption above 400 ms
  p95, card rendering above 600 ms p95, connection above 5,000 ms p95, or
  preparation above 1,000 ms p95 as a blocking failure rather than weakening
  the gate.

### 7. Privacy, retention, usage, and cleanup

- [ ] Inspect application logs, browser storage, URLs, console output, timing
  records, screenshots, and temporary files for secrets, tokens, CV/transcript
  content, candidate identity, salary, role text, or provider payload leakage.
- [ ] Verify the OpenAI operation used the locked model/settings and review only
  coarse usage/cost evidence; do not retrieve or publish stored response data.
- [ ] Verify the tested ElevenLabs immutable revision, audio-saving state,
  zero-day retention, conversation duration, usage, and actual cost in the
  provider dashboard without copying live transcript/audio into project files.
- [ ] End every conversation, stop microphone/media tracks, cancel timers and
  obsolete requests, remove temporary object URLs, and confirm no automatic
  reconnect occurs.
- [ ] Immediately restore `PAID_DEMO_ENABLED=false` and
  `PROVIDER_MODE=fake`, restart, and confirm deterministic fake mode still works.
- [ ] Confirm no secret or candidate/provider content appears in `git status`,
  `git diff`, documentation, screenshots, logs, shell history, or chat after the
  test.
- [ ] Record a sanitized content-free report containing date, sample sizes,
  browser/device/network profiles, provider/model/revision identifiers,
  p50/p95 metrics, request counts, coarse usage/cost, pass/fail, outliers, and
  blockers. Never include candidate text, audio, credentials, tokens, account
  IDs, or secret-bearing screenshots.

## Immediate stop conditions

Stop paid testing, restore both safety switches, and preserve only content-free
diagnostics if any of these occurs:

- a credential, provider token, Turnstile token, real-person detail, CV text,
  transcript line, or audio is exposed or persisted unexpectedly;
- the provider revision, prompt, model, voice, retention, authentication, tool
  schema, dynamic variables, hostname, or action differs from the locked
  configuration;
- one user action causes duplicate OpenAI, token, WebRTC, or tool operations;
- the paid kill switch does not fail closed, spending exceeds the agreed bound,
  or the provider dashboard reports unexplained usage;
- audio continues after interruption/End/hard stop, media tracks remain active,
  a tool mutates evidence without a final candidate turn, or a release-blocking
  latency threshold fails;
- the interaction asks technical/professional-knowledge questions, makes a
  hiring judgment, invents employer facts, or treats a role as unsupported.

## Acceptance criteria

- [ ] Every precondition is completed with non-secret owner-verifiable evidence
  before `PAID_DEMO_ENABLED=true` is used.
- [ ] Live CV analysis, Turnstile validation, private token issuance, WebRTC
  voice, prompt behavior, five client tools, controls, and cleanup pass with
  synthetic data.
- [ ] The 50-turn and 50-preparation measurement samples are real, content-free,
  reproducible, and meet every SP-018 target and release-blocking threshold.
- [ ] Actual provider revision, retention, usage, and cost evidence is reviewed;
  no result is inferred from fake mode or configuration alone.
- [ ] No live summary call is attempted and no SP-020/SP-021 behavior is claimed.
- [ ] No secret, real-person data, CV/transcript content, audio, or provider
  payload is committed, logged, persisted, or placed in the test report.
- [ ] `PAID_DEMO_ENABLED=false` and `PROVIDER_MODE=fake` are restored and verified
  immediately after testing.
- [ ] Every failed or unperformed live item remains unchecked with its exact
  blocker; a partial smoke is never reported as full live acceptance.

## Focused verification

- [ ] Run only the smallest relevant deterministic checks before and after the
  live window; do not add paid provider calls to automated tests or CI.
- [ ] Use browser network, storage, console, accessibility, responsive, and
  media inspection without saving secret/content-bearing exports.
- [ ] Use provider dashboards for revision, retention, request count, usage, and
  cost evidence; use application instrumentation for content-free timing.
- [ ] Re-run only the affected bounded synthetic scenario after a fix. Do not
  repeat paid calls merely to increase confidence without a defined question.

## Commit boundary

Keep SP-018A reviewable as one logical live-verification and sanitized-evidence
change represented by `SP-018A: verify live CV and voice integrations`. Do not
implement transcript review, summary, public hardening, deployment, or release
QA. Do not create a commit unless the user asks or the active workflow already
authorizes it.

## Precision references

- [Authoritative live-provider setup runbook](../operations/live-provider-setup.md)
- [Performance gates and latency policy](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#performance-gates)
- [Credential acquisition and paid live-test gate](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)
- [Provider data configuration](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#provider-data-configuration)
- [Operational logs](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#operational-logs)
- [Cost controls](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#cost-controls)

## Completion handoff

Report every precondition checked, each synthetic live scenario run, provider
operation counts, sanitized timing/cost/retention evidence, files changed,
focused deterministic checks, immediate-stop event, and unchecked item with its
blocker. Explicitly confirm both safety switches were restored. Never include
credentials, tokens, candidate content, raw provider payloads, real audio, or a
secret-bearing screenshot in the handoff.
