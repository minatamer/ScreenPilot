# ScreenPilot live-provider setup runbook

**Ticket:** SP-014A<br>
**Last verified against first-party documentation:** 2026-09-14<br>
**Last synchronized with ticket sequencing:** 2026-09-23<br>
**Scope:** local setup and live-provider readiness only

This is the single owner runbook for preparing ScreenPilot's credentialed local
demo path. It does not authorize an agent to open provider dashboards, create
accounts, buy credits, create or rotate credentials, edit ignored `.env.local`
files, publish an ElevenLabs agent, or run paid, live-provider, or microphone
tests. Those steps belong to the human repository owner.

Deployment, hosted secrets, public hostnames, and production rollout belong to
SP-026 and are deliberately excluded.

## What requires an account

ScreenPilot has three credentialed external services and two locally generated
signing secrets:

| Setup group | Why ScreenPilot needs it | Values used by the repository |
| --- | --- | --- |
| OpenAI API Platform | Direct backend Responses API calls for CV analysis and summary generation | `OPENAI_API_KEY` |
| ElevenLabs ElevenAgents | Private browser voice session, speech recognition, speech synthesis, and the agent's native LLM integration | `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_VOICE_ID` |
| Cloudflare Turnstile | Human-verification proof before paid endpoints are allowed | `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES` |
| Local application secrets | Sign the short-lived interview grant and anonymous browser cookie | `INTERVIEW_GRANT_SIGNING_SECRET`, `ANONYMOUS_COOKIE_SECRET` |

There is no fourth credentialed, non-deployment runtime service in the current
repository. Next.js, Express, Zod, PDF.js, React, and the ElevenLabs browser SDK
are dependencies, not additional provider accounts. A future deployment host
may introduce deployment credentials, but that decision is deferred to SP-026.

The two OpenAI paths are intentionally separate:

| Path | Credential and billing owner | Current locked model |
| --- | --- | --- |
| ScreenPilot backend to OpenAI Responses | ScreenPilot's `OPENAI_API_KEY` and OpenAI API project | `gpt-5.4-mini`, reasoning `none`, `store: false` |
| ElevenLabs agent's native LLM integration | Configured and billed through ElevenLabs; it must not receive ScreenPilot's OpenAI key | GPT-5.4 Mini, reasoning budget 0/none |

A ChatGPT subscription does not fund the OpenAI API Platform. Treat OpenAI API
billing and ElevenLabs billing as separate accounts and separate budgets.

## Before touching a provider dashboard

1. Start from the committed examples:

   `Copy-Item apps/backend/.env.example apps/backend/.env.local`

   `Copy-Item apps/frontend/.env.example apps/frontend/.env.local`

2. Confirm the ignored files will not be committed:

   `git check-ignore -v apps/backend/.env.local apps/frontend/.env.local`

   Both paths must be reported by an ignore rule. Stop if either path is not
   ignored. Never paste a secret into `.env.example`, a ticket, a terminal
   transcript, a screenshot, a chat, or a source-controlled document.

3. Leave these safe switches unchanged while gathering values:

   - `PROVIDER_MODE=fake`
   - `PAID_DEMO_ENABLED=false`
   - `LIVE_INTERVIEW_ENABLED=true`

4. Generate the two application secrets locally. Run this command twice:

   `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`

   Put one result in `INTERVIEW_GRANT_SIGNING_SECRET` and the other in
   `ANONYMOUS_COOKIE_SECRET`. They must each be at least 32 characters and must
   not be equal. They are not obtained from a provider.

5. Keep `apps/frontend/.env.local` limited to the three non-secret local
   connection values from `apps/frontend/.env.example`:

   ```dotenv
   BACKEND_AUTH_MODE=local
   BACKEND_ORIGIN=http://127.0.0.1:3001
   BACKEND_AUTH_AUDIENCE=
   ```

   The blank audience is deliberate. Local mode accepts only the canonical
   loopback backend on port `3001` and never contacts Google metadata.

   Provider keys stay in `apps/backend/.env.local`. The browser receives only
   bounded bootstrap data, a Turnstile site key, and short-lived provider
   session credentials issued by the backend.

## Backend environment reference

Copy every field from `apps/backend/.env.example`. Do not delete apparently
unrelated safety limits.

| Field | Local value or source | Safety note |
| --- | --- | --- |
| `APP_ENV` | `local` | Production rules are stricter and belong to SP-026. |
| `PORT` | `3001` | Existing local backend port. |
| `PROVIDER_MODE` | Keep `fake` until the complete readiness gate passes | Switching to `live` changes which adapters may be called. |
| `PAID_DEMO_ENABLED` | Keep `false` until the final owner-authorized live test | This is the kill switch for paid operations. |
| `LIVE_INTERVIEW_ENABLED` | `true` by default | `false` selects summary rehearsal only after local live + paid-enabled gates resolve; fake and paid-disabled modes ignore it, while production rejects it. |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Must match the local frontend origin. |
| `OPENAI_API_KEY` | OpenAI project key | Backend only. |
| `ELEVENLABS_API_KEY` | Narrow ElevenLabs key | Backend only. |
| `ELEVENLABS_AGENT_ID` | Saved private ElevenLabs agent ID | Identifier, not a secret, but keep configuration centralized. |
| `ELEVENLABS_VOICE_ID` | Voice selected in the saved agent | Must match the source-of-truth snapshot. |
| `TURNSTILE_SITE_KEY` | Turnstile widget site key | Public by design, but keep the example blank. |
| `TURNSTILE_SECRET_KEY` | Turnstile widget secret | Backend only. |
| `TURNSTILE_ALLOWED_HOSTNAMES` | `localhost` for this local widget | Hostnames only: no scheme, port, path, or wildcard syntax. |
| `INTERVIEW_GRANT_SIGNING_SECRET` | First generated secret | At least 32 characters. |
| `ANONYMOUS_COOKIE_SECRET` | Second, different generated secret | At least 32 characters. |
| `HTTP_HEADERS_TIMEOUT_MS` | `10000` | Bounds receipt of complete request headers to 10 seconds before Express routing. |
| `HTTP_REQUEST_TIMEOUT_MS` | `30000` | Bounds receipt of the complete inbound request to 30 seconds; it is not a route-handler/provider timeout. |
| `HTTP_JSON_BODY_MAX_BYTES` | `65536` | Keeps parsed JSON requests within 64 KiB. |
| `PROVIDER_REQUEST_TIMEOUT_MS` | `30000` | Separately bounds and aborts each outbound provider operation to 30 seconds. |
| `INTERVIEW_GRANT_TTL_SECONDS` | `900` | Makes an interview grant expire after 15 minutes. |
| `ANONYMOUS_COOKIE_TTL_SECONDS` | `7200` | Makes the content-free safety cookie expire after two hours. |
| `CAPACITY_GLOBAL_CONCURRENT_REQUESTS` | `4` | Caps all in-flight metered requests in one backend instance. |
| `CAPACITY_CV_ANALYZE_CONCURRENT_REQUESTS` | `2` | Per-instance CV-analysis in-flight ceiling. |
| `CAPACITY_VOICE_TOKEN_CONCURRENT_REQUESTS` | `1` | Strict per-instance voice-token in-flight ceiling. |
| `CAPACITY_SUMMARY_CONCURRENT_REQUESTS` | `2` | Per-instance summary in-flight ceiling. |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Existing per-instance limiter window. |
| `RATE_LIMIT_MAX_ENTRIES` | `10000` | Bounds in-memory limiter bookkeeping. |
| `RATE_LIMIT_BOOTSTRAP_REQUESTS` | `120` | Preserves the existing bootstrap request ceiling. |
| `RATE_LIMIT_PREPARE_REQUESTS` | `30` | Preserves the existing preparation request ceiling. |
| `RATE_LIMIT_CV_ANALYZE_REQUESTS` | `10` | Preserves the existing CV-analysis request ceiling. |
| `RATE_LIMIT_VOICE_TOKEN_REQUESTS` | `3` | Preserves the strict voice-token request ceiling. |
| `RATE_LIMIT_SUMMARY_REQUESTS` | `10` | Preserves the existing summary request ceiling. |

### Runtime wiring audit (updated 2026-09-21)

This audit traces the committed variable names only. It did not open or read
either ignored `.env.local` file and did not contact a provider.

| Environment value | Current code consumer | Current state / ticket ownership |
| --- | --- | --- |
| `OPENAI_API_KEY` | The live backend adapter passes it to the OpenAI Responses client as a Bearer credential. | Live CV analysis is implemented by SP-010 and live post-call summary generation is implemented by SP-020. Both remain paid/Turnstile gated, and the first controlled real summary stays deferred to SP-021B. |
| `ELEVENLABS_API_KEY` | The live backend client sends it only in the server-side `xi-api-key` header when requesting a private conversation token. | Implemented by SP-014; no browser exposure. |
| `ELEVENLABS_AGENT_ID` | The live token client binds it into the ElevenLabs `agent_id` request and rejects a mismatched requested agent. | Implemented by SP-014; it is not accepted from the browser. |
| `ELEVENLABS_VOICE_ID` | Validated and retained in typed backend configuration and the source-controlled agent target. | Intentionally not sent in the token request: the published ElevenAgent owns the selected voice. SP-018A supplied the initial smoke; SP-021B/SP-025 own remaining manual/deployed-agent drift acceptance. |
| `TURNSTILE_SITE_KEY` | Copied into the allow-listed public bootstrap response, then passed to the frontend Turnstile widget. | Implemented by SP-003/SP-012. This is the only provider value in this group that is public by design. |
| `TURNSTILE_SECRET_KEY` | The backend sends it to Cloudflare Siteverify in the form body. | Implemented by SP-009 and used before CV-analysis, voice-token, and SP-020 summary provider calls with route-specific actions. |
| `TURNSTILE_ALLOWED_HOSTNAMES` | The backend compares Siteverify's returned hostname against this exact allow-list. | Implemented by SP-009; `localhost` is the current local-only value. |
| `INTERVIEW_GRANT_SIGNING_SECRET` | The backend HMAC-signs and verifies short-lived stateless interview grants. | Implemented by SP-009 and used by preparation, CV analysis, voice-token authorization, and SP-020 summary plan binding. |
| `ANONYMOUS_COOKIE_SECRET` | Express `cookie-parser` verifies the signed, HttpOnly, content-free anonymous-session cookie and signs replacements. | Implemented by SP-009 and used by bootstrap plus protected routes. |
| `LIVE_INTERVIEW_ENABLED` | Backend configuration folds it into one public `effectiveMode`; the browser never reads the environment variable directly. | Global gates dominate: fake remains `deterministic_fake`, live + paid disabled remains `paid_disabled`, live + paid enabled defaults to `standard_live`, and only local live + paid enabled + `false` becomes `summary_rehearsal`. |

The audit found two activation defects, both corrected on 2026-09-14:

1. `loadBackendConfig()` reads `process.env`. The new local-only
   `start:backend:local` path uses Node's built-in `--env-file` support to load
   `apps/backend/.env.local` deliberately. The production `start` path still
   expects its host to inject `process.env` and never depends on a local file.
2. In `PROVIDER_MODE=fake`, provider adapters correctly remain fake, but a
   populated `TURNSTILE_SITE_KEY` is now suppressed from public bootstrap. The
   frontend therefore uses its deterministic no-network proof in fake mode;
   live mode alone receives the configured public site key.

`PAID_DEMO_ENABLED=false` disables CV analysis, voice-token issuance, and
summary before a paid provider is called. Standard `PROVIDER_MODE=live` creates
the real clients and validates the complete credential group, but does not by
itself make a network request. Local summary rehearsal deliberately requires
live/paid-enabled configuration while omitting ElevenLabs client construction;
CV analysis and interview voice remain deterministic while the summary is live
and metered. It remains a paid OpenAI/Turnstile path and never authorizes
itself. The fixes above make loading the populated local file safe in fake mode,
but they do not authorize any unchecked live-mode readiness or provider test.

### Local summary-only rehearsal

Use this only when the owner explicitly wants to validate the live summary
boundary without paying for another ElevenLabs interview. It is not the default
fake rehearsal and does not count as a complete live voice pass.

1. Use only the checked-in synthetic sample CV or synthetic conversation-first
   scenario. Confirm the OpenAI/Turnstile project, balance/caps, allowed
   `localhost` hostname, and the maximum of one intended summary operation.
2. In the ignored backend environment, the owner sets `APP_ENV=local`,
   `PROVIDER_MODE=live`, `PAID_DEMO_ENABLED=true`, and
   `LIVE_INTERVIEW_ENABLED=false`. OpenAI, Turnstile, and both application
   secrets remain required. ElevenLabs values are not required by this mode.
3. Restart both applications with the canonical production-like local startup.
   Confirm the persistent **Summary rehearsal** notice and that both the
   simulated CV-assisted and conversation-first paths are available. Stop if
   the notice or mode differs.
4. Complete the deterministic fake interview through the selected path. Its
   diagnostics must say `fake`; CV analysis uses the deterministic analyzer and
   no ElevenLabs client, WebRTC session, speech operation, or voice charge is
   expected. The CV-analysis and voice-authorization routes still consume their
   real Turnstile challenges before returning deterministic local results.
5. Normal fake-voice disconnect automatically starts the real
   `interview_summary` Turnstile check and at most one metered OpenAI summary.
   This can spend the one summary operation even if **View summary** is never
   clicked. While it is pending, confirm the completed workspace shows no
   passive “checking” status and keeps **View summary** disabled with a
   continuous spinner. If Turnstile genuinely requires interaction, complete
   the visible challenge. When preparation settles, the button becomes enabled;
   click it to expose the ready review or preserved failure/retry state. Retry
   only through the visible explicit action after a retryable failure; never
   refresh or repeat for metrics.
6. Review only sanitized request count, coarse usage/cost, and provider status.
   This evidence validates summary behavior only, not ElevenLabs or live voice.
7. When finished, the owner restores `LIVE_INTERVIEW_ENABLED=true`,
   `PAID_DEMO_ENABLED=false`, and `PROVIDER_MODE=fake`, then restarts both apps.

Automated tests always override their process to fake/paid-disabled and never
load the ignored local file, regardless of these owner-selected runtime values.

### Canonical local startup — no stale processes

Run both long-lived applications outside any restricted execution sandbox with
unrestricted network access. This is required for both processes, not only the
backend: the frontend must reach the local API and provider-owned browser
endpoints, while a live backend must reach Turnstile, OpenAI, and ElevenLabs.
This operational exception does not apply to tests or CI, which remain
fake-provider, paid-disabled, network-denied, and unable to spend credits.

1. Stop the previous frontend and backend processes and confirm ports `3000`
   and `3001` have no stale listeners.
2. In terminal 1 at the repository root, run:

   ```powershell
   corepack pnpm build:backend
   corepack pnpm start:backend:local
   ```

   The second command deliberately loads the ignored
   `apps/backend/.env.local`; never put its values on the command line. Wait for
   port `3001` to be listening before continuing.
3. In terminal 2 at the repository root, run:

   ```powershell
   corepack pnpm build:frontend
   corepack pnpm --filter @screenpilot/frontend start
   ```

   Next.js loads `apps/frontend/.env.local` automatically. Open
   `http://localhost:3000/demo` after port `3000` is ready.

For frontend editing only, `corepack pnpm dev:frontend` may replace the
frontend build/start pair. A clean live-provider verification always uses the
production-like build/start pair above for both apps. Restart after any backend
build so the process cannot retain stale compiled modules or environment state.

Do not place a literal value in this guide. Record only redacted evidence such
as a key name, last four characters, creation date, expiry, permission summary,
and where it is stored.

## OpenAI API Platform

### 1. Why it is required

The backend uses the OpenAI Responses API directly for non-voice provider work.
The repository locks this path to `gpt-5.4-mini` with reasoning `none` and
`store: false`. The key is never sent to ElevenLabs or to the browser.

For CV analysis, one accepted user action sends exactly one evidence-only
Structured Outputs request. The backend applies safe normalization and builds
the universal screening plan locally; it never sends an automatic paid repair
request. A visible Retry analysis action is a new request and requires a fresh
Turnstile token. Provider diagnostics contain only fixed categories, validation
rule IDs, field paths, duration, usage, and optional HTTP status—not CV text,
generated values, response bodies, or raw causes.

For interview summary, one accepted user action likewise sends at most one
Structured Outputs request. The server—not the model—is authoritative for the
exact role record, topic partition, evidence IDs, captured candidate questions,
human follow-ups, compensation/availability evidence, and fixed limitations.
It reconciles those fields locally, keeps model-authored narrative only after
the complete domain/evidence/safety check, and otherwise returns its bounded
grounded evidence summary. It never sends an automatic paid repair request. A
structurally unusable provider response fails closed after the one request; the
backend log may contain only bounded validation rule IDs and field paths, never
transcript text or generated values. A visible Retry is a separate owner action
with a fresh Turnstile token.

### 2. Account and billing prerequisites

1. Sign in to the [OpenAI API Platform](https://platform.openai.com/).
2. Confirm that this is the API Platform account and billing area, not merely a
   ChatGPT subscription.
3. Create or select a dedicated ScreenPilot project from the project switcher.
   If the project controls are unavailable, an organization owner may need to
   create the project or change the member's role.
4. In the project's billing or credit balance area, choose a deliberately small
   initial budget. Current prepaid billing documentation states a USD 5 minimum,
   a USD 10 default initial purchase, optional auto-recharge, and one-year
   credit expiry. Recheck those values in the dashboard before purchasing
   because pricing and billing controls can change.
5. If auto-recharge is shown during prepaid setup, turn it off unless the owner
   explicitly wants it. If it is enabled, set a low recharge amount and monthly
   recharge cap.
6. Configure usage alerts below the intended ceiling. Where the project exposes
   `Limits > Spend > Enforce hard limit`, enable a small hard limit too.
   Enforcement is not instantaneous, so alerts and ScreenPilot's own kill switch
   remain necessary.

Official paths:

- [API quickstart](https://developers.openai.com/api/docs/quickstart)
- [How API projects work](https://help.openai.com/en/articles/9186755-managing-projects-in-the-api-platform)
- [API billing is separate from ChatGPT billing](https://help.openai.com/en/articles/9039756)
- [Prepaid API billing](https://help.openai.com/en/articles/8264644-what-is-chatgpt-plus)
- [Project and organization spend limits](https://developers.openai.com/api/docs/guides/spend-limits)

If labels move, search the official API Platform help for “projects,” “billing
overview,” “usage limits,” and “API keys.” Do not use a third-party walkthrough
as the authority.

### 3. Model access and project limits

1. In the ScreenPilot project, open `Limits`.
2. Confirm `gpt-5.4-mini` is available to the project. The official model page
   currently lists Responses API support and reasoning effort `none`.
3. Keep only the models needed by ScreenPilot enabled if the dashboard offers a
   model allow-list.
4. Set conservative project rate and spend limits appropriate for a private
   local demo.
5. Do not silently substitute another model. If the locked model is unavailable,
   record the blocker and update the source of truth through a separate,
   reviewed decision.

Authority: [GPT-5.4 mini model page](https://developers.openai.com/api/docs/models/gpt-5.4-mini).

### 4. Create the narrow credential

1. Open `Organization settings > Projects > ScreenPilot > API Keys`, or the
   equivalent API-key page within the selected project.
2. Create a new secret key named so its owner and local-demo purpose are clear.
3. Prefer `Restricted` permissions.
4. Grant only the request/write permission required to create Responses API
   responses. Set unrelated resource categories to `None`. The exact permission
   label can differ by dashboard version; if the UI does not expose a granular
   Responses permission, record the exact category selected and use the
   narrowest setting that permits `POST /v1/responses`.
5. Copy the value once into `OPENAI_API_KEY` in
   `apps/backend/.env.local`. Do not put it in the ElevenLabs dashboard.
6. Record the key name, project, permission summary, creation date, and expiry or
   rotation date without recording the secret itself.

OpenAI documents `All`, `Restricted`, and `Read Only` key modes. Restricted
resource choices may be `None`, `Read`, or `Write` depending on the resource:
[API-key permissions](https://help.openai.com/en/articles/8867743-assign-api-key-permissions).

### 5. Safe verification

Before any paid request:

- Confirm the selected project is ScreenPilot.
- Confirm the key is restricted and the secret is visible only in the ignored
  backend file.
- Confirm `gpt-5.4-mini` is allowed.
- Confirm a small budget, alert, and available hard limit are set.
- Confirm `PROVIDER_MODE=fake` and `PAID_DEMO_ENABLED=false` remain in place.

Do not use a shell `curl` command that places the key in command history. The
repository's own backend path is the eventual verification path because it also
enforces request bounds and `store: false`.

### 6. Usage, privacy, and retention

Check project usage after each owner-authorized live smoke test. `store: false`
prevents Responses application state from being retained for later retrieval,
but it is not a promise that no provider-side processing or abuse-monitoring
retention exists. Review the current [OpenAI data controls documentation](https://developers.openai.com/api/docs/guides/your-data)
before using any non-synthetic content.

Only synthetic candidate data is permitted during setup and smoke testing.

#### Temporary synthetic-only input/output sharing

OpenAI may offer free daily usage for eligible API traffic when the owner opts
in to share that traffic's inputs and outputs with OpenAI. This is not a credit
grant and does not change ScreenPilot's runtime behavior. OpenAI states that API
content is not used to train or improve its models by default unless the owner
explicitly opts in; review the current
[OpenAI data controls documentation](https://developers.openai.com/api/docs/guides/your-data)
before changing the dashboard setting.

The owner may temporarily choose **Enabled for selected projects** and select
only **ScreenPilot** during local, owner-controlled live tests when every CV,
candidate detail, transcript, and summary is obviously synthetic. Never choose
**Enabled for all projects**. Fake mode sends no provider traffic, and localhost
does not make a live provider request local or private. `store: false` controls
Responses application-state storage; it does not cancel this explicit sharing
opt-in.

Before the first real CV, real candidate detail, external tester, or public
deployment:

1. Stop before sending any provider request and warn the owner that sharing is
   still enabled.
2. Open OpenAI API Platform `Organization settings > Data controls` and set
   **Share inputs and outputs with OpenAI** to **Disabled**.
3. Verify the disabled state after saving. Record only “OpenAI input/output
   sharing disabled,” the project name, and the verification date—never
   candidate content, a key, or account/billing identifiers.
4. Treat a missing login, unclear state, or failed save as a blocker for the
   real-data or public run.

### 7. Rotation and revocation

Create and install a replacement key first, restart and verify the backend with
fake mode still protecting paid routes, then revoke the old key. If a key is
exposed, revoke it immediately, search the repository and Git history for the
value, and do not assume deleting a local file removes it from history.

Use the project's usage page to review activity around the rotation:
[production API-key practices](https://developers.openai.com/api/docs/guides/production-best-practices).

### 8. What remains deferred

The final paid Responses request, provider output review, and cost evidence are
owner-only manual work. Production service accounts, hosted secret storage, and
deployment budgets belong to SP-026.

## ElevenLabs ElevenAgents

### 1. Why it is required

ElevenLabs owns the private voice agent, WebRTC conversation session, speech
recognition, speech synthesis, and the native LLM selection used during the
interview. ScreenPilot's backend exchanges its ElevenLabs key for a short-lived
conversation token; the browser never receives the provider key.

The repository does not use a public agent, public widget, hostname allow-list,
telephony number, custom LLM endpoint, webhook, knowledge base, server tool,
MCP integration, or a ScreenPilot OpenAI key inside ElevenLabs.

### 2. Account, plan, and cost controls

1. Sign in to the [ElevenLabs dashboard](https://elevenlabs.io/app).
2. Open the subscription or billing page and confirm the current plan, remaining
   credits or call minutes, concurrency, and overage behavior.
3. Choose the smallest plan that exposes the locked settings and allows the
   owner-authorized smoke test. Current plan names, included minutes, model
   charges, and overage rates are volatile; recheck the
   [official Agents pricing page](https://elevenlabs.io/pricing/agents) on the
   day of purchase.
4. Disable overages or set the lowest available spend/usage alert where the
   account supports it. Record any account-level controls that are unavailable.
5. Use synthetic setup data only.

Useful official references:

- [ElevenAgents quickstart](https://elevenlabs.io/docs/eleven-agents/quickstart)
- [Billing administration](https://elevenlabs.io/docs/overview/administration/billing)
- [Usage analytics](https://elevenlabs.io/docs/overview/administration/usage-analytics)

### 3. Create a private Blank agent

1. Open `ElevenAgents` in the dashboard.
2. Choose `Create agent` or `New agent`.
3. Select the `Blank` template.
4. Give it a clearly local-demo name.
5. Keep it private and require signed authentication.
6. Do not add a public widget, phone number, knowledge base, workflow, webhook,
   evaluation, or data-collection rule.

If the navigation labels move, use the official documentation search for
“ElevenAgents Blank agent,” “API keys,” “conversation flow,” “privacy,” and
“versioning.” Do not infer a setting from an unrelated text-to-speech screen.

ElevenLabs may rename `Save`, `Publish`, or `Deploy` controls. Saving agent
changes creates an immutable version. If the UI offers a separate publish or
deployment action, keep the agent private and do not expose a public channel.
Record the active version ID after the locked configuration is saved.

The owner compared the saved private agent against the locked matrix and
published Main on 2026-09-14. The initially verified immutable version was recorded as
`agentRevisionId: "agtvrsn_3001m2fxwb6ce0nva1gweerevkqr"` in the source target.
This value came from the dashboard's version history and was not guessed from
an agent ID.

Authority: [agent versioning](https://elevenlabs.io/docs/eleven-agents/operate/versioning).

### 4. Apply the locked ScreenPilot settings

Configure the following values exactly. If a dashboard label differs, use the
official documentation, the executable source target in
`apps/backend/src/providers/elevenlabs/elevenlabs-agent-config.ts`, and its
contract in `docs/SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md` to find the equivalent
control; do not improvise a different behavior.

| Area | Locked value |
| --- | --- |
| Product and template | ElevenAgents (`elevenagents`), one private Blank agent |
| First message | `Hi, what's your name?` |
| System prompt | Exact rendered `INTERVIEWER_SYSTEM_PROMPT` from `apps/backend/src/ai/prompts/interviewer-prompt.ts`. Source policy `sp021b-2026-09-23.1` was owner-published to private Main on 2026-09-24 at immutable revision `agtvrsn_9501m39701mmet6av5bz53yk6ggp`, with built-in `end_call` enabled as the sole active system tool. The owner later reconfirmed that state, the exact five saved client-tool configurations, and the exact source-controlled `end_call` description. On 2026-09-28 the same policy/tool configuration was republished with the 300-second maximum at current immutable revision `agtvrsn_2101m3m80ezpee3bvccqy3ymwamk`. Publication is configuration evidence only; paid/live acceptance remains open. |
| Language | English only |
| Native LLM | GPT-5.4 Mini (`gpt-5.4-mini`) through ElevenLabs |
| Reasoning | None / reasoning budget 0 |
| Maximum output | 160 tokens |
| Speech to text | Scribe v2 Realtime (`scribe_v2_realtime`) |
| Text to speech | Flash v2.5 (`eleven_flash_v2_5`) |
| Voice | One owner-selected voice whose ID matches `ELEVENLABS_VOICE_ID` |
| Expressive mode | Off |
| Voice behavior | SP-018 source baseline keeps normal eagerness, interruptions enabled, and provider-default buffering; empirical adjustment requires controlled live measurement |
| Turn eagerness | Normal |
| Take turn after silence | 12 seconds |
| Interruptions | Enabled |
| Client events | Exactly `audio`, `interruption`, `user_transcript`, `agent_response`, `agent_response_correction`, `agent_chat_response_part`, and `vad_score`; typed streaming parts drive Pilot captions, final events drive local turns, and VAD scores ≥0.5 define candidate speech |
| System tools | Enable only **End conversation** (`end_call`) with the source-controlled completion description; every other system tool remains off |
| Soft timeout | Source target `sp018-2026-09-16.1`: disabled pending deployed evidence; if measurement warrants activation, exactly 1.5 seconds, static `Mm-hm…`, one maximum per generation, no alternate/randomized messages, no LLM-generated message, and disabled before the first user message |
| Maximum conversation duration | 300 seconds |
| Transport | Private browser WebRTC with a backend-issued conversation token |
| Save audio | Off |
| Retention | 0 days |
| Zero Retention Mode | Enable only if the plan supports it and required client events still work; otherwise leave off and record the blocker |
| Backup LLM | Disabled |
| Debug mode | Off |

Relevant first-party settings guides:

- [Conversation flow and call limits](https://elevenlabs.io/docs/eleven-agents/customization/conversation-flow)
- [Native LLM selection and reasoning](https://elevenlabs.io/docs/eleven-agents/customization/llm)
- [Voice settings](https://elevenlabs.io/docs/eleven-agents/customization/voice)
- [Scribe v2 Realtime in ElevenAgents](https://elevenlabs.io/blog/scribe-v2-realtime-in-elevenlabs-agents)

### 5. Add the exact dynamic-variable names

Create exactly these eight dynamic variables, preserving case and spelling:

- `screenpilot_policy_version`
- `screenpilot_entry_mode`
- `screenpilot_demo_disclosure`
- `screenpilot_screening_plan`
- `screenpilot_role_context`
- `screenpilot_cv_context`
- `screenpilot_known_state`
- `screenpilot_remaining_seconds`

Use obvious synthetic placeholders while editing the dashboard, for example
`sp017-pending`, `conversation_first`, `synthetic demo only`,
`universal HR topics only`, `undecided`, `no CV supplied`,
`no confirmed facts`, and `300`. Never paste a real CV or candidate transcript
into a dashboard placeholder.

The SP-017 prompt references these names directly. Dynamic-variable names and
template references must match exactly:
[dynamic variables](https://elevenlabs.io/docs/eleven-agents/customization/personalization/dynamic-variables).

### 6. Synchronize the source-controlled interviewer prompt

Do this only after the local SP-017 prompt tests pass. The TypeScript constant
is the prose source of truth; the dashboard is a deployed copy and must never
be edited as an independent prompt draft.

Current synchronization status: source policy `sp021b-2026-09-23.1` passed
deterministic fake/provider-shaped verification and was owner-published to
private Main on 2026-09-24 with built-in `end_call` enabled as the sole active
system tool.
Current immutable revision `agtvrsn_2101m3m80ezpee3bvccqy3ymwamk` maps this
policy to the published 300-second maximum. Prior immutable revision
`agtvrsn_9501m39701mmet6av5bz53yk6ggp` remains the 2026-09-24 behavior baseline;
Main branch ID `agtbrch_8401m2ar2j6nfshaa5wg31f0j654` is not revision evidence.
The policy fixes same-response fallback continuation and final-question
decline → closing + `end_call`. The owner later reconfirmed that `end_call`
remains the sole active system tool and that all five saved client tools match
their source-controlled descriptions, parameters, bounds, and Wait-for-response
behavior. The owner also reopened `end_call` and confirmed its custom description
exactly matches `ELEVENLABS_END_CALL_TOOL_DESCRIPTION`. One later synthetic
sample-CV standard-live flow passed the corrected question flow, Team/work-style
flow, automatic ending, and summary/review; the remaining SP-021B live/manual
matrix stays open.

Before live activation, complete SP-021B's remaining free checklist. The owner
reported every available user-facing deterministic fake flow passing in both
current entry paths through completion and review. The paired evidence,
completed-workspace handoff, diagnostics clearing, and corrected live summary
boundary also pass. The latest Team/work-style fact/evidence reconciliation
needs one affected fake review observation; exact sample-CV provenance and the
deliberately injected summary error/retry and interruption paths remain open.

1. Run the focused prompt suite in fake mode. Do not start a Preview
   conversation.

   ```powershell
   node ./node_modules/vitest/vitest.mjs run --root apps/backend src/ai/prompts/interviewer-prompt.test.ts
   ```
2. Run `pnpm build:backend`, then print the exact rendered prompt without
   reading any local environment file:

   ```powershell
   node -e "import('./apps/backend/dist/ai/prompts/interviewer-prompt.js').then((module) => process.stdout.write(module.INTERVIEWER_SYSTEM_PROMPT))"
   ```

3. In the existing private **ScreenPilot** agent, replace the complete System
   prompt with that rendered value. Do not paste the surrounding TypeScript,
   alter the `{{screenpilot_*}}` references, add procedures/guardrails in a
   second dashboard field, or enter real candidate content as preview data.
4. Confirm the first message, eight dynamic variables, five client tools, native
   GPT-5.4 Mini model, reasoning None, and 160-token output limit still match
   the source-controlled configuration. Keep Preview off; prompt publication
   alone does not authorize a paid or microphone test.
5. Save/publish only to the private Main branch. Record the resulting immutable
   agent version and matching `agentRevisionPolicyVersion` in
   `apps/backend/src/providers/elevenlabs/elevenlabs-agent-config.ts`, rerun the
   same prompt test, and record the prompt version, model alias or snapshot, and
   agent revision in the SP-017 completion evidence. If publication is not
   performed, leave revision/live acceptance unchecked and keep the last
   verified revision explicitly identified as the older published policy.

Never use a real CV, real candidate detail, or live transcript for dashboard
preview values. The checked-in synthetic fixtures under
`tests/fixtures/transcripts/` are the only approved evaluation content.

### 7. Add the exact client-tool names

Create exactly these five client tools, preserving case and spelling:

- `recordInsight`
- `correctInsight`
- `markTopic`
- `recordCandidateQuestion`
- `requestFollowup`

Tool names and parameters are case-sensitive. The exact dashboard descriptions,
parameter descriptions, required flags, enums, and character bounds are
source-controlled in
`packages/contracts/src/interview/client-tools.ts` as
`VOICE_CLIENT_TOOL_DASHBOARD_DEFINITIONS`. They are paired with the executable
Zod schemas and must be copied without paraphrasing.

| Tool | Required parameters |
| --- | --- |
| `recordInsight` | `category`: string enum of the 12 `RECORDABLE_INSIGHT_CATEGORIES`; `label`: string, 1–120 characters; `value`: string, 1–600 characters with the documented 120-character identity limit; `source`: string enum `CV`, `Candidate`, `CV + Candidate` |
| `correctInsight` | `cardId`: string, 1–64 characters; `value`: string, 1–600 characters with the documented 120-character identity limit; `reason`: string, 1–500 characters |
| `markTopic` | `topicKey`: string enum of the 12 `UNIVERSAL_TOPIC_KEYS`; `status`: string enum `in_progress`, `covered`, `skipped`, `needs_clarification` |
| `recordCandidateQuestion` | `question`: string, 1–600 characters |
| `requestFollowup` | `reason`: string, 1–500 characters |

For every tool:

- make every listed parameter required;
- enable **Wait for response** so the agent receives the browser handler's
  `Applied:` or `Rejected:` result;
- copy every character bound verbatim into its parameter description. The
  current ElevenLabs client-tool editor exposes string type, required status,
  description, and enum values but no separate minimum/maximum-character
  controls. Do not invent unsupported JSON fields; ScreenPilot's matching Zod
  schemas remain the runtime enforcement boundary for those bounds;
- leave dynamic-variable assignments and response mocks absent; and
- do not enable a tool-call sound or allow a tool call to bypass the normal
  interruption policy.

Client tools are workspace-level resources and each tool's **Save** action
persists independently from an agent-branch publication. When the same tool IDs
remain attached to Main, description or parameter edits may therefore be absent
from the branch publish diff. Reopen and compare all five saved tools with
`VOICE_CLIENT_TOOL_DASHBOARD_DEFINITIONS` after publication before claiming
dashboard synchronization.

Do not create server tools, webhooks, code tools, MCP tools, or any system tool
except the single built-in **End conversation** tool described below:
[client tools](https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools).

Enable **End conversation** and keep its tool name as `end_call`. Use the exact
description from `SCREENPILOT_ELEVENLABS_AGENT_CONFIG.systemTools.endCall`.
This is the provider-owned terminal signal after ScreenPilot's spoken close;
the browser maps the SDK's typed agent disconnect into its existing one-time
Review transition. Do not add phrase matching in browser code. Keep language
detection, transfer, skip-turn, state update, DTMF, and voicemail tools off.

### 8. Advanced-settings audit

Review every dashboard section before saving. This table records whether a
setting is configured now, deliberately disabled, kept at a provider default,
not applicable, or deferred to a named later ticket.

| Dashboard area | Required audit result |
| --- | --- |
| Agent identity/template | Blank private agent; configured now |
| First message | Exact locked sentence; configured now |
| System prompt | Exact rendered SP-017 source-controlled prompt; publication/revision evidence stays unchecked until synchronized |
| Procedures and guardrails | Disabled or empty; all adaptive policy prose remains in the source-controlled prompt |
| Multimodal input | Disabled or not applicable |
| Channel behavior | Provider default for WebRTC; channel tuning deferred to SP-018 |
| Languages | English only; additional languages and automatic multilingual expansion disabled |
| Language-detection system tool | Disabled because the agent is English only |
| End-conversation system tool | Enabled as the sole system tool, with the exact source-controlled `end_call` description |
| LLM model | Native GPT-5.4 Mini; configured now |
| Reasoning | None / budget 0; configured now |
| Maximum output | 160 tokens; configured now |
| Temperature or sampling controls | Provider default; prompt/model tuning deferred to SP-017 and SP-018 |
| Backup LLM | Disabled to prevent an undocumented fallback |
| Custom LLM / BYOK | Disabled or not applicable; ScreenPilot's OpenAI key is never entered here |
| Speech recognition | Scribe v2 Realtime; configured now |
| STT language detection, keywords, diarization, custom vocabulary | Default, off, or not applicable unless a later ticket explicitly owns it |
| TTS model | Flash v2.5; configured now |
| Voice | One selected voice; record its ID |
| Speed, stability, similarity, style, speaker boost, normalization | Provider defaults; tuning deferred to SP-018 |
| Pronunciation dictionary | Empty; later addition requires an explicit policy/tuning owner |
| Expressive mode / Eleven v3-only behavior | Disabled or not applicable |
| Multiple voices, background audio, voice filters | Disabled or not applicable |
| Turn eagerness | Normal; configured now |
| Silence threshold | 12 seconds; configured now |
| Interruptions | Enabled, including the required client event if the dashboard separates the controls |
| Soft timeout | Disabled |
| Maximum duration / call limit | 300 seconds |
| Idle prompts or extra timeout messages | Provider default or off; do not add unapproved behavior |
| Dynamic variables | Exact eight names; configured with synthetic placeholders |
| Secret dynamic variables and overrides | None; disabled |
| Client tools | Exact five names, source-controlled descriptions, required parameters, enums, and bounds from `VOICE_CLIENT_TOOL_DASHBOARD_DEFINITIONS` |
| Tool-call sounds, tool interruption, wait-for-response, and response behavior | Wait for response enabled for all five so `Applied:`/`Rejected:` reaches the agent; dynamic assignments and response mocks absent; sounds off; normal interruption policy retained |
| Server, webhook, code, MCP, or integration tools | Disabled or not applicable; no additional system tools |
| Knowledge base / RAG | Disabled or empty |
| Workflows, branches, sub-agents, transfer rules | Disabled or not applicable |
| Evaluation criteria, post-call analysis, data collection, sentiment | Disabled or empty |
| Dashboard testing, simulation, and test suites | No live/dashboard run in SP-014A; synthetic policy evaluation belongs to SP-017 and deterministic timing behavior to SP-018. SP-018A completed the bounded initial smoke; SP-021B first proves the memory-only diagnostics in fake mode, then runs the two consolidated live complete flows without a timing-sample quota. |
| Initiation and post-call webhooks | Disabled |
| Experiments, traffic splits, alternate versions | Disabled; one active Main version |
| Server-to-client and client-to-server events | Only events required by the private WebRTC bridge and exact client tools; normalization and handlers are deferred to SP-015 and SP-016 |
| Widget and public embed | Disabled or unpublished |
| Telephony, phone numbers, SIP, outbound calling | Disabled or not applicable |
| Third-party integrations and custom channels | Disabled or not applicable |
| Conversation transport | Authenticated private browser WebRTC |
| Signed authentication | Enabled |
| ElevenLabs hostname allow-list | Disabled; ElevenLabs documents signed auth and allow-listing as alternative access controls, while Turnstile hostname checks remain separate |
| Debug mode | Off |
| Audio saving | Off; verify explicitly because provider documentation says saving is enabled by default |
| Data retention | 0 days |
| Zero Retention Mode | Account-dependent; enable only if available and compatible with required client events, then record the exact result |
| Data residency, redaction, compliance add-ons | Account-dependent and not assumed; leave unchanged unless required and documented |
| Conversation history and provider analytics | Provider-native only; do not export candidate data, and expect evidence to be limited by zero-day retention |
| Spotlight, real-time monitoring, and OpenTelemetry traces | Disabled or not applicable; no candidate telemetry export |
| ElevenLabs CLI and Hosted MCP | Disabled or not applicable |
| ElevenLabs environment variables and secrets | None; ScreenPilot sends only bounded dynamic variables at runtime |
| Versioning | Save one active version and record the immutable version ID; no branches or traffic split |

Privacy authorities:

- [ElevenAgents privacy settings](https://elevenlabs.io/docs/eleven-agents/customization/privacy)
- [Audio saving](https://elevenlabs.io/docs/eleven-agents/customization/privacy/audio-saving)
- [Retention](https://elevenlabs.io/docs/eleven-agents/customization/privacy/retention)
- [Zero Retention Mode](https://elevenlabs.io/docs/eleven-agents/customization/privacy/zrm)

Zero Retention Mode is plan-dependent, and current documentation describes
webhooks as the way to retrieve data from ZRM calls. ScreenPilot does not add a
webhook or durable candidate store to work around that limitation. If ZRM
prevents the required client events or is unavailable, leave it off, retain
audio saving off and retention at zero days, and record the limitation.

#### Deferred research: ElevenLabs-managed call audio

`Store Call Audio` remains **off** for the current demo. Its presence in the
dashboard is preserved as a future product-research option for replayable
evidence audio; it is not authorization to record a candidate or to change the
current transcript-only design.

Before proposing that the switch be enabled, answer and document all of the
following from current first-party ElevenLabs documentation and a synthetic
test call:

- **Storage:** where the recording is stored, which workspace users or provider
  personnel can access it, its encryption/residency behavior, applicable plan
  limits and costs, and how `Store Call Audio`, retention `0`, deletion timing,
  Zero Retention Mode, and manual deletion interact.
- **Retrieval:** whether recordings are retrievable through the dashboard,
  API, or both; the required API-key scope; returned format or expiring URL;
  download/stream/export behavior; and how access and deletion are verified.
- **Timestamps:** whether ElevenLabs exposes reliable recording, turn, segment,
  word, or transcript start/end timestamps; the clock/offset reference used;
  whether interruptions and reconnects preserve alignment; and whether a
  bounded evidence excerpt can be derived without keeping a full recording in
  ScreenPilot.

Also decide explicit recording consent and disclosure, candidate access and
deletion handling, retention duration, authorization, mobile/browser behavior,
playback echo prevention, and the threat/cost model. Any experiment must use
synthetic voices and data first. Enabling provider recording for real candidate
content requires a separate owner-approved scope/privacy decision and updated
product copy, tests, runbook, and source-of-truth controls.

### 9. Create the narrow credential

1. For a user key, open the dashboard's personal API-key settings. For a
   service account, use `profile icon > Workspace settings > Service Accounts`
   if the plan and owner role expose it.
2. For local personal development, a user key is acceptable. For a future
   backend deployment, ElevenLabs recommends a service account, but that is
   account-dependent and belongs to SP-026.
3. Name the key for ScreenPilot local token issuance.
4. Set an expiry or near-term rotation reminder.
5. Apply a low credit quota if the dashboard offers it.
6. Grant only the ElevenAgents/Conversational AI permission required to call
   `GET /v1/convai/conversation/token` for the configured agent. Dashboard scope
   labels can vary; record the exact label. Do not enable unrelated speech,
   music, dubbing, voice creation, or administrative scopes.
7. Use IP allow-listing only if the local backend has a stable public egress IP.
   Do not enter `localhost` as though it were an egress IP.
8. Copy the secret once into `ELEVENLABS_API_KEY` in the ignored backend file.
9. Copy the private agent ID and selected voice ID into
   `ELEVENLABS_AGENT_ID` and `ELEVENLABS_VOICE_ID`.

Authorities:

- [ElevenLabs API keys](https://elevenlabs.io/docs/overview/administration/workspaces/api-keys)
- [Private-agent authentication](https://elevenlabs.io/docs/eleven-agents/customization/authentication)
- [WebRTC conversation-token endpoint](https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/get-webrtc-token)

### 10. Safe verification, rotation, and revocation

Before any live conversation:

- Compare every saved value with the locked table.
- Confirm the agent is private and signed authentication is enabled.
- Confirm the selected voice ID matches the environment value.
- Confirm audio saving is off, retention is 0, backup LLM is off, and debug is
  off.
- Confirm the exact eight dynamic variables and all five client-tool
  descriptions, required parameters, enums, bounds, and Wait-for-response
  settings.
- Record the agent version ID and a redacted key permission summary.
- Keep `PROVIDER_MODE=fake` and `PAID_DEMO_ENABLED=false`.

After the owner later authorizes a live test, review usage and cost immediately.
Do not rely on retained audio or transcript evidence.

Rotate by creating a replacement key, updating the ignored backend file,
restarting and verifying the bounded token path, then revoking the old key.
Revoke immediately after any suspected exposure.

Final agent publication/configuration review, provider token issuance, WebRTC
connection, voice behavior, interruption behavior, microphone behavior, event
delivery, retention proof, and cost evidence remain manual and unchecked.

## Cloudflare Turnstile

### 1. Why it is required

Turnstile supplies a short-lived, single-use proof before ScreenPilot authorizes
the paid CV-analysis, voice-token, and summary endpoints. Turnstile can be used
without moving DNS or traffic behind Cloudflare.

ScreenPilot needs a widget site key and secret only. It does not need a
Cloudflare API token, zone, proxy, Workers deployment, WAF rule, or hosting
project for this local ticket.

### 2. Account and plan prerequisites

1. Sign in to the [Cloudflare dashboard](https://dash.cloudflare.com/).
2. Open `Turnstile` and choose `Add widget`.
3. A Free plan is sufficient for the local widget unless the owner has a
   separate organizational requirement. Recheck the
   [current Turnstile plans](https://developers.cloudflare.com/turnstile/plans/)
   before choosing.

If navigation moves, search Cloudflare's official dashboard and documentation
for “Turnstile add widget,” “Managed mode,” “hostname management,” and
“Siteverify.” Do not create a zone, Worker, API token, or proxy configuration as
a substitute.

### 3. Create the local widget

1. Give the widget a clear ScreenPilot local-development name.
2. Add `localhost` as the allowed hostname.
3. Do not include `http://`, `https://`, a port, a path, or wildcard syntax.
   Cloudflare's current hostname rules state that a parent hostname can cover
   its subdomains even though wildcard characters are unsupported; for this
   local widget, authorize only `localhost`.
4. Select the `Managed` widget mode.
5. Create the widget and copy:

   - the site key to `TURNSTILE_SITE_KEY`;
   - the secret key to `TURNSTILE_SECRET_KEY`;
   - `localhost` to `TURNSTILE_ALLOWED_HOSTNAMES`.

The repository separately renders the widget with
`appearance: "interaction-only"`. That appearance is a client rendering option,
not a replacement for choosing Managed challenge mode in the dashboard.

Authorities:

- [Turnstile setup](https://developers.cloudflare.com/turnstile/get-started/)
- [Dashboard widget management](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/)
- [Hostname management](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/)
- [Widget configuration and appearance](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/)

### 4. Lock the exact actions

Use one widget for the three existing actions:

- `cv_analyze`
- `voice_token`
- `interview_summary`

The frontend sends the relevant action with the challenge. The backend calls
Siteverify and checks success, the exact expected action, and the configured
hostname before consuming the proof. Do not create alternate spellings.

Cloudflare currently limits action values to 32 characters using letters,
numbers, underscores, and hyphens:
[widget action configuration](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/).

### 5. Safe local test-key option

Cloudflare publishes dummy site and secret keys for automated testing. Use only
the current values copied directly from the
[official testing page](https://developers.cloudflare.com/turnstile/troubleshooting/testing/);
do not copy their literal values into this public runbook or the committed
environment examples.

Dummy keys prove deterministic application behavior, not the real widget's
hostname setup, analytics, secret handling, or production acceptance. Real
secret keys reject dummy tokens, and dummy secret keys are not production
credentials.

### 6. Server-side verification behavior

Siteverify is mandatory. Current Cloudflare documentation says a token expires
after five minutes, is single-use, and must be checked on the server. The
repository additionally validates `action` and `hostname` and keeps consumed
tokens in process memory only for their bounded lifetime.

Authority: [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

### 7. Usage and analytics

The Turnstile dashboard can show solve rate, traffic, top actions, and
hostnames. After an owner-authorized real-widget test, confirm only `localhost`
and the three expected actions appear. Analytics are provider-side operational
metrics, not permission to add candidate analytics to ScreenPilot.

Authority: [Turnstile analytics](https://developers.cloudflare.com/turnstile/turnstile-analytics/).

### 8. Rotation and revocation

Cloudflare's rotation flow allows the previous and replacement secret to
overlap for up to two hours. Start rotation in the widget's settings, copy the
replacement into the ignored backend file, restart and verify, then allow the
old secret to expire. If compromise is suspected, minimize the overlap.

Authority: [rotate a Turnstile secret](https://developers.cloudflare.com/turnstile/troubleshooting/rotate-secret-key/).

### 9. What remains deferred

Real-widget rendering, the Siteverify success path, action and hostname
rejection, token replay/expiry, analytics evidence, and secret rotation are
owner-only manual checks. Production hostname and deployment setup belong to
SP-026.

## Fake-to-live readiness sequence

Do these phases in order. A successful documentation review is not the same as
a successful provider setup or live test.

### Phase A: deterministic repository state

- [x] Committed environment examples contain no usable credentials.
- [x] Fake mode and paid-demo defaults are safe.
- [x] Required credential names, agent settings, actions, and signing-secret
  rules are documented here.
- [x] No fourth credentialed non-deployment provider is present.

### Phase B: owner account setup

Owner-reported OpenAI checkpoint on 2026-09-14. This records only safe setup
state, not a payment method, account identifier, key, or billing screenshot:

- [x] The dedicated API project is named **ScreenPilot**.
- [x] The `gpt-5.4-mini` alias is allowed; the dated model snapshot shown during
  setup was left unselected.
- [x] USD 5 of initial prepaid API credits were purchased and auto-reload is
  disabled.
- [x] The organization monthly spend limit is USD 5 with hard-limit enforcement
  enabled.
- [x] Organization spend alerts are configured at 20%, 50%, 80%, and 100% of
  the USD 5 monthly hard limit: USD 1, USD 2.50, USD 4, and USD 5. The owner
  verified the dashboard list on 2026-09-14.
- [x] Input/output sharing is enabled only for the selected ScreenPilot project
  under the synthetic-only exception above. Eligible shared traffic may receive
  free daily usage; this is not treated as a guaranteed credit grant.
- [ ] Input/output sharing is disabled and re-verified before any real CV, real
  candidate detail, external tester, or public use.
- [x] The owner reports that the `ScreenPilot local backend` project key was
  created with restricted permissions, a finite expiry, and only Responses
  write access, then saved as `OPENAI_API_KEY` in the ignored backend
  environment file. The key value was never shared with or read by the coding
  agent.
- [x] On 2026-09-28 the owner activated ElevenLabs Starter at USD 6/month,
  verified Auto Top Up off, and enabled a workspace credit-usage email
  threshold. ScreenPilot's stricter per-agent controls remain 5 calls/day and
  1 concurrent call. No Pay As You Go top up or usage-based overage is
  authorized.
- [x] The owner reports that the `ScreenPilot local backend` user key was
  created with a 30-day expiry, a 2,500-credit quota, restricted access, only
  `ElevenAgents: Write`, no IP allow-list, and automatic leak disabling enabled,
  then saved as `ELEVENLABS_API_KEY` in the ignored backend environment file.
  The key began with Read access and was raised to Write during the authorized
  2026-09-16 token test; the key value was never shared with or read by the
  coding agent.
- [x] The owner reports that the existing private agent now requires signed
  authentication; all client overrides are off; initiation and post-call
  webhooks are off; the daily call limit is 5; the concurrent call limit is 1;
  and burst pricing and call queuing are off.
- [x] The owner reports that `Store Call Audio` is off, retention is 0 days,
  transcript/derived-field deletion and audio deletion are enabled, and the
  setting was not retroactively applied to existing conversations. Zero
  Retention Mode remains off because compatibility with the locked native LLM
  and required events has not been established.
- [x] The owner reports that chat mode and file attachments are off, Scribe v2
  Realtime is selected by Turn V3, turn eagerness is Normal, take-turn-after-
  silence is 12 seconds, and end-after-silence is disabled. On 2026-09-28 the
  owner reverified that the dashboard still used the prior 480-second maximum,
  reviewed four ScreenPilot conversations averaging 2:39, and selected the new
  300-second target. The owner then changed the maximum to 300 seconds and
  published immutable revision `agtvrsn_2101m3m80ezpee3bvccqy3ymwamk` on
  private Main. Source and provider are synchronized for this duration.
- [x] The owner selected the single voice labelled **Bella - Professional,
  Bright, Warm** with the **Flash** TTS family. The provider voice ID was later
  copied into the ignored backend environment file; the display label is not
  used as an identifier.
- [x] The first message is exactly `Hi, what's your name?`; English is the only
  language; GPT-5.4 Mini is primary with reasoning set to None, reasoning
  summaries off, a 160-token limit, backup LLM disabled, soft timeout disabled,
  parallel tool calling off, and temperature unset. Expressive Mode remains
  off. A bounded role-neutral placeholder prompt is installed until SP-017.
- [x] The six pre-SP-017 dynamic-variable names are referenced by the
  placeholder prompt and have text-only synthetic dashboard-preview defaults:
  `sp017-pending`, `conversation_first`, `synthetic demo only`,
  `universal HR topics only`, `undecided`, and `no CV supplied`. These defaults
  contain no real CV or candidate content and will be replaced with bounded
  session values by the later runtime integration.
- [x] The exact five case-sensitive names `recordInsight`, `correctInsight`,
  `markTopic`, `recordCandidateQuestion`, and `requestFollowup` are attached as
  Client tools. Each currently has only the explicit SP-016-reserved
  description, no parameters, no dynamic-variable assignments, no response
  mock, and wait-for-response off. All system tools remain off; no webhook,
  integration, server, code, or MCP tool was added. SP-016 still owns the final
  schemas, descriptions, handlers, and response behavior.
- [x] Guardrails and procedures are disabled/empty; workflow, knowledge base,
  extra branches, and traffic splits are absent; only Main receives 100% of
  traffic. Topic discovery, sentiment analysis, transcript translation, and
  source attribution are off; evaluation criteria and data collection each
  contain zero items. The unused default analysis-model selector is unchanged
  and does not authorize a post-call analysis job.
- [x] The existing agent's editable title is **ScreenPilot**. A stale selector
  label may continue to show the provider's earlier default until refresh; the
  editable agent title is the recorded owner-verified identity. No second agent
  was created.
- [x] The owner copied the existing ScreenPilot agent ID from the dashboard URL
  into `ELEVENLABS_AGENT_ID` in the ignored backend environment file. The
  identifier value was not shared with or read by the coding agent.
- [x] The owner copied the selected Bella provider voice ID into
  `ELEVENLABS_VOICE_ID` in the ignored backend environment file. The identifier
  value was not shared with or read by the coding agent.
- [x] The owner published the reviewed configuration to ScreenPilot/Main. The
  branch is owner-verified as Live at 100%, has no pending Draft badge, and the
  Publish control is disabled because no unapplied changes remain. No Preview
  conversation was started.
- [x] The single private ScreenPilot agent is configured against the locked
  matrix; its agent and voice identifiers are populated only in the ignored
  backend environment file, and immutable version
  `agtvrsn_1501m2mwx4ffek39r88ygh1ngxq4` is recorded in source. The existing
  default agent was reused rather than creating a duplicate.
- [x] SP-017 policy `sp017-2026-09-16.1`, including
  `screenpilot_known_state` and `screenpilot_remaining_seconds`, is synchronized
  to ScreenPilot/Main; the five placeholder tools are replaced with the exact
  source-controlled schemas and Wait-for-response behavior; and the new
  immutable agent revision `agtvrsn_1501m2mwx4ffek39r88ygh1ngxq4` is recorded
  with the matching policy version. No Preview conversation is claimed by this
  item.
- [x] SP-021A Prompt 1 source policy `sp017-2026-09-22.1` was owner-published to
  ScreenPilot/Main on 2026-09-22 after the complete rendered prompt was reviewed
  and the changed `recordCandidateQuestion` and `requestFollowup` descriptions
  were saved separately. The publish review targeted Main and no Preview or
  paid conversation was started. Immutable revision
  `agtvrsn_8901m350e924f2ev7t4pwnvq38b1` is recorded for this policy. Main's
  `agtbrch_8401m2ar2j6nfshaa5wg31f0j654` value remains a branch ID only, and the
  earlier `agtvrsn_1501m2mwx4ffek39r88ygh1ngxq4` revision remains historical
  evidence for `sp017-2026-09-16.1`.
- [x] On 2026-09-24 the owner replaced private Main's complete system prompt
  with source policy `sp021b-2026-09-23.1`, enabled the built-in `end_call`
  system tool as the sole active system tool, and published immutable revision
  `agtvrsn_9501m39701mmet6av5bz53yk6ggp`. Main branch ID
  `agtbrch_8401m2ar2j6nfshaa5wg31f0j654` remains branch identity only. No
  Preview or paid/live conversation is claimed by this publication.
- [x] On 2026-09-28 the owner changed private Main's maximum conversation
  duration from 480 to 300 seconds and published immutable revision
  `agtvrsn_2101m3m80ezpee3bvccqy3ymwamk`. The prompt policy, tool mapping, and
  Main branch identity remain unchanged. This records configuration
  synchronization only; it does not claim Preview or a paid/live conversation.
- [x] On 2026-09-24 the owner reconfirmed that `end_call` remains the sole active
  system tool and that all five saved client tools match their source-controlled
  descriptions, required parameters, enums, character-bound descriptions, and
  Wait-for-response behavior.
- [x] On 2026-09-24 the owner reopened `end_call` and confirmed that its custom
  description exactly matches
  `SCREENPILOT_ELEVENLABS_AGENT_CONFIG.systemTools.endCall.description`:
  “End the conversation immediately after ScreenPilot's brief closing sentence
  when screening is complete, the final candidate-question opportunity is
  resolved or declined, or the candidate asks to stop. Never wait for another
  user turn after closing.”
- [x] On 2026-09-24 the owner confirmed the immediate pre-live safety state:
  provider balance/caps were checked, ElevenLabs audio saving was off with
  retention at zero, Turnstile hostname/actions were correct, and paid routes
  had been proved closed before paid mode was enabled. This is configuration
  evidence only, not live acceptance or authorization for another paid call.
- [x] Owner-reported publication checkpoint on 2026-09-16: the publish review
  targeted ScreenPilot/Main and showed the complete rendered SP-017 prompt
  replacement, both added runtime variables (`screenpilot_known_state` and
  `screenpilot_remaining_seconds`) with synthetic placeholders, and `vad_score`
  added to the existing client-event stream. The owner then completed the
  publish action. All five client tools had already been saved separately as
  workspace-level resources with the source-controlled descriptions, required
  parameters, enums, and Wait-for-response enabled, so their unchanged tool IDs
  did not produce a branch-diff entry. Character bounds are present in parameter
  descriptions because the current dashboard does not expose separate
  min/max-character controls; browser Zod schemas enforce them at runtime.
  Dynamic-variable assignments and response mocks remain absent, and system
  tools remain disabled. The supplied
  `agtbrch_8401m2ar2j6nfshaa5wg31f0j654` value identifies Main's branch, not an
  immutable published revision. The later owner-confirmed publication supplied
  immutable revision `agtvrsn_1501m2mwx4ffek39r88ygh1ngxq4`, now recorded in
  source. No Preview or live result is claimed by this checkpoint.
- [x] Post-live-defect synchronization: add
  `agent_chat_response_part` to the existing client-event set, enable the sole
  built-in **End conversation** system tool with the exact source-controlled
  description, replace the prompt with policy `sp017-2026-09-16.1`, publish
  only Main, and record immutable revision
  `agtvrsn_1501m2mwx4ffek39r88ygh1ngxq4`. This dashboard
  update requires no Preview or paid conversation. The earlier publication
  checkpoint intentionally records the pre-correction state where system tools
  were still disabled.
- [x] The owner created the free `ScreenPilot local live` Turnstile widget in
  Managed mode with only `localhost` authorized and pre-clearance off. No
  Cloudflare zone, Worker, proxy, WAF rule, API token, paid plan, or Spin setup
  was created.
- [x] On 2026-09-24 the owner confirmed the local widget/account configuration
  remains complete for SP-022. Owner-controlled successful requests exercised
  all three expected actions—`cv_analyze`, `voice_token`, and
  `interview_summary`—on `localhost`. This is owner/runtime evidence, not a
  claim that the coding agent inspected the dashboard, and it does not replace
  SP-026's production-domain widget.
- [x] Provider plan limitations and observed dashboard labels are recorded;
  the remaining usage-summary check does not authorize a Preview or paid call.

### Phase C: local secret entry

- [x] Both `.env.local` paths are confirmed ignored by `.gitignore`; neither
  file existed when rechecked on 2026-09-14.
- [x] The OpenAI project key was copied only into
  `apps/backend/.env.local`; its value was not inspected.
- [x] The ElevenLabs user key was copied only into
  `apps/backend/.env.local`; its value was not inspected.
- [x] The ElevenLabs agent and voice identifiers are copied only into
  `apps/backend/.env.local`; neither value was inspected by the coding agent.
- [x] The Turnstile site key and secret key are copied only into
  `apps/backend/.env.local`; `TURNSTILE_ALLOWED_HOSTNAMES` is exactly
  `localhost`. Neither key value was shared with or read by the coding agent.
- [x] The owner reports that the two locally generated signing secrets are at
  least 32 characters, different from one another, and stored only in the
  ignored backend environment file. Neither value was shared with or inspected
  by the coding agent.
- [ ] The frontend file contains only the local backend origin.
- [ ] No secret appears in `git status`, `git diff`, documentation, screenshots,
  shell history, logs, or chat.

### Phase D: safe configuration readiness

SP-018A executed this phase before its paid CV and voice smoke. SP-021B repeats
the fail-closed checkpoint before its later consolidated paid window.

- [x] Correct the SP-009 backend local-start path so it deliberately loads the
  ignored backend environment file without printing it.
- [x] Make the SP-003/SP-012 public Turnstile site-key projection
  capability-aware so fake mode and paid-disabled live mode cannot load a real
  widget. The browser must also suppress CV, microphone, token, SDK, and WebRTC
  controls until paid live operations are explicitly enabled.
- [x] With `PROVIDER_MODE=fake` and `PAID_DEMO_ENABLED=false`, targeted
  deterministic checks still pass.
- [x] The owner selected `PROVIDER_MODE=live` while keeping
  `PAID_DEMO_ENABLED=false`, then confirms startup accepts only the complete
  credential group and paid routes remain disabled.
- [x] Deterministic public-projection coverage confirms bootstrap returns
  `providerMode: "live"`, `paidOperationsEnabled: false`, and an empty Turnstile
  site key. The owner-visible run confirmed CV analysis is unavailable and voice
  preflight does not render microphone or Start controls.
- [x] Owner-visible paid-disabled UI checkpoint on 2026-09-16: with the owner-
  confirmed `PROVIDER_MODE=live` and `PAID_DEMO_ENABLED=false`, `/demo` loaded,
  the CV path displayed **Paused for this safety check** with a disabled **CV
  analysis unavailable** action, and conversation-first preparation reached
  preflight where **Voice interview is unavailable right now** replaced the
  microphone and Start controls. This visual evidence does not by itself prove
  the exact bootstrap payload, route-gate ordering, browser network silence, or
  zero provider-account usage; those checks remain open below.
- [x] Restored-session regression coverage confirms a resumable tab revalidates
  bootstrap before any provider control becomes available; Strict Mode aborts,
  stale responses, stage transitions, and explicit retry cannot reuse an older
  persisted capability state to authorize a provider action.
- [x] At the historical no-spend checkpoint, the owner retained exclusive
  control of both switches and kept `PROVIDER_MODE=live` with
  `PAID_DEMO_ENABLED=false` until intentionally opening the bounded SP-018A paid
  window. After that smoke, the owner confirmed the current restored state is
  `PROVIDER_MODE=fake` with `PAID_DEMO_ENABLED=false`. SP-021B must repeat the
  fail-closed live/false checkpoint before its future paid window and restore
  fake/false afterward.
- [x] The no-spend phase is accepted as closed by the combined backend
  provider-spy tests, frontend fail-closed/network-denial tests, restored-session
  tests, startup evidence, and owner-visible browser confirmation. No paid
  capability was exposed and no provider, Turnstile, microphone, SDK, or WebRTC
  operation was intentionally initiated.

Implementation evidence on 2026-09-16: Node 24 deterministic suites passed 66
contract, 203 backend, and 229 frontend tests. Every package test runner forces
its isolated process to `PROVIDER_MODE=fake` and `PAID_DEMO_ENABLED=false`
before modules load and disables `.env.local` loading, regardless of local
runtime settings; backend/frontend safety tests assert those values and deny
unexpected application `fetch` calls.
All typechecks/builds and repository lint passed. Startup-only checks observed
ports 3001 and 3000 listening, stopped both,
and made no HTTP request or browser interaction. The later owner-visible browser
checkpoint confirms the intended paid-disabled CV and preflight composition.
Together, the public-projection, provider-spy, network-denial, restored-session,
startup, and owner-visible evidence closes Phase D without requiring another
manual repetition of the same paid-disabled flow. This does not authorize the
coding agent to change either switch or begin a provider operation.

### Phase E: owner-authorized live provider and dashboard checks

SP-018A executed the bounded CV-analysis and initial voice portions with
synthetic data. By owner decision on 2026-09-21, every unperformed full-flow
item below remains unchecked and moves to SP-021B after SP-019 through SP-021A.
The first live summary belongs to that consolidated window.

- [x] The owner explicitly authorizes the paid smoke test.
- [ ] Synthetic CV analysis makes at most one bounded direct OpenAI operation
  and is checked for cost and `store: false` behavior during SP-018A.
- [ ] During SP-021B, synthetic summary makes at most one bounded direct OpenAI
  operation per authorized complete flow and is checked for cost and
  `store: false` behavior.
- [x] The owner verifies successful real local Turnstile action/hostname
  handling through `cv_analyze`, `voice_token`, and `interview_summary`.
  Expiration, duplicate/replay, wrong-hostname, wrong-action, and timeout
  rejection remain deterministically covered so this checkpoint does not spend
  provider credits merely to force negative challenge states.
- [x] The owner verifies one private ElevenLabs token issuance and one WebRTC
  connection.
- [ ] ElevenLabs audio saving, zero-day retention, version ID, usage, and cost
  evidence are manually reviewed.
- [x] The owner confirms `PAID_DEMO_ENABLED=false` and `PROVIDER_MODE=fake` are
  restored after the bounded test. The coding agent did not inspect either
  ignored local environment file; SP-021B still owns post-window restart/fake-
  flow verification for its future consolidated run.

Live CV checkpoint on 2026-09-16: the owner-authorized paid run completed the
checked-in synthetic sample's full CV-assisted preparation path through browser
PDF extraction, real `cv_analyze` Turnstile verification, one bounded GPT-5.4
Mini evidence operation, deterministic universal-plan construction, combined
validation, and plan-preview rendering. The visible role suggestion and three
evidence cards matched the source-controlled expected fixture. The composite
usage/cost item above remains unchecked until provider-dashboard cost evidence
is reviewed; this checkpoint does not claim voice, negative Turnstile cases,
cleanup. Safety-switch restoration is confirmed separately above.

Live voice checkpoint on 2026-09-16: one owner-triggered Start passed the real
`voice_token` challenge, returned one successful backend token response, and
established one private ElevenLabs WebRTC session. The content-free backend log
recorded status `200` and a 1,054 ms route duration. The intended microphone and
level meter were visible, the synthetic two-way CV-assisted conversation was
intelligible, and four candidate-derived insight notes rendered. This is a
partial pass: Pilot-side captions were absent, and a verbal agent close did not
end the provider session or move the reducer into the existing scrubbed Review
placeholder. Both are blocking defects; no claim is made for all runtime
variables, both entry modes, all five tools, performance, provider cost/usage,
cleanup. Safety-switch restoration is confirmed separately above.

Deterministic voice-defect correction on 2026-09-16: Pilot-caption loss was
traced to global numeric provider-ID deduplication. Final message identity is
now speaker-scoped, and the bridge consumes the SDK's typed
`onAgentChatResponsePart` stream for bounded tentative/final Pilot captions.
Automatic completion now uses ElevenLabs' built-in `end_call` system tool and
the SDK's typed `reason: "agent"` disconnect; browser farewell phrase matching
is explicitly prohibited. The existing one-time agent-disconnect reducer path
enters the scrubbed Review placeholder. Focused regression tests cover the two
defects without a provider operation. The two live acceptance observations stay
unchecked until SP-021B's owner-observed complete flow; another partial paid
call is not required solely to repeat this fix.

The owner confirmed the corrected Main configuration was published without a
Preview or paid conversation. Historical immutable revision
`agtvrsn_1501m2mwx4ffek39r88ygh1ngxq4` remains recorded with policy
`sp017-2026-09-16.1`. On 2026-09-22 the owner separately published source policy
`sp017-2026-09-22.1` and its candidate-question fallback/tool-description delta
to private Main at immutable revision
`agtvrsn_8901m350e924f2ev7t4pwnvq38b1`, again without Preview or a paid
conversation. On 2026-09-24 the owner published successor policy
`sp021b-2026-09-23.1` with built-in `end_call` enabled as the sole active system
tool on the same private Main branch at immutable revision
`agtvrsn_9501m39701mmet6av5bz53yk6ggp`. The owner later reconfirmed that state
and the exact five saved client-tool configurations, then separately reopened
`end_call` and confirmed its exact source-controlled custom description. On
2026-09-28 the owner published the same policy/tool configuration with the
five-minute maximum at current immutable revision
`agtvrsn_2101m3m80ezpee3bvccqy3ymwamk`. This is configuration evidence only;
SP-021B observation is still required before this behavior can be described as
live-validated.

On 2026-09-24 one bounded synthetic sample-CV live interview reached the
completed workspace with the corrected published agent behavior, but its local
summary handoff failed before any `/v1/interview/summary` request. The frontend
summary contract incorrectly required ElevenLabs' numeric event sequence to be
globally unique even though the documented/live transcript identity is speaker
plus sequence and candidate/interviewer callbacks may reuse the number. The
contract, reducer/tool reconciliation, and persistence boundary now share that
speaker-scoped identity; same-speaker duplicates and duplicate turn IDs remain
invalid. Fake-only contract/frontend/backend coverage carries provider-shaped
shared sequences through one valid summary request. This correction authorizes
neither another live conversation nor an automatic paid summary retry; restart
and any retained-session summary attempt remain owner-controlled.

After that correction, the production frontend and backend were rebuilt with
Node 24.19, restarted without stale listeners, and verified healthy before one
new owner-controlled synthetic sample-CV standard-live run. The owner reported
the corrected candidate-question flow, Team/work-style question flow, brief
closing plus automatic `end_call`, completed-workspace handoff, and live
summary/review all working. Content-free backend evidence contains exactly one
successful `cv_analyze` request (HTTP 200, 9,894 ms), one successful
`voice_token` request (HTTP 200, 664 ms), and one successful
`interview_summary` request (HTTP 200, 4,848 ms), with no duplicate summary
request and no logged candidate/provider content. This is one completed CV-
assisted standard-live path; conversation-first, injected failures,
interruption, alternate endings, responsive/device checks, raw diagnostics,
cleanup/privacy inspection, provider-dashboard usage/cost/retention review, and
post-window safety restoration remain governed by SP-021B.

This run occurred while several SP-021B free/manual sequencing items were still
recorded as open. Preserve the successful CV-assisted evidence, but do not use
it to retroactively check those prerequisites or the remaining manual matrix;
complete the free follow-ups before closing the ticket or authorizing another
paid flow.

### Phase F: owner microphone and real-conversation checks

SP-021B owns every unchecked Phase F observation during the consolidated
complete-flow window. SP-025 reuses current evidence unless later changes
invalidate it.

- [x] The owner grants microphone permission in the intended browser.
- [ ] The owner confirms the intended input-device label and responsive level
  meter, including select/retry behavior.
- [ ] The owner confirms the first message is audible and candidate speech is
  intelligible.
- [ ] The owner confirms interruption, the 12-second silence threshold, the
  five-minute ceiling, cancellation, disconnect, and media-track cleanup.
- [ ] The owner confirms the five required client events arrive once and in the
  expected order without a duplicate voice session.
- [ ] The owner repeats the relevant UI checks at phone, tablet, laptop/desktop,
  large-monitor, and one intermediate drag-resized width.

### Phase G: production and deployment

- [ ] Deferred entirely to SP-026.
- [ ] No production domain, DNS, Cloud Run, Artifact Registry, Secret Manager,
  owner Google Cloud authentication, or hosted-secret step is performed from
  this local runbook.

An automated coding agent must leave Phase B through Phase G unchecked unless
the owner explicitly performs and reports the applicable steps. Microphone
quality and browser permission behavior require human observation; they are not
inferred from unit tests.

## Redacted setup record

Copy this table into a private, ignored owner note if an audit trail is needed.
Do not fill it in within source-controlled documentation.

| Item | Safe evidence to record | Never record |
| --- | --- | --- |
| OpenAI | Organization/project name, key label, last four characters, permission summary, creation/rotation date, model access, budget and alert values | Full key, payment details, provider responses containing candidate data |
| ElevenLabs | Workspace, plan reviewed date, key label/last four, scope, quota, expiry, agent ID, voice ID, version ID, locked-setting comparison | Full key, real audio, real transcript, real CV, screenshots containing secrets |
| Turnstile | Account/widget name, site-key last four, allowed hostname, widget mode, creation/rotation date | Secret key or a screenshot showing it |
| Local signing secrets | Creation date, length check, inequality check, ignored-file check | Either secret value |
| Manual live test | Date, synthetic scenario name, pass/fail per checklist, request count, redacted usage/cost evidence | Candidate content, raw provider payloads, credentials |

## Incident response

If any credential or signing secret is exposed:

1. Keep `PAID_DEMO_ENABLED=false` and `PROVIDER_MODE=fake`.
2. Revoke or rotate the exposed provider credential immediately.
3. Replace an exposed local signing secret and restart all local processes that
   loaded it.
4. Search the working tree, staged diff, commits, logs, terminal history,
   screenshots, and shared messages for the value without printing it again.
5. Review provider usage for unexpected activity and preserve only redacted
   evidence.
6. If a secret reached Git history or a remote, treat deletion from the current
   file as insufficient and follow the repository owner's incident process.

## Official source index

All links below were checked on 2026-09-12. Provider dashboards and commercial
terms change; use the current first-party page if a label or price differs.

- OpenAI: [quickstart](https://developers.openai.com/api/docs/quickstart),
  [projects](https://help.openai.com/en/articles/9186755-managing-projects-in-the-api-platform),
  [key permissions](https://help.openai.com/en/articles/8867743-assign-api-key-permissions),
  [spend limits](https://developers.openai.com/api/docs/guides/spend-limits),
  [GPT-5.4 mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini),
  [data controls](https://developers.openai.com/api/docs/guides/your-data).
- ElevenLabs: [quickstart](https://elevenlabs.io/docs/eleven-agents/quickstart),
  [API keys](https://elevenlabs.io/docs/overview/administration/workspaces/api-keys),
  [authentication](https://elevenlabs.io/docs/eleven-agents/customization/authentication),
  [WebRTC token API](https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/get-webrtc-token),
  [conversation flow](https://elevenlabs.io/docs/eleven-agents/customization/conversation-flow),
  [LLM settings](https://elevenlabs.io/docs/eleven-agents/customization/llm),
  [versioning](https://elevenlabs.io/docs/eleven-agents/operate/versioning),
  [privacy](https://elevenlabs.io/docs/eleven-agents/customization/privacy).
- Cloudflare: [Turnstile setup](https://developers.cloudflare.com/turnstile/get-started/),
  [dashboard widgets](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/),
  [hostname management](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/),
  [server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
  [testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/),
  [secret rotation](https://developers.cloudflare.com/turnstile/troubleshooting/rotate-secret-key/).
