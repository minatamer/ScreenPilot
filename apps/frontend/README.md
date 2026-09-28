# ScreenPilot frontend

The frontend is the public ScreenPilot experience: a responsive Next.js application that guides a candidate from entry and consent through a live voice interview to an evidence-linked review.

For the product contract and architecture decisions, start with the [ScreenPilot source of truth](../../docs/SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md). Repository-wide privacy and implementation rules live in [`AGENTS.md`](../../AGENTS.md); the generated Next.js-specific rules in [`apps/frontend/AGENTS.md`](AGENTS.md) also apply inside this workspace.

## Responsibilities

- Own the landing page and candidate demo journey.
- Keep the canonical demo reducer as the only workflow-stage authority.
- Extract text from a selected PDF in the browser and send only bounded text to the API.
- Manage consent, Turnstile, microphone preflight, ElevenLabs WebRTC, captions, and cleanup.
- Keep an allow-listed, session-scoped browser projection without persisting CV text, transcripts, audio, or generated reviews.
- Render the final review with traceable CV and transcript evidence.

The feature code is organized by product behavior:

```text
src/features/
  abuse-protection  cv        entry       insights
  interview         plan      preflight   privacy
  review            session   transcript
```

Framework route files in `src/app` stay thin. Browser/provider behavior belongs in named feature hooks and services, while reusable visual primitives live under `src/shared/ui`.

## Runtime boundary

Browser code calls relative `/v1` endpoints. The Next.js server proxies those requests to the backend and keeps backend authentication and provider credentials out of the browser bundle.

The only committed frontend configuration schema is [`.env.example`](.env.example):

| Variable                   | Purpose                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `BACKEND_ORIGIN`           | Server-only upstream API origin. Local development uses `http://127.0.0.1:3001`.                        |
| `BACKEND_AUTH_MODE`        | `local` for the loopback development path; deployed environments use the documented authenticated mode. |
| `BACKEND_AUTH_AUDIENCE`    | Backend identity-token audience for deployed authentication; blank in local mode.                       |
| `FRONTEND_ALLOWED_ORIGINS` | Origins allowed to reach the frontend proxy.                                                            |

Copy the schema to the ignored `apps/frontend/.env.local` and edit it manually when local overrides are needed. Never commit that file or place its values in commands, logs, screenshots, or documentation.

## Run locally

Install dependencies from the repository root first:

```bash
corepack pnpm install --frozen-lockfile
```

Start the backend and wait for both health endpoints to return `200` before starting the frontend. See the [backend guide](../backend/README.md#run-locally).

For the clean, production-like frontend path, run from the repository root:

```bash
corepack pnpm build:frontend
corepack pnpm --filter @screenpilot/frontend start
```

Open [http://localhost:3000/demo](http://localhost:3000/demo).

For a normal edit/watch loop, use:

```bash
corepack pnpm dev:frontend
```

The production-like build/start pair remains the canonical path for final local verification. When an automated agent owns the process, it must also follow the stale-port, sandbox, logging, and process-lifecycle rules in the root [`AGENTS.md`](../../AGENTS.md#canonical-local-app-startup).

## Verify changes

Tests must be explicitly fake-provider and paid-disabled even if the owner's ignored local configuration is live:

```powershell
$env:PROVIDER_MODE = "fake"
$env:PAID_DEMO_ENABLED = "false"
corepack pnpm typecheck:frontend
corepack pnpm lint:frontend
corepack pnpm test:unit:frontend
corepack pnpm build:frontend
```

For UI changes, also inspect phone, tablet, laptop/desktop, large-monitor, and at least one intermediate drag-resized width. Verify keyboard navigation, visible focus, reduced-motion behavior, overflow, and cleanup of media tracks, SDK listeners, timers, requests, and object URLs touched by the change.

## Frontend guardrails

- Do not put OpenAI, ElevenLabs, Turnstile secret, signing, or backend credentials in browser code.
- Do not mirror workflow stages across unrelated local state; derive values from the canonical reducer.
- Do not serialize the full runtime state and remove private fields afterward. Persist only an explicit allow-listed projection.
- Keep `window`, `sessionStorage`, `File`, PDF parsing, and media devices behind client boundaries.
- Lazy-load PDF and voice dependencies only when their stage needs them.
- Share components and semantics across device sizes; adapt layout continuously instead of creating separate device implementations.

## Related documentation

- [Root project overview](../../README.md)
- [Signal Canvas design system](../../docs/SCREENPILOT_DESIGN_SYSTEM.html)
- [Implementation tickets](../../docs/tickets/README.md)
