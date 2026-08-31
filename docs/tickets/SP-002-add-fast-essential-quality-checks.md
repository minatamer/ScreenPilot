# SP-002 — Add fast essential quality checks

Status: Required  
Milestone: Milestone 0 — repository and visual foundations  
Last synchronized: 2026-08-31  
Depends on: SP-001  
Suggested commit: `chore(quality): add fast essential checks`  
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Provide fast, focused linting, formatting, type, unit-test, and build gates that can run on ordinary tickets without waiting for browser or AI suites.

## Standalone implementation context

- The user prefers frequent manual testing and does not want every ticket blocked by Playwright or a large test folder.
- This ticket owns the quick default quality layer and the initial GitHub Actions file.
- The single CI/CD file is `.github/workflows/ci.yml`. It starts with one unpaid `quality` job here and is extended—not replaced—by SP-026.
- Default checks must be incapable of spending OpenAI or ElevenLabs credits.
- Tests are added selectively for error-prone logic; the complete fast gate runs at milestone/release boundaries rather than after every tiny edit.
- Unit tests live beside their owning source modules. The root `tests/fixtures` tree is only for reusable synthetic inputs; it is not a parallel test/source architecture.
- This ticket turns the repository dependency direction into an automated rule: applications may consume declared `@screenpilot/contracts` exports, contracts consume neither application, and applications never consume each other.
- The owned configuration filenames are root `eslint.config.mjs`, `prettier.config.mjs`, `.prettierignore`, `.github/workflows/ci.yml`, one `vitest.config.ts` in each workspace, and `apps/frontend/src/test/setup.ts` for browser-component test setup.

## Scope boundaries

- Do not add Playwright, visual regression, full integration environments, live AI evals, deployment jobs, Google Cloud credentials, or provider secrets.
- Do not create a second workflow file for deployment.
- Do not make formatting or broad test runs unexpectedly mutate files in CI.
- Do not weaken strict TypeScript or unsafe-value checks to make an empty scaffold pass.
- Do not permit deep imports into another package's `src`, aliases that escape an application, browser imports of Node-only modules, or backend imports of frontend code.
- Do not create a root catch-all test directory for unit tests or a custom dependency-boundary framework when ESLint/package exports can enforce the rule.

## Implementation checklist

- [ ] Configure ESLint and the chosen deterministic formatter for all packages.
- [ ] Create the exact quality/configuration filenames assigned to SP-002 in the parent filesystem blueprint; do not scatter per-folder lint/format configs.
- [ ] Enable strict unsafe-type and import/boundary rules appropriate to TypeScript, React, and Node.
- [ ] Enforce `frontend -> contracts <- backend`, declared contract subpath exports, application-local aliases, and browser/server environment boundaries.
- [ ] Configure Vitest for small package/file-level unit tests with deterministic defaults.
- [ ] Co-locate representative unit tests with their owning modules and document that root `tests/fixtures` contains shared inputs only.
- [ ] Add documented per-package targeted commands plus root `lint`, `format:check`, `test:unit`, and `verify:quick` commands; every command must execute a real check.
- [ ] Create `.github/workflows/ci.yml` for pull requests and pushes to `main` with a `quality` job only.
- [ ] Pin or lock the Node.js/pnpm setup, use `pnpm install --frozen-lockfile`, and cache the pnpm store safely.
- [ ] Run lint, typecheck, focused unit tests, and build in CI without Playwright.
- [ ] Give CI read-only repository permissions, no deployment identity, and no provider secrets.
- [ ] Document the exact named `quality` status check expected by branch protection.

## Acceptance criteria

- [ ] Each package can run its smallest relevant check independently.
- [ ] `verify:quick` runs format checking, lint, typecheck, unit tests, and build as the complete unpaid fast gate and has a stable exit code.
- [ ] A temporary forbidden app-to-app import, contracts-to-app import, package-source deep import, and Node-only frontend import each fail the relevant automated check.
- [ ] Pull requests and `main` pushes run the same `quality` job.
- [ ] No code path in default CI can instantiate a live OpenAI, ElevenLabs, or production Turnstile call.
- [ ] No E2E, visual snapshot, AI persona, deploy, or cloud-auth job exists yet.

## Focused verification

- [ ] Run each targeted command once against its owning package.
- [ ] Run `verify:quick` once.
- [ ] Prove the boundary rules with temporary failing imports, then remove those probes.
- [ ] Validate the workflow syntax and inspect its permissions, events, cache key, and frozen install.
- [ ] Temporarily omit any provider environment values and confirm the quality gate still succeeds using no paid adapter.

## Commit boundary

Keep SP-002 reviewable as one logical change represented by `chore(quality): add fast essential checks`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Lean verification strategy](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#18-lean-verification-strategy)
- [Unified GitHub Actions pipeline](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#unified-github-actions--google-cloud-pipeline)
- [Ticket rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#ticket-rules)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
