# SP-011 — Build the conversation-first frontend entry path

Status: Required  
Milestone: Milestone 1 — interview preparation paths  
Last synchronized: 2026-08-31  
Depends on: SP-005, SP-006, SP-007, SP-009  
Suggested commit: `feat(frontend): add conversation-first entry`  
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Deliver the equally prominent no-CV preparation path from landing choice to shared preflight using only deterministic server preparation and no pre-call AI provider charge.

## Standalone implementation context

- The landing offers two equal cards: **Use a CV** and **Start without a CV**. Neither is a secondary link or degraded experience.
- Conversation-first simulates a recruiter beginning with no document. The live agent will learn name, role interest, and background naturally from speech.
- On selection, call `POST /v1/interview/prepare` with the fixed conversation-first mode/catalogue and show a short truthful **Preparing an open conversation** transition.
- The response contains a generic discovery plan and `interviewGrant`; it contains no candidate facts, suggested vacancy, or CV source.
- This path skips upload, extraction, OpenAI CV analysis, CV fact preview, and plan preview entirely, then enters the same shared preflight as the CV path.
- Later live behavior begins with an open target-position question and may become more specific only from candidate-evidenced answers.
- Employer/vacancy context comes from `GET /v1/demo/bootstrap`; the frontend does not compile a duplicate catalogue. Browser requests use the shared relative `/v1` client.

## Scope boundaries

- Do not ask the candidate to fill a pre-call form, choose Frontend/Backend from a picker, or upload a CV.
- Do not display fake personalization, CV silhouettes, extracted facts, a generated plan, or provider-analysis progress.
- Do not call OpenAI, ElevenLabs, or Turnstile during deterministic preparation.
- Do not create a separate interview/review implementation for this mode.
- Do not assume the visitor is an engineer before their answers provide context.
- Do not import backend demo values or introduce a feature-local API base URL/client.

## Implementation checklist

- [ ] Build the responsive landing chooser with equal-weight CV-assisted and conversation-first cards.
- [ ] Connect **Start without a CV** to the deterministic preparation endpoint with a unique client request ID.
- [ ] Show only the brief approved conversation-preparation transition and specific retry/back errors.
- [ ] Validate the response and persist only the generic plan, grant, entry mode, and shared public context.
- [ ] Guarantee `cv` remains absent and CV/CV+Candidate source labels are impossible.
- [ ] Enter the shared preflight state with the Conversation-first badge.
- [ ] Implement mode-aware Back, retry, grant expiry, Start over/Clear session, keyboard, and responsive behavior.
- [ ] Preserve equal visual quality on phones, tablets, laptops, desktops, large monitors, and intermediate widths.
- [ ] Add focused reducer/component/API tests for branch isolation, no provider preparation calls, failure recovery, and shared-stage convergence.

## Acceptance criteria

- [ ] A visitor can reach shared preflight without providing a file or triggering a paid preparation call.
- [ ] No screen in the path claims to analyze or know the candidate.
- [ ] The generic plan has discovery branch, no suggested vacancy, no CV IDs, and both dormant vacancy branches.
- [ ] Retry stays in conversation-first; Back returns to the equal choice screen instead of CV upload.
- [ ] Mobile and desktop show the same information/actions with intentional reflow.

## Focused verification

- [ ] Run targeted frontend component/reducer/API tests.
- [ ] Inspect network calls and prove the only preparation call is `POST /v1/interview/prepare`.
- [ ] Inspect stored session JSON and confirm no `cv` field or CV provenance exists.
- [ ] Manually exercise success, slow response, typed failure, retry, Back, expiry, Clear session, keyboard, and responsive layouts.

## Commit boundary

Keep SP-011 reviewable as one logical change represented by `feat(frontend): add conversation-first entry`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Entry-mode contract and conversation-first stage](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#42-entry-mode-contract)
- [Landing and `/demo` requirements](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#5-frontend-routes-and-screen-requirements)
- [Deterministic conversation-first plan](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#deterministic-conversation-first-plan)
- [Conversation-first opening behavior](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#conversation-first-opening)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
