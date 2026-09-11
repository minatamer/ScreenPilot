# ScreenPilot standalone ticket index

Status: execution-packet index  
Last synchronized: 2026-09-11<br>
Parent source of truth: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)

---

## Why these files exist

Each implementation ticket has its own Markdown execution packet so a fresh agent chat can work on one commit-sized task without loading the complete project plan. Every packet repeats the local decisions, interfaces, scope exclusions, acceptance criteria, and focused verification needed for that ticket. Links into the parent document are precision references, not an instruction to read all 2,979 lines.

The immutable client-style input remains [`../SCREENPILOT_PROJECT_SPEC.md`](../SCREENPILOT_PROJECT_SPEC.md). Do not edit it and do not use it to override a newer decision.

## Authority and synchronization

Use this order when instructions conflict:

1. The latest explicit user decision.
2. The parent ScreenPilot source of truth.
3. The current standalone ticket packet for ticket-local execution details.
4. An approved implementation ADR.
5. The immutable raw project specification.

The standalone packet should normally contain everything needed to execute its ticket. Open only its specifically linked parent sections when exact schemas, complete prompt examples, design-token values, deployment records, or acceptance matrices are required. If a material decision changes, update the parent document and every affected ticket packet in the same documentation change.

The canonical filename-level repository map is [Section 11's filesystem blueprint](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#filename-level-filesystem-blueprint). SP-001 repeats its exact initial scaffold; later tickets add only the files assigned to their responsibility. Do not create the complete target tree as empty folders.

## Fresh-chat usage

Start a new implementation chat with a prompt like:

> Implement only SP-012 using `docs/tickets/SP-012-build-cv-assisted-frontend-path.md`. Read that file completely before changing code. Inspect the current repository and completed dependencies. Follow its scope, acceptance criteria, and focused verification. Do not absorb adjacent tickets or edit the raw client specification.

The implementation agent should:

- read the selected packet completely;
- inspect the repository and confirm its listed dependencies are actually present;
- read only the parent sections explicitly linked by the packet when more precision is needed;
- preserve unrelated user work and avoid implementing later tickets early;
- keep the change reviewable as one logical commit boundary;
- run the smallest relevant checks plus the ticket's manual verification;
- avoid the optional full browser/AI suites unless the ticket is SP-028 or the user asks;
- never make paid OpenAI or ElevenLabs calls from default tests or CI;
- keep every missing API/provider field exactly blank, never populate credentials on the user's behalf, and follow the selected packet's manual credential gate plus the parent [credential guide](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup);
- verify `apps/backend/.env.local` and `apps/frontend/.env.local` are ignored before the user fills them; if a live value is unavailable, finish with fakes and report the paid/live checklist item as blocked rather than inventing a pass;
- report changed files, verification performed, remaining risks, and any checklist item not completed;
- create a commit only when the user explicitly asks or the active workflow already authorizes committing.

If a dependency is missing or materially different, stop at that boundary and report it. Do not silently reimplement several earlier tickets inside the current one.

## Project-wide guardrails carried by every ticket

- This is a public portfolio demo, not an MVP or production recruiting platform.
- The two equal paths are **Use a CV** and **Start without a CV**; both converge on shared preflight, interview, review, and Clear-session behavior.
- Visible employer wording is **our company** or **the company**. There is no fictional employer brand.
- ScreenPilot is role-agnostic: any bounded non-empty role label stated by the candidate becomes the available synthetic demo vacancy for that browser session. An undecided candidate continues with an open role-neutral screen.
- There is no role allow-list, unavailable-vacancy branch, forced Frontend/Backend choice, Full Stack fallback, or profession-specific interview path. Named roles are ordinary fixtures only.
- Every role receives the same adaptive general-HR intent coverage. Candidate experience/status may affect conversational structure, but profession never creates technical, portfolio, competency, roleplay, professional-knowledge, or hiring-suitability assessment.
- Role labels and CV suggestions are untrusted candidate data. Never infer employer responsibilities, qualifications, compensation, benefits, reporting lines, team size, work pattern, location requirements, or hiring timelines from them; unsupported employer/vacancy questions become human follow-up.
- The interview is a concise, natural HR/recruiter screen, never a technical assessment or hiring decision.
- The application is stateless: no application database, object storage, queue, saved PDF, saved audio, saved transcript, or historical account workflow.
- Candidate/session content is confined to current-tab memory and bounded `sessionStorage`; secrets, provider tokens, Turnstile tokens, PDFs, raw CV text, and audio are never persisted there.
- ElevenLabs is the only real-time voice/transcription/TTS path; OpenAI GPT-5.4 mini supplies interview, CV, and summary intelligence where specified.
- Audio saving is disabled, ElevenLabs transcript retention uses the shortest locked setting, and direct OpenAI Responses calls use `store: false`.
- Cloudflare Turnstile Free protects each route capable of triggering metered provider usage: OpenAI CV analysis, ElevenLabs voice-session authorization, and OpenAI summary. It is not added to the free deterministic preparation route; Bot Fight Mode, a Cloudflare proxy, paid WAF, persistent IP ledger, and authentication are out of scope.
- Phone, tablet, compact laptop, desktop, and large-monitor behavior are equal release priorities; there is no reduced mobile version.
- Prefer strict types, clear boundaries, modular shared components, reuse, efficient data flow, and elimination of redundant implementations.
- The fixed internal dependency graph is `apps/frontend -> packages/contracts <- apps/backend`; applications never import each other, and contracts remain browser-safe.
- Frontend-only workflow/persistence models stay in the frontend session feature; server configuration, demo values, grants, and provider mapping stay in the backend. Only real cross-boundary schemas belong in contracts.
- Use one pnpm lockfile, application-scoped environment examples, real quality commands, co-located unit tests, and root `tests/fixtures` only for shared synthetic inputs.

## Ordered ticket index

Current implementation progress, reconciled against code and Git history on 2026-09-11:

- SP-001 through SP-005 are completed, reviewed, revised, and represented by their documented implementation commits.
- SP-004's earlier direction is represented by `6f94d0a`; the approved Deep Ink + Warm Coral revision supersedes it for implementation.
- SP-003 remains credential-free by design; live/paid verification waits for user-supplied credentials and explicit permission, while deterministic fake-mode verification is complete.
- SP-006 is completed, revised, and represented by implementation commit `c8bbaf2`, including interrupted CV/summary recovery and hardened restored-state validation.
- SP-007 is completed, revised, and represented by implementation commit `f890bfb`; its previously blocked PDF-library verification is now closed by SP-008.
- SP-008 is completed, verified, and represented by implementation commit `0b6819f`.
- SP-009 is completed, verified, and represented by implementation commit `db65b2c`.
- SP-010 is completed, verified, and represented by implementation commit `744901e`. Its fixed Frontend/Backend role-alignment boundary is now historical and explicitly superseded by SP-010A; its evidence, safety, statelessness, and provider protections remain required.
- SP-010A is completed, verified, and represented by implementation commit `6febf01`; its role-neutral contract/domain migration supersedes the earlier fixed-role direction without making a paid provider call.
- SP-011 is completed and verified on 2026-09-11. The real landing now exposes equal CV-assisted and conversation-first paths, deterministic conversation-first preparation reaches the shared preflight boundary, and the temporary SP-005 showcase is gone. SP-012 is now the next eligible implementation ticket.

Execute in order unless the dependency column proves a later packet can safely proceed.

| Ticket | Execution packet | Depends on | Release status |
| --- | --- | --- | --- |
| SP-001 | [Initialize Git and the plain pnpm workspace](SP-001-initialize-pnpm-workspace.md) | Nothing | Required |
| SP-002 | [Add fast essential quality checks](SP-002-add-fast-essential-quality-checks.md) | SP-001 | Required |
| SP-003 | [Add validated configuration and provider fakes](SP-003-add-validated-configuration-and-provider-fakes.md) | SP-001 | Required |
| SP-004 | [Create and approve visual design references](SP-004-create-and-approve-visual-design-references.md) | SP-001, SP-002 | Required |
| SP-005 | [Implement Signal Canvas foundations](SP-005-implement-signal-canvas-foundations.md) | SP-002, SP-004 | Required |
| SP-006 | [Define browser-session contracts and reducer](SP-006-define-browser-session-contracts-and-reducer.md) | SP-001, SP-003 | Required |
| SP-007 | [Add vacancy catalogue and CV fixtures](SP-007-add-vacancy-catalogue-and-cv-fixtures.md) | SP-006 | Required |
| SP-008 | [Implement browser-only PDF extraction](SP-008-implement-browser-only-pdf-extraction.md) | SP-005, SP-006 | Required |
| SP-009 | [Build backend foundation and conversation preparation](SP-009-build-backend-foundation-and-conversation-preparation.md) | SP-003, SP-006, SP-007 | Required |
| SP-010 | [Build stateless CV-analysis endpoint](SP-010-build-stateless-cv-analysis-endpoint.md) | SP-003, SP-007, SP-009 | Required |
| SP-010A | [Make every candidate-selected role an available synthetic demo vacancy](SP-010A-make-every-candidate-selected-role-available.md) | SP-006, SP-007, SP-009, SP-010 | Required |
| SP-011 | [Build conversation-first frontend path](SP-011-build-conversation-first-frontend-path.md) | SP-005, SP-006, SP-007, SP-009, SP-010A | Required |
| SP-012 | [Build CV-assisted frontend path](SP-012-build-cv-assisted-frontend-path.md) | SP-005, SP-006, SP-008, SP-010, SP-010A, SP-011 | Required |
| SP-013 | [Build disclosure, consent, and microphone preflight](SP-013-build-disclosure-consent-and-microphone-preflight.md) | SP-006, SP-011, SP-012 | Required |
| SP-014 | [Configure ElevenLabs agent and private token flow](SP-014-configure-elevenlabs-agent-and-token-flow.md) | SP-003, SP-009, SP-010, SP-010A, SP-013 | Required |
| SP-015 | [Normalize live events, captions, and controls](SP-015-normalize-live-events-captions-and-controls.md) | SP-006, SP-014 | Required |
| SP-016 | [Build client tools and Insight Board](SP-016-build-client-tools-and-insight-board.md) | SP-005, SP-006, SP-010A, SP-015 | Required |
| SP-017 | [Write and evaluate adaptive interview policy](SP-017-write-and-evaluate-adaptive-interview-policy.md) | SP-007, SP-010A, SP-011, SP-012, SP-014, SP-016 | Required |
| SP-018 | [Tune latency, interruption, and filler](SP-018-tune-latency-interruption-and-filler.md) | SP-014, SP-015, SP-017 | Required |
| SP-019 | [Finalize transcript and evidence navigation](SP-019-finalize-transcript-and-evidence-navigation.md) | SP-015, SP-016 | Required |
| SP-020 | [Generate stateless post-call summary](SP-020-generate-stateless-post-call-summary.md) | SP-009, SP-010, SP-010A, SP-017, SP-019 | Required |
| SP-021 | [Build review, retry, and Clear session](SP-021-build-review-retry-and-clear-session.md) | SP-005, SP-006, SP-010A, SP-019, SP-020 | Required |
| SP-022 | [Add public abuse and spend controls](SP-022-add-public-abuse-and-spend-controls.md) | SP-003, SP-009, SP-010, SP-014, SP-020, SP-021 | Required |
| SP-023 | [Harden privacy, headers, and logging](SP-023-harden-privacy-headers-and-logging.md) | SP-006, SP-009, SP-010, SP-014, SP-020 | Required |
| SP-024 | [Harden accessibility, responsiveness, and performance](SP-024-harden-accessibility-responsiveness-and-performance.md) | SP-005, SP-011, SP-012, SP-013, SP-016, SP-021 | Required |
| SP-025 | [Complete focused manual release QA](SP-025-complete-focused-manual-release-qa.md) | SP-010A, SP-017, SP-018, SP-021, SP-022, SP-023, SP-024 | Required |
| SP-026 | [Deploy frontend and backend](SP-026-deploy-frontend-and-backend.md) | SP-022, SP-023, SP-025 | Required |
| SP-027 | [Optionally produce portfolio materials](SP-027-optionally-produce-portfolio-materials.md) | SP-018, SP-021, SP-025, SP-026 | Optional |
| SP-028 | [Optionally add extended automation](SP-028-optionally-add-extended-automation.md) | SP-010A, SP-026 | Optional |

## Milestone boundaries

- Milestone 0: SP-001 through SP-005 — repository, quality, configuration, and visual foundations.
- Milestone 1: SP-006 through SP-012, including SP-010A — disposable state, the role-neutral migration, and both preparation paths.
- Milestone 2: SP-013 through SP-018 — shared preflight, real-time voice, insights, policy, and latency.
- Milestone 3: SP-019 through SP-021 — transcript evidence, summary, and local review.
- Milestone 4: SP-022 through SP-025 — public-demo hardening and focused release approval.
- Milestone 5: SP-026 — deployment.
- Milestone 6: SP-027 — optional portfolio packaging.
- Milestone 7: SP-028 — optional extended automation.

SP-026 is the required release boundary. SP-027 and SP-028 do not block it.

## Initial implementation runway

Ticket numbers identify scope; dependencies determine safe execution order:

```text
Repository/runtime lane: SP-001 -> SP-002 + SP-003 -> SP-006 -> SP-007 -> SP-009 -> SP-010 -> SP-010A
Visual lane:             SP-001 -> SP-002 -> SP-004 (approval) -> SP-005
Convergence:             SP-005 + SP-006 -> SP-008; both lanes then feed SP-011/SP-012
```

SP-002 and SP-003 may be taken in either order after SP-001. The runtime lane can proceed while SP-004 waits for design approval; the approval gate blocks broad React styling, not the contracts/session/backend backbone.

Do not start feature implementation until the relevant foundation exists in code. The minimum shared checkpoint is one lockfile, three targetable workspaces, enforced `frontend -> contracts <- backend` direction, real build/quality commands, browser-safe contracts, app-local state/config ownership, verified secret-file ignore rules, blank app-scoped environment templates, and explicit fake mode with no paid-call path.
