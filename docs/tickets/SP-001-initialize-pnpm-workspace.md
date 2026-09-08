# SP-001 — Initialize Git and the plain pnpm workspace

Status: Required  
Implementation state: Completed, reviewed, revised, and verified; committed as `1b9e0b1`<br>
Milestone: Milestone 0 — repository and visual foundations  
Last synchronized: 2026-09-08<br>
Depends on: Nothing  
Suggested commit: `chore(repo): initialize stateless ScreenPilot workspace`  
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Initialize the local Git repository and create the smallest maintainable workspace skeleton in which the frontend, backend, and shared contracts can build independently without introducing a workspace orchestrator.

## Standalone implementation context

- The repository currently begins as documentation-only. This ticket establishes structure, not product behavior.
- Initialize Git with `main` as the initial branch and configure the user-supplied SSH remote `origin` as `git@github.com:minatamer/ScreenPilot.git`. The GitHub repository already exists; this ticket does not create or replace it.
- If `.git` already exists, verify the repository root, current branch, and remote instead of reinitializing it. Never overwrite an unexpected existing remote without user review.
- The review boundary is strict: do not run `git add`, create a commit, or push. Leave every SP-001 change unstaged and uncommitted until the user reviews it and explicitly authorizes the next Git action.
- Use a plain pnpm workspace with native filtered and recursive commands; no extra workspace task orchestrator is needed.
- The fixed private workspace names are `@screenpilot/frontend` at `apps/frontend`, `@screenpilot/backend` at `apps/backend`, and `@screenpilot/contracts` at `packages/contracts`.
- The only allowed internal dependency graph is `frontend -> contracts <- backend`; the applications never import one another.
- The frontend will be Next.js + React; the backend will be Express 5 on Node.js; only schemas and runtime values that cross a real HTTP, client-tool, or structured-provider boundary live in `packages/contracts`.
- `packages/contracts` is browser-safe and dependency-light. It cannot import React, Next.js, Express, Node-only APIs, environment readers, provider SDKs, fixtures, or application code.
- Node.js 24 and strict TypeScript are locked. The shared TypeScript base owns safety flags, while each package keeps tool-appropriate module/module-resolution settings.
- Root scripts delegate with native pnpm workspace filtering/recursion and respect the contracts-before-applications build order.
- SP-001 creates real build/typecheck commands. Lint, formatting, unit-test, and `verify:quick` commands arrive in SP-002; do not create placeholder scripts that only print success.
- Create repository `AGENTS.md` now because every later fresh chat must inherit the same scope, privacy, and code-quality rules.

### Exact filesystem created by this ticket

Create exactly this scaffold. Later feature directories are documented in the parent plan, but they are added only by their owning tickets.

Git also creates the hidden `.git/` metadata directory at the repository root. It is intentionally omitted from the source-file tree below because it is managed by Git rather than edited as project source.

```text
screen-pilot/
├─ .editorconfig
├─ .gitattributes
├─ .gitignore
├─ .node-version
├─ AGENTS.md
├─ README.md
├─ package.json
├─ pnpm-lock.yaml
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ apps/
│  ├─ frontend/
│  │  ├─ package.json
│  │  ├─ next-env.d.ts
│  │  ├─ next.config.ts
│  │  ├─ tsconfig.json
│  │  └─ src/
│  │     ├─ app/
│  │     │  ├─ layout.tsx
│  │     │  └─ page.tsx
│  │     └─ styles/
│  │        └─ globals.css
│  └─ backend/
│     ├─ package.json
│     ├─ tsconfig.json
│     └─ src/
│        └─ index.ts
└─ packages/
   └─ contracts/
      ├─ package.json
      ├─ tsconfig.json
      └─ src/
         └─ index.ts
```

The backend/contracts `index.ts` files are empty compile entry points only. They are removed—not turned into catch-all barrels—when SP-003 adds the first explicit contract subpath export and SP-009 adds backend `app.ts`/`server.ts`.

## Credential-safety bootstrap

- No API credential is required by this ticket, and no `.env.local` file is created or filled here.
- Add the parent plan's exact local-environment and downloaded-cloud-credential patterns to root `.gitignore` before SP-003 introduces blank templates.
- Only future blank `apps/*/.env.example` templates may be committed. Usable `.env`, `.env.local`, service-account JSON, and application-default credential files must remain ignored.
- Public project documentation under `docs/` remains visible to Git. Only deliberately private local notes and exports under `docs/private/`, `docs/**/*.local.md`, `docs/operations/private/`, and `docs/operations/provider-exports/` are ignored.
- Verification must prove `apps/backend/.env.local` and `apps/frontend/.env.local` are ignored with `git check-ignore -v -- ...` even if those files do not yet exist. If a credential file is already tracked later, rotate any exposed credential before removing that exact path from the index.

## Scope boundaries

- Do not implement routes, screens, provider integrations, demo data, Docker, deployment, Playwright, or AI evaluation.
- Do not add a database, ORM, cache, queue, object storage, or authentication package.
- Do not invent generic `api`, `web`, or `services` names; use `frontend`, `backend`, and `contracts`.
- Do not duplicate TypeScript settings across packages when a shared base can express them.
- Do not pre-create empty feature directories, generic root `src`, shared data packages, root barrel exports, or path aliases that cross application boundaries.
- Do not add npm/Yarn lockfiles, `postinstall` code generation, or generated build output to source control.
- Do not stage, commit, push, fetch, pull, or otherwise reconcile remote history in this ticket without explicit user authorization. Remote configuration is the only Git network/repository wiring in scope.

## Implementation checklist

- [x] Initialize the repository with `git init -b main` when `.git` is absent, then verify the repository root and initial branch.
- [x] Configure `origin` exactly as `git@github.com:minatamer/ScreenPilot.git`; do not replace an unexpected existing remote, fetch, pull, or push.
- [x] Configure `pnpm-workspace.yaml`, a root `package.json`, and native filtered/recursive scripts with no root product runtime code.
- [x] Create the three private named workspaces with minimum real source entry points and `workspace:*` dependencies following `frontend -> contracts <- backend`.
- [x] Pin/declare Node.js 24, one exact pnpm package-manager version, and one root lockfile.
- [x] Create `tsconfig.base.json` for common strictness plus package-specific configs for Next/bundler and Node builds; do not force one module strategy across all packages.
- [x] Make `@screenpilot/contracts` emit runtime JavaScript and declarations before application production builds, without stale-output assumptions in development.
- [x] Add real root `build`, `typecheck`, and filtered application/package commands. Leave lint/format/test/`verify:quick` absent until SP-002 implements them honestly.
- [x] Add root `.gitignore`, `.editorconfig`, and `.gitattributes`; copy the exact credential-ignore baseline from the parent plan, allow only blank `**/.env.example` templates, keep public `docs/` tracked, ignore the narrow private-document paths, and do not hide source or fixtures.
- [x] Add a concise root `README.md` with the demo boundary, workspace map, prerequisites, install/build/typecheck commands, and a note that setup evolves ticket-by-ticket; SP-027 may later expand portfolio material.
- [x] Create repository `AGENTS.md` containing the exact repository map/dependency direction plus the demo scope/privacy rules and all mandatory structure, reuse, React, backend, efficiency, readability, and ticket-completion quality rules.
- [x] Match the exact SP-001 filesystem above; do not pre-create empty later-ticket folders.
- [x] Generate and retain the pnpm lockfile through the normal package-manager workflow.
- [x] Confirm the frontend, backend, and contracts packages can be targeted separately.
- [x] Stop with an empty Git index and no commit or push so the user can review the complete working tree first.

## Acceptance criteria

- [x] `git rev-parse --show-toplevel` resolves to this repository, `main` is the initial branch, and `git remote get-url origin` returns `git@github.com:minatamer/ScreenPilot.git`.
- [x] A clean pnpm install succeeds from the repository root.
- [x] Root build/typecheck discover all three workspaces, build contracts before consumers, and return successfully for intentionally minimal real code.
- [x] A filtered command can target `frontend` or `backend` without starting the other application.
- [x] Package manifests and imports prove that neither application depends on or imports the other, and contracts remain a browser-safe dependency leaf.
- [x] There is exactly one lockfile and no fake-green quality/test script.
- [x] No extra workspace task orchestrator exists.
- [x] `AGENTS.md` is specific enough to prevent later chats from adding persistence, duplicated components, weak types, or out-of-scope product work.
- [x] The Git index is empty, no SP-001 commit has been created, and nothing has been pushed before user review.

## Focused verification

- [x] Run `git rev-parse --show-toplevel`, `git branch --show-current`, and `git remote get-url origin`.
- [x] Run the clean/frozen install supported by the newly generated lockfile.
- [x] Run the real root typecheck and build entry points.
- [x] Run one filtered command against each application package.
- [x] Inspect package dependency output and source imports for the required direction.
- [x] Run `git check-ignore -v -- apps/backend/.env.local apps/frontend/.env.local`; confirm both local paths are ignored and future `.env.example` paths are not.
- [x] Inspect the resulting tree and confirm no duplicate lockfile, generated secret, build artifact, empty speculative layer, or unrelated application feature was committed.
- [x] Run `git diff --cached --quiet` and `git status --short --untracked-files=all`; confirm the index is empty and the intended files remain available for user review.

## Implementation record

- Implemented on 2026-08-31 with Node.js 24.20.0 and pnpm 11.24.0. The lockfile resolved Next.js 16.3.3, React/React DOM 19.2.8, TypeScript 5.9.3, and Node type declarations 24.13.3. Next.js 16.3.3 is the August 2026 Active LTS security release and React 19.2.8 is the patched 19.2 line for the July Server Functions denial-of-service advisory.
- pnpm 11.24.0 supersedes the initially tested 11.19.0 pin because pnpm 11.20.0 fixed named-registry substitution and malicious-lockfile rebuild risks affecting the earlier line. The workstation's default Node remains 22.23.2, so exact-target verification used Node's official portable 24.20.0 Windows archive after its SHA-256 matched the published checksum; it did not change the installed system runtime or add files to the repository.
- Frozen install, route type generation, strict typecheck, focused package checks, production build, and `pnpm audit --prod` all passed under the exact Node.js 24.20.0/pnpm 11.24.0 toolchain. The production audit reported no known vulnerabilities.
- Git was initialized on `main`, `origin` was configured, and `.git` ownership was restored to the user's Windows account so local Git does not require a global `safe.directory` exception.
- The original review boundary was satisfied: the SP-001 work remained unstaged and uncommitted until the user reviewed it. It was later committed as `1b9e0b1` and is present on `main` and `origin/main`.
- Revised on 2026-09-08 against the ticket, source of truth, current repository tree, and commit history. The workspace graph, single-lockfile rule, package exports, privacy ignores, targetable builds, and absence of a second orchestrator remain correct; no SP-001 implementation gap was found.

## Commit boundary

Keep SP-001 reviewable as one logical change represented by `chore(repo): initialize stateless ScreenPilot workspace`. For this implementation, the user has explicitly required review before any staging or commit: do not run `git add`, commit, or push until they give a new explicit instruction after reviewing the working tree.

## Precision references

- [Repository shape, stack, boundaries, and code-quality rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#11-frontendbackend-architecture)
- [Filename-level scaffold and target repository](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#filename-level-filesystem-blueprint)
- [Credential, blank-value, and ignore contract](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)
- [Ordered backlog rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#19-ordered-implementation-backlog)
- [Scope boundaries](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#3-demo-scope-boundaries)

## Completion handoff

- Outcome: SP-001 is complete, reviewed, committed, and revised against current repository evidence.
- Verification: the 2026-09-08 revision reconfirmed the package graph, contract export boundary, one root lockfile, ignored local credential paths, and successful milestone quality gate.
- Deviations or blockers: none. The no-commit checklist items describe the historical pre-review boundary and were satisfied before commit `1b9e0b1` was created.
