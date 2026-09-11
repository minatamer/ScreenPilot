# SP-010A — Make every candidate-selected role an available synthetic demo vacancy

Status: Required<br>
Milestone: Milestone 1 — role-neutral preparation foundation<br>
Implementation state: Completed and verified locally after final application-claim guardrail correction on 2026-09-11; awaiting user-directed commit<br>
Last synchronized: 2026-09-11<br>
Depends on: SP-006, SP-007, SP-009, SP-010<br>
Suggested commit: `refactor(domain): make screening roles session-defined`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)<br>
Ticket index: [`README.md`](README.md)

---

## Completion evidence

- Replaced the fixed employer/vacancy catalogue boundary with the server-owned `PublicRoleNeutralDemoContext`, one normalized role-label schema, evidence-linked candidate role state, optional fact-linked CV role suggestions, universal screening topics, and role-neutral summary semantics.
- Removed catalogue keys and vacancy unions from bootstrap, preparation/CV requests, signed grants, provider ports, screening plans, browser session state, and current-tab persistence. Session schema v2 deliberately clears the superseded v1 envelope.
- Deleted the fixed catalogue/FAQ modules, updated the fake and OpenAI prompt boundary, regenerated the synthetic sample PDF, and added Graphic Designer, Customer Support Representative, Product Manager, Backend Developer, and Full Stack Developer fixtures as ordinary role examples.
- Deterministic tests cover role normalization and unsafe-character rejection, evidence-linked suggestions, `apply` inflections with `for`/`to`/`as`, active and passive submitted-application claims, possessive/pending application wording, general suitability and profession/domain assessment variants, benign applied-ML/software-application counterexamples, grounded cross-profession fake output, universal plan equality with optional human follow-up, Full Stack without redirection, correction and compound wording, undecided state, prompt injection, grant integrity, old-envelope rejection, and coexistence/corrupt-current storage cleanup.
- The final corrective pass verified formatting, lint, contract/backend/frontend typechecks, frontend route type generation, and 224 deterministic unit tests (48 contracts, 119 backend, 57 frontend) with the bundled Node 24 runtime. The focused structured-output and OpenAI adapter regression run passed 58 tests. The host pnpm shim remains 11.19.0 rather than the repository-pinned 11.24.0, so equivalent package binaries were invoked directly. The three production builds passed before the corrective passes but were not rerun afterward. Paid/live OpenAI, ElevenLabs, and Turnstile verification was not run and remains prohibited for this ticket; no new manual UI or voice verification was applicable to this non-UI correction.

## Corrective validation hardening

- Reject arbitrary-role application claims across `apply`, `applies`, `applying`, and `applied` with `for`, `to`, or `as`; active or passive submitted-application wording with or without an explicit target; and candidate/applicant/possessive application wording including pending states. Reject general suitability evaluation, role/profession/domain knowledge tests, quizzes, exercises or assessments, and simulation/scenario/roleplay assessment directions at the shared structured-output boundary, with the OpenAI prompt stating the same full policy. Keep benign grounded references to portfolios, competency, domain knowledge, past work/training simulations, applied machine learning, and software/role-based application terminology valid when they are not assessment directions or application claims.
- Keep fake CV facts profession-neutral and grounded; cross-profession fixtures must not acquire software/engineering experience language unless their evidence actually contains it.
- Require both prepared plan types to expose the same 12 universal topic intents. Keep the 11 ordinary fields in `fixedTopics`, and include `clarifications_and_followups` in `topics` with `required: false` so unsupported employer/vacancy questions remain representable without forcing a question.
- On every browser-session load, clear all unsupported versioned ScreenPilot session keys even when the current v2 key coexists or is corrupt, while preserving unrelated tab storage.

## Product decision and rationale

ScreenPilot is a role-agnostic first-stage HR screening demo. Any bounded non-empty role label the candidate states becomes the available **synthetic demo vacancy for that browser session**. The demo does not maintain a supported-role allow-list, unavailable-vacancy path, forced Frontend/Backend choice, special Full Stack fallback, or profession-specific interview branch. This keeps the portfolio story honest: ScreenPilot demonstrates adaptive evidence capture and recruiter-style HR screening, not job-catalogue management or professional assessment.

Frontend Developer and Backend Developer remain useful synthetic fixtures but have no special runtime semantics. A candidate who says Graphic Designer, Customer Support Representative, Product Manager, Full Stack Developer, a compound/multiple-role label, or another profession receives the same universal HR screen. A candidate who is undecided completes an open role-neutral screen.

This decision supersedes the fixed software-role examples in the immutable `docs/SCREENPILOT_PROJECT_SPEC.md`. That file remains untouched as received input; this packet and the parent source of truth are the implementation authority.

## Universal HR scope

The adaptive intent set covers preferred name, requested role, current context, high-level experience and responsibilities, work/collaboration preferences, motivation and next-role priorities, location/work-arrangement preferences, availability, compensation expectation, candidate-stated English use where relevant, candidate questions, human follow-ups, and close. One answer may cover several intents; this is not a rigid script.

Candidate experience/status may change ordering, phrasing, or the amount of clarification. Profession never creates a technical, portfolio, competency, roleplay, professional-knowledge, or hiring-suitability assessment. The interview does not score, rank, recommend, or infer personality, sentiment, accent, protected traits, or culture fit.

## Required target contracts

- Replace the fixed vacancy catalogue as an active session authority with a server-owned role-neutral demo disclosure. Bootstrap must not advertise a finite list of available roles.
- Replace catalogue keys and vacancy-key unions at public/session boundaries with one shared role-label schema: trim and Unicode-normalize the value, require 1–120 characters after normalization, reject control characters and bidi overrides, and always treat it as inert untrusted candidate content.
- Represent candidate role state as one current candidate-authored label or `null` when undecided, plus final-turn evidence IDs and an explicit `candidate_stated | undecided` status. Preserve compound wording such as “Product Designer and UX Researcher” as one bounded label; do not classify or split it to route behavior.
- A correction replaces the current label while retaining transcript evidence/history through ordinary turns and corrected insight semantics. It does not create a second workflow branch.
- CV analysis may return one optional `suggestedRole` containing a bounded label and at least one validated CV fact ID. The suggestion is evidence-linked and non-binding; it does not prove an application or create candidate-confirmed role state.
- Remove `confirmedVacancyKeys`, `suggestedVacancyKey`, `screeningVacancyKeys`, `applicableVacancyKeys`, unavailable-role status, and the fixed `vacancyCatalogKey` request/grant dependency from the target contracts.
- Keep experience-informed preparation branches only where they describe conversational structure (`graduate`, `experienced`, `mixed`, `discovery`); they must never mean profession-specific competency depth.
- Rename the fixed `remote_europe_fit` intent to role-neutral `location_work_arrangement`. Compensation and work arrangement gather candidate preferences unless explicit server-owned facts are present.
- Grants bind entry mode, plan version/hash, anonymous correlation, expiry, and CV-analysis hash where applicable. They do not bind a fixed role catalogue or copy candidate role text into the token.
- Summaries report the candidate-stated role label or undecided state with transcript evidence. They never claim a real vacancy/application or add employer facts.

## Backend and provider behavior

- Bootstrap returns role-neutral synthetic-demo disclosure, limits, privacy/configuration, and the existing content-free anonymous cookie; it returns no fixed opening list, universal salary, location, benefits, work pattern, responsibilities, or qualifications.
- Conversation-first preparation remains deterministic and makes no OpenAI/ElevenLabs call. It contains the universal HR intents and begins role discovery without assuming a profession.
- CV analysis remains stateless, Turnstile-protected, evidence-grounded, and `store: false`. It may suggest any bounded role label only when linked to validated CV facts; prompt injection in the CV remains inert.
- Shared structured-output validation rejects application/vacancy claims for arbitrary role labels and rejects every technical, portfolio, competency, roleplay, professional-knowledge, or profession-specific suitability assessment direction while allowing ordinary grounded CV evidence.
- Provider prompts delimit CV, transcript, insight, and role-label data as untrusted. A role label can be repeated naturally but cannot alter instructions, tools, knowledge, safety rules, or interview type.
- Employer/vacancy questions are answered only from explicit server-owned facts. Missing responsibilities, qualifications, salary, benefits, reporting lines, team size, work pattern, location requirements, and hiring timelines become concise human follow-up items without blocking the interview.
- No paid or live provider call is permitted while implementing or verifying SP-010A. Use deterministic fakes and injected HTTP responses only.

## Frontend and session behavior

- Explain that the candidate's stated role becomes a synthetic, session-only demo vacancy and is not a real opening or application.
- Keep both entry modes equal. There is no pre-call allow-list picker or redirection flow.
- CV plan preview labels an evidence-linked role suggestion as **Suggested from CV — confirm during the call** and never as an applied or available real role.
- Conversation-first begins with open role discovery. If the candidate is undecided, the screen continues without pressure to choose.
- Any non-empty candidate-stated role updates the same role-preference insight/session field. Corrections replace it. Multiple-role wording receives one shared general-HR screen.
- Do not seed employer details from the role label. Show candidate preferences and **Needs human follow-up** for unsupported employer/vacancy questions.
- Session persistence remains allow-listed and current-tab only; role text, like other candidate content, is removed by Clear session and never appears in URLs, cookies, logs, analytics, or server persistence.
- Session restore clears every unsupported versioned ScreenPilot session key before evaluating the current envelope, including coexistence and corrupt-current cases, without removing unrelated `sessionStorage` data.

## Precise implementation scope

- Migrate the affected contracts, demo content, bootstrap/preparation/CV use cases, grants, fake providers, session reducer/persistence, role-preference insight semantics, and documentation/tests to the role-neutral model; do not build the later SP-016 Insight Board UI.
- Update existing files in the canonical repository blueprint; remove superseded fixed-catalogue code, exports, fixtures, constants, dead branches, and error handling when no longer referenced.
- Keep Frontend/Backend fixtures as ordinary examples and add cross-profession fixtures needed by the acceptance matrix.
- Update prompt payload/dynamic-variable shapes consumed by later voice/summary tickets, without configuring or calling the live ElevenLabs agent.
- Preserve all SP-010 validation, privacy, Turnstile, bounded-output, repair, cost-metadata, and no-store guarantees.

### Initial migration inventory

This is the minimum inspected surface from the committed SP-010 tree; follow references and update a file only when the role-neutral contract affects it.

- Contracts: `packages/contracts/package.json`; `src/api/bootstrap.ts`, `cv-analysis.ts`, and `interview-preparation.ts`; `src/interview/employer-context.ts`, `normalized-cv.ts`, `screening-plan.ts`, and `screening-summary.ts`; `src/ai/cv-analysis-output.ts`; and their focused tests. Replace the exported `interview/employer-context` boundary with a role-neutral `interview/demo-context` boundary rather than retaining a misleading compatibility alias.
- Backend demo/use cases/security: `src/demo/vacancy-catalogue.ts`, `employer-faq.ts`, `conversation-first-plan.ts`, and `demo-content.test.ts`; `get-demo-bootstrap.ts`, `prepare-conversation-first.ts`, `analyze-cv.ts`, `ports/cv-analyzer.ts`, and focused tests; `interview-grant.ts` and its tests. Delete the catalogue/FAQ modules once references are migrated; add the server-owned role-neutral demo disclosure under the domain-specific demo tree.
- Backend provider/transport composition: `openai-cv-analyzer.ts`, `fake-openai.ts`, their focused adapter tests, `cv-analyze.routes.test.ts`, and `app.test.ts`. Preserve one-call/repair behavior and prove invalid role-bearing data cannot escape the shared schemas.
- Frontend session: `demo-session.types.ts`, `demo-session.reducer.ts`, `persisted-session.schema.ts`, `demo-session-provider.client.test.tsx`, reducer tests, and storage tests. Increment the persisted schema version, reject/migrate the old fixed-catalogue envelope deliberately, and keep hydration/clear/expiry behavior unchanged.
- Fixtures: replace fixed-role-only assumptions in `tests/fixtures/cv/fixture-manifest.json` and related synthetic inputs with the required cross-profession matrix; keep production imports out of the root fixture tree.

## Non-goals

- No ATS, job board, employer vacancy CRUD, external job lookup, role ontology, classifier, recommendations engine, or persistent vacancy record.
- No generated job description, competency framework, technical rubric, portfolio review, roleplay, professional-knowledge test, or hiring suitability output.
- No inference that a CV role title is the role applied for; no employer fact inferred from candidate wording.
- No country-specific employment advice or universal compensation/work-arrangement promise.
- No database, durable server session, cache, queue, object storage, analytics payload, or hidden candidate registry.
- No SP-011 screen implementation, SP-014 voice-agent configuration, SP-020 summary generation, SP-022 limiter, deployment, or paid provider verification.

## Acceptance criteria

- Any valid non-empty candidate-stated role becomes the current synthetic demo vacancy without allow-list lookup, error, redirection, or special branch.
- Frontend Developer and Backend Developer pass through the same path as every other label.
- Full Stack Developer is accepted directly without a fallback prompt.
- Compound/multiple-role wording remains one candidate-authored label and receives one shared HR screen.
- An undecided candidate completes the same HR screen with role state explicitly unresolved.
- A CV role suggestion is optional, evidence-linked, non-binding, and replaceable by candidate speech.
- Role correction updates local state and later wording without losing transcript evidence or restarting the interview.
- Every role uses the universal adaptive HR intents and produces zero technical, portfolio, competency, roleplay, professional-knowledge, or suitability questions.
- Both CV-assisted and conversation-first plans contain every universal intent, including an optional non-blocking `clarifications_and_followups` topic for unsupported employer/vacancy questions.
- Unsupported employer/vacancy questions create human follow-up and do not interrupt completion.
- No role label or CV instruction changes system behavior; no employer detail is invented.
- Existing statelessness, cleanup, grant, origin, Turnstile, provider-call ordering, logging, and content-bound guarantees continue to pass.

## Deterministic scenario matrix

1. **Graphic Designer** is accepted normally and receives only the universal HR intents.
2. **Customer Support Representative** is accepted normally with no competency simulation or support-role knowledge test.
3. A CV suggests **Product Manager** only through linked CV facts; candidate confirmation or correction remains required.
4. **Backend Developer** receives no technical questions and no special branching.
5. **Full Stack Developer** is accepted without redirection.
6. Candidate corrects one role to another; the current label and insight update from final-turn evidence.
7. Multiple-role wording receives one shared HR screen without splitting into parallel interviews.
8. An undecided candidate completes an open role-neutral screen.
9. Unsupported employer/vacancy questions become human follow-up without interrupting completion.
10. Prompt injection in a CV or candidate role label remains inert untrusted data.
11. Compensation and location/work-arrangement prompts gather preferences and do not repeat the old Remote-Europe or €40,000–€55,000 claims.
12. Candidate experience/status adjusts conversation structure but never introduces profession-specific evaluation.

## Search-based completion checks

- Search active product code/contracts for fixed `frontend-developer`, `backend-developer`, `demo-engineering`, `confirmedVacancyKeys`, `suggestedVacancyKey`, `screeningVacancyKeys`, `applicableVacancyKeys`, `unavailable_requested`, and `remote_europe_fit`; any remaining occurrence must be an explicitly labelled migration fixture or historical document.
- Search prompts/UI/demo content for Full Stack redirection, supported-role lists, unavailable-vacancy copy, general-engineering fallback, universal Remote-Europe claims, and universal €40,000–€55,000 claims.
- Search role handling for dynamic prompt interpolation or instruction concatenation that fails to delimit the role label as data.
- Search logs, URLs, cookies, analytics, files, caches, and server registries for role/candidate persistence.
- Confirm `docs/SCREENPILOT_PROJECT_SPEC.md` is unchanged.

## Verification commands

Use the repository-pinned Node.js/pnpm versions and the smallest affected-package commands first:

```bash
pnpm format:check
pnpm lint:contracts
pnpm lint:backend
pnpm lint:frontend
pnpm typecheck:contracts
pnpm typecheck:backend
pnpm typecheck:frontend
pnpm test:unit:contracts
pnpm test:unit:backend
pnpm test:unit:frontend
pnpm build:contracts
pnpm build:backend
pnpm build:frontend
```

Run focused schema/reducer/use-case/route/prompt tests during iteration. Run the complete unpaid fast gate once after migration. Do not run a live OpenAI, ElevenLabs, or Turnstile request.

## Documentation synchronization

When implementation completes, update the parent source of truth, this packet, the ticket index, README, and supersession notes in SP-006/SP-007/SP-009/SP-010. Reconcile downstream SP-011/SP-012/SP-014/SP-016/SP-017/SP-020/SP-021/SP-025/SP-028 requirements and remove any stale fixed-vacancy language discovered elsewhere. Preserve the immutable project specification unchanged.

## Commit boundary

Keep SP-010A as one reviewable contract/domain migration. Do not implement SP-011 or later UI/voice/summary work merely because adjacent shapes are visible. Do not stage or commit unless the user explicitly authorizes it.

## Completion handoff

Report contract migrations, removed fixed-role behavior, deterministic scenarios, searches, checks, and every remaining historical occurrence. State explicitly that no paid provider call was made and identify any user-only live verification as not applicable to this migration.
