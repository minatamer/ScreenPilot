# SP-023 — Harden privacy, headers, and logging

Status: Required  
Milestone: Milestone 4 — public-demo hardening  
Last synchronized: 2026-09-14<br>
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

- [ ] Apply strict CSP with exact ElevenLabs/Turnstile requirements plus Helmet security headers.
- [ ] Enforce restricted CORS/origin and CSRF protections on mutations; verify first-party secure cookie behavior.
- [ ] Set `Cache-Control: no-store` on candidate/credential-bearing responses and prevent candidate values in URLs.
- [ ] Disable request/response body and proxy debug logging; redact secrets, authorization, cookies, grants, Turnstile/provider tokens, and raw IP.
- [ ] Escape/render all CV/transcript/model/tool content as text.
- [ ] Audit browser storage and memory lifecycle for both modes, including Clear session and conversation-first provenance.
- [ ] Audit filesystem/object/database/queue code paths and prove none can persist candidate artifacts.
- [ ] Verify OpenAI/ElevenLabs retention/audio settings and disclosure wording.
- [ ] Verify OpenAI input/output sharing is **Disabled** before any real-data or public run and record only the non-secret dashboard state and verification date.
- [ ] Consolidate the approved privacy/demo-limitation wording in the filename-level privacy feature and reuse it on landing/preflight without introducing a third application route.
- [ ] Add dependency, secret, and prompt-injection scanning/fixtures without paid calls.
- [ ] Review error reporting/browser diagnostics for content-free codes only.

## Acceptance criteria

- [ ] No forbidden candidate or credential value appears in storage, logs, URLs, analytics, error reporting, build layers, or deployment output.
- [ ] CSP supports the exact app/provider behavior without broad unsafe allowances.
- [ ] Both modes use the same bounded session model and conversation-first never acquires CV provenance.
- [ ] Clear session removes all ScreenPilot candidate state.
- [ ] Provider configuration and user disclosure match the implemented retention/processing behavior.
- [ ] No application persistence infrastructure exists.

## Focused verification

- [ ] Run header/CORS/origin/cookie/no-store and log-redaction tests.
- [ ] Run dependency and secret scanning plus prompt-injection fixtures.
- [ ] Use browser storage/network/console inspection through both complete paths.
- [ ] Search repository/runtime logs/temp paths for representative synthetic names, CV excerpts, transcript lines, salary values, tokens, and secrets.
- [ ] Manually verify provider dashboard retention/audio settings against disclosure.

## Commit boundary

Keep SP-023 reviewable as one logical change represented by `security: harden stateless data handling`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Security, privacy, and public-demo controls](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#16-security-privacy-and-public-demo-controls)
- [Browser session contract](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#45-browser-session-contract)
- [Operational logs and diagnostics](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#17-reliability-errors-and-observability)
- [Filename-level scaffold and target repository](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#filename-level-filesystem-blueprint)
- [Provider data configuration](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#provider-data-configuration)
- [Credential, ignore, and rotation rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
