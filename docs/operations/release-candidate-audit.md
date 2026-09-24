# ScreenPilot release-candidate audit

Status: Repository audit and deterministic gate complete; deployment remains
blocked on SP-025 owner/manual gates  
Audit date: 2026-09-24  
Baseline Git state: `fe84ded` (`SP-025: reconcile manual release QA evidence`)  
Scope: tracked first-party repository content only; ignored `.env.local` files,
provider dashboards, microphones, running applications, and paid/live-provider
operations are excluded

## Release decision

This audit can close repository code and documentation findings, but it cannot
approve deployment while SP-025's owner/manual browser and device matrix remains
open. SP-026 must consume the exact post-audit worktree revision only after that
manual gate and the explicitly listed external checks are completed. No prior
ticket is treated as complete merely because it has a ticket-named commit.

## Baseline and preserved behavior

The audit started from clean `main` at `fe84ded`, six commits ahead of
`origin/main`. The baseline repository contained 341 tracked files. With Node
24.19.0 and pnpm 11.24.0, repository lint, all package typechecks, 25 backend
test files / 334 tests, 40 frontend test files / 295 tests, the contracts tests,
and every production build passed in explicit fake/paid-disabled mode. The
tracked-secret and browser-inline-style scans passed. Formatting failed only for
the two files recorded as pre-existing by SP-023:

- `apps/frontend/src/features/entry/illustrative-interview-preview.tsx`
- `apps/frontend/src/features/interview/voice-session-context.ts`

The owner-approved workflow, role-neutral policy, provider-operation counts,
allow-listed session projection, same-origin `/v1` browser API boundary,
stateless backend, error semantics, accessibility behavior, and fake/live
diagnostic distinction are the behavior-preservation boundary for this pass.

The host's default executable remains pnpm 11.19.0. Calling the pinned pnpm
11.24.0 CLI directly succeeds, but root scripts that recursively invoke the
literal `pnpm` command inherit the stale host executable in this Codex shell.
The audit therefore records the exact underlying workspace commands separately;
this is a host launcher condition, not a product or lockfile failure.

## Required-ticket reconciliation

“Complete” below means the ticket's repository-owned implementation and
deterministic evidence are complete. Manual, provider-dashboard, hardware, and
deployment work stays explicitly deferred even when the implementation is
complete.

| Ticket | Commit evidence | Reconciled state | Open destination or limit |
| --- | --- | --- | --- |
| SP-001 | `1b9e0b1` | Complete | None |
| SP-002 | `60241c4` | Complete | None |
| SP-003 | `e7e8a18`, `9f8d923` | Complete after F-01 | Blank-template regression is owned by SP-025A |
| SP-004 | `6f94d0a`, `d2a350c` | Complete | None |
| SP-005 | `24d256c`, `1a29875` | Complete | None |
| SP-006 | `c8bbaf2`, `12b870b` | Intentionally superseded in part | SP-010A replaced the fixed-vacancy model |
| SP-007 | `f890bfb`, `3053877` | Intentionally superseded in part | SP-010A replaced the fixed catalogue; the synthetic PDF fixture remains valid |
| SP-008 | `0b6819f`, `f856b9b` | Implementation complete | Native picker/error and heap/network inspection remain in SP-025's manual matrix |
| SP-009 | `db65b2c` | Intentionally superseded in part | SP-010A replaced fixed catalogue/grant semantics; backend foundation remains current |
| SP-010 | `744901e` | Implementation complete | Controlled live response evidence is consolidated under SP-021B/SP-025/SP-026 |
| SP-010A | `6febf01` | Complete | None |
| SP-011 | `a7813c0`, `a04e04a`, `d20a525` | Complete | None |
| SP-011A | `283f104`, `d20a525` | Complete | Its stale final automated checkbox is reconciled by this audit's full gate |
| SP-012 | `6be106a` | Implementation complete | Alternate PDFs, browser challenge failures, and navigation remain in SP-025 |
| SP-013 | `d5338cb` | Implementation complete | Real permission allow/deny/revoke/device cases remain in SP-025 |
| SP-014 | `9075c7d` | Implementation complete | Provider-dashboard and real connection evidence moved to SP-021B/SP-026 |
| SP-014A | `b9186ac`, `ff8760d` | Complete after F-01 | Local-only hostname belongs in ignored local configuration, not the committed template |
| SP-015 | `a9d3a17` | Implementation complete | Active-session manual interaction evidence moved to SP-021B/SP-025 |
| SP-015A | `cab2990` | Implementation complete | Consolidated responsive/accessibility approval is owned by SP-024/SP-025 |
| SP-016 | `13fc434` | Implementation complete | Live/reduced-motion visual evidence moved to SP-021B/SP-025 |
| SP-016A | `08ff846` | Complete | Real hardware/live-provider work was deliberately excluded |
| SP-017 | `e85e64f` | Policy complete | Remaining read-aloud/live observations moved to SP-021B/SP-025 |
| SP-018 | `f847008` | Implementation complete | Two-flow live observations moved to SP-021B/SP-026 |
| SP-018A | `3add8d1` | Intentionally finalized as a bounded smoke | Its detailed unchecked ledger was transferred to SP-021B; it is not independent release acceptance |
| SP-019 | `e5a1323` | Implementation complete | Screen-reader/zoom/device evidence remains in SP-025 |
| SP-020 | `055d80b` | Complete | None |
| SP-021 | `7ab7dcd`, `a19f344` | Implementation complete | Broad review/retry/manual matrix remains in SP-025 |
| SP-021A | `9ea7702` | Complete | Conversation-first production observation remains an SP-026 acceptance flow |
| SP-021B | `c6a670a`, `9279c3` | Corrected implementation and one CV-assisted live flow complete | Uncorrelated conversation-first recollection, provider evidence, and remaining failure/privacy/cost gates are retained by SP-025/SP-026 |
| SP-022 | `ad44ab2` | Complete | Production caps/configuration are applied by SP-026 |
| SP-023 | `59441b4` | Implementation complete | Owner must verify OpenAI input/output sharing is disabled before real data or public use |
| SP-024 | `8136bac` | Approved implementation complete | Cross-browser/device/performance manual release evidence remains in SP-025 |
| SP-025 | `fe84ded` | Evidence reconciliation complete; release approval blocked | Free/manual matrix, final owner approval, and safety-state confirmation remain open; no extra local paid run is authorized |

## Architecture and whole-codebase review

- Dependency direction passes: no frontend/backend application cross-imports
  were found, and contracts contain no React, Next, Express, Node, provider, DOM,
  or environment dependency. ESLint enforces package boundaries and public
  contract exports.
- `demo-session.reducer.ts` remains the sole workflow-stage transition
  authority. Components dispatch typed events rather than maintaining a second
  stage machine.
- Persistence is confined to `sessionStorage` through
  `projectPersistedDemoSession`; the Zod projection bounds persisted fields and
  excludes raw PDF bytes/text, tentative captions, provider payloads, audio,
  Turnstile tokens, and runtime-only state. Clear removes every
  `screenpilot:*` key.
- The backend creates no repository/data-access layer, database, filesystem
  candidate write, durable session, analytics payload, or queue. Bounded
  process-local admission counters contain no candidate content.
- External JSON boundaries use shared Zod contracts. Provider HTTP mechanics
  stay behind typed OpenAI, ElevenLabs, and Turnstile adapters with explicit
  response-size limits, timeouts, abort signals, safe failure classification,
  and no automatic provider retry.
- Browser API requests are relative `/v1`, use `no-store`, and propagate abort
  signals. PDF.js loads only on CV extraction and ElevenLabs loads only at the
  voice stage. Generated worklets are build-owned artifacts from pinned package
  sources.
- DOM/SDK listeners, timers, animation frames, requests, Turnstile widgets,
  microphone tracks, and voice sessions have explicit cleanup paths backed by
  focused tests. Terminal/duplicate/out-of-order events and summary retries are
  reducer-owned and idempotent.
- All declared production dependencies have an active source or build-script
  owner. Strict TypeScript unused checks and zero-warning ESLint found no unused
  imports/locals; the public asset scan found no orphaned tracked asset.
- Searches found no stale TODO/FIXME/HACK/debugger, unsafe suppression, empty
  catch, fixed-sample release verdict, obsolete batch UI, or quota-based timing
  gate. The retained p50/p95 implementation is descriptive, bounded raw
  diagnostics approved on 2026-09-23, not a release decision.
- The two browser `console.error` sites emit only fixed operation/category and
  bounded HTTP/error metadata; candidate/provider bodies and thrown objects are
  deliberately excluded.
- `globals.css` and the canonical reducer are large but each retains one
  coherent responsibility with extensive regression coverage. Splitting them
  during the final audit would create high cascade/state-machine risk without a
  concrete correctness or efficiency benefit, so that speculative churn is
  rejected.

## Finding and implementation plan

This plan was fixed before application edits.

| ID | Severity | Evidence and affected guardrail | Exact correction | Before → after | Risk and smallest verification |
| --- | --- | --- | --- | --- | --- |
| F-01 | Medium | `apps/backend/.env.example` sets `TURNSTILE_ALLOWED_HOSTNAMES=localhost`, contradicting SP-003, SP-014A, the source-of-truth blank template, and SP-025A privacy acceptance | Blank that assignment; extend `scripts/check-tracked-secrets.mjs` with an `.env.example`-specific allow-list of owner-supplied fields that must be empty | A committed owner-supplied identifier is populated → all credentials/owner identifiers are blank and future drift fails the security scan | Low; run the current/history secret scans and inspect both examples/ignore rules without opening `.env.local` |
| F-02 | Low | `cv-analyze.routes.ts`, `voice-token.routes.ts`, and `interview-summary.routes.ts` duplicate identical request/response abort-listener setup and removal | Add domain-owned `withRequestAbortSignal` in HTTP middleware and use it from all three routes; add focused lifecycle tests | Three hand-maintained cancellation copies → one tested lifecycle contract while use cases still receive one signal | Medium because cancellation protects provider spend; run the focused helper and route suites, backend typecheck/lint/build, then all tests |
| F-03 | Low | Prettier fails only for `illustrative-interview-preview.tsx` and `voice-session-context.ts`, already recorded by SP-023 | Apply repository Prettier to exactly those files | Known committed format drift → repository format gate clean | Very low; run format check plus frontend lint/typecheck/tests/build |
| F-04 | Low | Ticket/SOT status does not yet record the final audit and SP-011A still shows its broad automated gate unchecked | Update SP-011A, SP-025, SP-025A, the SOT, and this ledger only where current deterministic evidence proves completion; preserve every external/manual checkbox | Stale or ambiguous audit evidence → exact repository work is closed while manual/provider gates remain visibly open | Low; inspect documentation diff, format check, and `git diff --check` |
| F-05 | Low | The final unsafe-cast search finds an `as unknown as Animation` stub in `insight-board.test.tsx`; production uses only its `cancel` member | Let the Vitest stub return its minimal structural runtime object without asserting the full browser `Animation` interface | A double assertion hides the stub shape → the test expresses only the behavior it supplies | Very low; run the focused Insight Board test, frontend lint/typecheck, and the final unsafe-cast search |

## External blockers retained

- SP-025's complete browser/device/zoom/motion/permission/error matrix and final
  owner approval are not performed by this code audit.
- OpenAI input/output sharing must be confirmed disabled before any real-person
  data or public use.
- Production infrastructure, provider configuration, and the two definitive
  post-deployment synthetic flows belong to SP-026.
- No manual, credentialed, paid, dashboard, microphone, or live-provider result
  is inferred from deterministic tests.

## Finding disposition

- **F-01 resolved:** the committed hostname assignment is blank. The tracked
  secret scan now treats the nine current credentials and owner-supplied
  identifiers as required-empty in every `.env.example` file. Current and
  reachable-history scans pass; ignored local files were not opened.
- **F-02 resolved:** `withRequestAbortSignal` owns abort-controller creation,
  request/response listeners, incomplete-response behavior, and cleanup for all
  three paid HTTP routes. Three focused lifecycle tests and the existing 47
  affected route tests pass.
- **F-03 resolved:** both pre-existing format drifts were normalized and the
  repository format check passes.
- **F-04 resolved for repository-owned evidence:** SP-011A, SP-025, SP-025A,
  this ledger, and the source of truth record the current deterministic result.
  Manual/provider items deliberately remain unchecked.
- **F-05 resolved:** the Insight Board animation stub no longer asserts a full
  browser `Animation`; its five focused tests, frontend typecheck, and the final
  unsafe-cast search pass.

## Final verification

Runtime: Node 24.19.0 and pnpm 11.24.0. Every test process explicitly used
`PROVIDER_MODE=fake` and `PAID_DEMO_ENABLED=false`; all Vitest configurations
also set those values, use `envDir: false`, and deny unexpected network access.

- Repository Prettier check: passed.
- Repository zero-warning ESLint: passed. Its first post-change run caught three
  unnecessary `async` markers in the new test; the corrected focused lint and
  final repository lint pass.
- Package typechecks: contracts, backend, and frontend passed; Next route types
  generated successfully.
- Unit tests: contracts 6 files / 50 tests, backend 26 files / 337 tests, and
  frontend 40 files / 295 tests passed—72 files / 682 tests total.
- Focused regressions: abort helper plus three route suites passed 4 files / 50
  tests; the helper alone passed 3 tests; Insight Board passed 5 tests.
- Production builds: contracts and backend passed. The frontend passed Next
  16.3.3's webpack production builder and emitted `/`, `/_not-found`, `/demo`,
  and `/icon.svg`. The build snapshot contained 344 Git-visible files and zero
  `.env.local` files. Turbopack's known refusal to follow dependency junctions
  outside the isolated filesystem root was bypassed with the supported
  `--webpack` builder, matching the SP-016A verification method.
- Production dependency audit: `No known vulnerabilities found`.
- Security: current and all reachable-history tracked-secret scans passed over
  344 current files; the browser inline-style scan passed over 87 source files.
- Architecture/static review: zero application cross-imports, zero forbidden
  contract imports/globals, zero durable backend storage concerns, zero stale
  TODO/FIXME/HACK/debugger/type-suppression/double-assertion markers, all three
  test configurations fake/paid-disabled with environment loading disabled,
  and both local environment paths confirmed ignored and untracked.
- `git diff --check`, final format verification, and final scope/status review
  pass after the documentation update.

No browser/manual scenario was repeated because every correction is
configuration, lifecycle-structure, formatting, test, or documentation only;
the existing route/component behavior is covered by focused and complete
deterministic suites. No running application, microphone, provider dashboard,
`.env.local`, live provider, or paid operation was used.

The exact audited state is baseline commit `fe84ded` plus the unstaged SP-025A
diff listed by the final Git-status review. SP-026 must use the eventual commit
containing exactly that reviewed diff; its commit hash cannot be recorded until
the owner separately authorizes a commit. Repository-owned SP-025A work is
complete, but SP-025's manual matrix and final owner release-candidate approval
remain deployment blockers.
