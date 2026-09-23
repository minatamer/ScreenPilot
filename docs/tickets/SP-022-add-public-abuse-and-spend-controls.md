# SP-022 — Add public abuse and spend controls

Status: Required  
Milestone: Milestone 4 — public-demo hardening  
Last synchronized: 2026-09-23
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

## Manual provider/account gate

- This ticket reuses the blank-template OpenAI, ElevenLabs, and Turnstile groups; it introduces no new API credential. `PAID_DEMO_ENABLED=false` remains the default until the user has supplied values and the corresponding account caps are configured.
- Create/restrict the Turnstile widget through Cloudflare's dashboard; no Cloudflare API token is required. Provider spend/concurrency alerts or caps are manual account-dashboard settings and must be recorded without copying account IDs, credentials, or screenshots containing secrets into the repository.
- All ordering, replay, limiter, kill-switch, and capacity behavior must pass with fakes and Cloudflare test configuration first. Real-host challenge checks and provider-cap review remain unchecked when credentials/dashboard access are missing.
- Verify the local backend secret file is ignored before account values are entered, and never make production bypass/test keys available when `APP_ENV=production`.

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
keeps the real `voice_token` and `interview_summary` Turnstile boundaries,
disables CV analysis, uses no ElevenLabs client, and waits for explicit
**View summary** before one live OpenAI summary. Production rejects the mode;
standard fake/live behavior and every remaining SP-022 acceptance item are
unchanged.
Restored completion state cannot use persisted mode data to mount Turnstile or
start summary work. Fresh bootstrap validation must succeed first;
paid-disabled, pending, and failed refresh remain fully closed, standard
fake/live may then prepare once in the background, and summary rehearsal still
waits for **View summary**.

Current mid-call boundary: SDK error/disconnect callbacks are sanitized at the
adapter boundary. A detectable structured owner-action marker is classified
without retaining its raw message; an opaque disconnect stays generic. Either
path stops and unmounts the session once, preserves local evidence, and enters
the explicit partial-review path without fake fallback or automatic reconnect.

- [ ] Audit the shared managed Turnstile client on all three paid actions for accessible interaction-only rendering, memory-only tokens, explicit reset, and safe state preservation.
- [ ] Audit Siteverify on all three routes for server-only secret, bounded timeout, strict response schema, expected hostname/action, single-use/expiry handling, stable errors, and redacted logs.
- [ ] Enforce fail-closed provider ordering and assert zero paid calls for all pre-provider failures.
- [ ] Implement bounded per-route/source/anonymous-cookie TTL memory limits using only a validated proxy chain and capped memory.
- [ ] Apply tighter voice-token limits and proportionate CV/summary limits; separately rate-limit bootstrap/preparation.
- [ ] Add body/time limits, paid-demo kill switch, capacity checks, and safe `Retry-After` errors.
- [x] Parse non-success OpenAI and ElevenLabs responses through small bounded error-envelope schemas before discarding their bodies. Preserve only allow-listed HTTP status, provider error type/code, request correlation, and retry timing; never retain or surface the raw provider message/body.
- [x] Classify OpenAI `credit_balance_exhausted`, organization/project spend-limit, and organization usage-limit responses plus ElevenLabs `payment_required`/`insufficient_credits` and bounded legacy quota-exceeded responses as owner-action-required, candidate-safe, non-retryable failures.
- [x] Keep Retry available only for explicitly transient classes such as temporary request/concurrency limits, timeouts, network failures, and provider `5xx`/service-unavailable responses. Honor a valid bounded `Retry-After`; authentication, authorization, billing/quota, and configuration failures are non-retryable from the candidate UI.
- [x] Sanitize every ElevenLabs browser SDK error/disconnect at the adapter boundary. Never render SDK-provided text directly; a failure before connection returns to the existing safe recovery UI, while a failure after connection ends and unmounts the live bridge once, preserves local transcript/insights, and explains plainly that the connection ended and completed evidence remains available in partial review.
- [x] Assert that all provider failure branches preserve the configured live/fake boundary: no live error may select the fake adapter/bridge, synthesize a transcript or summary, auto-retry, or auto-reconnect.
- [ ] Configure Cloud Run max instances/concurrency and provider account concurrency/spend alerts/caps.
- [ ] Reserve $0.80 per planned standard live acceptance flow, or $1.40 only when burst is deliberately enabled; set the user-approved total test budget/caps before changing `PAID_DEMO_ENABLED` from `false`.
- [ ] Ensure rate/capacity errors identify the unavailable action without exposing internals or faking a result.
- [ ] Document the exact $0 Turnstile role, limitations, no-proxy design, and non-durable enforcement.
- [ ] Test success, missing, invalid, expired, replayed, wrong-hostname, wrong-action, Siteverify timeout, route/source/cookie limits, memory eviction, capacity, provider cap, and kill switch.

## Acceptance criteria

- [ ] Every paid provider route fails before provider invocation when Turnstile or another precondition fails.
- [ ] A valid visitor can recover with a fresh challenge without losing extracted CV text, prepared plan, transcript, or insights as appropriate.
- [ ] Detectable credit, spend, usage, authentication, permission, and configuration failures show bounded candidate-safe unavailable copy without a Retry action; temporary provider failures show Retry only when another attempt can reasonably succeed.
- [ ] No candidate-facing surface contains a raw provider body/message, provider or account-finance detail, SDK diagnostic, credential, or internal configuration value.
- [ ] A pre-connect voice failure offers safe recovery without mounting fake voice; a post-connect failure stops the live session once, preserves available local evidence, and presents an explicit partial-interview explanation without automatic reconnection.
- [ ] No provider failure changes `providerMode`, invokes a fake provider after a live attempt, or represents fabricated output as successful live output.
- [ ] In-memory counters are bounded and do not persist/log raw IPs.
- [ ] Maximum infrastructure/provider settings cap spend even if distributed abuse evades one instance's memory.
- [ ] No paid WAF/proxy/database/auth service has been added.
- [ ] Public copy and documentation describe protection and limitations honestly.

## Focused verification

- [ ] Run focused client/server Turnstile, limiter, capacity, and kill-switch tests with fakes/test keys.
- [ ] Simulate bounded OpenAI and ElevenLabs authentication, billing/credit, spend/usage-limit, rate/concurrency-limit, timeout, network, malformed-error-envelope, and `5xx` responses without paid calls; assert the expected safe copy, retryability, `Retry-After`, redaction, and provider call count.
- [ ] Exercise pre-connect SDK error and post-connect disconnect/error callbacks with deliberately technical synthetic messages; assert none reaches rendered copy, the live bridge unmounts once, partial evidence survives, and no fake bridge or synthetic success path starts.
- [ ] Assert provider call count/order for every rejection path.
- [ ] Inspect logs/storage/memory keys for tokens, raw IPs, cookies, or candidate content.
- [ ] Manually exercise one legitimate and one forced challenge/replay recovery on a non-production hostname.
- [ ] Review Cloud Run/provider cap configuration separately from code defaults.
- [ ] Confirm ElevenLabs included minutes/credits and OpenAI balance immediately before a paid test; allowances reduce actual cash spend but never increase the approved maximum number of runs.

## Commit boundary

Keep SP-022 reviewable as one logical change represented by `feat(security): gate anonymous paid demo usage`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Abuse protection contract](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#abuse-protection)
- [Paid-route REST security](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#12-rest-api-specification)
- [Cost controls](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#cost-controls)
- [Full-flow cost analysis and free allowances](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#13-elevenlabs--openai-research-and-cost-plan)
- [Honest limitation](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#honest-limitation)
- [Credential acquisition, fake mode, and account setup](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
