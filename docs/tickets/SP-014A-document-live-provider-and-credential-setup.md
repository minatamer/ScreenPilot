# SP-014A — Document complete live-provider and credential setup

Status: Required<br>
Implementation state: Complete as documentation-led setup work; owner-reported provider accounts, keys, ElevenLabs agent, Turnstile widget, and local signing-secret setup are complete, both runtime activation fixes are implemented, and live-provider plus microphone verification remain pending<br>
Milestone: Milestone 2 — browser voice experience<br>
Last synchronized: 2026-09-14<br>
Depends on: SP-003, SP-009, SP-010, SP-012, SP-014<br>
Suggested commit: `SP-014A: document live provider and credential setup`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)<br>
Ticket index: [`README.md`](README.md)

---

## Objective

Turn the SP-014 ElevenLabs notes into one authoritative, beginner-friendly setup runbook for every non-deployment account, dashboard setting, credential, identifier, local secret, and spend control required to run ScreenPilot against its approved live providers.

The guide covers OpenAI, ElevenLabs ElevenAgents, Cloudflare Turnstile, and ScreenPilot's two locally generated signing secrets from account creation through a ready-but-disabled local live configuration. It also audits the repository for any other credentialed third-party runtime dependency and records the result. Google Cloud, Cloud Run, Firebase, Artifact Registry, Secret Manager, GitHub deployment identity, domains, and DNS remain SP-026 work and are excluded here.

## Why this follow-up exists

SP-003 established blank validated configuration and deterministic fakes. SP-009, SP-010, SP-012, and SP-014 implemented the boundaries that use OpenAI, Turnstile, and ElevenLabs. SP-014 also recorded the locked ElevenLabs target and an owner-only live checklist. The information is technically sufficient but spread across the parent plan, environment examples, provider code, and an ElevenLabs-only operations note.

SP-014A consolidates it before later live evaluation. An owner should be able to follow one guide without guessing which product to select, which dashboard feature to disable, where each value belongs, whether it is secret, how spending is bounded, or which later ticket owns a deferred setting.

Documentation completion and account setup completion are separate. This ticket can finish after the guide is researched, written, link-checked, and reconciled while all real credentials remain blank. Account changes, local secret entry, agent publication, microphone access, and paid calls remain explicit owner-only items.

## Authoritative non-deployment service inventory

| Owner | Required value or record | Purpose | Secret? | Runtime location |
| --- | --- | --- | --- | --- |
| OpenAI API Platform | `OPENAI_API_KEY` | Direct backend Responses calls for CV analysis and post-call summary | Yes | Ignored `apps/backend/.env.local` only |
| ElevenLabs | `ELEVENLABS_API_KEY` | Backend creation of short-lived private conversation tokens | Yes | Ignored `apps/backend/.env.local` only |
| ElevenLabs | `ELEVENLABS_AGENT_ID` | Select the one private ScreenPilot ElevenAgent | No, but owner-supplied | Ignored backend local configuration until selected |
| ElevenLabs | `ELEVENLABS_VOICE_ID` | Record the selected agent voice and detect drift | No, but owner-supplied | Ignored backend local configuration until selected |
| ElevenLabs | Published agent revision/version identifier | Prove the dashboard matches source | No | Source only after owner verification |
| Cloudflare Turnstile | `TURNSTILE_SITE_KEY` | Public widget identifier returned by backend bootstrap | Public identifier | Backend configuration, never a separate frontend environment value |
| Cloudflare Turnstile | `TURNSTILE_SECRET_KEY` | Backend Siteverify authentication | Yes | Ignored `apps/backend/.env.local` only |
| Cloudflare Turnstile | `TURNSTILE_ALLOWED_HOSTNAMES` | Fail-closed Siteverify hostname comparison | No | Ignored backend local configuration until selected |
| ScreenPilot local runtime | `INTERVIEW_GRANT_SIGNING_SECRET` | Sign stateless short-lived interview grants | Yes | Ignored `apps/backend/.env.local` only |
| ScreenPilot local runtime | `ANONYMOUS_COOKIE_SECRET` | Sign the content-free safety cookie | Yes | Ignored `apps/backend/.env.local` only |

The guide must explicitly state that:

- ChatGPT subscriptions and OpenAI API billing are separate products;
- the direct `OPENAI_API_KEY` is never copied into ElevenLabs;
- ElevenLabs' natively integrated GPT model uses ElevenLabs' provider path, while ScreenPilot's OpenAI key is reserved for direct backend CV and summary calls;
- no Cloudflare API token, proxied DNS, WAF, Bot Fight Mode, phone provider, OAuth client, analytics key, database credential, storage credential, webhook secret, or custom-LLM credential is required for local provider setup;
- open-source dependencies such as Next.js, Express, PDF.js, Zod, and the ElevenLabs React SDK require no account credential; and
- deployment-only identities are intentionally absent and remain SP-026 work.

If execution finds another active non-deployment service or credential in application code, configuration, or runtime docs, stop and reconcile it with the parent architecture before adding it. Do not silently normalize provider creep.

## Required deliverable

Expand [`../operations/elevenlabs-agent-setup.md`](../operations/elevenlabs-agent-setup.md) into one consolidated guide at [`../operations/live-provider-setup.md`](../operations/live-provider-setup.md).

The consolidated guide becomes authoritative for OpenAI, ElevenLabs, Turnstile, local secrets, fake-to-live switching, rotation, and owner verification. Preserve `docs/operations/elevenlabs-agent-setup.md` as either the detailed ElevenLabs child guide or a short tracked pointer so existing SP-014 links do not break. Update parent and ticket links to identify one authority instead of duplicating instructions that can drift.

Every provider section uses the same structure:

1. Why ScreenPilot needs it.
2. Official account and dashboard path.
3. Exact setting or safest available choice.
4. Value produced and whether it is secret.
5. Exact local destination.
6. Verification without exposing the value.
7. Spend and privacy safeguards.
8. Rotation, revocation, and undo path.
9. Deferred settings and their owning tickets.

Dashboard labels change. Research current official docs during execution, record a **last verified** date, and give both the documented navigation path and a safe fallback search term. Never invent a click path or claim an account-plan feature is available without verification.

## Guide 1 — Safe local configuration

Document the complete blank-to-ready flow:

- Verify ignore rules before creating or filling local files:

  ```powershell
  git check-ignore -v -- apps/backend/.env.local apps/frontend/.env.local
  git status --short --untracked-files=all
  ```

- Copy only the committed examples into ignored local paths. Never add real values to the examples.
- Keep `apps/frontend/.env.local` limited to `BACKEND_ORIGIN`; no provider key or `NEXT_PUBLIC_*` provider secret is permitted.
- Explain that the public Turnstile site key is supplied by backend bootstrap and still does not belong in the frontend environment.
- Show one Node command that prints one 32-byte base64url secret. Instruct the owner to run it twice for `INTERVIEW_GRANT_SIGNING_SECRET` and `ANONYMOUS_COOKIE_SECRET`, confirm the values differ, paste them manually, and never record the output in docs, screenshots, tickets, commits, logs, or chat.
- Keep `PROVIDER_MODE=fake` and `PAID_DEMO_ENABLED=false` while values are incomplete.
- Explain that current live mode validates the complete OpenAI, ElevenLabs, Turnstile, signing, and cookie group even when testing only one paid route.
- After all values exist, use `PROVIDER_MODE=live` with `PAID_DEMO_ENABLED=false` first so startup/readiness fails closed without authorizing paid operations.
- Set `PAID_DEMO_ENABLED=true` only for an explicitly approved controlled run and restore it to `false` afterward.
- Include safe visible local values such as `ALLOWED_ORIGINS=http://localhost:3000`, `BACKEND_ORIGIN=http://127.0.0.1:3001`, and the local Turnstile hostname contract. Never include a plausible secret.

## Guide 2 — OpenAI API Platform and GPT access

Start from current first-party sources:

- [Developer quickstart](https://developers.openai.com/api/docs/quickstart)
- [API projects and project limits](https://help.openai.com/en/articles/9186755-managing-projects-in-the-api-platform)
- [API-key permissions](https://help.openai.com/en/articles/8867743-assign-api-key-permissions)
- [Prepaid API billing](https://help.openai.com/en/articles/8264644-what-is-chatgpt-plus)

The guide must walk the owner through:

1. Signing in to the **OpenAI API Platform**, selecting the intended organization, and creating or choosing a dedicated ScreenPilot API project. Distinguish this from a ChatGPT Project or subscription.
2. Confirming that the project can use source-locked `gpt-5.4-mini`. If access or the exact label differs, report the blocker rather than silently substituting a model.
3. Configuring the narrowest practical project model access and rate limits for a portfolio demo.
4. Configuring billing deliberately. Record any minimum prepaid purchase shown, whether auto-recharge is enabled by default, how to disable or cap it, and that project budgets/alerts may be soft thresholds rather than guaranteed hard stops. Never purchase credits automatically.
5. Creating a dedicated project key with a descriptive ScreenPilot name and **Restricted** permissions. Grant only the narrowest available permission required for `POST /v1/responses` and verified prerequisites; disable Files, Assistants, fine-tuning, vector stores, Realtime, administration, and unrelated endpoints. If the UI exposes categories rather than endpoint permissions, document the real labels instead of inventing scopes.
6. Copying the newly displayed key once and placing it only in backend `OPENAI_API_KEY`.
7. Confirming direct calls remain backend-only, use Responses with `store: false`, use bounded structured input/output, and never use this key for ElevenLabs, browser code, or client-side Realtime.
8. Locating usage, costs, limits, key last-use data, and revocation. Include safe replacement-first rotation instructions.
9. Documenting that OpenAI input/output sharing may be temporarily enabled only for the selected ScreenPilot project during synthetic-only owner-controlled testing, never for all projects, and must be disabled with an explicit owner warning before any real CV, real candidate detail, external tester, or public use. Clarify that localhost is not a privacy boundary and `store: false` does not override the dashboard opt-in.

Record the two GPT paths separately:

| GPT use | Credential owner | Configuration owner |
| --- | --- | --- |
| CV analysis and post-call summary | Backend `OPENAI_API_KEY` | SP-010 and SP-020 adapters; `store: false` |
| Live interviewer language inside ElevenAgents | ElevenLabs native model integration; no ScreenPilot OpenAI key | SP-014 target plus SP-017 prompt |

## Guide 3 — ElevenLabs ElevenAgents

Start from current first-party sources:

- [ElevenAgents quickstart](https://elevenlabs.io/docs/eleven-agents/quickstart)
- [Workspace API-key security](https://elevenlabs.io/docs/overview/administration/workspaces/api-keys)
- [Agent authentication](https://elevenlabs.io/docs/eleven-agents/customization/authentication)
- [Private WebRTC token](https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/get-webrtc-token)
- [Conversation flow](https://elevenlabs.io/docs/eleven-agents/customization/conversation-flow)
- [Dynamic variables](https://elevenlabs.io/docs/eleven-agents/customization/personalization/dynamic-variables)
- [Client tools](https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools)
- [Privacy and retention](https://elevenlabs.io/docs/eleven-agents/customization/privacy)

### Account, plan, and key

Document how to:

- select **ElevenAgents**, not an ElevenCreative-only flow;
- identify the workspace/plan, included agent minutes, model charges, credit balance, usage analytics, and subscription controls;
- keep the free or lowest sufficient plan unless a required feature is unavailable, and never upgrade automatically;
- create a personal key for the current single-owner demo or a service-account key only if supported and justified later;
- select the narrowest Agents/conversation-token scope, a conservative credit quota, and a short practical user-key expiry;
- exclude unrelated speech generation, cloning, dubbing, music, admin, and workspace-management scopes;
- inspect last use, rotate, revoke, and respond to exposure; and
- store the secret only as backend `ELEVENLABS_API_KEY`.

### Agent creation and locked target

Create one **Blank agent** with a descriptive name such as **ScreenPilot Live Interviewer**, keep it private/authenticated, and reconcile every dashboard section with this matrix:

| Surface | ScreenPilot target | Ownership or reason |
| --- | --- | --- |
| Platform | ElevenAgents | Only approved real-time voice platform |
| Agent count | One private agent | No role-specific agents or transfer tree |
| First message | `Hi, what's your name?` | Single SP-014 fixed-message exception |
| System prompt | Safe placeholder until SP-017, then exact source-controlled prompt | Dashboard prose is never authoritative |
| Default language | English | Additional languages and auto-switching disabled unless approved |
| Live LLM | GPT-5.4 mini through ElevenLabs | No Custom LLM/BYOK |
| Reasoning/thinking | `none` | Latency and source contract |
| Live output ceiling | 160 tokens | Reconcile the current UI/API field; SP-017/SP-018 may tune later |
| Speech to text | Scribe v2 Realtime | Locked transcription path |
| Text to speech | Flash v2.5 | Locked low-latency synthesis path |
| Voice | One owner-selected voice | Record its voice ID; no clone or multi-voice behavior |
| Expressive Mode | Disabled | Not part of the locked Flash v2.5 path |
| Personality / behavior preset | Default/off | SP-017 prompt owns behavior |
| Turn eagerness | Normal | Initial value; SP-018 owns measured tuning |
| Take turn after silence | 12 seconds | Initial interview-thinking window |
| Interruptions | Enabled | Verify matching client events |
| Soft timeout/filler | Disabled | SP-018 may enable one measured static filler |
| Maximum duration | 480 seconds | Eight-minute hard limit |
| Transport | Private browser WebRTC | No telephony, SIP, PSTN, phone number, or widget embed |
| Audio saving | Disabled | Privacy contract |
| Transcript retention | `0` days / scheduled deletion | Shortest locked setting; provider processing still occurs |
| Zero Retention Mode | Enable only if the owner's plan offers it and it supports required events | Record availability; never falsely claim it is active |
| Backup LLM/provider fallback | Disabled | One approved path; failures return to app recovery |
| Debug events | Disabled for normal runs | No provider debug payloads or candidate content |

For every visible or advanced setting not in the matrix, record **configured now**, **disabled**, **deferred to ticket**, **account-dependent**, or **not applicable**. At minimum audit:

- voice stability, similarity, style, speed, normalization, pronunciation dictionaries, and speaker boost;
- ASR quality, keywords, diarization, language detection, and additional languages;
- temperature, token ceiling, reasoning summaries, fallback models, and model-provider selection;
- turn eagerness, timeout, soft timeout, interruption thresholds, client events, idle behavior, and limits;
- prompt, first message, dynamic variables, overrides, secret variables, and placeholder values;
- tools, response behavior, tool interruption, workflows, subagents, knowledge bases, MCP, webhooks, code tools, and system tools;
- post-call and initiation webhooks, evaluation criteria, data collection, history, analytics, and experiments;
- phone numbers, outbound campaigns, SIP, messaging, widget deployment, integrations, and workspace sharing; and
- privacy, audio saving, retention/deletion, redaction, data residency, and Zero Retention Mode.

Do not fill unspecified options by taste. Preserve the default and assign final decisions to SP-017 for language/policy, SP-018 for measured voice/latency tuning, SP-022 for public spend limits, SP-023 for privacy/logging hardening, or SP-025 for release verification.

### Dynamic variables, tools, and overrides

Document these exact dynamic variables and how the browser supplies bounded values:

- `screenpilot_policy_version`
- `screenpilot_entry_mode`
- `screenpilot_demo_disclosure`
- `screenpilot_screening_plan`
- `screenpilot_role_context`
- `screenpilot_cv_context`

Dashboard placeholders use obviously synthetic, bounded, non-secret data. They never contain a real CV, transcript, identity, employer claim, API key, challenge token, provider token, or prompt-overriding instruction. Disable per-call prompt, first-message, voice, language, tool-list, and knowledge-base overrides unless a later ticket proves one necessary; ScreenPilot uses dynamic variables rather than browser prompt replacement.

Audit these five client-tool names:

- `recordInsight`
- `correctInsight`
- `markTopic`
- `recordCandidateQuestion`
- `requestFollowup`

SP-014 provides safe deferred handlers. SP-016 owns strict argument schemas, evidence checks, response behavior, and the real dispatcher. Do not invent final parameters early, add webhook tools, or enable unrelated system tools.

### Publication and identifiers

Document how the owner saves/publishes the private agent, copies its ID into `ELEVENLABS_AGENT_ID`, obtains the selected voice ID for `ELEVENLABS_VOICE_ID`, and records the published revision/version in source only after comparing the dashboard with the locked target. Verify authentication is required and ScreenPilot's backend-minted token—not a public embed—authorizes WebRTC. Confirm no knowledge base, webhook, phone number, outbound workflow, public widget, recording, or second agent was created.

## Guide 4 — Cloudflare Turnstile without Cloudflare hosting

Start from current first-party sources:

- [Turnstile get started](https://developers.cloudflare.com/turnstile/get-started/)
- [Dashboard widget management](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/)
- [Widget configuration](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/)
- [Hostname management](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/)
- [Mandatory Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Published testing keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)

Document this local account flow:

1. Sign in to Cloudflare. The domain need not be registered with, transferred to, or proxied through Cloudflare.
2. Open **Turnstile**, add a clearly named local widget such as **ScreenPilot local live**, and choose **Managed** mode.
3. Restrict it to the browser hostname, normally `localhost`. Entries have no scheme, port, path, or wildcard. Never reuse a localhost-enabled widget for production; SP-026 creates/restricts the production widget when the real hostname exists.
4. Put the public site key in backend `TURNSTILE_SITE_KEY`, the private secret in `TURNSTILE_SECRET_KEY`, and use `TURNSTILE_ALLOWED_HOSTNAMES=localhost` for the documented origin.
5. Explain that `appearance: interaction-only` is an app rendering choice while **Managed** is the dashboard challenge mode.
6. Explain that one widget supports `cv_analyze`, `voice_token`, and `interview_summary`; these are runtime actions, not three widgets.
7. Verify every token through server-side Siteverify for success, expected action, and hostname before a paid call. Tokens are short-lived, single-use, memory-only, and reset after attempts.
8. Explain that dashboard creation needs no Cloudflare API token. Do not add WAF, Bot Fight Mode, pre-clearance, clearance cookies, Any Hostname, API automation, or proxying.
9. Explain deterministic published test keys without putting them in committed `.env.example`; production rejects them.
10. Record analytics location, secret rotation, transition/invalidation behavior, and safe local update steps.

## Guide 5 — Combined readiness and manual ledger

Include this redacted evidence table:

| Check | Safe evidence | Never record |
| --- | --- | --- |
| Local files ignored | Ignore rule/path | File contents |
| OpenAI ready | Project name, model availability, budget/rate-control status | Key or billing details |
| ElevenLabs key ready | Key name and scope/quota/expiry summary | Key |
| ElevenLabs agent ready | Voice label, revision ID, settings checklist | Tokens, candidate data, private exports |
| Turnstile ready | Widget name, hostname, mode, optional site-key suffix | Secret or challenge token |
| App secrets ready | “two distinct values present” | Either value |
| Paid-demo state | `false` by default; owner approval for a controlled run | Candidate content or provider token |

Order the combined process so the owner can stop safely:

1. Verify ignored files and deterministic fake mode.
2. Generate the two local ScreenPilot secrets.
3. Configure the OpenAI project, billing safeguards, and restricted key.
4. Configure the ElevenLabs key, private agent, voice, retention, and revision.
5. Configure the local Turnstile Managed widget and hostname.
6. Fill the ignored backend file manually and keep the paid switch off.
7. Start in live mode with paid operations disabled and resolve fail-closed errors without printing values.
8. Run only unpaid readiness/configuration checks.
9. Stop for explicit approval before enabling paid operations, using a microphone, or contacting a live provider.
10. After an approved smoke run, disable paid mode, review usage, and record only non-sensitive SP-025 evidence.

End with separate checklists for **documentation complete**, **accounts configured by owner**, **ignored secrets populated by owner**, **live provider/dashboard verification**, **microphone and real conversation verification**, and **production/deployment deferred to SP-026**.

## Scope boundaries

- Do not create accounts, buy credits, upgrade plans, publish agents, rotate keys, or modify dashboard state while writing the guide.
- Do not request, read, paste, echo, screenshot, or store a real credential.
- Do not create or fill `.env.local`; the owner does this manually after ignore verification.
- Do not perform a live OpenAI, ElevenLabs, Turnstile, paid, or microphone test.
- Do not add code, SDKs, credential managers, dashboard automation, ElevenLabs CLI files, or a second configuration source.
- Do not add Custom LLM/BYOK, OpenAI Realtime, another voice provider, telephony, webhooks, analytics, a knowledge base, transfers, or role-specific agents.
- Do not write SP-017's final prompt, SP-016's final tool schemas, SP-018 tuning, SP-022 final public caps, or SP-025 evidence. Link and defer them.
- Do not include Google Cloud, Cloud Run, Firebase, Artifact Registry, Secret Manager, GitHub deployment identity, production domains, DNS, registrar setup, or deployment credentials. SP-026 owns them.
- Do not weaken fake/default behavior; default development and CI remain unable to spend provider credits.

## Implementation checklist

- [x] Re-audit active code, environment examples, manifests, operations docs, and tickets for every non-deployment service and credential.
- [x] Trace every configured provider/local value to its runtime consumer, record deliberate future-ticket deferrals, and correct both activation gaps without opening an ignored environment file.
- [x] Research every setup path from current first-party docs and record a last-verified date.
- [x] Create `docs/operations/live-provider-setup.md` using the required provider template.
- [x] Reconcile or redirect the existing ElevenLabs guide without broken links.
- [x] Document ignored local files and two-secret generation.
- [x] Document OpenAI project, GPT access, restricted key, billing, usage, rotation, and ownership.
- [x] Audit every ElevenLabs dashboard section, apply locked choices, and classify every other setting.
- [x] Document ElevenLabs key, private auth, agent/voice/revision IDs, spend, privacy, and revocation.
- [x] Document Turnstile account/widget creation, Managed mode, hostname, key ownership, actions, Siteverify, tests, rotation, and excluded products.
- [x] Add the readiness sequence and separate owner/manual/deployment ledgers.
- [x] Update parent, SP-003/SP-014, and later-ticket links only as needed to establish one authority.
- [x] Confirm committed examples keep credential and owner-supplied identifiers blank.
- [x] Confirm no live secret, plausible key, candidate content, provider token, private export, or deployment guide was added.

## Acceptance criteria

- [x] A new owner can identify every current non-deployment account and value without reading source or guessing ownership.
- [x] Every field in both environment examples is explained, explicitly safe/defaulted, or assigned to SP-026.
- [x] OpenAI instructions distinguish ChatGPT from API Platform, direct GPT from ElevenLabs GPT, restricted keys from admin keys, and soft budgets from enforceable/prepaid limits.
- [x] OpenAI input/output sharing is documented as a selected-project, synthetic-only temporary exception with a mandatory disabled-state warning and verification gate before real candidate data or public use.
- [x] ElevenLabs instructions cover every visible and advanced dashboard section, not only prompt, voice, language, and LLM.
- [x] The ElevenLabs matrix exactly matches `SCREENPILOT_ELEVENLABS_AGENT_CONFIG`; unresolved settings are deferred, not invented.
- [x] Turnstile instructions cover widget creation, Managed mode, hostname syntax, public/secret separation, all actions, Siteverify, deterministic tests, and no hosting/proxy requirement.
- [x] The guide concludes whether any fourth credentialed non-deployment third party exists; adding one requires architecture reconciliation.
- [x] The fake-to-live sequence cannot accidentally authorize a paid call before credentials, safeguards, and approval exist.
- [x] No secret enters frontend configuration, docs, committed examples, URLs, logs, screenshots, prompts, storage, or build arguments.
- [x] Owner account changes, secret entry, paid calls, microphone checks, and deployment were left visibly unchecked during documentation implementation; later owner-reported progress is tracked separately in the runbook.
- [x] Google Cloud/Firebase/domain/deployment instructions are absent except links to SP-026 ownership.

## Focused verification

- [x] Run `git diff --check` and a documentation formatting check if available.
- [x] Check every external link and prefer first-party OpenAI, ElevenLabs, and Cloudflare sources.
- [x] Compare the guide's variable matrix against both `.env.example` files.
- [x] Compare every ElevenLabs value with `elevenlabs-agent-config.ts` and backend provider constants.
- [x] Search the docs diff for secret-like values, `NEXT_PUBLIC_` credentials, candidate content, BYOK, OpenAI Realtime, telephony, webhooks, analytics, and excluded deployment instructions.
- [x] Confirm `git check-ignore` identifies both local paths without opening them.
- [x] Confirm completion needs no provider login, credential, paid call, microphone, or account mutation.

## Commit boundary

Keep SP-014A as one documentation-only change represented by `SP-014A: document live provider and credential setup`. Do not implement SP-015 events, SP-016 tools, SP-017 policy, SP-018 tuning, SP-022 public limits, or SP-026 deployment. Do not stage or commit unless the user explicitly asks.

## Precision references

- [Authoritative live-provider setup runbook](../operations/live-provider-setup.md)
- [Credentials and manual setup](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)
- [Browser voice contract](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#9-browser-voice-implementation-and-performance-contract)
- [Provider retention and cost plan](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#13-elevenlabs--openai-research-and-cost-plan)
- [SP-003 provider fakes](SP-003-add-validated-configuration-and-provider-fakes.md)
- [SP-014 private voice](SP-014-configure-elevenlabs-agent-and-token-flow.md)
- [SP-017 interview policy](SP-017-write-and-evaluate-adaptive-interview-policy.md)
- [SP-018 voice tuning](SP-018-tune-latency-interruption-and-filler.md)
- [SP-026 deployment](SP-026-deploy-frontend-and-backend.md)

## Completion handoff

- Outcome: the new consolidated owner runbook is authoritative; the former ElevenLabs-only guide is a compatibility pointer, and parent/SP-003/SP-014/index links identify the consolidated guide.
- Research: current first-party OpenAI API Platform, ElevenLabs ElevenAgents, and Cloudflare Turnstile sources were checked on 2026-09-12.
- Inventory: OpenAI, ElevenLabs, Turnstile, and two local signing secrets are the complete non-deployment credential groups. No fourth credentialed runtime provider exists.
- ElevenLabs audit: the source-locked agent matrix and every relevant advanced-settings group are classified as configured, disabled, provider-default, deferred, account-dependent, or not applicable.
- Verification: targeted Prettier, `git diff --check`, environment/config comparisons, secret-pattern checks, and `git check-ignore` completed without a live provider call.
- Owner progress reported on 2026-09-14: the ScreenPilot OpenAI API project, `gpt-5.4-mini` allow-list, USD 5 initial prepaid credits, disabled auto-reload, USD 5 enforced monthly hard limit, spend alerts at 20%/50%/80%/100%, selected-project synthetic-only input/output sharing, and the restricted finite-expiry `ScreenPilot local backend` OpenAI key with Responses write access only are configured. The owner also reports that the ElevenLabs `ScreenPilot local backend` user key was created with a 30-day expiry, 2,500-credit quota, restricted `ElevenAgents: Read` access only, no IP allow-list, and automatic leak disabling, then saved only in the ignored backend environment file. The private agent's reported partial checkpoint now covers signed authentication, disabled client overrides and webhooks, 5 daily/1 concurrent call limits with burst pricing and queueing off, call-audio storage off, 0-day deletion settings, chat/file inputs off, Scribe v2 Realtime/Turn V3, Normal eagerness, a 12-second silence threshold, disabled end-after-silence, and a 480-second maximum duration. Neither key value was shared with or read by the coding agent. No account identifier, payment method, key value, or billing screenshot is recorded.
- The same ElevenLabs checkpoint now includes the exact first message, English-only language, GPT-5.4 Mini with reasoning None and a 160-token ceiling, disabled backup LLM/reasoning summary/soft timeout/parallel tool calling/Expressive Mode, unset temperature, a bounded role-neutral placeholder prompt, and the owner-selected **Bella - Professional, Bright, Warm** voice using the Flash TTS family.
- The owner also reports that the exact six dynamic-variable names are present with text-only synthetic dashboard-preview defaults; SP-017 still owns their bounded per-session runtime rendering.
- The owner also reports that the exact five case-sensitive client-tool names are attached as Client tools with placeholder-only descriptions, no parameters, assignments, mocks, or response waiting; every system tool remains off and no webhook, integration, server, code, or MCP tool was added. SP-016 still owns the functional schemas and browser handlers.
- The dashboard audit also confirms empty/disabled guardrails and procedures; no workflow, knowledge base, extra branch, or traffic split; only Main at 100%; topic discovery, sentiment analysis, transcript translation, and source attribution off; and zero evaluation criteria/data points.
- The existing agent's editable title is now **ScreenPilot** and no duplicate agent was created; any stale provider selector label remains a final pre-publication recheck.
- The owner copied the existing dashboard agent ID into `ELEVENLABS_AGENT_ID` in the ignored backend environment file without sharing it with the coding agent.
- The owner copied the selected Bella provider voice ID into `ELEVENLABS_VOICE_ID` in the ignored backend environment file without sharing it with the coding agent.
- The reviewed configuration is published to ScreenPilot/Main, owner-verified as Live at 100% with no pending Draft badge; no Preview conversation ran.
- Immutable version `agtvrsn_3001m2fxwb6ce0nva1gweerevkqr` is recorded as `agentRevisionId` in the source-controlled provider target after the owner compared and published the locked dashboard configuration.
- The ElevenLabs subscription is owner-verified as Free at USD 0/month with 15 included agent-call minutes; by explicit owner decision, no upgrade, Pay As You Go purchase, or paid overage is enabled.
- The owner created the free `ScreenPilot local live` Turnstile widget in Managed mode with only `localhost` authorized and pre-clearance off, then populated its site key, secret key, and exact allowed hostname only in the ignored backend environment file. Neither key was shared with the coding agent, and no Cloudflare zone, Worker, proxy, WAF rule, API token, paid plan, or Spin setup was created.
- The owner reports that the two locally generated application secrets are present, at least 32 characters, different from one another, and stored only in the ignored backend environment file; neither value was shared with or inspected by the coding agent.
- Runtime wiring audit: the OpenAI key is wired to the SP-010 live CV adapter, while SP-020 still owns the absent live summary route/adapter; the ElevenLabs key and agent ID are wired to SP-014 private token creation; the voice ID is intentionally configuration/drift evidence because the published agent owns its voice; Turnstile site/secret/hostnames are wired across bootstrap, widget rendering, Siteverify, and current CV/voice gates; and both local secrets are wired to their HMAC/cookie consumers.
- Activation fixes completed without reading a credential: the new local-only backend launcher loads `apps/backend/.env.local` through Node's built-in environment-file support, and fake mode now suppresses a populated Turnstile site key from public bootstrap while live mode exposes it normally.
- Still unchecked after that report: the mandatory OpenAI sharing-disabled gate before real/external/public use, the ready-but-disabled live configuration check, live provider calls, live WebRTC, microphone/manual responsive checks, provider usage/retention evidence, and all SP-026 deployment work.
- Documentation-implementation safety: no credential was read or written, the coding work did not mutate a dashboard/account, no `.env.local` file was created or opened, and no paid, live-provider, or microphone test ran. The owner performed the separately recorded OpenAI dashboard steps.
