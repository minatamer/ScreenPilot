# SP-025A — Audit release-candidate code and ticket completion

Status: Repository audit and deterministic gate complete; deployment remains blocked on SP-025 owner/manual gates<br>
Milestone: Milestone 4 — public-demo hardening<br>
Last synchronized: 2026-09-24<br>
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

After SP-025 has established that the product works as intended, perform one
deliberate behavior-preserving quality and efficiency iteration across the
entire first-party codebase. Find and correct concrete redundancy, weak or
unclear structure, avoidable complexity, misplaced responsibility, missed
reuse, and structurally obvious waste while preserving the accepted product,
provider, privacy, and workflow behavior.

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
- Treat the SP-025-approved behavior as the baseline. Refactoring must preserve
  it; a functional difference is allowed only when the audit proves an existing
  defect, records the correction, and adds focused regression evidence.
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

- [x] Enumerate every required prior ticket through SP-025 from the canonical
  index, including A-suffixed tickets, and identify its dependency chain and
  associated implementation/documentation commits.
- [x] Read each ticket's acceptance criteria, focused verification,
  implementation evidence, deferrals, supersessions, and completion handoff;
  compare them with current code and Git history rather than commit subjects
  alone.
- [x] Reconcile every unchecked item. Mark nothing performed without evidence;
  every intentional deferral names its required destination ticket and owner-
  approved rationale, while every blocker names the exact missing condition.
- [x] Reconcile the ticket index, source of truth, operations guides, README,
  environment examples, and code comments with the actual release candidate.
- [x] Produce `docs/operations/release-candidate-audit.md` as the sanitized final
  ledger with one row per required prior ticket: status, commits, code/docs
  evidence, verification, deferred destination, blockers, and remaining limits.

### 2. Architecture, package, and workflow authority

- [x] Prove `frontend -> contracts <- backend`; reject application cross-
  imports, React/Next/Express/Node/provider/environment concerns in contracts,
  and application implementation leaked through public package exports.
- [x] Confirm the canonical demo reducer remains the only workflow-stage
  authority and no component/hook/server layer mirrors or bypasses stage state.
- [x] Confirm browser persistence uses an explicit allow-listed projection and
  no full runtime object, token, PDF/raw CV, audio, tentative caption, or
  provider payload can enter storage.
- [x] Confirm the backend remains stateless and has no repository/data-access
  layer, cache, queue, candidate registry, durable session, filesystem write, or
  persistence-shaped abstraction.
- [x] Confirm route handlers remain thin; shared Zod contracts validate every
  external boundary; provider SDK details remain behind typed adapters; config
  and provider implementations are injected without import-time side effects.

### 3. Whole-codebase behavior-preserving quality and efficiency iteration

- [x] Capture the exact SP-025 handed-off candidate and its deterministic
  baseline before refactoring. Define the externally visible workflow,
  provider-call, persistence, privacy, error, and accessibility behavior that
  must remain unchanged.
- [x] Review every first-party source, test, configuration, script, style, and
  documentation area—not only recently changed files—for concrete code-quality
  or efficiency findings. Exclude generated output, dependencies, ignored owner
  files, and evidence already assigned to manual/provider dashboards.

- [x] Search for duplicate components, schemas, constants, styles, error/loading
  patterns, provider calls, workflow transitions, role normalization, evidence
  validation, and storage projections; consolidate only genuinely shared
  responsibilities.
- [x] Simplify oversized or mixed-responsibility modules, functions, hooks, and
  components; improve naming, boundaries, composition, and data flow where the
  current structure makes correctness or maintenance harder to reason about.
- [x] Prefer existing primitives and small domain-owned shared modules. Extract
  reuse only when the shared contract is real; do not replace clear local code
  with an abstract framework or configurable catch-all merely to reduce line
  count.
- [x] Remove dead code, unused exports/imports/dependencies/assets, stale flags,
  unreachable branches, superseded implementations, debug routes/output,
  obsolete fixtures, and resolved/stale TODO/FIXME comments.
- [x] Confirm the removed timing benchmark left no fixed-count constants,
  minimum-sample or percentile-gate statuses, gate-only outlier/report branches,
  obsolete batch-form UI, compatibility exports, or quota-specific tests and
  fixtures. Retain only the bounded fake/live raw diagnostics behavior approved
  by the 2026-09-23 owner decision.
- [x] Audit unsafe casts, non-null assertions, swallowed/empty catches,
  log-and-continue state corruption, unhandled promises, ad hoc error response
  shapes, and vague public types; fix every material instance.
- [x] Review every dependency for an active owner/use, package-boundary fit,
  browser/server footprint, and duplication of platform or existing capability.
- [x] Review bundle-sensitive PDF/voice imports, provider context size, repeated
  parsing/serialization, and high-frequency transcript/insight paths for obvious
  waste. Improve measured or structurally evident inefficiency without adding
  speculative memoization, caching, persistence, dependencies, or abstractions.

### 4. Lifecycle, cancellation, and provider-call correctness

- [x] Audit cleanup for DOM/SDK listeners, timers, animation frames, media tracks,
  object URLs, Turnstile widgets/tokens, SDK subscriptions, voice sessions,
  retries, in-flight requests, and abort controllers on unmount, stage change,
  retry, Clear & exit, disconnect, and hard stop.
- [x] Trace abort propagation and stale-result ownership from browser actions
  through HTTP routes, use cases, and provider adapters; obsolete requests must
  not mutate canonical state or leak resources.
- [x] Prove one user action creates at most the documented provider operation,
  except for an explicitly bounded retry policy. Validation/auth/rate/non-
  retryable failures are never retried.
- [x] Confirm terminal events, duplicate/out-of-order callbacks, reconnect,
  summary retry, and partial-review transitions are idempotent and preserve the
  correct bounded local evidence.

### 5. Privacy, security, configuration, and deterministic tests

- [x] Inspect tracked files, Git diffs/history relevant to the candidate, logs,
  fixtures, generated artifacts, and documentation for secrets, usable keys,
  candidate content, provider payloads, transcripts, audio, account IDs, or
  secret-bearing screenshots. Use only synthetic fixtures.
- [x] Confirm committed `.env.example` files remain complete schemas with every
  credential and user-owned identifier blank; confirm ignored local files and
  cloud credentials cannot be tracked or enter build contexts without reading
  their contents.
- [x] Confirm provider secrets are backend-only; browser APIs use relative
  `/v1`; cookies/origins/CORS/CSP/no-store/log redaction/error mapping/body and
  output bounds match the source of truth.
- [x] Confirm role labels and all candidate/provider text are bounded untrusted
  data, role-neutral guardrails remain universal, and no prompt/content path can
  create profession-specific assessment, hiring judgment, or invented employer
  facts.
- [x] Confirm every automated test runner overrides its process to
  `PROVIDER_MODE=fake` and `PAID_DEMO_ENABLED=false` before imports, disables
  `.env.local`, denies unexpected network/provider access, and never targets a
  running local application.

### 6. Contracts, APIs, state, evidence, and operations consistency

- [x] Reconcile shared contracts with frontend/backend consumers, REST routes,
  public runtime configuration, grants, Turnstile actions, provider adapters,
  limits, timeouts, retry behavior, and stable API error envelopes.
- [x] Reconcile reducer transitions, persisted stages, refresh/recovery rules,
  transcript turn identity, final/tentative boundaries, insight provenance,
  correction history, missing evidence behavior, summary citations, and Clear
  session scrubbing.
- [x] Reconcile fake fixtures and provider configuration with the exact role-
  neutral policy, eight runtime variables, five client tools, published revision
  target, environment examples, operations runbooks, and source-of-truth text.
- [x] Confirm documentation does not describe removed behavior, stale commits,
  superseded role/catalogue assumptions, completed-but-unverified checks, or a
  deployment path inconsistent with the code.

### 7. Findings, fixes, and focused regression coverage

- [x] Maintain a finding ledger with severity, affected ticket/guardrail,
  evidence, chosen correction, focused verification, and disposition.
- [x] Resolve every substantiated finding with a clear maintenance, correctness,
  privacy, lifecycle, dependency, or efficiency benefit, including worthwhile
  low-severity cleanup. Reject subjective churn and record why any concrete
  finding is intentionally retained.
- [x] Fix every material finding within the owning module/ticket boundary;
  update contracts/source of truth/affected packets together when public
  behavior or architecture changes.
- [x] Add the smallest focused regression for every correctness, lifecycle,
  privacy, security, contract, or provider-call bug fixed.
- [x] Re-run the smallest affected checks after each correction and keep
  unrelated user work intact.

### 8. Complete deterministic final gate

- [x] Run formatting verification, repository lint, every package typecheck, all
  unit tests, and all production builds on the exact audited candidate.
- [x] Run the repository-approved dependency/security audit; triage every
  finding, fix actionable release issues, and document bounded exceptions with
  package/version/evidence rather than suppressing them silently.
- [x] Run architecture/dependency-direction validation, duplicate/dead-code and
  unused-dependency review, tracked-secret scanning, ignore/example validation,
  `git diff --check`, and a final Git-status scope review.
- [x] Prove the deterministic gate did not load ignored local environments,
  contact a live provider, consume credits, request microphone access, or
  connect to a running application.
- [x] Record exact commands, tool/runtime versions, pass/fail counts, build
  outputs, audit findings, and every check that remains blocked.

## Acceptance criteria

- [x] Every required pre-deployment ticket has a reconciled ledger entry and no
  unexplained unchecked requirement; every supersession, deferral, or blocker
  is explicit and evidence-linked.
- [x] The release candidate matches the canonical package direction,
  statelessness, privacy, role-neutrality, workflow authority, and provider
  boundaries.
- [x] No known material dead/duplicate/obsolete implementation, unsafe
  diagnostic, lifecycle leak, provider-call duplication, secret exposure,
  stale dependency, or contradictory documentation remains.
- [x] The owner-approved product behavior remains unchanged except for explicit,
  evidence-backed bug fixes; before/after regression evidence covers every
  refactored critical path and provider-operation boundary.
- [x] Every first-party code area received the documented quality/efficiency
  review, and the finding ledger distinguishes completed improvements from
  rejected speculative or purely stylistic churn.
- [x] Every material audit finding is fixed with focused regression coverage or
  remains an explicit deployment blocker.
- [x] Formatting, lint, all typechecks, unit tests, production builds,
  dependency/security audit, secret/diff checks, and architecture validations
  pass on the exact audited candidate.
- [x] The final audit ledger honestly records evidence, remaining limitations,
  and any user-only or externally blocked check without treating it as passed.
- [ ] SP-026 can deploy the exact audited candidate without an unresolved code-
  quality, architecture, privacy/security, lifecycle, documentation, or ticket-
  completion blocker.

## Focused verification

- [x] Run the pinned equivalents of `corepack pnpm format:check`, `corepack pnpm lint`,
  `corepack pnpm typecheck`, `corepack pnpm test:unit`, and
  `corepack pnpm build` with the repository's locked toolchain.
- [x] Run the package-manager dependency/security audit with production and
  development dependencies covered; retain the exact command/output summary in
  the audit ledger.
- [x] Run repository searches/validation for forbidden imports, provider/env
  concerns in contracts, duplicate provider operations, durable storage,
  unbounded candidate/provider data, debug output, TODO/FIXME, unsafe casts,
  ignored-secret tracking, and test-runner safety overrides.
- [x] Inspect `git status`, `git diff`, `git diff --check`, tracked/ignored file
  rules, and the final release-candidate diff without reading `.env.local`.
- [x] Re-run only manual/browser scenarios directly affected by an audit fix;
  otherwise reuse current SP-024/SP-025 evidence and make no paid call.

## Commit boundary

Keep SP-025A reviewable as one logical release-candidate audit, correction, and
evidence change represented by `SP-025A: audit release candidate`. Do not absorb
deployment, unrelated features, redesign, or optional automation. Do not stage,
commit, push, or rewrite history unless explicitly authorized.

## Implementation evidence (2026-09-24)

The sanitized per-ticket ledger, baseline, five findings and dispositions,
architecture/privacy/lifecycle review, exact deterministic commands and counts,
clean build-snapshot evidence, and remaining external blockers are recorded in
[`../operations/release-candidate-audit.md`](../operations/release-candidate-audit.md).
Repository-owned audit work is complete. The tree remains unstaged and
uncommitted; SP-025's owner/manual release matrix and final approval still block
SP-026 despite the green deterministic gate.

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
performed. Include the pre-refactor baseline, the behavior-preservation evidence,
and the disposition of every concrete whole-codebase quality/efficiency finding.
