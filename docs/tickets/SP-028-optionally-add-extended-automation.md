# SP-028 — Optionally add comprehensive browser and AI automation

Status: Optional; cannot block release  
Milestone: Milestone 7 — optional extended automation  
Last synchronized: 2026-09-11<br>
Depends on: SP-010A, SP-026. SP-027 is independent and optional<br>
Suggested commit: `test: add optional extended demo automation`  
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

If explicitly approved after deployment, add opt-in comprehensive browser, visual, provider-event, and conversation-policy regression coverage without slowing normal commits or making paid calls.

## Standalone implementation context

- SP-026 is already the release boundary. This ticket adds confidence, not required product scope.
- Playwright projects cover representative desktop and mobile/tablet/large-monitor anchors plus intermediate drag-resized widths using deterministic fakes.
- Major flows cover sample CV, materially different upload, conversation-first skip/discovery, arbitrary-role/undecided state, invalid PDF, gates, fake voice/captions/insights/review, correction, disconnect, summary retry, refresh, and Clear session.
- Visual regression covers paired desktop/mobile major stages and failure states, including portrait/landscape, safe area, virtual keyboard, long captions, and sticky controls.
- The AI eval matrix covers Graphic Designer, Customer Support Representative, evidence-linked Product Manager CV suggestion, Backend Developer without technical questions, Full Stack Developer without redirection, role correction, compound/multiple-role wording, undecided completion, unsupported employer questions, CV/role-label prompt injection, compensation refusal, and stop.
- All extended commands are manual/opt-in or CI-dispatch only. Paid live-provider evals remain manual outside automation.

## Scope boundaries

- Do not attach extended suites to every commit/pull request or block SP-026 release retroactively.
- Do not use live OpenAI/ElevenLabs or production Turnstile secrets in automation.
- Do not capture CV/transcript/insight/cookie/token content in public traces/screenshots/artifacts.
- Do not turn deterministic dialogue checks into exact-sentence tests or hardcoded question banks.
- Do not expand into a commercial device lab, load-testing platform, or production monitoring system.

## Implementation checklist

- [ ] Add Playwright projects for the approved browser/viewport matrix using fake provider/event fixtures.
- [ ] Automate sample-CV and materially different uploaded-CV preparation flows.
- [ ] Automate conversation-first skip/preparation/open discovery through Candidate-only review.
- [ ] Automate Graphic Designer, Customer Support Representative, evidence-linked Product Manager suggestion, ordinary Backend Developer, ordinary Full Stack Developer, role correction, compound/multiple-role wording, undecided completion, unsupported-employer follow-up, prompt injection, name correction, invalid PDF, consent/microphone, insight correction, disconnect, summary retry, refresh, and Clear session.
- [ ] Add paired desktop/mobile visual snapshots for every major stage and failure state plus required responsive edge cases.
- [ ] Add deterministic provider event-order/error/grant/privacy integration coverage.
- [ ] Automate the full role-neutral AI eval matrix with expected universal topics, forbidden profession-specific questions/claims, tool schema/evidence validity, and acceptable endings.
- [ ] Keep semantic evaluation narrow and intent-based; retain deterministic length/question/source/stop graders.
- [ ] Expose `test:integration`, `test:e2e`, and `test:ai-evals` through manual/opt-in commands or workflow dispatch only.
- [ ] Keep paid calls and production secrets impossible in the automated environment.
- [ ] Publish only sanitized screenshots/traces on optional-suite failure with safe retention.

## Acceptance criteria

- [ ] The optional suites are deterministic enough to diagnose regressions without live provider variance.
- [ ] All named flows/personas and responsive failure states are covered.
- [ ] Normal CI/ticket completion remains fast and unchanged.
- [ ] No paid call, real candidate content, secret, token, or unsafe artifact can enter automation.
- [ ] Tests assert natural intent/constraints rather than exact generated wording.
- [ ] Cross-profession tests prove identical workflow semantics for arbitrary, software, compound, corrected, and undecided role states and fail on invented employer facts.
- [ ] SP-027 remains independent and SP-026 release remains valid if this suite is disabled.

## Focused verification

- [ ] Run each extended command explicitly in the fake environment.
- [ ] Repeat representative suites to identify flakiness and remove timing dependence.
- [ ] Inspect workflow triggers to prove ordinary PR/push events do not run extended suites.
- [ ] Inspect all screenshots/traces/reports for candidate content, secrets, and unsafe retention.
- [ ] Force representative failures and confirm artifacts are useful, sanitized, and bounded.

## Commit boundary

Keep SP-028 reviewable as one logical change represented by `test: add optional extended demo automation`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Optional Playwright flows and AI personas](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#optional-extended-playwright-flows--sp-028)
- [Lean verification rules and optional commands](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#18-lean-verification-strategy)
- [Prompt evaluation contract](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#prompt-evaluation-contract)
- [Responsive behavior](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#responsive-behavior)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
