# SP-012 — Build the CV-assisted frontend preparation path

Status: Required  
Implementation state: Completed in deterministic fake mode; credential-gated live verification remains pending<br>
Milestone: Milestone 1 — interview preparation paths  
Last synchronized: 2026-09-12<br>
Depends on: SP-005, SP-006, SP-008, SP-010, SP-010A, SP-011, SP-011A<br>
Suggested commit: `SP-012: add CV-assisted preparation`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Connect upload/sample extraction to protected CV analysis, then present grounded facts and an explainable tailored plan before converging on the shared preflight.

## Standalone implementation context

- The CV path represents a screening call after a CV was already submitted upstream; ScreenPilot is not the job application portal.
- Uploaded and bundled sample PDFs use the same local extraction and backend analysis path.
- Immediately before paid analysis, execute the reusable managed Turnstile gate with action `cv_analyze`; its token is memory-only and single-use.
- After a validated response, clear raw extracted text and store only normalized facts, the plan, grant, and bounded public metadata in `sessionStorage`.
- Plan preview has **What the CV says** and **What ScreenPilot will explore**. Every CV-derived topic links to evidence; fixed topics are marked as standard screening.
- An evidence-linked role suggestion is labelled **Suggested from CV — confirm during the call**. The visitor does not select or confirm a role before the call.
- This branch converges into the exact shared preflight used by conversation-first.
- Render every CV preparation stage inside SP-011A's centralized Deep Ink/plum/coral `/demo` workspace. Preserve its header-owned inert progress status, **Clear & exit**, and compact session/privacy/human-decision context band; do not reintroduce a marketing navbar, white/Warm White page/card/form surfaces, or a stage-local shell.
- Role-neutral synthetic-demo disclosure comes from bootstrap and API payloads use SP-010A's declared role-label contracts through the shared relative `/v1` client; the feature does not mirror server values, create a role allow-list, or create a second HTTP stack.

## Manual credential gate

- The frontend receives `TURNSTILE_SITE_KEY` from the validated backend bootstrap. Do not add it—or any secret—to `apps/frontend/.env.local`; that file needs only the local backend rewrite origin.
- The real CV path reuses SP-010's backend `OPENAI_API_KEY`, `TURNSTILE_SECRET_KEY`, allowed hostnames, and public site key. Obtain them through the official links in the parent [credential guide](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup).
- Component/integration work must use injected fake Turnstile and fake analysis responses while values remain blank. The real challenge/provider walkthrough remains unchecked until the user fills the ignored backend file and permits a paid OpenAI request.

## Scope boundaries

- Do not upload/store the PDF, persist raw extracted text, add a plan editor/regeneration workflow, or ask for recruiter approval.
- Do not claim the candidate applied for any role, turn a CV suggestion into candidate-confirmed role state, or invent candidate/employer values.
- Do not allow sample-CV placeholders to leak into uploaded-CV sessions.
- Do not create separate desktop/mobile or CV-only preflight/interview/review implementations.
- Do not start ElevenLabs in this ticket.

## Implementation checklist

- [x] Connect the landing CV card to upload/sample selection and the SP-008 extractor.
- [x] Implement truthful extraction and analysis progress labels without fake percentages or premature facts.
- [x] Build/reuse the managed interaction-only Turnstile gate for `cv_analyze`, with a bounded/cancellable script loader, stable accessible fallback layout, and token reset.
- [x] Call the SP-010A-migrated `POST /v1/cv/analyze` with bounded text, client request ID, and one-time token; do not send a fixed catalogue key.
- [x] Clear raw text only after a validated successful response; preserve it in component memory for a safe manual retry.
- [x] Validate and store normalized CV, plan, grant, expiry, and coarse metadata.
- [x] Render evidence-linked CV fact cards and planned topic cards with fixed-topic badges.
- [x] Display any evidence-linked bounded role suggestion as **Suggested from CV — confirm during the call** and provide no pre-call role selector or supported-role list.
- [x] Offer only Continue and Start over; implement typed analysis/Turnstile/schema/grant-expiry errors and mode-aware Back behavior.
- [x] Converge on the same shared preflight state/components.
- [x] Preserve the SP-011A shared dark workspace, compact context band, navigation language, and viewport-aware natural-scroll fallback across extraction, analysis, plan preview, and shared preflight.
- [x] Test two distinct fixtures, no-placeholder leakage, retry/reset, evidence links, and responsive parity.

## Acceptance criteria

- [x] Both sample and uploaded valid PDFs reach an evidence-grounded plan preview through identical code paths.
- [x] Two distinct fixtures visibly change at least two facts and two topic intents/directions.
- [x] Turnstile must pass before OpenAI analysis and its token never reaches persistence.
- [x] Raw PDF/text is absent after success; only bounded structured state remains.
- [x] No text claims an applied/real vacancy or candidate-confirmed role before candidate speech; all role availability is disclosed as synthetic and session-scoped.
- [x] A CV may suggest any bounded role label only through validated fact IDs; Product Manager and other non-software suggestions render identically and remain replaceable by candidate speech.
- [x] Continue reaches the same preflight implementation as conversation-first.

## Focused verification

- [x] Run targeted frontend integration/component/reducer tests with fake extraction, Turnstile, and backend responses.
- [x] Inspect browser network/storage for PDF, raw CV text, Turnstile token, or sample-value leakage.
- [ ] Manually exercise sample/upload, two different CVs, challenge interaction/failure, analysis timeout/schema error, retry, Start over, and Back.
- [x] Exercise a Product Manager suggestion, no suggestion, and injected role-like CV text; verify each suggestion remains explicitly unconfirmed and replaceable by later candidate speech, and no employer fact or supported-role list appears. Candidate confirmation/correction behavior is owned by SP-016, SP-017, and SP-025.
- [x] Check plan preview at mobile, tablet, desktop, large-monitor, and one intermediate width.

## Implemented result

- Uploaded and bundled sample PDFs now share one local extraction pipeline, one memory-only managed Turnstile boundary, and the relative `POST /v1/cv/analyze` client. The fake bootstrap's blank public site key returns the deterministic fake token without loading Cloudflare or spending provider credits.
- `useCvPreparation` owns the CV path's ephemeral PDF/text lifecycle, abort controllers, progress timers, protected analysis call, retry behavior, and reducer-event bridge. `CvStage` is limited to composing the visible intake, progress, challenge, and error states.
- One browser-safe shared contract now defines the three documented metered boundaries (`cv_analyze`, `voice_token`, and `interview_summary`) for both applications without wiring either later-ticket route. The client's shared script load has a 10-second ceiling; the last cancelled waiter removes the script, listeners, and timer, while cancellation by one of several waiters leaves the shared load available to the others.
- Raw file/text references remain inside the mounted CV feature across safe retries and are released after validated success. Persistence schema v3 stores only public runtime configuration, normalized CV facts, the universal HR plan, grant/expiry, and bounded usage metadata.
- The plan preview renders provisional evidence, evidence-linked topic intents, standard-screen badges, an explicitly unconfirmed fact-linked role suggestion, and only Continue/Start over before converging on the existing shared preflight.
- The deterministic fake analyzer now accepts the compact single-line-break layout produced by the bundled sample PDF while preserving its bounded evidence requirements.

## Verification evidence

- Passed repository formatting, zero-warning ESLint, all workspace typechecks, all 252 unit tests (48 contracts, 120 backend, 84 frontend), and the complete production build using the repository-pinned Node 24 and pnpm 11.24 toolchain. The validation follow-up specifically reran 15 Turnstile/CV tests, all 84 frontend tests, the frontend typecheck/lint, and the frontend production build.
- Browser-tested the bundled sample through extraction, fake protected analysis, evidence-link keyboard focus, plan restore after refresh, Continue, CV-aware Back, Start over, and conversation-first convergence on the same preflight.
- Visually checked 375 px phone, 768 px tablet, 980 px intermediate, 1280 px laptop/desktop, and 1920 px large-monitor layouts. Every checked width had natural vertical scrolling and `scrollWidth === clientWidth`; browser logs contained no warnings or errors.

## Unchecked gates

- The in-app browser's file-chooser bridge timed out twice, so an uploaded PDF was not manually selected in the real browser. Component/integration coverage verifies the upload path, exact analysis request, no sample-value leakage, and structured-only persistence.
- Real production-hostname Turnstile interaction/replay behavior and the live OpenAI response remain unchecked because the required ignored credentials are blank and the user did not authorize a paid request. Deterministic tests cover challenge interaction, expiry/removal, fresh-token retry, timeout/error mapping, and request ordering.

## Commit boundary

Keep SP-012 reviewable as one logical change represented by `SP-012: add CV-assisted preparation`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [CV stages and plan-preview contract](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#44-detailed-stage-contracts)
- [Normalized CV and screening-plan contracts](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#10-stateless-interview-preparation-and-summary-intelligence)
- [CV-analysis REST route](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#post-v1cvanalyze)
- [CV input, analysis, and plan design](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#screen-design)
- [Credential acquisition and fake-first gate](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
