# SP-012 — Build the CV-assisted frontend preparation path

Status: Required  
Milestone: Milestone 1 — interview preparation paths  
Last synchronized: 2026-08-31  
Depends on: SP-005, SP-006, SP-008, SP-010, SP-011  
Suggested commit: `feat(frontend): add CV-assisted preparation`  
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
- Role alignment is labelled **Suggested from CV — we will confirm during the call**. The visitor does not select a role before the call.
- This branch converges into the exact shared preflight used by conversation-first.
- Employer/vacancy context comes from bootstrap and API payloads use declared contract exports through the shared relative `/v1` client; the feature does not mirror server values or create a second HTTP stack.

## Manual credential gate

- The frontend receives `TURNSTILE_SITE_KEY` from the validated backend bootstrap. Do not add it—or any secret—to `apps/frontend/.env.local`; that file needs only the local backend rewrite origin.
- The real CV path reuses SP-010's backend `OPENAI_API_KEY`, `TURNSTILE_SECRET_KEY`, allowed hostnames, and public site key. Obtain them through the official links in the parent [credential guide](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup).
- Component/integration work must use injected fake Turnstile and fake analysis responses while values remain blank. The real challenge/provider walkthrough remains unchecked until the user fills the ignored backend file and permits a paid OpenAI request.

## Scope boundaries

- Do not upload/store the PDF, persist raw extracted text, add a plan editor/regeneration workflow, or ask for recruiter approval.
- Do not claim the candidate applied for Frontend/Backend, confirm a role from CV evidence, or invent missing candidate values.
- Do not allow sample-CV placeholders to leak into uploaded-CV sessions.
- Do not create separate desktop/mobile or CV-only preflight/interview/review implementations.
- Do not start ElevenLabs in this ticket.

## Implementation checklist

- [ ] Connect the landing CV card to upload/sample selection and the SP-008 extractor.
- [ ] Implement truthful extraction and analysis progress labels without fake percentages or premature facts.
- [ ] Build/reuse the managed interaction-only Turnstile gate for `cv_analyze`, with stable accessible fallback layout and token reset.
- [ ] Call `POST /v1/cv/analyze` with bounded text, fixed catalogue, client request ID, and one-time token.
- [ ] Clear raw text only after a validated successful response; preserve it in component memory for a safe manual retry.
- [ ] Validate and store normalized CV, plan, grant, expiry, and coarse metadata.
- [ ] Render evidence-linked CV fact cards and planned topic cards with fixed-topic badges.
- [ ] Display non-binding role-alignment language exactly and provide no pre-call role selector.
- [ ] Offer only Continue and Start over; implement typed analysis/Turnstile/schema/grant-expiry errors and mode-aware Back behavior.
- [ ] Converge on the same shared preflight state/components.
- [ ] Test two distinct fixtures, no-placeholder leakage, retry/reset, evidence links, and responsive parity.

## Acceptance criteria

- [ ] Both sample and uploaded valid PDFs reach an evidence-grounded plan preview through identical code paths.
- [ ] Two distinct fixtures visibly change at least two facts and two topic intents/directions.
- [ ] Turnstile must pass before OpenAI analysis and its token never reaches persistence.
- [ ] Raw PDF/text is absent after success; only bounded structured state remains.
- [ ] No text claims an applied or confirmed vacancy before candidate speech.
- [ ] Continue reaches the same preflight implementation as conversation-first.

## Focused verification

- [ ] Run targeted frontend integration/component/reducer tests with fake extraction, Turnstile, and backend responses.
- [ ] Inspect browser network/storage for PDF, raw CV text, Turnstile token, or sample-value leakage.
- [ ] Manually exercise sample/upload, two different CVs, challenge interaction/failure, analysis timeout/schema error, retry, Start over, and Back.
- [ ] Check plan preview at mobile, tablet, desktop, large-monitor, and one intermediate width.

## Commit boundary

Keep SP-012 reviewable as one logical change represented by `feat(frontend): add CV-assisted preparation`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [CV stages and plan-preview contract](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#44-detailed-stage-contracts)
- [Normalized CV and screening-plan contracts](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#10-stateless-interview-preparation-and-summary-intelligence)
- [CV-analysis REST route](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#post-v1cvanalyze)
- [CV input, analysis, and plan design](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#screen-design)
- [Credential acquisition and fake-first gate](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
