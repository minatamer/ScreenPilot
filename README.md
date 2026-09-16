# ScreenPilot

> Pilot conducts the first screen. Humans make the decision.

ScreenPilot is a stateless, privacy-minded, role-agnostic demonstration of AI-assisted first-stage HR screening. It gives candidates a disclosed voice conversation with **Pilot**, organizes candidate-sourced facts into evidence-linked insights, and prepares a structured review for a human recruiter.

ScreenPilot supports recruiter judgment. It does not rank candidates, issue pass/fail decisions, or automate hiring decisions.

Any non-empty role label the candidate states becomes the available **synthetic demo vacancy for that browser session**. There is no supported-role allow-list or unavailable-vacancy path: Graphic Designer, Customer Support Representative, Product Manager, Backend Developer, Full Stack Developer, multiple-role wording, and other bounded labels are handled by the same general HR screen. An undecided candidate can complete an open role-neutral screen.

Role labels and CV suggestions are untrusted candidate context, not employer facts. ScreenPilot never invents responsibilities, qualifications, compensation, benefits, reporting lines, team size, work pattern, location requirements, or hiring timelines for a candidate-selected role. It gathers the candidate's preferences and records unsupported employer/vacancy questions for human follow-up. Every role stays inside the same universal HR scope—name, requested role, current context, high-level experience/responsibilities, collaboration preferences, motivation, work arrangement/location preferences, availability, compensation expectation, relevant candidate-stated English use, questions, follow-ups, and close—and never becomes a technical, portfolio, competency, roleplay, professional-knowledge, or suitability assessment.

## What the product does

Candidates can enter the same screening experience in two ways:

- **CV-assisted:** upload a text-based CV so Pilot can prepare grounded discussion areas.
- **Conversation-first:** begin without a CV and let Pilot discover relevant context through broader opening questions.

The intended flow is:

```text
candidate-selected synthetic demo vacancy or open role-neutral context
  -> optional CV understanding or conversation-first preparation
  -> disclosure, consent, and microphone preflight
  -> live voice interview with captions and candidate-sourced insights
  -> evidence-linked human review
  -> explicit session clearing
```

Candidate content stays in the active browser/request lifecycle. The architecture deliberately has no candidate database, durable transcript store, analytics payload, background queue, or hidden server session.

## Technology stack

| Area                  | Technology                                                        | How ScreenPilot uses it                                                                                                                                |
| --------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Web application       | Next.js 16 App Router, React 19, TypeScript                       | Renders the responsive candidate flow and keeps browser-only session, microphone, transcript, and workflow behavior behind explicit client boundaries. |
| API                   | Node.js 24 and Express 5                                          | Exposes a separately deployable REST boundary, validates requests, keeps provider credentials server-side, and coordinates stateless use cases.        |
| Shared contracts      | Zod                                                               | Defines browser-safe request, response, provider-output, and public-runtime schemas used by both applications.                                         |
| Voice interview       | ElevenLabs WebRTC / Agents                                        | Provides real-time speech, transcription, turn-taking, and Pilot's voice through short-lived server-issued access.                                     |
| AI processing         | OpenAI Responses API                                              | Performs bounded CV analysis and post-interview organization through backend-only provider adapters.                                                   |
| Abuse protection      | Cloudflare Turnstile                                              | Protects paid provider operations while keeping the managed widget inside a stable, accessible surrounding layout.                                     |
| Monorepo tooling      | pnpm workspaces                                                   | Keeps the frontend, backend, and shared contracts independently buildable with one locked dependency graph.                                            |
| Quality               | ESLint, Prettier, TypeScript strict mode, Vitest, Testing Library | Provides deterministic formatting, linting, typechecking, unit tests, and production builds before provider or deployment checks.                      |
| Delivery architecture | GitHub Actions, Firebase Hosting, Google Cloud Run                | Supports one public origin with frontend/API routing and independently deployable containers without storing candidate data in the delivery layer.     |

Provider integrations remain behind small typed adapters. Local development and automated checks use deterministic fake providers by default, so ordinary work cannot spend OpenAI or ElevenLabs credits.

## Repository structure

```text
apps/frontend       @screenpilot/frontend  Next.js browser application
apps/backend        @screenpilot/backend   Node.js API and provider adapters
packages/contracts  @screenpilot/contracts Browser-safe cross-boundary schemas
docs                                      Product, design, and ticket documentation
```

The internal dependency direction is intentionally narrow:

```text
frontend -> contracts <- backend
```

The applications never import one another, and the contracts package cannot import browser UI, backend framework code, provider SDKs, or Node-only configuration.

## Prerequisites

- Git
- Node.js **24.20.0**, declared in [`.node-version`](.node-version)
- Corepack with pnpm **11.24.0**, locked by `packageManager`

## Install

From the repository root:

```bash
corepack enable
pnpm install --frozen-lockfile
```

No provider credentials are required for the default fake mode.

## Run locally

> **Local runtime rule:** run both long-lived application processes outside any
> restricted sandbox, with unrestricted network access. This is required even
> when the frontend and backend are started separately: the frontend must reach
> the local API/provider browser endpoints, and a live backend must reach
> Turnstile, OpenAI, and ElevenLabs. Automated tests remain sandboxed,
> fake-provider, paid-disabled, and network-denied.

Stop the previous frontend and backend processes first so ports `3000` and
`3001` have no stale listeners. Then use two terminals from the repository root.

Terminal 1 — build and start the backend with the ignored local environment
file:

```bash
corepack pnpm build:backend
corepack pnpm start:backend:local
```

`start:backend:local` uses Node's built-in `--env-file` support to load
`apps/backend/.env.local` into the backend process. The production `start`
script remains environment-injection only and never depends on a local file.

Wait for the backend to report that it is listening on port `3001`.

Terminal 2 — build and start the production-like Next.js application:

```bash
corepack pnpm build:frontend
corepack pnpm --filter @screenpilot/frontend start
```

Next.js loads `apps/frontend/.env.local` automatically. Then open
[http://localhost:3000/demo](http://localhost:3000/demo).

For an edit/watch loop, `corepack pnpm dev:frontend` may replace the frontend
build/start pair. The canonical clean verification run remains build then start
for both applications, outside the sandbox and with unrestricted network
access. Never place environment values in startup commands.

When editing backend modules, the backend workspace can compile changes in
TypeScript watch mode in an additional terminal. Restart the local backend
process when a compiled change must be loaded:

```bash
pnpm dev:backend
```

The frontend can proxy relative `/v1` requests to a local backend origin. The example value is `http://127.0.0.1:3001` in [`apps/frontend/.env.example`](apps/frontend/.env.example).

## Configuration and provider modes

Configuration templates live at:

- [`apps/frontend/.env.example`](apps/frontend/.env.example)
- [`apps/backend/.env.example`](apps/backend/.env.example)

The backend supports two provider modes:

- `PROVIDER_MODE=fake` is the safe local and CI default. Provider secrets remain blank and `PAID_DEMO_ENABLED=false`.
- `PROVIDER_MODE=live` requires the documented OpenAI, ElevenLabs, Turnstile, and signing values. Live or paid testing must be explicitly authorized and configured before use.

Never expose OpenAI, ElevenLabs, Turnstile secret, cookie, or signing values to browser code. The frontend calls relative `/v1` endpoints and receives only allow-listed public runtime configuration.

## Verify the workspace

Run the complete unpaid quality gate:

```bash
pnpm verify:quick
```

It runs formatting checks, linting, strict typechecking, unit tests, and production builds across the workspace.

Individual checks are also available:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
```

Focused package commands follow the same pattern, for example:

```bash
pnpm typecheck:frontend
pnpm test:unit:backend
pnpm build:contracts
```

## Design and documentation

- [Signal Canvas HTML design-system reference](docs/SCREENPILOT_DESIGN_SYSTEM.html)
- [ScreenPilot demo source of truth](docs/SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)
- [Implementation ticket index](docs/tickets/README.md)

Committed examples use synthetic content only. Never commit a real CV, transcript, interview audio, generated candidate summary, API key, service-account file, or provider secret.
