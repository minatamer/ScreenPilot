# SP-018A — Verify live CV and voice integrations

Status: Finalized by owner-approved bounded live smoke; deferred evidence moved to SP-021B<br>
Milestone: Milestone 2 — browser voice experience<br>
Last synchronized: 2026-09-23<br>
Depends on: SP-014A, SP-018<br>
Suggested commit: `SP-018A: verify live CV and voice integrations`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)<br>
Ticket index: [`README.md`](README.md)

---

## Objective

Safely activate the already-implemented live provider paths with owner-supplied
credentials and exclusively synthetic candidate data. Establish a bounded live
CV and private-voice compatibility checkpoint before same-session review work,
while preserving every unperformed full-flow, diagnostic, privacy, usage, and
cost item for the consolidated SP-021B validation window.

## Why this ticket exists

- Fake mode is the deterministic contract and regression harness. It proves
  state transitions, schemas, failure handling, and cleanup, but it does not
  prove real model behavior, tool selection, STT/TTS quality, WebRTC behavior,
  provider latency, interruption, or dashboard/source synchronization.
- SP-018 owns content-free instrumentation and the runtime behavior being
  measured. This packet owns the completed initial bounded live feedback loop;
  SP-021B first verifies the simplified diagnostics path in fake mode, then
  observes the naturally occurring metrics during its two live complete flows.
- SP-020 owns the live OpenAI summary route and SP-021 owns the browser
  summary/review/retry experience. Do not call or simulate a live summary in
  this ticket.
- This is a local, owner-controlled engineering test, not public-demo approval.
  SP-022 through SP-025A still own public abuse controls, privacy hardening,
  release QA, and the final repository/ticket audit.

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
- [x] ScreenPilot/Main contains the exact rendered source-controlled prompt at
  policy version `sp017-2026-09-16.1`, not the older prompt.
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
  placeholder parameterless tools or extra server/webhook/code/MCP tools.
- [x] The built-in **End conversation** system tool (`end_call`) is the only
  enabled system tool and uses the source-controlled completion description;
  language detection, transfer, skip-turn, state, DTMF, and voicemail tools
  remain disabled.
- [x] Client events include `audio`, `interruption`, `user_transcript`,
  `agent_response`, `agent_response_correction`,
  `agent_chat_response_part`, and `vad_score` so the typed live adapter receives
  both completed and streaming Pilot text.
- [ ] **Wait for response** is enabled for all five client tools so the agent
  receives the browser handler's `Applied:` or `Rejected:` result. Dynamic
  assignments and response mocks remain absent unless a later source-controlled
  contract explicitly requires them.
- [ ] GPT-5.4 Mini, reasoning None, 160-token output ceiling, Scribe v2 Realtime,
  Flash v2.5, the selected voice, English-only mode, interruptions, timing, and
  SP-018 tuning values match the source-controlled configuration.
- [ ] Audio saving is off, retention is zero days, debug mode is off, and Zero
  Retention Mode remains in the documented compatible state.
- [x] The synchronized configuration is published only to ScreenPilot/Main; its
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
- [x] The owner explicitly authorizes this bounded synthetic paid test. Merely
  completing configuration or this packet does not imply authorization.

### D. Live wiring with the paid kill switch still closed

- [ ] Set `PROVIDER_MODE=live` while keeping `PAID_DEMO_ENABLED=false`.
- [ ] Start the backend and frontend without printing environment values.
- [ ] Confirm backend configuration accepts the complete live group and the
  browser receives only public runtime configuration. With the paid switch
  closed, bootstrap exposes an empty Turnstile site key and the browser renders
  no usable CV, microphone, challenge, token, SDK, or WebRTC control.
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
- [x] With `PROVIDER_MODE=live`, temporarily set
  `PAID_DEMO_ENABLED=true`, restart cleanly, and verify the UI exposes the paid
  paths only for this test window.
- [ ] Keep browser developer tools available for content-free request counts,
  timing, console errors, storage inspection, and media-track cleanup. Do not
  save a network archive containing provider tokens or candidate content.

### 2. Live CV-assisted preparation

- [x] Use an approved synthetic text PDF and complete a real Turnstile
  `cv_analyze` challenge on the allowed hostname.
- [x] Confirm one user action produces at most one bounded OpenAI operation and
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
- [ ] Verify in fake mode that conversation preparation automatically creates a
  content-free, source-labelled timing observation visible in the local raw
  diagnostics before live testing begins.

### 4. Private ElevenLabs token and WebRTC connection

- [x] From shared preflight, grant microphone permission intentionally, verify
  the intended input device and level meter, and complete a fresh real
  Turnstile `voice_token` challenge.
- [x] Confirm one Start action produces at most one backend token request, one
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

### 6. SP-018 live performance observations and interruption behavior

- [ ] Before live activation, confirm fake mode automatically records eligible
  preparation, connection, TTFA, interruption, and client-tool-to-card timings;
  raw values are viewable/copyable/resettable and contain no candidate content.
- [ ] During the two bounded live complete flows, confirm the same instrumentation
  records every naturally eligible observation with source `live`. Do not repeat
  a paid turn or session merely to increase a measurement count.
- [ ] Review TTFA, connect-request-to-ready, client-tool-to-card, and
  interruption-to-audio-stop values as informational troubleshooting data. A
  filler never stops TTFA, and no observed percentile or count is a release
  gate.
- [ ] Confirm interruption produces no overlapping residual agent speech.
- [ ] The existing Pilot status remains the only feedback from 0–800 ms,
  **Reviewing your answer…** appears from 800–1,500 ms, and the one allowed
  static **“Mm-hm…”** filler is eligible only above 1,500 ms.
- [ ] A filler occurs at most once per turn, never on consecutive turns, never
  more than three times per interview, never changes evidence, and never implies
  praise, agreement, comprehension, or hiring judgment.
- [ ] Run one explicitly authorized eight-minute synthetic session and confirm
  the hard stop ends voice, prevents further tool mutations, releases media,
  and preserves only the bounded partial local result.
- [ ] Investigate an obvious delay or behavioral regression found during the
  bounded walkthrough, but do not convert the diagnostics into a statistical
  release claim or add paid repetitions solely for timing confidence.

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
- [ ] Record an optional sanitized content-free diagnostic snapshot containing
  date, observed counts, raw timings, browser/device/network context, and
  provider/model/revision identifiers. Record request counts and coarse
  usage/cost separately. Never include candidate text, audio, credentials,
  tokens, account IDs, or secret-bearing screenshots.

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
- [ ] Fake mode proves the content-free diagnostics path before live activation;
  the two live complete flows produce source-labelled observations naturally,
  with no sample quota or percentile release gate.
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

## Preparation record — 2026-09-16

- The owner confirmed `PROVIDER_MODE=live` and `PAID_DEMO_ENABLED=false` and
  retained exclusive control of both switches. The coding agent did not read,
  print, inspect, or modify either ignored `.env.local` file.
- Repository evidence confirms SP-014A and SP-018 are committed and the worktree
  began clean on `main`. Both local environment paths remain ignored.
- The five dashboard tool descriptions, parameter descriptions, required flags,
  enums, bounds, disabled dynamic assignments, absent response mocks, and
  enabled Wait-for-response behavior are now explicit in
  `VOICE_CLIENT_TOOL_DASHBOARD_DEFINITIONS`. This resolves the source-contract
  gap left by the pre-SP-016 placeholder dashboard setup.
- The owner reports completing publication to ScreenPilot/Main after the review
  diff showed the complete rendered `sp017-2026-09-15.1` prompt replacement,
  all eight case-sensitive dynamic variables with synthetic placeholder values,
  and `vad_score` added to the existing client-event stream. All five client
  tools had already been saved separately as workspace-level resources with the
  source-controlled descriptions, required parameters, enums, and
  Wait-for-response behavior. Their tool IDs did not change, so their contents
  were not repeated in the branch publish diff. ElevenLabs' current client-tool
  editor does not expose separate minimum/maximum-character controls; the
  documented bounds are copied into parameter descriptions and remain
  runtime-enforced by the browser Zod contracts. Dynamic-variable assignments
  and response mocks remain absent, and system tools remain disabled.
- The supplied `agtbrch_8401m2ar2j6nfshaa5wg31f0j654` value is the Main branch
  ID, not an immutable published revision. At that checkpoint, complete
  dashboard synchronization remained unchecked pending the later published
  configuration and immutable revision recorded below.
  No Preview, Turnstile challenge, microphone access, provider request, WebRTC
  connection, provider callback, or paid/live application operation is claimed
  by this preparation record.
- The no-spend audit found and corrected a frontend activation gap. Public
  runtime configuration now distinguishes deterministic fake mode from paid
  live capability, withholds the site key while the paid switch is closed, and
  fails closed before CV extraction/challenge, microphone permission, voice
  challenge/token, ElevenLabs SDK loading, or WebRTC. Restored tabs revalidate
  bootstrap before provider controls can return. Each refresh is owned by a
  request generation: cleanup aborts and releases only that request, stale
  responses cannot update state, safe stage transitions keep the current
  request authoritative, and a genuine failure stays closed behind an explicit
  fresh retry.
- Deterministic Node 24.19.0 verification passed 4 contract files/66 tests, 18
  backend files/203 tests, and 35 frontend files/229 tests. All three Vitest
  configurations explicitly override their isolated processes to
  `PROVIDER_MODE=fake` and `PAID_DEMO_ENABLED=false` before test modules load,
  disable `.env.local` loading, and operate independently of local runtime
  settings. Backend and frontend safety tests assert those effective values and
  both application suites install a fail-on-unexpected-network guard; focused
  regression checks
  cover the public projection, disabled CV/preflight composition, restored-tab
  Strict Mode abort/replacement ownership, stage changes during refresh,
  failed-refresh retry into paid-disabled live mode, and both backend
  provider-gate orderings. All three typechecks and builds, repository lint,
  and diff checks passed.
- Startup-only verification observed the backend listening on port 3001 and the
  statically built frontend becoming ready on port 3000, then stopped both and
  confirmed neither port remained open. No HTTP request, browser navigation,
  microphone request, Turnstile challenge, provider call, SDK session, WebRTC
  connection, Preview, or paid operation was performed. No live checklist item
  is implied by this code and startup evidence.
- The owner then completed a visual paid-disabled checkpoint with the owner-
  confirmed `PROVIDER_MODE=live` and `PAID_DEMO_ENABLED=false`. `/demo` loaded;
  the CV card showed **Paused for this safety check** with its analysis action
  disabled; conversation-first preparation reached preflight; and the preflight
  safety state omitted microphone and Start controls while stating that no
  challenge or voice connection would start. This screenshot-backed observation
  proves the intended visible fail-closed composition. Combined with the
  deterministic public-bootstrap projection, backend tests proving both paid
  routes stop before Turnstile and their provider adapters, frontend
  fail-closed/network-denial coverage, restored-session request-ownership tests,
  and startup evidence, this is accepted as the final Phase D no-spend gate.
  Repeating the same paid-disabled browser flow is not required before the
  bounded paid window. This acceptance does not authorize the coding agent to
  change either switch: the owner alone may set `PAID_DEMO_ENABLED=true`, and the
  paid checklist remains entirely unchecked until that explicit action.
- During the owner-controlled paid window, two synthetic CV attempts stopped at
  Turnstile with `TURNSTILE_UNAVAILABLE` before OpenAI or ElevenLabs. The second
  attempt still returned 503 after the backend was moved outside the restricted
  network sandbox, but the previous log surface could not distinguish a fetch,
  HTTP, body, JSON, or schema failure. The verifier now preserves fail-closed
  behavior while attaching one content-safe category for fetch/abort,
  non-success HTTP, empty/oversized/invalid body, invalid JSON, or schema
  mismatch, plus only bounded duration and HTTP status when available. The
  terminal request log emits those fields with its existing request ID and never
  logs the token, secret, response body, CV content, candidate data, environment
  values, or failure cause. The public 503 error envelope is unchanged.
- The third owner-triggered synthetic retry reached Cloudflare and received a
  successful HTTP response with a non-empty valid JSON body in 526 ms, then
  stopped at `response_schema_mismatch`; OpenAI and ElevenLabs were still not
  called. Review against Cloudflare's current Siteverify response contract found
  a compatibility defect in the local boundary: strict-object parsing rejected
  any provider field the application does not consume. The parser now validates
  and retains only the documented fields ScreenPilot uses while stripping
  unknown top-level and nested metadata fields. Malformed consumed fields still
  fail closed, and a fixed value-free category identifies the affected known
  field without logging provider content. Focused fake-mode verification passes
  2 files/22 tests, backend typecheck, targeted lint, and formatting. None of
  these diagnostic attempts counts as live-CV acceptance.
- The next owner-triggered synthetic retry passed Turnstile and reached the
  OpenAI CV-analysis stage, then returned `PROVIDER_UNAVAILABLE` after 22,762 ms.
  ElevenLabs was not involved. The previous OpenAI boundary intentionally
  discarded non-success HTTP status and collapsed fetch, timeout, response-body,
  JSON, envelope-status, and structured-output failures into the same public
  error, so the exact cause of that already-completed operation cannot be
  reconstructed from its safe log.
- OpenAI and ElevenLabs now use the same content-safe diagnostic contract as
  Turnstile. Typed provider failures retain only a fixed source, fixed category,
  bounded duration, and optional HTTP status. OpenAI additionally distinguishes
  incomplete, failed, or unexpected response status and invalid structured
  output without retaining provider messages or generated content. The terminal
  request log emits the normalized `provider`, `providerFailureClass`,
  `providerDurationMs`, and optional `providerHttpStatus` fields through the
  use-case error boundary. It never logs response bodies, URLs, credentials,
  tokens, CV or transcript content, conversation credentials, agent IDs, or raw
  causes. Public API errors and retry behavior remain unchanged. Focused
  fake-mode verification passed 6 files/75 tests plus backend typecheck and
  targeted lint before the rebuild and restart.
- The first retry after that restart passed Turnstile and exercised OpenAI's
  bounded automatic structured-output repair. The repaired attempt still ended
  as `structured_output_invalid` after 12,460 ms, and the complete `cv_analyze`
  request returned the unchanged public 503 after 26,615 ms. Because the repair
  call is made only after the initial output fails validation, this proves both
  OpenAI outputs violated the application schema; ElevenLabs was not involved.
  The exact field cannot be reconstructed from the completed call because the
  privacy-safe diagnostics deliberately retain no output, validation cause, CV
  content, or provider body. The CV-analysis waiting panel now pairs the existing
  coral document motif with a token-based coral spinner and exposes
  `aria-busy=true`, so the active paid wait is visually and semantically clear
  without exposing candidate facts. Frontend verification passes 35 files/230
  tests, typecheck, targeted lint, formatting, and the production build. The
  rebuilt `/demo` returns 200 with no browser warnings or errors. Live visual
  confirmation of the active spinner remains owner-triggered because entering
  that state requires a fresh Turnstile challenge and paid OpenAI operation.
- The failed retry exposed an architectural mismatch rather than an
  ElevenLabs fault: the OpenAI JSON Schema described only response shape while
  application-only refinements also expected plan completeness, exact universal
  topics, evidence/reference consistency, role synchronization, and policy-safe
  prose. The analyzer then made a second paid repair operation without new
  evidence. SP-018A now supersedes that path. GPT-5.4 Mini receives one strict
  evidence-only schema generated from the exact structural Zod parser; the
  application performs bounded local grounding, deduplication, invalid-field
  removal, role-reference filtering, and unsupported experience-classification
  downgrade, then builds the complete universal CV-assisted plan from
  source-controlled templates. A safe partial result continues when at least
  one grounded fact remains; zero grounded facts, refusals, incomplete
  responses, and structural failures fail closed. No automatic paid repair is
  permitted, so one accepted owner action can produce at most one direct OpenAI
  operation. An explicit UI retry remains a new action and requires a fresh
  Turnstile token.
- OpenAI failure logs now retain only fixed failure categories plus bounded
  validation rule IDs and field paths. They distinguish refusal, JSON syntax,
  structural schema mismatch, and semantically unusable evidence without
  retaining generated values, CV text, response bodies, or raw causes. The
  implementation follows OpenAI's current Structured Outputs guidance: all
  model fields are structurally required, objects disallow unknown properties,
  keys have descriptions, and refusals/incomplete responses are handled outside
  the schema. This redesign and its verification used fake providers only; no
  live OpenAI or ElevenLabs operation was made.
- Deterministic verification after the redesign passes 4 contract files/32
  tests and 19 backend files/212 tests under the isolated fake/network-denial
  test configuration, plus contract/backend typechecks, package lint, targeted
  formatting, whitespace checks, and contract/backend production builds. No
  environment secret file was read and no service was restarted as part of
  this redesign checkpoint.
- The next owner-triggered run completed the end-to-end live paid CV-assisted
  preparation path with the checked-in synthetic sample PDF. The browser
  extracted the document, the real `cv_analyze` Turnstile challenge succeeded,
  one bounded GPT-5.4 Mini evidence operation returned usable grounded facts,
  the backend built and validated the universal HR plan locally, and the
  browser rendered the plan preview. The displayed role suggestion and three
  evidence cards were cross-checked against the source-controlled expected-text
  fixture without copying their content into this record. This passes the two
  checked live-CV items above; it does not verify role correction, negative
  Turnstile cases, provider-dashboard usage/cost, voice, or cleanup, which remain
  unchecked and transfer to SP-021B. The owner later confirmed both safety
  switches were restored, as recorded in the closure decision below.
- The subsequent owner-triggered Start completed a real `voice_token`
  Turnstile check and private ElevenLabs token exchange. The content-free
  backend request log recorded one successful `POST /v1/voice/token` response
  (`200`) in 1,054 ms, after which the browser established one WebRTC session
  and sustained a usable CV-assisted two-way synthetic interview. The intended
  microphone label and live level meter were visible, agent audio and candidate
  speech were mutually intelligible, and four candidate-derived insight notes
  appeared without a duplicate connection. This passes only the first two
  token/WebRTC items above; browser-memory inspection, all eight runtime
  variables, both entry modes, every client tool, performance sampling,
  provider usage/cost, and cleanup remain unchecked and transfer to SP-021B.
  The owner later confirmed both safety switches were restored, as recorded in
  the closure decision below.
- The same live conversation exposed two blocking defects. Candidate captions
  rendered, but completed Pilot messages never appeared in the left-side
  caption log, so the caption acceptance item remains unchecked. After the
  agent verbally closed the interview, the provider session stayed active and
  the canonical workflow did not dispatch interview completion or enter the
  existing scrubbed Review placeholder. Full SP-021 Review is intentionally not
  implemented yet, but the terminal transition into the current placeholder is
  already the required interim flow.
- The two defects were corrected without another paid operation. Final-message
  deduplication is now speaker-scoped, so a candidate and Pilot message may
  safely share a provider event ID. The live bridge also consumes the SDK's
  typed `onAgentChatResponsePart` start/delta/stop callback, bounds accumulated
  text, emits tentative Pilot captions while text is produced, finalizes once,
  and suppresses the later duplicate completed callback. Closing no longer
  depends on matching phrases such as “all set”: policy version
  `sp017-2026-09-16.1` calls the sole built-in `end_call` system tool after the
  brief close, and the SDK's typed agent-disconnect signal follows the already-
  tested reducer path into the scrubbed Review placeholder. Focused deterministic
  verification covers cross-speaker ID reuse, streaming caption assembly,
  duplicate suppression, and one orderly agent-completed end. This establishes
  implementation confidence without spending credits; it does not retroactively
  mark live caption/end acceptance as observed.
- The owner then confirmed that ScreenPilot/Main was updated and published with
  the exact `sp017-2026-09-16.1` prompt, the complete client-event set including
  `agent_chat_response_part`, and `end_call` as the sole enabled system tool with
  the source-controlled description. This owner confirmation closes the
  dashboard-configuration blocker for the two fixes without requiring Preview
  or another paid conversation. Live caption and automatic-end behavior remain
  unchecked until observed naturally in a future owner-run call. The owner
  supplied immutable revision `agtvrsn_1501m2mwx4ffek39r88ygh1ngxq4`; it is
  recorded in the source-controlled provider target with matching policy
  version `sp017-2026-09-16.1`.

## Owner-approved closure and deferred evidence — 2026-09-21

- The owner accepts the completed bounded live smoke as sufficient SP-018A
  evidence: a real synthetic CV analysis and one real private CV-assisted voice
  interview worked and felt good before the caption and automatic-ending defects
  were found.
- The caption and provider-owned ending corrections remain deterministically
  verified but not re-observed live. Their checklist items remain unchecked.
- The second entry mode, all eight runtime variables, all five client tools,
  negative/replay Turnstile behavior, fake-first/live timing diagnostics,
  complete cleanup/privacy inspection, and provider revision/retention/usage/cost
  review remain unchecked. They move intact to the required SP-021B packet; this
  closure does not represent them as passed.
- The owner explicitly chose not to pay for another partial interview-only run
  before summary and review exist. SP-021B consolidates the next paid window
  after SP-021 so it validates both complete entry modes through interview,
  summary, evidence-linked review, retry behavior, cleanup, and cost.
- The owner explicitly confirms the current local runtime is restored to
  `PAID_DEMO_ENABLED=false` and `PROVIDER_MODE=fake`. The coding agent did not
  read or inspect either ignored local environment file. Restart/fake-flow
  verification remains part of SP-021B's close-window checklist.
- SP-018A is finalized for dependency ordering on this bounded, explicitly
  scoped evidence. SP-019 is eligible now. Public/release readiness remains
  blocked by SP-021B and the later hardening/release tickets.

## Precision references

- [Authoritative live-provider setup runbook](../operations/live-provider-setup.md)
- [Performance diagnostics and latency policy](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#performance-diagnostics)
- [Credential acquisition and paid live-test gate](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)
- [Provider data configuration](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#provider-data-configuration)
- [Operational logs](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#operational-logs)
- [Cost controls](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#cost-controls)

## Completion handoff

The closure handoff must distinguish the bounded evidence completed here from
the exact unchecked ledger transferred to SP-021B. It records the owner's
confirmation that both switches are restored without claiming the ignored files
were inspected or that fake mode was re-run. Never include credentials, tokens,
candidate content, raw provider payloads, real audio, or a secret-bearing
screenshot.
