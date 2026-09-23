# SP-025A — Audit release-candidate code and ticket completion

Status: Required final pre-deployment audit<br>
Milestone: Milestone 4 — public-demo hardening<br>
Last synchronized: 2026-09-23<br>
Depends on: SP-025<br>
Suggested commit: `SP-025A: audit release candidate`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)<br>
Ticket index: [`README.md`](README.md)

---

## Objective

Perform a repository-wide final revision of the exact release candidate before
deployment. Reconcile every required prior ticket against its acceptance
criteria, implementation evidence, deferred work, dependencies, Git history,
the current code, and the authoritative source of truth; fix every material
code-quality, architecture, documentation, lifecycle, privacy, security, or
incomplete-ticket issue found.

This is the final code-and-evidence audit. It is not another product redesign,
responsive matrix, provider smoke, or manual release-QA pass.

## Standalone implementation context

- A ticket-named commit is evidence that work occurred, not proof that the
  ticket is complete. Read the packet, its current checklist/evidence, relevant
  commits, and the implementation before assigning a status.
- Required prior tickets may be classified only as **complete**,
  **intentionally superseded**, **explicitly deferred**, or **blocked**. Every
  supersession/deferral names the authoritative replacement/destination and the
  owner-approved rationale. Unperformed checks stay unchecked.
- SP-024 owns the complete layout/device/accessibility/performance pass. SP-025
  owns the focused manual product matrix and current live-evidence approval.
  Re-run only the smallest UI/manual scenario needed to validate an audit fix.
- SP-026 may deploy only the exact commit/worktree state that passes this audit.
  Any material change after SP-025A invalidates the affected audit evidence and
  requires the smallest relevant re-audit before deployment.
- Preserve the fixed dependency direction:
  `apps/frontend -> packages/contracts <- apps/backend`. Applications never
  import one another, and contracts remain browser-safe.
- Preserve statelessness and the privacy boundary: no database, ORM, candidate
  registry, durable server session, filesystem cache, transcript/audio/PDF
  persistence, analytics payload, or hidden storage abstraction.
- Automated tests remain isolated from owner runtime settings and explicitly
  force `PROVIDER_MODE=fake` and `PAID_DEMO_ENABLED=false` before test modules
  load. They never read `.env.local` or connect to a running app/provider.

## Scope boundaries

- Do not add unrelated features, redesign the product, deploy, purchase
  infrastructure, open provider dashboards, or make paid-provider calls.
- Do not duplicate SP-024's complete layout/device pass or SP-025's full manual
  matrix except to validate a specific audit correction.
- Do not rewrite Git history, stage, commit, or push unless explicitly
  authorized.
- Do not weaken an acceptance criterion to make the ledger green. Record an
  unresolved blocker or obtain an explicit owner scope decision.
- Do not read ignored `.env.local` files. Audit the committed blank examples,
  ignore rules, tracked files, configuration boundaries, and tests instead.
- Do not perform speculative refactors. Change code only for a concrete
  architecture, correctness, privacy, security, lifecycle, duplication,
  maintainability, dependency, performance, or documentation finding.

## Audit checklist

### 1. Ticket, documentation, and Git reconciliation

- [ ] Enumerate every required prior ticket through SP-025 from the canonical
  index, including A-suffixed tickets, and identify its dependency chain and
  associated implementation/documentation commits.
- [ ] Read each ticket's acceptance criteria, focused verification,
  implementation evidence, deferrals, supersessions, and completion handoff;
  compare them with current code and Git history rather than commit subjects
  alone.
- [ ] Reconcile every unchecked item. Mark nothing performed without evidence;
  every intentional deferral names its required destination ticket and owner-
  approved rationale, while every blocker names the exact missing condition.
- [ ] Reconcile the ticket index, source of truth, operations guides, README,
  environment examples, and code comments with the actual release candidate.
- [ ] Produce `docs/operations/release-candidate-audit.md` as the sanitized final
  ledger with one row per required prior ticket: status, commits, code/docs
  evidence, verification, deferred destination, blockers, and remaining limits.

### 2. Architecture, package, and workflow authority

- [ ] Prove `frontend -> contracts <- backend`; reject application cross-
  imports, React/Next/Express/Node/provider/environment concerns in contracts,
  and application implementation leaked through public package exports.
- [ ] Confirm the canonical demo reducer remains the only workflow-stage
  authority and no component/hook/server layer mirrors or bypasses stage state.
- [ ] Confirm browser persistence uses an explicit allow-listed projection and
  no full runtime object, token, PDF/raw CV, audio, tentative caption, or
  provider payload can enter storage.
- [ ] Confirm the backend remains stateless and has no repository/data-access
  layer, cache, queue, candidate registry, durable session, filesystem write, or
  persistence-shaped abstraction.
- [ ] Confirm route handlers remain thin; shared Zod contracts validate every
  external boundary; provider SDK details remain behind typed adapters; config
  and provider implementations are injected without import-time side effects.

### 3. Duplication, dead code, dependencies, and maintainability

- [ ] Search for duplicate components, schemas, constants, styles, error/loading
  patterns, provider calls, workflow transitions, role normalization, evidence
  validation, and storage projections; consolidate only genuinely shared
  responsibilities.
- [ ] Remove dead code, unused exports/imports/dependencies/assets, stale flags,
  unreachable branches, superseded implementations, debug routes/output,
  obsolete fixtures, and resolved/stale TODO/FIXME comments.
- [ ] Confirm the removed timing benchmark left no fixed-count constants,
  minimum-sample or percentile-gate statuses, gate-only outlier/report branches,
  obsolete batch-form UI, compatibility exports, or quota-specific tests and
  fixtures. Retain only the bounded fake/live raw diagnostics behavior approved
  by the 2026-09-23 owner decision.
- [ ] Audit unsafe casts, non-null assertions, swallowed/empty catches,
  log-and-continue state corruption, unhandled promises, ad hoc error response
  shapes, and vague public types; fix every material instance.
- [ ] Review every dependency for an active owner/use, package-boundary fit,
  browser/server footprint, and duplication of platform or existing capability.
- [ ] Review bundle-sensitive PDF/voice imports, provider context size, repeated
  parsing/serialization, and high-frequency transcript/insight paths for obvious
  waste without adding speculative memoization or abstractions.

### 4. Lifecycle, cancellation, and provider-call correctness

- [ ] Audit cleanup for DOM/SDK listeners, timers, animation frames, media tracks,
  object URLs, Turnstile widgets/tokens, SDK subscriptions, voice sessions,
  retries, in-flight requests, and abort controllers on unmount, stage change,
  retry, Clear & exit, disconnect, and hard stop.
- [ ] Trace abort propagation and stale-result ownership from browser actions
  through HTTP routes, use cases, and provider adapters; obsolete requests must
  not mutate canonical state or leak resources.
- [ ] Prove one user action creates at most the documented provider operation,
  except for an explicitly bounded retry policy. Validation/auth/rate/non-
  retryable failures are never retried.
- [ ] Confirm terminal events, duplicate/out-of-order callbacks, reconnect,
  summary retry, and partial-review transitions are idempotent and preserve the
  correct bounded local evidence.

### 5. Privacy, security, configuration, and deterministic tests

- [ ] Inspect tracked files, Git diffs/history relevant to the candidate, logs,
  fixtures, generated artifacts, and documentation for secrets, usable keys,
  candidate content, provider payloads, transcripts, audio, account IDs, or
  secret-bearing screenshots. Use only synthetic fixtures.
- [ ] Confirm committed `.env.example` files remain complete schemas with every
  credential and user-owned identifier blank; confirm ignored local files and
  cloud credentials cannot be tracked or enter build contexts without reading
  their contents.
- [ ] Confirm provider secrets are backend-only; browser APIs use relative
  `/v1`; cookies/origins/CORS/CSP/no-store/log redaction/error mapping/body and
  output bounds match the source of truth.
- [ ] Confirm role labels and all candidate/provider text are bounded untrusted
  data, role-neutral guardrails remain universal, and no prompt/content path can
  create profession-specific assessment, hiring judgment, or invented employer
  facts.
- [ ] Confirm every automated test runner overrides its process to
  `PROVIDER_MODE=fake` and `PAID_DEMO_ENABLED=false` before imports, disables
  `.env.local`, denies unexpected network/provider access, and never targets a
  running local application.

### 6. Contracts, APIs, state, evidence, and operations consistency

- [ ] Reconcile shared contracts with frontend/backend consumers, REST routes,
  public runtime configuration, grants, Turnstile actions, provider adapters,
  limits, timeouts, retry behavior, and stable API error envelopes.
- [ ] Reconcile reducer transitions, persisted stages, refresh/recovery rules,
  transcript turn identity, final/tentative boundaries, insight provenance,
  correction history, missing evidence behavior, summary citations, and Clear
  session scrubbing.
- [ ] Reconcile fake fixtures and provider configuration with the exact role-
  neutral policy, eight runtime variables, five client tools, published revision
  target, environment examples, operations runbooks, and source-of-truth text.
- [ ] Confirm documentation does not describe removed behavior, stale commits,
  superseded role/catalogue assumptions, completed-but-unverified checks, or a
  deployment path inconsistent with the code.

### 7. Findings, fixes, and focused regression coverage

- [ ] Maintain a finding ledger with severity, affected ticket/guardrail,
  evidence, chosen correction, focused verification, and disposition.
- [ ] Fix every material finding within the owning module/ticket boundary;
  update contracts/source of truth/affected packets together when public
  behavior or architecture changes.
- [ ] Add the smallest focused regression for every correctness, lifecycle,
  privacy, security, contract, or provider-call bug fixed.
- [ ] Re-run the smallest affected checks after each correction and keep
  unrelated user work intact.

### 8. Complete deterministic final gate

- [ ] Run formatting verification, repository lint, every package typecheck, all
  unit tests, and all production builds on the exact audited candidate.
- [ ] Run the repository-approved dependency/security audit; triage every
  finding, fix actionable release issues, and document bounded exceptions with
  package/version/evidence rather than suppressing them silently.
- [ ] Run architecture/dependency-direction validation, duplicate/dead-code and
  unused-dependency review, tracked-secret scanning, ignore/example validation,
  `git diff --check`, and a final Git-status scope review.
- [ ] Prove the deterministic gate did not load ignored local environments,
  contact a live provider, consume credits, request microphone access, or
  connect to a running application.
- [ ] Record exact commands, tool/runtime versions, pass/fail counts, build
  outputs, audit findings, and every check that remains blocked.

## Acceptance criteria

- [ ] Every required pre-deployment ticket has a reconciled ledger entry and no
  unexplained unchecked requirement; every supersession, deferral, or blocker
  is explicit and evidence-linked.
- [ ] The release candidate matches the canonical package direction,
  statelessness, privacy, role-neutrality, workflow authority, and provider
  boundaries.
- [ ] No known material dead/duplicate/obsolete implementation, unsafe
  diagnostic, lifecycle leak, provider-call duplication, secret exposure,
  stale dependency, or contradictory documentation remains.
- [ ] Every material audit finding is fixed with focused regression coverage or
  remains an explicit deployment blocker.
- [ ] Formatting, lint, all typechecks, unit tests, production builds,
  dependency/security audit, secret/diff checks, and architecture validations
  pass on the exact audited candidate.
- [ ] The final audit ledger honestly records evidence, remaining limitations,
  and any user-only or externally blocked check without treating it as passed.
- [ ] SP-026 can deploy the exact audited candidate without an unresolved code-
  quality, architecture, privacy/security, lifecycle, documentation, or ticket-
  completion blocker.

## Focused verification

- [ ] Run `corepack pnpm format:check`, `corepack pnpm lint`,
  `corepack pnpm typecheck`, `corepack pnpm test:unit`, and
  `corepack pnpm build` with the repository's locked toolchain.
- [ ] Run the package-manager dependency/security audit with production and
  development dependencies covered; retain the exact command/output summary in
  the audit ledger.
- [ ] Run repository searches/validation for forbidden imports, provider/env
  concerns in contracts, duplicate provider operations, durable storage,
  unbounded candidate/provider data, debug output, TODO/FIXME, unsafe casts,
  ignored-secret tracking, and test-runner safety overrides.
- [ ] Inspect `git status`, `git diff`, `git diff --check`, tracked/ignored file
  rules, and the final release-candidate diff without reading `.env.local`.
- [ ] Re-run only manual/browser scenarios directly affected by an audit fix;
  otherwise reuse current SP-024/SP-025 evidence and make no paid call.

## Commit boundary

Keep SP-025A reviewable as one logical release-candidate audit, correction, and
evidence change represented by `SP-025A: audit release candidate`. Do not absorb
deployment, unrelated features, redesign, or optional automation. Do not stage,
commit, push, or rewrite history unless explicitly authorized.

## Precision references

- [Repository-wide quality instructions](../../AGENTS.md)
- [Authoritative source of truth](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)
- [Ordered ticket index](README.md)
- [Lean verification strategy](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#18-lean-verification-strategy)
- [Definition of done](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#20-definition-of-done)
- [Architecture and filesystem blueprint](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#11-frontendbackend-architecture)
- [Security, privacy, and public-demo controls](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#16-security-privacy-and-public-demo-controls)

## Completion handoff

Report the final ledger path, every material finding and correction, changed
files, focused regressions, complete deterministic gate, dependency/security
audit, architecture/secret/diff checks, and every remaining limitation or
blocker. Identify the exact audited Git/worktree state SP-026 may deploy. Never
claim a manual, live, credentialed, or externally blocked check that was not
performed.
