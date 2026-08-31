# SP-007 — Add the fixed synthetic vacancy catalogue and CV fixtures

Status: Required  
Milestone: Milestone 1 — interview preparation paths  
Last synchronized: 2026-08-31  
Depends on: SP-006  
Suggested commit: `feat(demo): add vacancy catalogue and synthetic CV fixtures`  
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Create the small, coherent, fully synthetic content set that supports both entry modes, natural role clarification, CV personalization, and deterministic tests.

## Standalone implementation context

- There is no employer brand. Visible language uses **our company** or **the company**.
- The only confirmed synthetic openings are Frontend Developer and Backend Developer. Neither is preselected before the candidate speaks.
- A candidate may request Full Stack; record it honestly as an unconfirmed preference, explain that only Frontend and Backend are confirmed, and ask whether one or both confirmed openings should be covered.
- The synthetic location is **Remote within Europe** with a remote-first pattern and optional team meetups.
- The synthetic employer compensation band is **€40,000–€55,000 gross annually**.
- The conversation-first plan contains intent/coverage metadata, not literal question strings. It starts with name and open role discovery, then fills HR screening fields.
- All data must be generic European synthetic content with no real-person PII or country-specific assumptions.
- Ownership is intentionally split: cross-boundary schemas live in `packages/contracts`, server-owned catalogue/plan values live in `apps/backend/src/demo`, the bundled sample PDF lives in `apps/frontend/public/fixtures`, and reusable expected/adversarial inputs live in `tests/fixtures`.
- The frontend obtains employer/vacancy content from bootstrap and must not compile a second hardcoded catalogue.

## Scope boundaries

- Do not add a company name, recruiter identity, arbitrary vacancies, vacancy CRUD, configurable employer knowledge, or an ATS/job-board flow.
- Do not make Full Stack a confirmed opening.
- Do not hardcode a candidate name into product configuration.
- Do not add technical interview questions, scores, protected traits, or a large content-management system.
- Do not embed the example dialogue as a runtime question bank.
- Do not create a new shared-data/content workspace, import `tests/fixtures` from production code, or move server-owned product values into `packages/contracts`.

## Implementation checklist

- [ ] Define the cross-boundary public catalogue/plan schemas in `packages/contracts`, then create the server-owned employer context and two fixed vacancy values under `apps/backend/src/demo`.
- [ ] Add shared FAQ, benefits, salary, remote-Europe, work-pattern, availability, and candidate-question answers.
- [ ] Encode the Full Stack/unavailable-vacancy boundary and human-follow-up wording constraints.
- [ ] Create and version the deterministic conversation-first discovery plan with both dormant vacancy branches and no candidate facts or CV sources.
- [ ] Include prioritized HR coverage for preferred name, requested role/confirmed vacancy set, current context, synthesized experience/responsibilities/strengths, team/work style, motivation, remote fit, availability, compensation, candidate-stated English use, candidate questions, and close.
- [ ] Add the text-based synthetic sample PDF under `apps/frontend/public/fixtures` plus expected extracted text under `tests/fixtures`; use mixed engineering signals so live role clarification is visible.
- [ ] Add graduate, experienced, Frontend-leaning, Backend-leaning, mixed/Full-Stack-interest, correction, and prompt-injection inputs under `tests/fixtures` with explicit fixture metadata.
- [ ] Mark visible fixture data synthetic and verify no real-person PII or unintended country-specific location/currency/context remains.

## Acceptance criteria

- [ ] The public catalogue exposes exactly two confirmed vacancies and no employer brand.
- [ ] There is one server-owned catalogue/plan value set, no frontend mirror, and no production import from the root test-fixture tree.
- [ ] The conversation-first plan contains intents and completion rules but no bank of exact spoken questions.
- [ ] At least two CV fixtures create materially different facts and topic directions.
- [ ] The sample fixture supports name correction and non-binding role alignment.
- [ ] Every fixture and employer value is synthetic, internally coherent, and generic-European.

## Focused verification

- [ ] Run contract/fixture validation tests.
- [ ] Extract the bundled sample PDF with the intended PDF library and compare meaningful text to the fixture.
- [ ] Search fixture/content files for real company names, unintended country-specific assumptions, unsupported vacancies, and accidental real PII.
- [ ] Search imports/package contents to confirm values and fixtures remain in their owning trees.
- [ ] Manually review the Frontend, Backend, both, Full Stack, and neither-confirmed-role paths.

## Commit boundary

Keep SP-007 reviewable as one logical change represented by `feat(demo): add vacancy catalogue and synthetic CV fixtures`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Locked product decisions and placeholder values](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#1-locked-product-decisions)
- [Filename-level scaffold and target repository](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#filename-level-filesystem-blueprint)
- [Deterministic plan and role preference contracts](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#10-stateless-interview-preparation-and-summary-intelligence)
- [Voice behavior, HR checklist, and fixed answers](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#8-voice-agent-behavior-and-branching)
- [Explicit scope exclusions](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#explicitly-out-of-scope)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
