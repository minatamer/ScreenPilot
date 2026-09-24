# SP-023 — Harden privacy, headers, and logging

Status: Required  
Milestone: Milestone 4 — public-demo hardening  
Implementation state: Completed and verified on 2026-09-24 for the synthetic-only local boundary. Both strict-CSP browser paths passed network, console, completion, reload, and Clear-session checks. Direct raw `sessionStorage` inspection was not available through the browser automation interface; the owner accepted the deterministic bounded-storage coverage because the relevant concern is the verified absence of any application database or other server-side candidate persistence. The OpenAI sharing-off public/real-data gate remains an explicit future operator check.<br>
Last synchronized: 2026-09-24<br>
Depends on: SP-006, SP-009, SP-010, SP-014, SP-020  
Suggested commit: `SP-023: harden stateless data handling`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Audit and harden the complete browser/backend/provider boundary so candidate content stays out of persistence, logs, URLs, analytics, unsafe rendering, and overbroad browser permissions.

## Standalone implementation context

- Allowed browser persistence is bounded versioned current-tab `sessionStorage` for structured facts/plan/transcript/insights/summary only.
- Original PDF/raw text are memory-only; audio streams to ElevenLabs but is never recorded by ScreenPilot.
- Backend request bodies are not logged and no candidate-content database/filesystem write exists.
- Direct OpenAI Responses calls use `store: false`; ElevenLabs audio saving is off and transcript retention uses the shortest locked setting.
- OpenAI input/output sharing may be enabled only as the documented selected-project exception for synthetic-only local live tests. It must be disabled and verified after an explicit owner warning before any real CV, real candidate detail, external tester, or public use; `store: false` does not override the sharing opt-in.
- The safety cookie is content-free, signed, Secure, HttpOnly, and SameSite=Lax.
- CSP must permit only exact documented ElevenLabs and Cloudflare Turnstile script/frame/connect origins needed by the app; avoid broad wildcards.
- Turnstile Siteverify receives no CV, transcript, insight, salary, name, or audio content.
- Operational logs may include service, environment, request ID, route, status, duration, sanitized error/retry/rate/Turnstile outcome, provider/model ID, and coarse usage—not candidate content or raw IP.
- Reusable visitor-facing wording lives in `apps/frontend/src/features/privacy/privacy-copy.ts` and is rendered by `privacy-notice.tsx` on landing/preflight surfaces. It does not require a new route or duplicate copy in page files.

## Credential-handling audit gate

- This ticket creates no key. Secret scans and redaction tests use recognizable synthetic canaries, never real OpenAI, ElevenLabs, Turnstile, signing, cookie, Google, or registrar credentials.
- Audit root `.gitignore` for both ignored `apps/*/.env.local` paths and downloaded cloud-credential patterns; audit SP-026 `.dockerignore` before release. Confirm blank `.env.example` templates remain trackable.
- Provider retention/audio checks require authenticated dashboard access but do not require copying an API key into documentation or test code. If dashboard access is unavailable, complete repository/runtime audits and leave only the dashboard verification item unchecked with the access blocker.
- If any real credential is discovered in Git history, logs, artifacts, or a tracked file, stop live work, rotate it at the provider, remove the exact tracked artifact, and re-run the audit. Ignoring the file after exposure is not sufficient.

## Scope boundaries

- Do not add third-party analytics on `/demo`, session replay, full URLs, request/response body logs, provider payload logs, or debug dumps.
- Do not promise that no third party processes data or market the demo as compliant for real applicants.
- Do not weaken CSP with `*` or `unsafe-inline` simply to make a provider work.
- Do not store PDFs, raw text, audio, transcripts, or insights on backend disk/object storage/database.
- Do not render transcript/model text as HTML.

## Implementation checklist

- [x] Apply strict CSP with exact ElevenLabs/Turnstile requirements plus Helmet security headers.
- [x] Enforce restricted CORS/origin and CSRF protections on mutations; verify first-party secure cookie behavior.
- [x] Set `Cache-Control: no-store` on candidate/credential-bearing responses and prevent candidate values in URLs.
- [x] Disable request/response body and proxy debug logging; redact secrets, authorization, cookies, grants, Turnstile/provider tokens, and raw IP.
- [x] Escape/render all CV/transcript/model/tool content as text.
- [x] Audit browser storage and memory lifecycle for both modes, including Clear session and conversation-first provenance.
- [x] Audit filesystem/object/database/queue code paths and prove none can persist candidate artifacts.
- [x] Verify OpenAI/ElevenLabs retention/audio settings and disclosure wording.
- [ ] Verify OpenAI input/output sharing is **Disabled** before any real-data or public run and record only the non-secret dashboard state and verification date.
- [x] Consolidate the approved privacy/demo-limitation wording in the filename-level privacy feature and reuse it on landing/preflight without introducing a third application route.
- [x] Add dependency, secret, and prompt-injection scanning/fixtures without paid calls.
- [x] Review error reporting/browser diagnostics for content-free codes only.

## Acceptance criteria

- [x] No forbidden candidate or credential value appears in storage, logs, URLs, analytics, error reporting, build layers, or deployment output.
- [x] CSP supports the exact app/provider behavior without broad unsafe allowances.
- [x] Both modes use the same bounded session model and conversation-first never acquires CV provenance.
- [x] Clear session removes all ScreenPilot candidate state.
- [x] Provider configuration and user disclosure match the implemented retention/processing behavior for synthetic-only operation; OpenAI sharing must still be disabled before real-data/public use.
- [x] No application persistence infrastructure exists.

## Focused verification

- [x] Run header/CORS/origin/cookie/no-store and log-redaction tests.
- [x] Run dependency and secret scanning plus prompt-injection fixtures.
- [x] Exercise both complete paths under the production response CSP and inspect network/console behavior; direct raw `sessionStorage` key inspection was unavailable through browser automation and was explicitly accepted by the owner based on deterministic bounded-storage tests and the verified absence of database/server-side candidate persistence.
- [x] Search repository/runtime logs/temp paths for representative synthetic names, CV excerpts, transcript lines, salary values, tokens, and secrets.
- [x] Manually verify provider dashboard retention/audio settings against disclosure.

Deterministic verification on 2026-09-24 used Node 24.19 with provider fakes and no paid calls. The backend suite passed 25 files / 334 tests, including strict Helmet headers, restricted origin/CORS behavior, the signed content-free cookie, no-store responses, prompt-injection fixtures, and root/nested log redaction. The frontend suite passed 40 files / 294 tests, including nonce CSP/no-store headers, exact Cloudflare/ElevenLabs origins, centralized disclosure, no inline-style dependence, bounded storage/Clear behavior, and same-origin pinned ElevenLabs audio worklets including mute and sample-rate fallback behavior. Frontend/backend typechecks, repository lint, both production builds, and `git diff --check` passed. The clean backend production build emits no test files, and representative credential/candidate canaries were absent from both production build outputs and ignored runtime logs. The production dependency audit reported no known vulnerabilities; current/untracked and all 46 reachable Git commits passed the content-safe secret scan; and generated worklet hashes matched their pinned package sources exactly. The root format check remains blocked only by two pre-existing committed files outside SP-023: `illustrative-interview-preview.tsx` and `voice-session-context.ts`; all SP-023-touched supported files were formatted directly.

Both complete paths were walked in a production-local browser with provider fakes and paid calls disabled. They reached review with no console warnings, errors, or CSP refusals; the expected security and no-store headers were present; review survived reload; conversation-first retained candidate-only provenance; and Clear & exit removed restorable ScreenPilot state. The automation interface could not expose raw Storage API key/value inspection. The owner explicitly accepted the deterministic `sessionStorage` allow-list, expiry, migration, and clearing coverage because the relevant persistence concern is the verified absence of an application database, object storage, queue, filesystem candidate store, or other server-side candidate persistence. OpenAI input/output sharing remains the documented selected-project synthetic-only exception and must be set to **Disabled** and re-verified before any real CV, real candidate detail, external tester, or public run.

## Commit boundary

Keep SP-023 reviewable as one logical change represented by `SP-023: harden stateless data handling`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Security, privacy, and public-demo controls](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#16-security-privacy-and-public-demo-controls)
- [Browser session contract](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#45-browser-session-contract)
- [Operational logs and diagnostics](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#17-reliability-errors-and-observability)
- [Filename-level scaffold and target repository](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#filename-level-filesystem-blueprint)
- [Provider data configuration](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#provider-data-configuration)
- [Credential, ignore, and rotation rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
