# SP-009 — Build the backend foundation and conversation-first preparation

Status: Required  
Milestone: Milestone 1 — interview preparation paths  
Last synchronized: 2026-08-31  
Depends on: SP-003, SP-006, SP-007  
Suggested commit: `feat(backend): prepare conversation-first interviews`  
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Create the first complete Express 5 backend slice, public bootstrap, deterministic conversation-first preparation, signed grant boundary, and reusable safe provider infrastructure without persistence or paid preparation calls.

## Standalone implementation context

- The backend is `apps/backend`, an independently runnable Express 5 application on Node.js 24.
- Follow the repository backbone: `http` owns routes/middleware/mapping, `use-cases` owns orchestration, `providers` owns external SDK translation, `demo` owns catalogue/plan values, `security` owns grants/cookies, and `config` owns environment parsing.
- Transport concerns stay thin: route handlers validate/map requests while use cases, grants, and provider adapters remain independent of Express request/response objects.
- `app.ts` is the explicit composition root and application factory. It receives validated configuration plus fake/live implementations; `server.ts` only starts the listener and owns process-signal shutdown.
- Importing backend modules must not bind a port, read candidate content, or make a network call. Use cases do not import Express, `process.env`, or concrete provider SDK clients.
- `GET /health/live` proves the process is alive; `GET /health/ready` validates configuration without paid calls.
- `GET /v1/demo/bootstrap` returns public unnamed-employer context, two fixed vacancies, public limits, Turnstile public configuration, feature flags, and privacy version; it sets a short-lived signed HttpOnly content-free safety cookie.
- `POST /v1/interview/prepare` accepts only `entryMode: conversation_first`, `vacancyCatalogKey: demo-engineering`, and `clientRequestId`; it returns the server-owned deterministic plan and signed `interviewGrant` with no OpenAI/ElevenLabs call.
- The grant binds entry mode, catalogue, plan version/hash, anonymous-session correlation, and expiry. It contains no candidate facts, identity, transcript, or CV text.
- Implement the Turnstile Siteverify adapter here for reuse, but the free conversation-preparation route never invokes it.

## Manual credential gate

- No OpenAI or ElevenLabs key is needed because bootstrap and conversation-first preparation are free/deterministic.
- Real Siteverify work uses blank-template fields `TURNSTILE_SECRET_KEY=` and `TURNSTILE_ALLOWED_HOSTNAMES=`. Obtain the secret by creating a widget under **Cloudflare dashboard → Turnstile → Add widget**; keep it backend-only. Fake/test verification completes without a production widget.
- Grants/cookies use `INTERVIEW_GRANT_SIGNING_SECRET=` and `ANONYMOUS_COOKIE_SECRET=`. The user generates and fills two different values using the command in the parent credential guide; deterministic test values live only in test injection.
- If any field is blank, fake mode and all route/unit work continue, but live Siteverify/readiness remains unchecked. Before filling `apps/backend/.env.local`, verify it is ignored with `git check-ignore -v -- apps/backend/.env.local`.

## Scope boundaries

- Do not add a database, server session store, Redis, Prisma, file writes, queue, worker, or durable per-IP ledger.
- Do not call OpenAI or ElevenLabs during bootstrap or conversation-first preparation.
- Do not accept browser-supplied prompts, literal questions, provider IDs, model/voice IDs, tool definitions, vacancies, or company content.
- Do not log request bodies, cookies, tokens, raw IPs, CV text, or candidate values.
- Do not introduce a second backend framework.
- Do not add a repository/data-access abstraction for a stateless service, a global mutable service locator, or hidden singleton provider clients that tests must patch.

## Implementation checklist

- [ ] Create the Express application factory/composition root separately from the server listener and implement graceful shutdown.
- [ ] Remove the temporary backend `src/index.ts` when `src/app.ts` and `src/server.ts` become the real entry points.
- [ ] Place transport, use-case, provider, demo-content, security, and configuration modules in their Section 11 owning areas; do not introduce generic `services`, `helpers`, or `common` folders.
- [ ] Inject typed configuration, clock/ID/signing seams, and fake/live provider implementations into composition so route/use-case tests need no module-cache or global-environment mutation.
- [ ] Add Zod boundary middleware, Pino/`pino-http` with explicit redaction, Helmet, restricted CORS, bounded JSON parsing, cookie parsing, and Supertest.
- [ ] Implement generated request IDs, typed domain errors, one not-found handler, and one terminal JSON error mapper.
- [ ] Validate the proxy/origin configuration before trusting source information or secure cookies.
- [ ] Implement `GET /health/live` and `GET /health/ready` without provider spending.
- [ ] Implement `GET /v1/demo/bootstrap` and its content-free signed safety cookie.
- [ ] Implement the typed Turnstile Siteverify adapter with timeout, strict response parsing, secret redaction, hostname/action checks, and stable errors.
- [ ] Implement `POST /v1/interview/prepare` from the versioned server fixture with `Cache-Control: no-store`.
- [ ] Implement the shared signed `interviewGrant` signer/verifier and reject expiry, mutation, wrong mode/catalogue, and correlation mismatch.
- [ ] Return the stable API error envelope and required content-safe error codes.
- [ ] Add Supertest/unit coverage for middleware, deterministic output, cookie/grant behavior, expiry, invalid input, no provider calls, and no persistence.

## Acceptance criteria

- [ ] The backend boots, shuts down, and can be tested in process without binding a port.
- [ ] Importing app/use-case modules has no listener, filesystem, or network side effect, and tests can construct isolated app instances with explicit fakes.
- [ ] Bootstrap exposes only public configuration and sets no candidate content in its cookie.
- [ ] Conversation-first preparation completes deterministically and never invokes OpenAI, ElevenLabs, or Turnstile.
- [ ] Two identical valid requests use the same versioned plan semantics while receiving safely signed/expiring grants.
- [ ] Logs remain useful by route/status/duration/request ID without containing forbidden content.
- [ ] No persistent infrastructure or provider fallback exists.

## Focused verification

- [ ] Run focused backend typecheck and Supertest suites.
- [ ] Import the application factory in a test process and prove no port was opened and no provider was constructed/called until composition requests it.
- [ ] Inspect successful bootstrap/prepare responses, headers, cookie attributes, and the stable error envelope.
- [ ] Assert fake provider call counts remain zero for bootstrap/prepare.
- [ ] Tamper with and expire a grant; test origin, schema, body-limit, and proxy configuration failures.
- [ ] Search logs/test snapshots for candidate content, raw IPs, cookies, grants, and secrets.

## Commit boundary

Keep SP-009 reviewable as one logical change represented by `feat(backend): prepare conversation-first interviews`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Architecture, stack, and backend quality rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#11-frontendbackend-architecture)
- [Filename-level scaffold and target repository](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#filename-level-filesystem-blueprint)
- [Conversation-first stage contract](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#stage-2b--conversation-first-preparation)
- [REST API specification](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#12-rest-api-specification)
- [Deterministic plan and grant](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#deterministic-conversation-first-plan)
- [Credential acquisition and local-secret workflow](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)
- [Reliability and logs](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#17-reliability-errors-and-observability)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
