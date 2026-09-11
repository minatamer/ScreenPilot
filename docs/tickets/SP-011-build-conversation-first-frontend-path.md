# SP-011 — Build the conversation-first frontend entry path

Status: Required  
Milestone: Milestone 1 — interview preparation paths  
Last synchronized: 2026-09-11<br>
Depends on: SP-005, SP-006, SP-007, SP-009, SP-010A<br>
Suggested commit: `SP-011: add conversation-first entry`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Deliver the equally prominent no-CV preparation path from landing choice to shared preflight using only deterministic server preparation and no pre-call AI provider charge.

## Standalone implementation context

- The landing offers two equal cards: **Use a CV** and **Start without a CV**. Neither is a secondary link or degraded experience.
- Conversation-first simulates a recruiter beginning with no document. The live agent will learn name, role interest, and background naturally from speech.
- On selection, call the SP-010A-migrated `POST /v1/interview/prepare` without a fixed catalogue key and show a short truthful **Preparing an open conversation** transition.
- The response contains the universal role-neutral discovery plan and `interviewGrant`; it contains no candidate facts, CV role suggestion, fixed vacancy branches, or CV source.
- This path skips upload, extraction, OpenAI CV analysis, CV fact preview, and plan preview entirely, then enters the same shared preflight as the CV path.
- Later live behavior begins with an open target-position question and may become more specific only from candidate-evidenced answers.
- Role-neutral synthetic-demo disclosure comes from `GET /v1/demo/bootstrap`; the frontend does not compile a role allow-list or employer facts. Browser requests use the shared relative `/v1` client.

## Scope boundaries

- Do not ask the candidate to fill a pre-call form, choose from a supported-role picker, or upload a CV.
- Do not display fake personalization, CV silhouettes, extracted facts, a generated plan, or provider-analysis progress.
- Do not call OpenAI, ElevenLabs, or Turnstile during deterministic preparation.
- Do not create a separate interview/review implementation for this mode.
- Do not assume the visitor is an engineer before their answers provide context.
- Do not import backend demo values or introduce a feature-local API base URL/client.

## Implementation checklist

- [x] Build the responsive landing chooser with equal-weight CV-assisted and conversation-first cards.
- [x] Connect **Start without a CV** to the deterministic preparation endpoint with a unique client request ID.
- [x] Show only the brief approved conversation-preparation transition and specific retry/back errors.
- [x] Validate the response and persist only the generic plan, grant, grant expiry, entry mode, and shared public context.
- [x] Guarantee `cv` remains absent and CV/CV+Candidate source labels are impossible.
- [x] Enter the shared preflight state with the Conversation-first badge.
- [x] Implement mode-aware Back, retry, grant expiry, Start over/Clear session, keyboard, and responsive behavior.
- [x] Keep the `/demo` route's stage indicator, Privacy access, and Clear-session control available throughout early preparation and preflight. SP-011A later relocates Privacy from the temporary header position into the compact in-workspace context band.
- [x] Preserve equal visual quality on phones, tablets, laptops, desktops, large monitors, and intermediate widths.
- [x] Add focused reducer/component/API tests for branch isolation, no provider preparation calls, failure recovery, and shared-stage convergence.

## Acceptance criteria

- [x] A visitor can reach shared preflight without providing a file or triggering a paid preparation call.
- [x] No screen in the path claims to analyze or know the candidate.
- [x] The generic plan has a discovery structure, universal HR intents, no CV suggestion/IDs, and no dormant profession-specific branches.
- [x] The path discloses that any bounded candidate-stated role becomes a synthetic session-only demo vacancy, offers an undecided route, and contains no role allow-list or unavailable state.
- [x] Retry stays in conversation-first; Back returns to the equal choice screen instead of CV upload.
- [x] Mobile and desktop show the same information/actions with intentional reflow.
- [x] The landing opens Privacy as an accessible modal, and `/demo` retains progress, contextual Privacy access, and Clear-session controls without duplicating them inside individual stages.

## Focused verification

- [x] Run targeted frontend component/reducer/API tests.
- [x] Inspect network calls and prove the only preparation call is `POST /v1/interview/prepare`.
- [x] Inspect stored session JSON and confirm no `cv` field or CV provenance exists.
- [x] Reject and clear malformed restored preparation state when either the interview grant or its expiry is missing.
- [x] Exercise success, slow response, typed failure, retry, Back, expiry, Clear session, keyboard, and responsive layouts through focused browser and deterministic component/reducer coverage.
- [x] Inspect bootstrap, prepared state, and persisted state before preflight to confirm the role-neutral disclosure appears, no role picker/catalogue/unavailable state or candidate role exists yet, and every conversation-first start uses the same deterministic universal plan and shared preflight.
- Spoken role-label, correction, compound-role, and undecided scenarios belong to the later live interview/insight policy and release QA work in SP-016, SP-017, and SP-025; they are not SP-011 preflight assertions.

## Implemented result

- Replaced the temporary SP-005 foundation showcase with the real responsive landing experience, keeping **Use a CV** and **Start without a CV** equal in visual weight, primary action treatment, and keyboard order.
- Added one shared relative `/v1` frontend API client that validates bootstrap, preparation, and stable error envelopes without exposing a provider URL or secret to the browser.
- Connected conversation-first to deterministic preparation with a fresh request ID, abortable Back behavior, typed Retry handling, strict response validation, and no CV, OpenAI, ElevenLabs, or Turnstile operation.
- Extended the allow-listed browser session with an atomic grant/expiry invariant: restored prepared state is cleared if either value is missing, while an expired valid conversation-first grant safely reruns only deterministic preparation.
- Added one reusable accessible Privacy modal to the landing and `/demo`, then centralized the demo stage indicator and Clear-session action at route level so every early stage exposes the same controls. SP-011A supersedes the temporary navbar placement by moving Privacy into the compact in-workspace context band and replaces the light early-stage surfaces with the shared dark workspace.
- Added the shared preflight handoff shell and mode badge while deliberately leaving consent, microphone, Turnstile, and live voice behavior to SP-013 and later tickets.
- Removed stale fixed-role showcase language from the existing CV entry stage so both entry paths remain role-neutral after SP-010A.
- Preserved the approved design reference HTML, bundled sample CV, and immutable project specification unchanged.

## Verification evidence

- Frontend lint, TypeScript, 68 deterministic unit/component/API tests, and the production build passed on the repository-pinned Node.js 24 and pnpm 11.24 runtime.
- Contract and backend production builds passed after rebuilding contract output; the contracts package was also corrected to resolve its source exports in Next.js development without stale compiled output.
- A fresh Turbopack development server returned HTTP 200 for both `/` and `/demo` with no compilation errors. The production browser flow reached shared preflight using only bootstrap plus deterministic preparation, and its clean-tab console contained no errors.
- Browser checks covered keyboard order and activation, Back behavior, conversation-first badge/handoff content, equal coral entry actions, the reusable Privacy modal at desktop and phone sizes, and the `/demo` stage/Privacy/Clear header. The corrected route shell has no document or header overflow at 390, 768, 1100, 1440, or 1920 CSS pixels; its progress strip reflows to a second header row before tablet space becomes constrained.
- Focused tests covered the slow/abort path, typed error and Retry with a new request ID, expiry recovery, rejection and clearing of a restored grant without expiry, Clear session, persisted allow-list projection, absent `cv`/candidate role/CV provenance, and the universal discovery plan.
- All checks used deterministic local services and spent no provider credits. SP-013 consent/microphone behavior and later Turnstile/ElevenLabs live behavior remain deliberately outside this ticket.

## Commit boundary

Keep SP-011 reviewable as one logical change represented by `feat(frontend): add conversation-first entry`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Entry-mode contract and conversation-first stage](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#42-entry-mode-contract)
- [Landing and `/demo` requirements](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#5-frontend-routes-and-screen-requirements)
- [Deterministic conversation-first plan](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#deterministic-conversation-first-plan)
- [Conversation-first opening behavior](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#conversation-first-opening)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
