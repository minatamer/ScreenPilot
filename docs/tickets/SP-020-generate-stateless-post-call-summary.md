# SP-020 — Generate the stateless post-call summary

Status: Required  
Milestone: Milestone 3 — same-session review  
Last synchronized: 2026-09-11<br>
Depends on: SP-009, SP-010, SP-010A, SP-017, SP-019<br>
Suggested commit: `SP-020: summarize local interview evidence`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Use one protected stateless GPT request to organize bounded local transcript/insight evidence into cautious recruiter-readable notes with explicit citations and limitations.

## Standalone implementation context

- `POST /v1/interview/summary` receives grant, one-time `turnstileToken` for action `interview_summary`, entry mode, plan, at most 160 turns/30,000 transcript characters/24 insights/16 topics.
- The backend validates origin, cookie, grant, entry-mode/plan/source consistency, evidence references, bounds, Turnstile hostname/action, and paid/rate/capacity gates before OpenAI.
- Use GPT-5.4 mini, reasoning `none`, structured output, and `store: false`.
- Every factual output statement cites existing local transcript turn IDs. Missing evidence becomes a limitation/topic-not-covered, not an invented fact.
- Output covers overview, optional role preference, confirmed facts, clarifications, covered/missing topics, compensation, availability, neutral communication observations, candidate questions, human follow-ups, and limitations.
- Role output preserves the bounded candidate-stated synthetic session role or undecided state with transcript evidence. It never maps to an allow-list, claims a real opening/application, or invents employer facts from the label.
- Conversation-first rejects CV/CV+Candidate provenance. No provider transcript or recording is retrieved.
- English content is candidate-stated context or neutral evidence-linked observation only—never an automated proficiency rating.
- At current GPT-5.4 Mini rates, the summary call is budgeted at **$0.00960 optimized, $0.01590 base, and $0.02700 heavy**. OpenAI lists no supported ongoing Free tier for this model; temporary account credit must not be assumed.

## Manual credential gate

- A real summary needs the same user-supplied backend `OPENAI_API_KEY`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and `TURNSTILE_ALLOWED_HOSTNAMES` group documented in SP-010. Keep all blank in the committed template.
- Obtain the OpenAI key and Turnstile pair from the official dashboard guides linked in the parent [credential guide](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup); store both secrets only in the ignored backend file or production Secret Manager.
- Fake OpenAI/Turnstile covers route, evidence, repair, rejection, and no-persistence tests. When values are blank, no live fallback is allowed and the one controlled real summary remains unchecked until the user permits paid testing.

## Scope boundaries

- Do not save the request/response, retrieve provider artifacts, regenerate histories, create recruiter decisions, or add multiple summary formats.
- Do not score, rank, pass/fail, infer personality, sentiment, emotion, accent, protected traits, honesty, employability, or unsupported English proficiency.
- Do not generate role-specific competency/technical conclusions, job fit, responsibilities, qualifications, salary, benefits, reporting lines, team size, work pattern, location requirements, or hiring timelines unless an explicit server-owned fact supports the non-candidate value.
- Do not cite missing/agent-only evidence for candidate facts.
- Do not call OpenAI on Turnstile, grant, schema, source, evidence, rate, capacity, or kill-switch failure.
- Do not repair more than one malformed structured response.

## Implementation checklist

- [ ] Implement the shared bounded summary request/output contracts and route.
- [ ] Validate origin/cookie/grant, entry mode, plan hash/type, allowed provenance, turn/insight/topic references, and all size/count limits.
- [ ] Verify a fresh Turnstile token with `interview_summary` action/hostname before OpenAI.
- [ ] Build a prompt that treats all browser fields as untrusted evidence and requires citations/limitations.
- [ ] Call only GPT-5.4 mini with reasoning none, structured output, and `store: false`.
- [ ] Validate every returned evidence ID and reject/repair unsupported or malformed output once.
- [ ] Keep distinct evidence-grounded notes for current context, synthesized broad responsibilities/strongest areas, and candidate-stated team/work style.
- [ ] Preserve any bounded candidate-stated role label or undecided state exactly as evidence supports it; keep compound wording intact and put unsupported employer/vacancy questions in human follow-ups.
- [ ] Forbid scores, decisions, personality/culture fit, sentiment, and unsupported proficiency labels in schema and prompt.
- [ ] Return coarse usage plus limitations with `Cache-Control: no-store`.
- [ ] Include provider-reported input, cached-input, and output token counts in content-free coarse usage so SP-025 can calculate measured cost without logging transcript or summary content.
- [ ] Add success, partial, invalid evidence/source, oversized input, Turnstile failure/replay, timeout, malformed repair, provider failure, and no-persistence tests.

## Acceptance criteria

- [ ] Every factual summary claim resolves to one or more valid local candidate turn IDs.
- [ ] Conversation-first requests containing CV provenance fail before OpenAI.
- [ ] Missing/unclear topics are listed honestly and never filled from inference.
- [ ] A failed summary leaves all local transcript/insights usable for review/retry.
- [ ] No hiring score/decision or forbidden inference appears in output.
- [ ] No summary content is stored or retrieved server-side.
- [ ] Candidate-stated/undecided role output preserves evidence and synthetic-session framing, while unsupported employer questions remain human follow-ups and no job requirements or suitability claims are invented.

## Focused verification

- [ ] Run focused schema/use-case/Supertest suites with fake OpenAI and Turnstile.
- [ ] Exercise complete, partial, disconnected, refused-compensation, uncertain-availability, no-question, and invalid-provenance fixtures.
- [ ] Exercise Graphic Designer, compound-role, corrected role, undecided, and unsupported-employer-question fixtures; assert identical schema behavior and no real-vacancy/application claim.
- [ ] Assert paid-provider call count is zero for every precondition failure.
- [ ] Inspect output evidence IDs and logs for unsupported claims/content leakage.
- [ ] Run one controlled real summary only when paid testing is explicitly permitted.

## Commit boundary

Keep SP-020 reviewable as one logical change represented by `feat(backend): summarize local interview evidence`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Summary input/output contracts](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#summary-input)
- [Summary REST route](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#post-v1interviewsummary)
- [Post-call stage contract](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#stage-9--end-and-summarize)
- [Safety rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#safety-rules)
- [OpenAI/Turnstile acquisition and fake-first gate](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)
- [Per-call cost assumptions and free-tier limits](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#13-elevenlabs--openai-research-and-cost-plan)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
