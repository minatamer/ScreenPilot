# ScreenPilot

> AI handles the first screen. Humans make the decision.

ScreenPilot is a stateless, privacy-minded demonstration of AI-assisted candidate screening. A candidate can start from a vacancy or add a CV, complete a disclosed voice interview, and receive a structured post-call summary with evidence links. The demo supports recruiter judgment; it does not make hiring decisions.

## Current boundary

This repository is being implemented ticket by ticket. SP-001 provides only the Git and buildable workspace foundation—no interview workflow, provider integration, persistence, authentication, or deployment behavior exists yet.

Public planning documents belong in [`docs/`](docs/). Local environment files, cloud credential downloads, and deliberately private documentation paths are ignored. API credentials must remain blank in committed templates and must never enter frontend code or Git history.

## Workspace map

```text
apps/frontend       @screenpilot/frontend  Next.js browser application
apps/backend        @screenpilot/backend   Node.js API application
packages/contracts  @screenpilot/contracts Browser-safe cross-boundary contracts
```

The only internal dependency direction is:

```text
frontend -> contracts <- backend
```

The applications never import one another.

## Prerequisites

- Git
- Node.js 24.20.0 (the current Node 24 LTS patch, declared in `.node-version`)
- Corepack with pnpm 11.24.0 (locked by `packageManager`)

## Git repository

SP-001 initializes the local repository on `main` and connects the existing GitHub repository over SSH:

```powershell
git branch --show-current
git remote get-url origin
ssh -T git@github.com
```

The expected remote is `git@github.com:minatamer/ScreenPilot.git`. SSH authentication and Git commit identity are machine-local setup; configuring them never requires committing a private key. Do not stage, commit, or push an implementation ticket until its working tree has been reviewed.

## Setup and verification

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
```

The first dependency resolution that creates `pnpm-lock.yaml` uses `pnpm install`; later clean installs use `pnpm install --frozen-lockfile`.

Useful focused commands:

```powershell
pnpm dev:frontend
pnpm dev:backend
pnpm build:frontend
pnpm build:backend
pnpm build:contracts
pnpm typecheck:frontend
pnpm typecheck:backend
pnpm typecheck:contracts
```

Implementation authority and constraints are in [`docs/SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](docs/SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md). Ticket packets are indexed in [`docs/tickets/README.md`](docs/tickets/README.md).
