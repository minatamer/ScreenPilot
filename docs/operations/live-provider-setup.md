# ScreenPilot live-provider setup runbook

**Ticket:** SP-014A<br>
**Last verified against first-party documentation:** 2026-09-14<br>
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

4. Generate the two application secrets locally. Run this command twice:

   `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`

   Put one result in `INTERVIEW_GRANT_SIGNING_SECRET` and the other in
   `ANONYMOUS_COOKIE_SECRET`. They must each be at least 32 characters and must
   not be equal. They are not obtained from a provider.

5. Keep `apps/frontend/.env.local` limited to:

   `BACKEND_ORIGIN=http://127.0.0.1:3001`

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
| `HTTP_JSON_BODY_MAX_BYTES` | `65536` | Keeps parsed JSON requests within 64 KiB. |
| `PROVIDER_REQUEST_TIMEOUT_MS` | `30000` | Bounds a provider operation to 30 seconds. |
| `INTERVIEW_GRANT_TTL_SECONDS` | `900` | Makes an interview grant expire after 15 minutes. |
| `ANONYMOUS_COOKIE_TTL_SECONDS` | `7200` | Makes the content-free safety cookie expire after two hours. |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Existing per-instance limiter window. |
| `RATE_LIMIT_MAX_ENTRIES` | `10000` | Bounds in-memory limiter bookkeeping. |
| `RATE_LIMIT_BOOTSTRAP_REQUESTS` | `120` | Preserves the existing bootstrap request ceiling. |
| `RATE_LIMIT_PREPARE_REQUESTS` | `30` | Preserves the existing preparation request ceiling. |
| `RATE_LIMIT_CV_ANALYZE_REQUESTS` | `10` | Preserves the existing CV-analysis request ceiling. |
| `RATE_LIMIT_VOICE_TOKEN_REQUESTS` | `3` | Preserves the strict voice-token request ceiling. |
| `RATE_LIMIT_SUMMARY_REQUESTS` | `10` | Preserves the existing summary request ceiling. |

### Runtime wiring audit (2026-09-14)

This audit traces the committed variable names only. It did not open or read
either ignored `.env.local` file and did not contact a provider.

| Environment value | Current code consumer | Current state / ticket ownership |
| --- | --- | --- |
| `OPENAI_API_KEY` | The live backend adapter passes it to the OpenAI Responses client as a Bearer credential. | Live CV analysis is implemented by SP-010. The live post-call summarizer and summary route do not exist yet; SP-020 owns them, and the current live summarizer intentionally fails closed. |
| `ELEVENLABS_API_KEY` | The live backend client sends it only in the server-side `xi-api-key` header when requesting a private conversation token. | Implemented by SP-014; no browser exposure. |
| `ELEVENLABS_AGENT_ID` | The live token client binds it into the ElevenLabs `agent_id` request and rejects a mismatched requested agent. | Implemented by SP-014; it is not accepted from the browser. |
| `ELEVENLABS_VOICE_ID` | Validated and retained in typed backend configuration and the source-controlled agent target. | Intentionally not sent in the token request: the published ElevenAgent owns the selected voice. It is a manual/deployed-agent drift check for SP-018A/SP-025, not a missing provider-call parameter. |
| `TURNSTILE_SITE_KEY` | Copied into the allow-listed public bootstrap response, then passed to the frontend Turnstile widget. | Implemented by SP-003/SP-012. This is the only provider value in this group that is public by design. |
| `TURNSTILE_SECRET_KEY` | The backend sends it to Cloudflare Siteverify in the form body. | Implemented by SP-009 and used before the current CV-analysis and voice-token provider calls. SP-020 will reuse it for summary. |
| `TURNSTILE_ALLOWED_HOSTNAMES` | The backend compares Siteverify's returned hostname against this exact allow-list. | Implemented by SP-009; `localhost` is the current local-only value. |
| `INTERVIEW_GRANT_SIGNING_SECRET` | The backend HMAC-signs and verifies short-lived stateless interview grants. | Implemented by SP-009 and used by preparation, CV analysis, and voice-token authorization. |
| `ANONYMOUS_COOKIE_SECRET` | Express `cookie-parser` verifies the signed, HttpOnly, content-free anonymous-session cookie and signs replacements. | Implemented by SP-009 and used by bootstrap plus protected routes. |

The audit found two activation defects, both corrected on 2026-09-14:

1. `loadBackendConfig()` reads `process.env`. The new local-only
   `start:backend:local` path uses Node's built-in `--env-file` support to load
   `apps/backend/.env.local` deliberately. The production `start` path still
   expects its host to inject `process.env` and never depends on a local file.
2. In `PROVIDER_MODE=fake`, provider adapters correctly remain fake, but a
   populated `TURNSTILE_SITE_KEY` is now suppressed from public bootstrap. The
   frontend therefore uses its deterministic no-network proof in fake mode;
   live mode alone receives the configured public site key.

`PAID_DEMO_ENABLED=false` disables the current CV-analysis and voice-token use
cases before either provider is called. Selecting `PROVIDER_MODE=live` creates
the real clients and validates the complete credential group, but does not by
itself make a network request. The fixes above make loading the populated local
file safe in fake mode, but they do not authorize the still-unchecked live-mode
readiness or provider tests.

Do not place a literal value in this guide. Record only redacted evidence such
as a key name, last four characters, creation date, expiry, permission summary,
and where it is stored.

## OpenAI API Platform

### 1. Why it is required

The backend uses the OpenAI Responses API directly for non-voice provider work.
The repository locks this path to `gpt-5.4-mini` with reasoning `none` and
`store: false`. The key is never sent to ElevenLabs or to the browser.

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
published Main on 2026-09-14. The verified immutable version is recorded as
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
| System prompt | Exact rendered `INTERVIEWER_SYSTEM_PROMPT` from `apps/backend/src/ai/prompts/interviewer-prompt.ts` at policy version `sp017-2026-09-15.1` |
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
| Client events | `vad_score` enabled; ScreenPilot treats scores ≥0.5 as candidate speech and uses the speaking-to-not-speaking transition as the TTFA start boundary |
| Soft timeout | Source target `sp018-2026-09-15.1`: disabled pending deployed evidence; if measurement warrants activation, exactly 1.5 seconds, static `Mm-hm…`, one maximum per generation, no alternate/randomized messages, no LLM-generated message, and disabled before the first user message |
| Maximum conversation duration | 480 seconds |
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
`no confirmed facts`, and `480`. Never paste a real CV or candidate transcript
into a dashboard placeholder.

The SP-017 prompt references these names directly. Dynamic-variable names and
template references must match exactly:
[dynamic variables](https://elevenlabs.io/docs/eleven-agents/customization/personalization/dynamic-variables).

### 6. Synchronize the source-controlled interviewer prompt

Do this only after the local SP-017 prompt tests pass. The TypeScript constant
is the prose source of truth; the dashboard is a deployed copy and must never
be edited as an independent prompt draft.

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
   verified revision explicitly identified as pre-SP-017.

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

Tool names and parameters are case-sensitive. SP-016 owns their final
descriptions, schemas, client handlers, timeout behavior, and response behavior.
For SP-014A, create only enough placeholder configuration to preserve the exact
names without inventing the deferred contract. Do not create server tools,
webhooks, code tools, MCP tools, or system tools:
[client tools](https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools).

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
| Maximum duration / call limit | 480 seconds |
| Idle prompts or extra timeout messages | Provider default or off; do not add unapproved behavior |
| Dynamic variables | Exact eight names; configured with synthetic placeholders |
| Secret dynamic variables and overrides | None; disabled |
| Client tools | Exact five names; detailed schema and handlers deferred to SP-016 |
| Tool-call sounds, tool interruption, wait-for-response, and response behavior | Off or provider default; final behavior deferred to SP-016 and SP-018 |
| Server, webhook, code, MCP, system, or integration tools | Disabled or not applicable |
| Knowledge base / RAG | Disabled or empty |
| Workflows, branches, sub-agents, transfer rules | Disabled or not applicable |
| Evaluation criteria, post-call analysis, data collection, sentiment | Disabled or empty |
| Dashboard testing, simulation, and test suites | No live/dashboard run in SP-014A; synthetic policy evaluation is deferred to SP-017, deterministic timing behavior to SP-018, and controlled live tuning to SP-018A |
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
- Confirm the exact eight dynamic variables and five client-tool names.
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
- [x] The ElevenLabs subscription is owner-verified as Free at USD 0/month,
  with 15 included agent-call minutes, 4 plan-level concurrent calls, and API
  access. ScreenPilot's stricter per-agent controls remain 5 calls/day and 1
  concurrent call. By explicit owner decision, no upgrade, Pay As You Go
  purchase, or paid overage is enabled at this stage.
- [x] The owner reports that the `ScreenPilot local backend` user key was
  created with a 30-day expiry, a 2,500-credit quota, restricted access, only
  `ElevenAgents: Read`, no IP allow-list, and automatic leak disabling enabled,
  then saved as `ELEVENLABS_API_KEY` in the ignored backend environment file.
  The key value was never shared with or read by the coding agent.
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
  silence is 12 seconds, end-after-silence is disabled, and maximum
  conversation duration is 480 seconds. The remaining visible advanced
  controls are unchanged from the audited disabled/provider-default state.
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
  `agtvrsn_3001m2fxwb6ce0nva1gweerevkqr` is recorded in source. The existing
  default agent was reused rather than creating a duplicate.
- [ ] SP-017 policy `sp017-2026-09-15.1`, including
  `screenpilot_known_state` and `screenpilot_remaining_seconds`, is synchronized
  to ScreenPilot/Main and its new immutable agent revision is recorded. Until
  this is performed,
  source identifies `agtvrsn_3001m2fxwb6ce0nva1gweerevkqr` with
  `agentRevisionPolicyVersion: "sp014-connection-v1"` as the last verified
  pre-SP-017 deployment; no Preview conversation is authorized by this item.
- [x] The owner created the free `ScreenPilot local live` Turnstile widget in
  Managed mode with only `localhost` authorized and pre-clearance off. No
  Cloudflare zone, Worker, proxy, WAF rule, API token, paid plan, or Spin setup
  was created.
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

SP-018A executes this phase before any paid CV or voice operation.

- [x] Correct the SP-009 backend local-start path so it deliberately loads the
  ignored backend environment file without printing it.
- [x] Make the SP-003/SP-012 public Turnstile site-key projection mode-aware so
  fake mode cannot load a real widget while the backend uses fake verification.
- [x] With `PROVIDER_MODE=fake` and `PAID_DEMO_ENABLED=false`, targeted
  deterministic checks still pass.
- [ ] The owner temporarily selects `PROVIDER_MODE=live` while keeping
  `PAID_DEMO_ENABLED=false`, then confirms startup accepts only the complete
  credential group and paid routes remain disabled.
- [ ] The owner returns to `PROVIDER_MODE=fake` after the configuration check.
- [ ] No provider request, credit spend, microphone access, or WebRTC connection
  occurs during this phase.

### Phase E: owner-authorized live provider and dashboard checks

SP-018A executes the CV-analysis and voice portions with synthetic data. The
summary item remains deferred to SP-020/SP-021.

- [ ] The owner explicitly authorizes the paid smoke test.
- [ ] Synthetic CV analysis makes at most one bounded direct OpenAI operation
  and is checked for cost and `store: false` behavior during SP-018A.
- [ ] After SP-020/SP-021, synthetic summary makes at most one bounded direct
  OpenAI operation and is checked for cost and `store: false` behavior.
- [ ] The owner verifies real Turnstile success, action and hostname validation,
  expiration, and replay rejection.
- [ ] The owner verifies one private ElevenLabs token issuance and one WebRTC
  connection.
- [ ] ElevenLabs audio saving, zero-day retention, version ID, usage, and cost
  evidence are manually reviewed.
- [ ] `PAID_DEMO_ENABLED=false` and `PROVIDER_MODE=fake` are restored immediately
  after the bounded test.

### Phase F: owner microphone and real-conversation checks

- [ ] The owner grants microphone permission in the intended browser.
- [ ] The owner confirms the intended input-device label and responsive level
  meter, including select/retry behavior.
- [ ] The owner confirms the first message is audible and candidate speech is
  intelligible.
- [ ] The owner confirms interruption, the 12-second silence threshold, the
  eight-minute ceiling, cancellation, disconnect, and media-track cleanup.
- [ ] The owner confirms the five required client events arrive once and in the
  expected order without a duplicate voice session.
- [ ] The owner repeats the relevant UI checks at phone, tablet, laptop/desktop,
  large-monitor, and one intermediate drag-resized width.

### Phase G: production and deployment

- [ ] Deferred entirely to SP-026.
- [ ] No production domain, DNS, Cloud Run, Firebase, Artifact Registry, Secret
  Manager, GitHub deployment identity, or hosted-secret step is performed from
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
