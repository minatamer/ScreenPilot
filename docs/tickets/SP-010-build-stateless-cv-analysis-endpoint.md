# SP-010 — Build the stateless CV-analysis endpoint

Status: Required  
Milestone: Milestone 1 — interview preparation paths  
Implementation state: Completed, verified, and committed on 2026-09-11<br>
Last synchronized: 2026-09-11<br>
Depends on: SP-003, SP-007, SP-009  
Suggested commit: `SP-010: analyze CVs without persistence`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

> **Superseded CV role-alignment contract — SP-010A:** This packet remains the historical record of commit `744901e`. Its fixed `demo-engineering` key, Frontend/Backend-only suggestions, rejection of other applied-role labels, and fixed-vacancy grant bindings are no longer the target product model. SP-010A completed the migration to evidence-linked, non-binding suggestions for any bounded role label; candidate speech remains authoritative, role labels stay inert untrusted data, and the existing evidence, HR-only, privacy, Turnstile, and statelessness guarantees remain mandatory.

## Objective

Convert bounded browser-extracted CV text into validated evidence-grounded facts and a focused HR screening plan in one protected stateless OpenAI request.

## Standalone implementation context

- `POST /v1/cv/analyze` receives `vacancyCatalogKey: demo-engineering`, 500–40,000 normalized characters of `cvText`, `clientRequestId`, and a one-time `turnstileToken` for action `cv_analyze`.
- Turnstile Siteverify must succeed for the expected hostname/action before OpenAI is called.
- Use OpenAI GPT-5.4 mini, reasoning `none`, structured output, and `store: false`.
- Normalized output contains optional CV-supported display name/headline, experience level, evidence-backed facts, and ambiguities. Unsupported values are `null` or omitted.
- The plan contains intents, coverage criteria, and follow-up directions—not exact questions. CV fact IDs must resolve to validated facts.
- CV alignment may suggest Frontend or Backend only as a non-binding conversation hint. It never asserts what the person applied for or mutates spoken role preference.
- The endpoint returns normalized CV, plan, a short-lived grant bound to their hashes, expiry, and coarse usage/cost metadata.
- At current GPT-5.4 Mini rates, the CV call is budgeted at **$0.00735 optimized, $0.01140 base, and $0.01950 heavy**. OpenAI lists no supported ongoing Free tier for this model; any account-specific test credit is a temporary bonus, not a release dependency.

## Manual credential gate

- A real request needs `OPENAI_API_KEY`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and `TURNSTILE_ALLOWED_HOSTNAMES`; all remain exactly blank in the committed backend template until the user fills the ignored local file.
- Temporary composition constraint: the current grouped `PROVIDER_MODE=live` configuration also requires the signing/cookie secrets and ElevenLabs key/agent/voice fields defined by SP-003, even though SP-010's CV route uses only OpenAI, Turnstile, and grant/cookie security. Live summary and voice adapters remain fail-closed until SP-014 and SP-020 replace them; this ticket does not weaken production readiness or implement those later capabilities.
- Create the OpenAI key in the intended API project from the [official quickstart](https://platform.openai.com/docs/quickstart/make-your-first-api-request). Create the Turnstile pair from [Cloudflare's widget dashboard flow](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/). The OpenAI and Turnstile secret keys are server-only; the Turnstile site key is public bootstrap data.
- Fake OpenAI and fake/test Turnstile complete implementation and automated acceptance with no paid call. When values are blank, do not attempt live fallback and leave the controlled real-response check unchecked with the credential blocker.
- Verify `apps/backend/.env.local` is ignored before entering values. Never paste a key into a fixture, test snapshot, log, Markdown, frontend environment, or commit.

## Scope boundaries

- Do not receive or persist a PDF, URL, storage key, user ID, candidate ID, recruiter record, or employer-provided arbitrary job.
- Do not follow instructions found inside CV text; it is delimited untrusted evidence.
- Do not generate technical interview questions, implementation/architecture/testing topics, scores, employability, personality, sentiment, accent, protected traits, or hiring decisions.
- Do not substitute bundled sample values into an uploaded CV.
- Do not retry general provider failures automatically; allow one bounded malformed-structured-output repair only.

## Implementation checklist

- [x] Consume declared `@screenpilot/contracts` AnalyzeCv request and normalized-output/plan exports; do not deep-import package source or duplicate schemas in the backend.
- [ ] Validate origin, cookie, schema, body bounds, fixed catalogue key, text printability/language sanity, client request ID, and best-effort rate signal. Everything except a real runtime rate/capacity signal is complete; SP-010 exposes and tests the fail-closed admission seam, while SP-022 owns the bounded TTL limiter and spend controls.
- [x] Verify the fresh Turnstile token with expected `cv_analyze` action and hostname before constructing an OpenAI request.
- [x] Build a prompt that clearly delimits CV text as untrusted data and enforces the HR-only output schema.
- [x] Call only locked GPT-5.4 mini with reasoning none, structured output, and `store: false`.
- [x] Schema-validate display-name evidence, fact categories/excerpts, evidence-supported experience classifications, ambiguities, branch, fact-linked suggested alignment, topic IDs, required HR fields, and all fact references.
- [x] Reject or strip unsupported fields and any technical-evaluation topic.
- [x] Allow one bounded repair for malformed model output.
- [x] Issue a signed short-lived CV-assisted grant bound to validated analysis/plan hashes.
- [x] Return `Cache-Control: no-store` and safe stable errors.
- [x] Capture provider-reported input, cached-input, and output token counts in coarse content-free usage metadata so SP-025 can calculate the measured call cost without logging CV or response content.
- [x] Add fake-provider success, two-materially-different-CV, timeout, malformed output/repair, injection, unsupported-field, Turnstile failure/replay/wrong-action, grant-expiry, and no-persistence tests.

## Acceptance criteria

- [x] No OpenAI call occurs for invalid input, failed Turnstile, rate/capacity denial, or disabled paid demo.
- [x] Every returned candidate fact has a bounded supporting excerpt or the field is absent/unclear.
- [x] Different CV fixtures produce materially different facts and planned topic directions.
- [x] No result claims a confirmed applied role or introduces a Full Stack vacancy.
- [x] No CV text, model response body, Turnstile token, or candidate value reaches storage or logs.

## Focused verification

- [x] Run focused route/use-case/schema tests with fake OpenAI and Turnstile.
- [x] Exercise graduate, experienced, Frontend, Backend, mixed, correction, and injection fixtures.
- [x] Assert provider call ordering and call counts for every precondition failure.
- [x] Manually inspect two successful JSON responses against the normalized CV and plan contracts.
- [x] Search logs/temp directories/browser responses for persistence or raw-body leakage.

## Implemented result

- Added the protected, no-store `POST /v1/cv/analyze` route with strict origin, anonymous-cookie, request-schema, English-text-sanity, an injectable fail-closed admission seam, and Turnstile ordering before any OpenAI operation.
- Added a bounded OpenAI Responses client and CV adapter locked to GPT-5.4 mini, reasoning `none`, strict structured output, and `store: false`; only malformed structured output receives one repair attempt.
- Added shared model/public output validation for grounded facts and names, CV-supported headlines, evidence-supported experience classifications, complete HR-screening topics, resolved fact links, and non-binding Frontend/Backend hints that cite at least one validated fact. Every model-generated plan text field is checked for literal questions, technical evaluation, applied-role claims, scoring/ranking/hiring judgments, employability, personality/sentiment/accent/protected-trait inference, and culture-fit judgments.
- Added deterministic fixture-aware fakes, content-free token/cost metadata, and signed CV-assisted grants bound to the validated CV and plan hashes.
- Live composition now selects the real OpenAI and Turnstile adapters with no fake fallback. Unimplemented live summary and voice operations remain fail-closed for their owning later tickets.
- Preserved the stateless boundary: no PDF upload, database, durable session, cache, queue, filesystem write, raw-body log, or candidate registry was introduced.

## Verification evidence

- Focused contract, provider-composition, OpenAI-client, adapter, use-case, and Supertest coverage passed: 6 files and 54 tests after the evidence-relationship and plan-semantics revision.
- The complete workspace unit matrix passed: contracts 22 tests, backend 94 tests, and frontend 53 tests (169 total). Repository formatting and lint, all three TypeScript checks, and contracts/backend/frontend production builds also passed on Node.js 24; the unchanged frontend result is carried from the immediately preceding SP-010 gate.
- The fixture matrix covered graduate, experienced, Frontend-leaning, Backend-leaning, mixed/Full-Stack, correction, and prompt-injection CVs; materially different outputs, exact evidence excerpts, safe vacancy hints, and provider call ordering were asserted.
- Invalid origin/cookie/schema/text, disabled-paid-demo, injected admission denial, Turnstile failure/replay/action/hostname mismatch, timeout, malformed/oversized provider output, forbidden or question-form text in every plan area, unsupported vacancy suggestions and experience labels, dangling fact references, and invented headline paths were exercised. Graduate, junior, and experienced fixture paths continue to pass with evidence-backed facts. The server's default admission remains `allowed`; connecting the real bounded rate/capacity signal is deliberately deferred to SP-022.
- Successful Frontend and Backend response structures were inspected through the shared response contract; `Cache-Control: no-store`, content-free usage, expiry, grant bindings, and absence of the one-time challenge token were verified.
- Source scans found no candidate persistence or application dependency inversion, logging redaction remains in place, `git diff --check` passed, and both application `.env.local` paths remain ignored.
- The controlled real-provider response remains unchecked because no user-owned OpenAI/Turnstile credentials, grouped live-mode prerequisites, or explicit paid-call permission were supplied. All completed checks used deterministic fakes or injected local HTTP responses and spent no provider credits.

## Commit boundary

Keep SP-010 reviewable as one logical change represented by `feat(backend): analyze CVs without persistence`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [CV input/output and screening plan schemas](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#10-stateless-interview-preparation-and-summary-intelligence)
- [CV-analysis REST route](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#post-v1cvanalyze)
- [HR field checklist and prohibited behavior](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#hr-screening-field-checklist-and-priority)
- [Security and abuse controls](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#16-security-privacy-and-public-demo-controls)
- [Credential acquisition and fake-first gate](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)
- [Per-call cost assumptions and free-tier limits](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#13-elevenlabs--openai-research-and-cost-plan)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
