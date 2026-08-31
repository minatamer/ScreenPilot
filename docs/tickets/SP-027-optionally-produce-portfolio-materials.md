# SP-027 — Optionally produce portfolio materials

Status: Optional; cannot block release  
Milestone: Milestone 6 — optional portfolio packaging  
Last synchronized: 2026-08-26  
Depends on: SP-018, SP-021, SP-025, SP-026  
Suggested commit: `docs: prepare ScreenPilot portfolio release`  
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

If explicitly approved after deployment, package the already-released demo so an Upwork visitor can understand the product, architecture, tool breadth, privacy boundary, measured performance, and responsive quality quickly.

## Standalone implementation context

- SP-026 already completes the releasable demo. This ticket is presentation work only and may be skipped.
- The portfolio story shows two equal entry modes: focused CV-assisted screening and open conversation-first discovery, both converging on the same voice/insight/review experience.
- Explain the real tool division: Next.js/React frontend, Express backend, browser PDF extraction, OpenAI intelligence, ElevenLabs voice loop, Turnstile abuse check, Cloud Run/Firebase deployment.
- Use measured TTFA/cost figures with date/sample size; never publish estimates as observed results.
- The primary walkthrough is desktop, with a concise mobile walkthrough proving complete responsive parity.
- Screenshots/videos must use synthetic data and avoid secrets, internal IDs, provider dashboards, or candidate content from real people.

## Scope boundaries

- Do not change core product behavior, add features, block release, or create a marketing website larger than the demo needs.
- Do not overstate compliance, accuracy, hiring capability, privacy, bot prevention, latency, or costs.
- Do not present AI notes as hiring recommendations or use real applicant data.
- Do not require SP-028 automation or a Figma deliverable.
- Do not leave debug UI, dead experiments, or stale documentation in the portfolio package.

## Implementation checklist

- [ ] Write/update the project README with product story, both entry modes, architecture, provider roles, local setup, privacy limits, deployment, and safe demo instructions.
- [ ] Link the approved HTML Design System Reference and explain its token mapping to shared React styling.
- [ ] Add a concise architecture diagram and a two-minute demo script.
- [ ] Capture synthetic screenshots showing entry choice, focused/open preparation difference, active voice/insights, evidence review, and mobile parity.
- [ ] Record the primary desktop walkthrough and concise mobile walkthrough.
- [ ] Document measured TTFA, interruption, cost, and sample date/size with limitations.
- [ ] Explain statelessness, no audio recording, provider processing, Turnstile scope, and no hiring decisions.
- [ ] Audit every Section 20 definition-of-done item.
- [ ] Remove dead experiments, stale scope, debug UI, unused dependencies/assets, and accidental secrets/content.
- [ ] Verify every public link uses the canonical custom domain.

## Acceptance criteria

- [ ] An Upwork visitor can understand and run the demo quickly without reading internal planning documents.
- [ ] Both entry modes and the live evidence value are represented accurately.
- [ ] Architecture/tool claims match the implementation and measured results.
- [ ] Desktop and mobile materials prove one coherent responsive product.
- [ ] All media/data is synthetic and safe for public sharing.
- [ ] Skipping/removing the portfolio package would not affect the deployed demo.

## Focused verification

- [ ] Follow the README from a clean environment where practical.
- [ ] Run the two-minute script against the deployed production domain.
- [ ] Review every screenshot/video frame for real PII, secrets, internal URLs, broken states, and responsive defects.
- [ ] Check architecture diagram/metrics/cost/provider/privacy claims against the source and deployed configuration.
- [ ] Run link checking and the smallest docs/build validation relevant to changed files.

## Commit boundary

Keep SP-027 reviewable as one logical change represented by `docs: prepare ScreenPilot portfolio release`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Demo promise and success criteria](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#2-demo-promise-audience-and-success-criteria)
- [Provider division and measured cost plan](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#13-elevenlabs--openai-research-and-cost-plan)
- [Definition of done](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#20-definition-of-done)
- [Scope pressure decisions](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#21-remaining-scope-pressure-test)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.

