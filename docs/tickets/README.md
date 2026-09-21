# ScreenPilot standalone ticket index

Status: execution-packet index  
Last synchronized: 2026-09-21<br>
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

## Ticket commit-message convention

Every commit that implements or completes a ticket must begin with that ticket's exact ID, followed by a colon and a short imperative description: `SP-###: description` or `SP-###A: description`. For example, SP-011A uses `SP-011A: modernize the ScreenPilot entry experience`. The ticket ID always comes first; do not prefix the subject with `feat`, `fix`, `docs`, or another Conventional Commit type. This naming rule does not authorize staging or committing—the user must still explicitly request the Git action.

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

Current implementation progress, reconciled against code, Git history, and the
owner-approved SP-018A scope decision on 2026-09-21:

- SP-001 through SP-005 are completed, reviewed, revised, and represented by their documented implementation commits.
- SP-004's earlier direction is represented by `6f94d0a`; the approved Deep Ink + Warm Coral revision supersedes it for implementation.
- SP-003 remains credential-free by design; live/paid verification waits for user-supplied credentials and explicit permission, while deterministic fake-mode verification is complete.
- SP-006 is completed, revised, and represented by implementation commit `c8bbaf2`, including interrupted CV/summary recovery and hardened restored-state validation.
- SP-007 is completed, revised, and represented by implementation commit `f890bfb`; its previously blocked PDF-library verification is now closed by SP-008.
- SP-008 is completed, verified, and represented by implementation commit `0b6819f`.
- SP-009 is completed, verified, and represented by implementation commit `db65b2c`.
- SP-010 is completed, verified, and represented by implementation commit `744901e`. Its fixed Frontend/Backend role-alignment boundary is now historical and explicitly superseded by SP-010A; its evidence, safety, statelessness, and provider protections remain required.
- SP-010A is completed, verified, and represented by implementation commit `6febf01`; its role-neutral contract/domain migration supersedes the earlier fixed-role direction without making a paid provider call.
- SP-011 is completed and verified on 2026-09-11, including its focused corrective validation pass and commit `a04e04a`.
- SP-011A was reopened after user visual review on 2026-09-11. Its accepted corrected direction centers the live interview, simplifies the language, adds an automatically playing six-example/two-board note-taking sequence with no visible playback/topic controls, and uses a meaningful scroll story without a detached privacy/footer treatment. A later correction extends the same Deep Ink/plum/coral language into one centralized `/demo` workspace with a compact context band, inert progress status, predictable home/Back/exit behavior, and no white setup/review surfaces. The privacy, role-neutral, and canonical session-state contracts are unchanged. User visual/manual approval is recorded, so SP-012 is no longer blocked on this design gate; SP-011A still awaits its deferred broad automated verification before completion.
- SP-012 is completed, verified with deterministic provider coverage, and represented by implementation commit `6be106a`; live OpenAI and Turnstile verification remains credential-gated.
- SP-013 is completed, verified for its non-hardware boundary, and represented by implementation commit `d5338cb`; real microphone/device checks remain owner-only.
- SP-014 is completed, validated after its fake-mode and terminal-session cleanup corrections, and represented by implementation commit `9075c7d`; real ElevenLabs, Turnstile, retention-dashboard, and microphone verification remains credential-gated.
- SP-014A is completed as documentation-only work. Its consolidated runbook covers every non-deployment OpenAI, ElevenLabs, Turnstile, local-secret, spend, rotation, and manual-verification step without requesting credentials or making a paid call; owner account setup and live/microphone checks remain explicitly pending.
- SP-015 is implemented and deterministically verified. SP-018A supplied the initial active-session smoke; its remaining responsive, reduced-motion, callback, cleanup, and post-fix observations move unchanged to the consolidated SP-021A gate after review exists.
- SP-015A's owner-directed landing and `/demo` UI/UX implementation is represented by commit `cab2990`. Motion, illustration, CTA, responsive alignment, preflight hierarchy, the shared stage-heading primitive, typography tokens, and spacing rhythm have focused deterministic coverage; consolidated owner visual acceptance and remaining whole-flow/manual checks stay tracked in that packet.
- SP-016 is implemented, locally verified without credentials or paid calls, and represented by commit `13fc434`. Its schemas, five-tool dispatcher, evidence validation, correction-history preservation, CV seeding, strict session synchronization, aligned height-matched Insight Board, responsive connector treatment, and safety cases have focused coverage; published-agent callbacks and an owner/browser reduced-motion visual check remain explicitly pending.
- SP-016A is implemented, locally verified, and represented by commit `08ff846`. Every currently reachable `/demo` step fits practical tablet and laptop browser viewports through height-aware density, responsive composition, concise copy, bottom-anchored action footers, and bounded inner scrolling; the final compact-anchor evidence uses the real `/demo` flow from asserted top-of-page state, reduced motion is computed and checked, and the production build ran in a zero-local-environment snapshot. The fake-mode End interview path now enters a reducer-owned, scrubbed, non-persistable placeholder stage. Remaining owner/live observations are carried by the consolidated live-validation gate.
- SP-017 is locally implemented and verified at policy version `sp017-2026-09-16.1`. Its source-controlled prompt, eight-variable provider-config wiring, bounded reconnect state/time context, good/bad transcript fixtures, strengthened 52-test deterministic/semantic policy suite, and synchronization runbook are complete without a provider call. The 2026-09-16 closure revision adds only the provider-owned `end_call` requirement after a brief spoken close. The owner confirmed publication of the new prompt, complete client-event set including `agent_chat_response_part`, and sole End conversation system tool to ScreenPilot/Main without Preview. Immutable revision `agtvrsn_1501m2mwx4ffek39r88ygh1ngxq4` is recorded in source; remaining live behavior observation moves to SP-021A after the complete review flow exists.
- SP-018 is implemented and deterministically verified; SP-018A's no-spend
  caption/termination correction advances the provider-config target to
  `sp018-2026-09-16.1`. Its bounded content-free timing tracker, source-labelled
  profile reports, p50/p95 release gates, visual wait states,
  substantive-audio/filler separation, filler review limits, card-render boundary,
  and exact eight-minute stop are complete without a live call. Empirical
  provider tuning and all credentialed/live acceptance remain outside SP-018.
- SP-018A is finalized by explicit owner scope decision and represented by
  commit `3add8d1`. Its bounded live smoke proved one synthetic CV analysis and
  one private CV-assisted WebRTC interview; the two defects found in that run
  were corrected and deterministically verified. The owner accepted that
  evidence as sufficient to unlock SP-019 and confirmed the local runtime is
  restored to `PAID_DEMO_ENABLED=false` and `PROVIDER_MODE=fake`. Post-fix live
  observation, the second entry mode, complete tool/runtime-variable coverage,
  the 50-turn and 50-preparation samples, cleanup/privacy inspection, and
  provider revision/retention/usage/cost review remain explicitly unchecked and
  move intact to required SP-021A after SP-021. No public/release readiness is
  claimed by this closure.
- SP-019 is implemented and deterministically verified without provider
  transcript retrieval or a paid call. Orderly and interrupted interviews now
  converge on a bounded same-tab evidence review with stable transcript anchors,
  explicit provenance, unavailable-reference fallbacks, focus return, restore
  validation, and non-destructive quota handling. Human 320 px/200% zoom and
  screen-reader approval remain in the later responsive/live gates; SP-020 is
  eligible now.

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
| SP-011A | [Modernize the entry and early demo experience](SP-011A-modernize-entry-and-early-demo-experience.md) | SP-005, SP-006, SP-010A, SP-011 | Required |
| SP-012 | [Build CV-assisted frontend path](SP-012-build-cv-assisted-frontend-path.md) | SP-005, SP-006, SP-008, SP-010, SP-010A, SP-011, SP-011A | Required |
| SP-013 | [Build disclosure, consent, and microphone preflight](SP-013-build-disclosure-consent-and-microphone-preflight.md) | SP-006, SP-011, SP-012 | Required |
| SP-014 | [Configure ElevenLabs agent and private token flow](SP-014-configure-elevenlabs-agent-and-token-flow.md) | SP-003, SP-009, SP-010, SP-010A, SP-013 | Required |
| SP-014A | [Document complete live-provider and credential setup](SP-014A-document-live-provider-and-credential-setup.md) | SP-003, SP-009, SP-010, SP-012, SP-014 | Required |
| SP-015 | [Normalize live events, captions, and controls](SP-015-normalize-live-events-captions-and-controls.md) | SP-006, SP-014 | Required |
| SP-015A | [Polish the landing and demo flow after visual review](SP-015A-polish-landing-and-demo-flow-after-visual-review.md) | SP-005, SP-011A, SP-012, SP-013, SP-015 | Required |
| SP-016 | [Build client tools and Insight Board](SP-016-build-client-tools-and-insight-board.md) | SP-005, SP-006, SP-010A, SP-015, SP-015A | Required |
| SP-016A | [Fit demo steps to tablet and laptop viewports](SP-016A-fit-demo-steps-to-tablet-and-laptop-viewports.md) | SP-005, SP-011A, SP-012, SP-013, SP-015A, SP-016 | Required |
| SP-017 | [Write and evaluate adaptive interview policy](SP-017-write-and-evaluate-adaptive-interview-policy.md) | SP-007, SP-010A, SP-011, SP-012, SP-014, SP-016, SP-016A | Required |
| SP-018 | [Tune latency, interruption, and filler](SP-018-tune-latency-interruption-and-filler.md) | SP-014, SP-015, SP-017 | Required |
| SP-018A | [Verify live CV and voice integrations](SP-018A-verify-live-cv-and-voice-integrations.md) | SP-014A, SP-018 | Required |
| SP-019 | [Finalize transcript and evidence navigation](SP-019-finalize-transcript-and-evidence-navigation.md) | SP-015, SP-016, SP-018A | Required |
| SP-020 | [Generate stateless post-call summary](SP-020-generate-stateless-post-call-summary.md) | SP-009, SP-010, SP-010A, SP-017, SP-019 | Required |
| SP-021 | [Build review, retry, and Clear session](SP-021-build-review-retry-and-clear-session.md) | SP-005, SP-006, SP-010A, SP-019, SP-020 | Required |
| SP-021A | [Validate the complete live demo flow](SP-021A-validate-complete-live-demo-flow.md) | SP-018A, SP-019, SP-020, SP-021 | Required |
| SP-022 | [Add public abuse and spend controls](SP-022-add-public-abuse-and-spend-controls.md) | SP-003, SP-009, SP-010, SP-014, SP-020, SP-021 | Required |
| SP-023 | [Harden privacy, headers, and logging](SP-023-harden-privacy-headers-and-logging.md) | SP-006, SP-009, SP-010, SP-014, SP-020 | Required |
| SP-024 | [Harden accessibility, responsiveness, and performance](SP-024-harden-accessibility-responsiveness-and-performance.md) | SP-005, SP-011, SP-012, SP-013, SP-016, SP-016A, SP-021 | Required |
| SP-025 | [Complete focused manual release QA](SP-025-complete-focused-manual-release-qa.md) | SP-010A, SP-017, SP-018, SP-021A, SP-022, SP-023, SP-024 | Required |
| SP-025A | [Audit release-candidate code and ticket completion](SP-025A-audit-release-candidate-code-and-ticket-completion.md) | SP-025 | Required |
| SP-026 | [Deploy frontend and backend](SP-026-deploy-frontend-and-backend.md) | SP-022, SP-023, SP-025A | Required |
| SP-027 | [Optionally produce portfolio materials](SP-027-optionally-produce-portfolio-materials.md) | SP-018, SP-021A, SP-025A, SP-026 | Optional |
| SP-028 | [Optionally add extended automation](SP-028-optionally-add-extended-automation.md) | SP-010A, SP-026 | Optional |

## Milestone boundaries

- Milestone 0: SP-001 through SP-005 — repository, quality, configuration, and visual foundations.
- Milestone 1: SP-006 through SP-012, including SP-010A and SP-011A — disposable state, the role-neutral migration, the modern entry shell, and both preparation paths.
- Milestone 2: SP-013 through SP-018A, including SP-014A and SP-015A — shared preflight, provider setup, real-time voice, owner-reviewed UI polish, insights, policy, latency controls, and the bounded live CV/voice compatibility smoke.
- Milestone 3: SP-019 through SP-021A — transcript evidence, summary, local review, and one consolidated complete-flow live validation.
- Milestone 4: SP-022 through SP-025A — public-demo hardening, focused release approval, and the final repository/ticket audit.
- Milestone 5: SP-026 — deployment.
- Milestone 6: SP-027 — optional portfolio packaging.
- Milestone 7: SP-028 — optional extended automation.

SP-025A is the final required pre-deployment audit gate. SP-026 is the required
deployment/release boundary, and it may deploy only the exact candidate audited
by SP-025A. SP-027 and SP-028 do not block it.

## Initial implementation runway

Ticket numbers identify scope; dependencies determine safe execution order:

```text
Repository/runtime lane: SP-001 -> SP-002 + SP-003 -> SP-006 -> SP-007 -> SP-009 -> SP-010 -> SP-010A
Visual lane:             SP-001 -> SP-002 -> SP-004 (approval) -> SP-005
Convergence:             SP-005 + SP-006 -> SP-008; both lanes feed SP-011 -> SP-011A -> SP-012
```

SP-002 and SP-003 may be taken in either order after SP-001. The runtime lane can proceed while SP-004 waits for design approval; the approval gate blocks broad React styling, not the contracts/session/backend backbone.

Do not start feature implementation until the relevant foundation exists in code. The minimum shared checkpoint is one lockfile, three targetable workspaces, enforced `frontend -> contracts <- backend` direction, real build/quality commands, browser-safe contracts, app-local state/config ownership, verified secret-file ignore rules, blank app-scoped environment templates, and explicit fake mode with no paid-call path.
