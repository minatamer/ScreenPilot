# SP-022 — Add public abuse and spend controls

Status: Required  
Milestone: Milestone 4 — public-demo hardening  
Last synchronized: 2026-08-31  
Depends on: SP-003, SP-009, SP-010, SP-014, SP-020, SP-021  
Suggested commit: `feat(security): gate anonymous paid demo usage`  
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
- Do not make automated default CI solve production Turnstile or call paid providers.

## Implementation checklist

- [ ] Audit the shared managed Turnstile client on all three paid actions for accessible interaction-only rendering, memory-only tokens, explicit reset, and safe state preservation.
- [ ] Audit Siteverify on all three routes for server-only secret, bounded timeout, strict response schema, expected hostname/action, single-use/expiry handling, stable errors, and redacted logs.
- [ ] Enforce fail-closed provider ordering and assert zero paid calls for all pre-provider failures.
- [ ] Implement bounded per-route/source/anonymous-cookie TTL memory limits using only a validated proxy chain and capped memory.
- [ ] Apply tighter voice-token limits and proportionate CV/summary limits; separately rate-limit bootstrap/preparation.
- [ ] Add body/time limits, paid-demo kill switch, capacity checks, and safe `Retry-After` errors.
- [ ] Configure Cloud Run max instances/concurrency and provider account concurrency/spend alerts/caps.
- [ ] Reserve $0.80 per planned standard live acceptance flow, or $1.40 only when burst is deliberately enabled; set the user-approved total test budget/caps before changing `PAID_DEMO_ENABLED` from `false`.
- [ ] Ensure rate/capacity errors identify the unavailable action without exposing internals or faking a result.
- [ ] Document the exact $0 Turnstile role, limitations, no-proxy design, and non-durable enforcement.
- [ ] Test success, missing, invalid, expired, replayed, wrong-hostname, wrong-action, Siteverify timeout, route/source/cookie limits, memory eviction, capacity, provider cap, and kill switch.

## Acceptance criteria

- [ ] Every paid provider route fails before provider invocation when Turnstile or another precondition fails.
- [ ] A valid visitor can recover with a fresh challenge without losing extracted CV text, prepared plan, transcript, or insights as appropriate.
- [ ] In-memory counters are bounded and do not persist/log raw IPs.
- [ ] Maximum infrastructure/provider settings cap spend even if distributed abuse evades one instance's memory.
- [ ] No paid WAF/proxy/database/auth service has been added.
- [ ] Public copy and documentation describe protection and limitations honestly.

## Focused verification

- [ ] Run focused client/server Turnstile, limiter, capacity, and kill-switch tests with fakes/test keys.
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
