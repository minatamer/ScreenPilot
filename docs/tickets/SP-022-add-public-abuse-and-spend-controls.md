# SP-022 — Add public abuse and spend controls

Status: Required  
Milestone: Milestone 4 — public-demo hardening  
Implementation state: Completed and deterministically verified locally on 2026-09-24; deployment-time Cloud Run and production-domain Turnstile application remains owned by SP-026<br>
Last synchronized: 2026-09-24
Depends on: SP-003, SP-009, SP-010, SP-014, SP-020, SP-021  
Suggested commit: `SP-022: gate anonymous paid demo usage`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Harden every anonymous paid operation with free Turnstile, bounded best-effort stateless rate controls, kill switches, and hard Cloud Run/provider spending ceilings without adding identity or persistence.

## Standalone implementation context

- Turnstile Free protects `POST /v1/cv/analyze`, `POST /v1/voice/token`, and `POST /v1/interview/summary` with actions `cv_analyze`, `voice_token`, and `interview_summary`.
- The interaction-only client token is memory-only, single-use, valid for five minutes, and reset after every attempt. The backend Siteverify call must validate success, expected hostname, and action before a paid provider call.
- Conversation-first `POST /v1/interview/prepare` is deterministic and free; rate-limit it but do not challenge it unless measured abuse later justifies a scope change.
- Source/route counters are capped TTL memory per Cloud Run instance and reset on scale/restart. They are best effort, not durable identity enforcement.
- The signed anonymous cookie/grant contains no candidate content and provides coarse correlation only.
- Cloud Run maximum instances/concurrency plus OpenAI/ElevenLabs account concurrency/spend alerts/caps form the hard financial ceiling.
- Provider failures are classified from bounded, allow-listed status/type/code fields rather than raw provider messages. OpenAI credit/spend/usage-limit codes and ElevenLabs payment-required/insufficient-credit codes require owner action and are not retryable candidate actions; rate limits, concurrency limits, timeouts, network failures, and temporary provider outages remain retryable when their documented conditions allow it.
- Candidate-facing failures never disclose provider names, account balance, billing state, credentials, raw response bodies, or SDK diagnostics. Operational diagnostics may retain only the existing sanitized provider/status/code category and request correlation allowed by SP-023.
- A live-provider failure never changes provider mode, mounts the deterministic fake bridge, invents a provider result, auto-reconnects voice, or silently continues an interview as fake.
- Turnstile is $0 and independent of registrar/DNS/proxy choice. Bot Fight Mode, Cloudflare proxying, paid WAF, fingerprinting, auth, and persistent IP storage are out of scope.
- The researched full CV-assisted eight-minute flow is planned at about $0.70 after included voice minutes are exhausted: $0.68–$0.75 under standard pricing, or up to about $1.40 if burst pricing is deliberately enabled. These are pre-tax estimates until SP-025 measures actual provider usage.

## Provider/account evidence and deployment boundary

- This ticket reuses the blank-template OpenAI, ElevenLabs, and Turnstile groups; it introduces no new API credential. `PAID_DEMO_ENABLED=false` remains the default until the user has supplied values and the corresponding account caps are configured.
- Create/restrict the Turnstile widget through Cloudflare's dashboard; no Cloudflare API token is required. Provider spend/concurrency alerts or caps are manual account-dashboard settings and must be recorded without copying account IDs, credentials, or screenshots containing secrets into the repository.
- All ordering, replay, limiter, kill-switch, and capacity behavior must pass with fakes and Cloudflare test configuration first. Real-host challenge checks and provider-cap review remain unchecked when credentials/dashboard access are missing.
- Verify the local backend secret file is ignored before account values are entered, and never make production bypass/test keys available when `APP_ENV=production`.
- The owner-confirmed account configuration is complete for this ticket: OpenAI has the existing bounded hard limit/alerts, ElevenLabs has its existing account/agent quota and concurrency controls, and the free local Turnstile Managed widget is restricted to `localhost` with pre-clearance off. Successful owner-controlled requests have exercised `cv_analyze`, `voice_token`, and `interview_summary`; this records behavior and configuration without claiming the coding agent directly inspected a dashboard.
- The local widget is not the production widget. SP-026 creates/restricts the production-domain widget after the canonical hostname exists and applies/verifies Cloud Run minimum/maximum instances, service concurrency, and billing alerts. SP-022 defines application-side controls and intended deployment inputs only; no Google Cloud service exists to mutate here.
- Timeout ownership is explicit: the Node HTTP server bounds complete header receipt to 10 seconds and complete inbound request receipt to 30 seconds before/while Express parses the bounded body. That request-receipt timer is not a whole-handler timer. Each outbound provider operation separately uses the existing abortable 30-second provider timeout; bounded local handler work does not get a misleading socket timeout that could leave provider work running.

## Scope boundaries

- Do not claim one interview per unique person, durable bot prevention, or that Turnstile proves human identity.
- Do not store raw IP addresses, Turnstile tokens, cookies, grants, candidate content, or counters in a database/log.
- Do not introduce Redis, PostgreSQL, Cloud Armor/load balancer, paid Cloudflare plan, second proxy/CDN, or authentication.
- Do not let a rejected/expired/replayed token reach OpenAI or ElevenLabs.
- Do not expose raw OpenAI/ElevenLabs error bodies, messages, SDK text, billing state, or account configuration to the browser or candidate.
- Do not offer Retry for a provider failure that requires credits, a spend/usage-limit change, corrected credentials, permissions, or another owner-side configuration change.
- Do not make automated default CI solve production Turnstile or call paid providers.

## Implementation checklist

SP-021B immediate slice (2026-09-23): OpenAI non-success summary responses now
classify bounded billing/quota, account/authentication, request-configuration,
and transient failures; valid numeric `Retry-After` reaches the existing API
envelope; permanent classes suppress Retry; and logs/UI remain content-safe.
Exact owner-action codes `credit_balance_exhausted`,
`organization_spend_limit_exceeded`, `project_spend_limit_exceeded`, and
`organization_usage_limit_exceeded`, plus bounded legacy quota codes, are
non-retryable even on HTTP 429. `Retry-After: 0` is intentionally omitted;
positive values are capped at 86,400 seconds so terminal error mapping always
matches the positive shared API contract.
ElevenLabs HTTP and browser-SDK classification now follow the same bounded
boundary: raw messages are discarded, owner-action codes suppress Retry, and
only safe class/status/type/code/retry/duration metadata reaches diagnostics.
The broader public-control work below remains owned by this ticket.

The owner-directed local summary rehearsal added on 2026-09-23 does not bypass
these controls. It is valid only for local live/paid-enabled configuration,
keeps all three paid-route Turnstile boundaries, uses deterministic fake CV
analysis and fake voice rather than constructing an ElevenLabs client, and
starts at most one live OpenAI summary in the background after fake-voice
disconnect. **View summary** remains disabled with a spinner until that work
settles and never initiates provider work. Production rejects the mode;
standard fake/live behavior and every remaining SP-022 acceptance item are
unchanged.
Restored completion state cannot use persisted mode data to mount Turnstile or
start summary work. Fresh bootstrap validation must succeed first;
paid-disabled, pending, and failed refresh remain fully closed, standard
fake/live and summary rehearsal may then prepare once in the background.

Current mid-call boundary: SDK error/disconnect callbacks are sanitized at the
adapter boundary. A detectable structured owner-action marker is classified
without retaining its raw message; an opaque disconnect stays generic. Either
path stops and unmounts the session once, preserves local evidence, and enters
the explicit partial-review path without fake fallback or automatic reconnect.

- [x] Audit the shared managed Turnstile client on all three paid actions for accessible interaction-only rendering, memory-only tokens, explicit reset, and safe state preservation.
- [x] Audit Siteverify on all three routes for server-only secret, bounded timeout, strict response schema, expected hostname/action, single-use/expiry handling, stable errors, and redacted logs.
- [x] Enforce fail-closed provider ordering and assert zero paid calls for all pre-provider failures.
- [x] Implement bounded per-route/source/anonymous-cookie TTL memory limits using only a validated proxy chain and capped memory.
- [x] Apply tighter voice-token limits and proportionate CV/summary limits; separately rate-limit bootstrap/preparation.
- [x] Add the 64 KiB body limit, explicit Node header/request-receipt deadlines, separately abortable provider deadlines, paid-demo kill switch, capacity checks, and safe `Retry-After` errors.
- [x] Parse non-success OpenAI and ElevenLabs responses through small bounded error-envelope schemas before discarding their bodies. Preserve only allow-listed HTTP status, provider error type/code, request correlation, and retry timing; never retain or surface the raw provider message/body.
- [x] Classify OpenAI `credit_balance_exhausted`, organization/project spend-limit, and organization usage-limit responses plus ElevenLabs `payment_required`/`insufficient_credits` and bounded legacy quota-exceeded responses as owner-action-required, candidate-safe, non-retryable failures.
- [x] Keep Retry available only for explicitly transient classes such as temporary request/concurrency limits, timeouts, network failures, and provider `5xx`/service-unavailable responses. Honor a valid bounded `Retry-After`; authentication, authorization, billing/quota, and configuration failures are non-retryable from the candidate UI.
- [x] Sanitize every ElevenLabs browser SDK error/disconnect at the adapter boundary. Never render SDK-provided text directly; a failure before connection returns to the existing safe recovery UI, while a failure after connection ends and unmounts the live bridge once, preserves local transcript/insights, and explains plainly that the connection ended and completed evidence remains available in partial review.
- [x] Assert that all provider failure branches preserve the configured live/fake boundary: no live error may select the fake adapter/bridge, synthesize a transcript or summary, auto-retry, or auto-reconnect.
- [x] Define deployment inputs without performing deployment work: backend minimum instances `0`, maximum instances `1`, container concurrency `4`; frontend minimum instances `0`, maximum instances `1`, container concurrency `80`. SP-026 alone applies/verifies them. OpenAI and ElevenLabs account controls are owner-confirmed and recorded in the live-provider runbook.
- [x] Preserve the $0.80 standard-flow planning reserve and $1.40 burst-only reserve; the owner-confirmed provider limits remain the hard account boundary and each live window still requires explicit authorization before changing `PAID_DEMO_ENABLED` from `false`.
- [x] Ensure rate/capacity errors identify the unavailable action without exposing internals or faking a result.
- [x] Document the exact $0 Turnstile role, limitations, no-proxy design, and non-durable enforcement.
- [x] Test success, missing, invalid, expired, replayed, wrong-hostname, wrong-action, Siteverify timeout, route/source/cookie limits, memory eviction, application capacity, and kill switch deterministically. Owner evidence confirms successful local real-widget requests for all three actions and provider-account controls; exhausting a paid provider cap is deliberately not a test. Production-host Turnstile verification belongs to SP-026.

## Acceptance criteria

- [x] Every paid provider route fails before provider invocation when Turnstile or another precondition fails.
- [x] A valid visitor can recover with a fresh challenge without losing extracted CV text, prepared plan, transcript, or insights as appropriate.
- [x] Detectable credit, spend, usage, authentication, permission, and configuration failures show bounded candidate-safe unavailable copy without a Retry action; temporary provider failures show Retry only when another attempt can reasonably succeed.
- [x] No candidate-facing surface contains a raw provider body/message, provider or account-finance detail, SDK diagnostic, credential, or internal configuration value.
- [x] A pre-connect voice failure offers safe recovery without mounting fake voice; a post-connect failure stops the live session once, preserves available local evidence, and presents an explicit partial-interview explanation without automatic reconnection.
- [x] No provider failure changes `providerMode`, invokes a fake provider after a live attempt, or represents fabricated output as successful live output.
- [x] In-memory counters are bounded and do not persist/log raw IPs.
- [x] Application-side capacity and owner-confirmed provider account limits bound current local exposure even if one memory counter is bypassed. SP-026 owns the separate deployed Cloud Run ceiling before public traffic exists.
- [x] No paid WAF/proxy/database/auth service has been added.
- [x] Public copy and documentation describe protection and limitations honestly.

## Focused verification

- [x] Run focused client/server Turnstile, limiter, capacity, and kill-switch tests with fakes/test keys.
- [x] Simulate bounded OpenAI and ElevenLabs authentication, billing/credit, spend/usage-limit, rate/concurrency-limit, timeout, network, malformed-error-envelope, and `5xx` responses without paid calls; assert the expected safe copy, retryability, `Retry-After`, redaction, and provider call count.
- [x] Exercise pre-connect SDK error and post-connect disconnect/error callbacks with deliberately technical synthetic messages; assert none reaches rendered copy, the live bridge unmounts once, partial evidence survives, and no fake bridge or synthetic success path starts.
- [x] Assert provider call count/order for every rejection path.
- [x] Inspect logs/storage/memory keys for tokens, raw IPs, cookies, or candidate content.
- [x] Exercise legitimate local real-widget challenges for `cv_analyze`, `voice_token`, and `interview_summary`; cover forced expiry/replay recovery deterministically so no extra paid provider request is required.
- [x] Review the application defaults and intended deployment inputs separately from provider account controls. Applying and verifying deployed Cloud Run settings is explicitly an SP-026 acceptance item, not unfinished SP-022 work.
- [x] Keep immediate provider balance/allowance confirmation as a per-live-window operator gate. Existing bounded windows were owner-confirmed; this ticket performs no new paid test and does not treat allowances as permission to increase the approved run count.

Deterministic verification on 2026-09-24 used Node 24 with every process forced
to `PROVIDER_MODE=fake` and `PAID_DEMO_ENABLED=false`. Focused backend
Turnstile/use-case/route/admission coverage, focused frontend Turnstile/storage/
summary/voice coverage, and provider-error classification suites passed without
network or paid-provider access. Validation follow-up replaced full-table
counter scans with bounded min-heap expiry/eviction and added explicit Node
header/request-receipt deadlines plus fail-closed configuration relationships.
The final focused limiter, capacity, config, server, and application run passed
5 files / 66 tests; backend typecheck, lint, and build also passed. The root
format check still reports two pre-existing committed frontend files outside
SP-022; every SP-022-supported source/document file passes its focused format
check.

## Commit boundary

Keep SP-022 reviewable as one logical change represented by `SP-022: gate anonymous paid demo usage`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Abuse protection contract](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#abuse-protection)
- [Paid-route REST security](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#12-rest-api-specification)
- [Cost controls](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#cost-controls)
- [Full-flow cost analysis and free allowances](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#13-elevenlabs--openai-research-and-cost-plan)
- [Honest limitation](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#honest-limitation)
- [Credential acquisition, fake mode, and account setup](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
