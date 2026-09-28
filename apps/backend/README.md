# ScreenPilot backend

The backend is ScreenPilot's stateless Express API. It validates every external boundary, applies admission and privacy controls, coordinates interview use cases, and keeps OpenAI and ElevenLabs details behind small server-only adapters.

For the product contract and architecture decisions, start with the [ScreenPilot source of truth](../../docs/SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md). Repository-wide privacy, test isolation, and implementation rules live in [`AGENTS.md`](../../AGENTS.md).

## Responsibilities

- Publish allow-listed public demo configuration and establish the anonymous browser session.
- Analyze bounded CV text into provisional, evidence-linked facts.
- Prepare the same general-HR intent set for conversation-first and CV-assisted paths.
- Issue short-lived private ElevenLabs conversation access.
- Organize the final transcript into an evidence-linked recruiter review.
- Enforce request limits, origin checks, capacity controls, timeouts, and stable error contracts.

There is deliberately no repository/data-access layer, database, object storage, candidate registry, durable server session, or background queue.

## API surface

| Method | Route                   | Responsibility                                                                                    |
| ------ | ----------------------- | ------------------------------------------------------------------------------------------------- |
| `GET`  | `/health/live`          | Confirms that the process is running.                                                             |
| `GET`  | `/health/ready`         | Confirms that required runtime configuration is ready.                                            |
| `GET`  | `/v1/demo/bootstrap`    | Returns allow-listed public runtime configuration and initializes the anonymous session boundary. |
| `POST` | `/v1/cv/analyze`        | Converts bounded CV text into structured, evidence-linked candidate context.                      |
| `POST` | `/v1/interview/prepare` | Prepares the role-neutral conversation-first interview plan.                                      |
| `POST` | `/v1/voice/token`       | Issues short-lived private ElevenLabs conversation access.                                        |
| `POST` | `/v1/interview/summary` | Builds the final evidence-linked review from a bounded transcript.                                |

Requests and responses are validated with schemas from `@screenpilot/contracts`. Route handlers validate, call one use case, and map the result; provider payloads do not escape their adapters.

## Source layout

```text
src/
  ai/          Prompt assembly and bounded model context
  config/      Centralized validated runtime configuration
  demo/        Deterministic fake-provider behavior
  http/        Express composition, middleware, routes, errors
  providers/   OpenAI and ElevenLabs adapters
  security/    Sessions, grants, admission and origin controls
  use-cases/   Product operations independent of HTTP transport
```

The Express application is constructed separately from the listening process so tests can exercise it through Supertest without opening a port.

## Configuration

The committed [`.env.example`](.env.example) is the safe configuration schema. The ignored `apps/backend/.env.local` is loaded only by the local start script and must never be committed, read back by an agent after secrets are entered, or copied into commands and logs.

Configuration is grouped by responsibility:

- **Runtime:** app environment, port, allowed origins, provider mode, and the paid-demo/live-interview switches.
- **Provider adapters:** blank OpenAI and ElevenLabs credentials and identifiers for owner-authorized live testing.
- **Abuse protection:** Turnstile site and secret configuration plus allowed hostnames.
- **Session integrity:** separate anonymous-cookie and interview-grant signing secrets.
- **Operational bounds:** request/body/provider timeouts, expiry windows, concurrency capacity, and per-route rate limits.

The committed defaults are `PROVIDER_MODE=fake` and `PAID_DEMO_ENABLED=false`. That is the normal development and test posture. Live-provider testing requires explicit owner authorization and manual configuration of the ignored local environment file.

## Run locally

Install dependencies from the repository root first:

```bash
corepack pnpm install --frozen-lockfile
```

For the clean local backend path, run from the repository root:

```bash
corepack pnpm build:backend
corepack pnpm start:backend:local
```

The API listens on port `3001`. Before testing through the frontend, confirm both endpoints return `200`:

```text
http://127.0.0.1:3001/health/live
http://127.0.0.1:3001/health/ready
```

`start:backend:local` uses Node's built-in `--env-file` support to load the ignored backend environment file. The production `start` script expects environment injection and never depends on a local file.

For TypeScript compilation in watch mode, use an additional terminal:

```bash
corepack pnpm dev:backend
```

That command compiles changes only; restart the local backend process when newly compiled code must be loaded. When an automated agent owns the process, it must also follow the stale-port, sandbox, logging, health-check, and process-lifecycle rules in the root [`AGENTS.md`](../../AGENTS.md#canonical-local-app-startup).

## Verify changes

Tests must override the process before test modules load so they cannot inherit a live local configuration or spend provider credits:

```powershell
$env:PROVIDER_MODE = "fake"
$env:PAID_DEMO_ENABLED = "false"
corepack pnpm typecheck:backend
corepack pnpm lint:backend
corepack pnpm test:unit:backend
corepack pnpm build:backend
```

Backend tests run through the constructed Express app and must not connect to an already-running application or live provider.

## Backend guardrails

- Validate every external request and provider response before business logic uses it.
- Keep middleware order explicit: request ID and logging, security headers, restricted CORS, bounded parsers/cookies, routes, not-found handling, then the terminal error mapper.
- Use typed domain errors and one stable API error shape.
- Bound request bodies, provider outputs, retries, timeouts, and collection sizes.
- Never retry validation, authentication, rate-limit, or known non-retryable provider failures.
- Abort obsolete provider work and avoid duplicate provider operations for one user action.
- Pass only the minimum required CV or transcript context and release large references after use.
- Keep candidate data request-scoped; never add persistence-shaped infrastructure.

## Related documentation

- [Root project overview](../../README.md)
- [Frontend guide](../frontend/README.md)
- [Implementation tickets](../../docs/tickets/README.md)
