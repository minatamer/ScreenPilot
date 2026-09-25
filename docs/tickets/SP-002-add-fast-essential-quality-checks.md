# SP-002 — Add fast essential quality checks

Status: Required  
Implementation state: Completed, reviewed, revised, and verified; committed as `60241c4`

Milestone: Milestone 0 — repository and visual foundations  
Last synchronized: 2026-09-08<br>
Depends on: SP-001  
Suggested commit: `SP-002: add fast essential quality checks`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Provide fast, focused linting, formatting, type, unit-test, and build gates that can run on ordinary tickets without waiting for browser or AI suites.

## Standalone implementation context

- The user prefers frequent manual testing and does not want every ticket blocked by Playwright or a large test folder.
- This ticket owns the quick default quality layer and the initial GitHub Actions file.
- The single CI file is `.github/workflows/ci.yml`. It contains the unpaid `quality` job and remains quality-only; SP-026 deploys manually from the owner's authenticated laptop.
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

- [x] Configure ESLint and the chosen deterministic formatter for all packages.
- [x] Create the exact quality/configuration filenames assigned to SP-002 in the parent filesystem blueprint; do not scatter per-folder lint/format configs.
- [x] Enable strict unsafe-type and import/boundary rules appropriate to TypeScript, React, and Node.
- [x] Enforce `frontend -> contracts <- backend`, declared contract subpath exports, application-local aliases, and browser/server environment boundaries.
- [x] Configure Vitest for small package/file-level unit tests with deterministic defaults.
- [x] Co-locate representative unit tests with their owning modules and document that root `tests/fixtures` contains shared inputs only.
- [x] Add documented per-package targeted commands plus root `lint`, `format:check`, `test:unit`, and `verify:quick` commands; every command must execute a real check.
- [x] Create `.github/workflows/ci.yml` for pull requests and pushes to `main` with a `quality` job only.
- [x] Pin or lock the Node.js/pnpm setup, use `pnpm install --frozen-lockfile`, and cache the pnpm store safely.
- [x] Run lint, typecheck, focused unit tests, and build in CI without Playwright.
- [x] Give CI read-only repository permissions, no deployment identity, and no provider secrets.
- [x] Document the exact named `quality` status check expected by branch protection.

## Acceptance criteria

- [x] Each package can run its smallest relevant check independently.
- [x] `verify:quick` runs format checking, lint, typecheck, unit tests, and build as the complete unpaid fast gate and has a stable exit code.
- [x] A temporary forbidden app-to-app import, contracts-to-app import, package-source deep import, and Node-only frontend import each fail the relevant automated check.
- [x] Pull requests and `main` pushes run the same `quality` job.
- [x] No code path in default CI can instantiate a live OpenAI, ElevenLabs, or production Turnstile call.
- [x] No E2E, visual snapshot, AI persona, deploy, or cloud-auth job exists yet.

## Focused verification

- [x] Run each targeted command once against its owning package.
- [x] Run `verify:quick` once.
- [x] Prove the boundary rules with temporary failing imports, then remove those probes.
- [x] Validate the workflow syntax and inspect its permissions, events, cache key, and frozen install.
- [x] Temporarily omit any provider environment values and confirm the quality gate still succeeds using no paid adapter.

## Implementation record

- Implemented on 2026-08-31 with the exact SP-001 toolchain: Node.js 24.20.0 (official portable archive SHA-256 verified) and pnpm 11.24.0. A frozen offline install succeeded after the final lockfile update.
- Root tooling resolved ESLint 10.9.1, TypeScript ESLint 8.68.0, Prettier 3.9.6, Vitest 4.1.11, jsdom 30.0.1, Testing Library, the official React Hooks and Next.js lint plugins, import-boundary rules, and the Vite React transform needed for the real TSX unit test. ESLint 10 was chosen because the registry marks the ESLint 9 maintenance line unsupported.
- `pnpm-workspace.yaml` explicitly denies the optional `unrs-resolver` postinstall script through pnpm 11's `allowBuilds` policy. The package's platform bindings are delivered as optional packages, so the quality checks do not require that script.
- The `quality` job pins `actions/checkout` v7.0.1 and `pnpm/setup` v2.0.2 by full commit SHA, locks pnpm 11.24.0 and Node.js 24.20.0, restores only the pnpm store keyed by `pnpm-lock.yaml`, performs an explicit frozen install, and runs format, lint, typecheck, unit-test, and build steps with only `contents: read` permission.
- The frontend has one co-located scaffold test. Backend and contracts run real Vitest discovery with `--passWithNoTests` until their owning feature tickets add behavior and co-located tests; no placeholder product behavior or fake assertion was added to make those empty SP-001 entry points green.
- All targeted lint, typecheck, unit-test, and build commands passed. `verify:quick` passed with OpenAI, ElevenLabs, and Turnstile provider values removed from the verification process.
- Temporary probes produced the required failures for frontend-to-backend, contracts-to-frontend, backend-to-contract-source deep import, frontend-to-`node:fs`, and parent-directory traversal through the frontend `@/*` alias. The probes were removed and lint passed afterward.
- Workflow syntax was parsed by Prettier and its events, exact `quality` name, read-only permission, action/tool pins, cache input, frozen install, and five gates were asserted locally. Full and production `pnpm audit` checks reported no known vulnerabilities.
- The ticket was later committed as `60241c4` and is present on `main` and `origin/main`. A hosted GitHub Actions run and the repository's branch-protection setting remain unobserved from this local revision; the required branch-protection check name remains `quality`.
- Revised on 2026-09-08 against the ticket, current quality configuration, commit history, dependency audit, and a fresh milestone gate. Formatting, strict lint, typechecks, unit tests, and production builds remain green; no SP-002 implementation gap was found.

## Commit boundary

Keep SP-002 reviewable as one logical change represented by `chore(quality): add fast essential checks`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Lean verification strategy](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#18-lean-verification-strategy)
- [Manual laptop deployment](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#manual-laptop--google-cloud-deployment)
- [Ticket rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#ticket-rules)

## Completion handoff

- Outcome: SP-002 is complete, reviewed, committed, and revised against current repository evidence.
- Verification: the 2026-09-08 revision reconfirmed the unpaid `quality` gate, package-boundary enforcement, secret-free CI configuration, dependency audit, and successful milestone quality gate.
- Deviations or blockers: no implementation blocker. Hosted workflow history and branch-protection settings were not inspected from the local repository and are not claimed as verified.
