# SP-020 — Generate the stateless post-call summary

Status: Required  
Milestone: Milestone 3 — same-session review  
Last synchronized: 2026-09-22<br>
Depends on: SP-009, SP-010, SP-010A, SP-017, SP-019<br>
Suggested commit: `SP-020: summarize local interview evidence`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Use one protected stateless GPT request to organize bounded local transcript/insight evidence into cautious recruiter-readable notes with explicit citations and limitations.

## Standalone implementation context

- `POST /v1/interview/summary` receives grant, one-time `turnstileToken` for action `interview_summary`, entry mode, plan, at most 160 turns/30,000 transcript characters/24 insights/16 topics.
- The backend validates origin, cookie, grant, entry-mode/plan/source consistency, evidence references, bounds, the paid kill switch, any injected admission decision, and Turnstile hostname/action before OpenAI. SP-020 supplies and tests the typed admission boundary; SP-022 owns the real per-route/source rate and capacity limiter plus server wiring.
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
- Fake OpenAI/Turnstile covers route, evidence, repair, rejection, and no-persistence tests. When values are blank, no live fallback is allowed. The first controlled real summary is deliberately deferred to SP-021A so it validates the complete product rather than creating a standalone pre-review charge.

## Scope boundaries

- Do not save the request/response, retrieve provider artifacts, regenerate histories, create recruiter decisions, or add multiple summary formats.
- Do not score, rank, pass/fail, infer personality, sentiment, emotion, accent, protected traits, honesty, employability, or unsupported English proficiency.
- Do not generate role-specific competency/technical conclusions, job fit, responsibilities, qualifications, salary, benefits, reporting lines, team size, work pattern, location requirements, or hiring timelines unless an explicit server-owned fact supports the non-candidate value.
- Do not cite missing/agent-only evidence for candidate facts.
- Do not call OpenAI on Turnstile, grant, schema, source, evidence, injected admission denial, or kill-switch failure.
- Do not repair more than one malformed structured response.

## Implementation checklist

- [x] Implement the shared bounded summary request/output contracts and route.
- [x] Validate origin/cookie/grant, entry mode, plan hash/type, allowed provenance, turn/insight/topic references, and all size/count limits.
- [x] Apply the paid kill switch and typed summary-admission decisions before Turnstile/OpenAI; explicitly defer the production route/source limiter and its server wiring to SP-022.
- [x] Verify a fresh Turnstile token with `interview_summary` action/hostname before OpenAI.
- [x] Build a prompt that treats all browser fields as untrusted evidence and requires citations/limitations.
- [x] Call only GPT-5.4 mini with reasoning none, structured output, and `store: false`.
- [x] Validate every returned evidence ID and reject/repair unsupported or malformed output once.
- [x] Keep distinct evidence-grounded notes for current context, synthesized broad responsibilities/strongest areas, and candidate-stated team/work style.
- [x] Preserve any bounded candidate-stated role label or undecided state exactly as evidence supports it; keep compound wording intact and put unsupported employer/vacancy questions in human follow-ups.
- [x] Forbid scores, decisions, personality/culture fit, sentiment, and unsupported proficiency labels in schema and prompt.
- [x] Return coarse usage plus limitations with `Cache-Control: no-store`.
- [x] Include provider-reported input, cached-input, and output token counts in content-free coarse usage so SP-025 can calculate measured cost without logging transcript or summary content.
- [x] Add success, partial, invalid evidence/source, oversized input, Turnstile failure/replay, timeout, malformed repair, provider failure, and no-persistence tests.

## Acceptance criteria

- [x] Every factual summary claim resolves to one or more valid local candidate turn IDs.
- [x] Conversation-first requests containing CV provenance fail before OpenAI.
- [x] Missing/unclear topics are listed honestly and never filled from inference.
- [x] A failed summary leaves all local transcript/insights usable for review/retry.
- [x] No hiring score/decision or forbidden inference appears in output.
- [x] No summary content is stored or retrieved server-side.
- [x] Candidate-stated/undecided role output preserves evidence and synthetic-session framing, while unsupported employer questions remain human follow-ups and no job requirements or suitability claims are invented.

## Focused verification

- [x] Run focused schema/use-case/Supertest suites with fake OpenAI and Turnstile.
- [x] Exercise complete, partial, disconnected, refused-compensation, uncertain-availability, no-question, and invalid-provenance fixtures.
- [x] Exercise Graphic Designer, compound-role, corrected role, undecided, and unsupported-employer-question fixtures; assert identical schema behavior and no real-vacancy/application claim.
- [x] Assert paid-provider call count is zero for every precondition failure.
- [x] Inspect output evidence IDs and logs for unsupported claims/content leakage.
- [x] Do not run a standalone real summary in this ticket; hand the first
  controlled real summary to SP-021A after SP-021 is complete.

## Implementation record — 2026-09-21

- Added the strict no-store summary route, grant/plan/provenance/evidence checks, paid kill switch, typed summary-admission boundary, and fresh `interview_summary` Turnstile verification before any summary provider call. SP-022 still owns the production rate/capacity implementation and server wiring; SP-020 does not claim that limiter exists yet.
- Added a GPT-5.4 Mini structured-output adapter that reuses the locked reasoning-none, `store: false` Responses client. It performs at most one repair for malformed or semantically unsupported output and aggregates input, cached-input, and output usage across that repair.
- Kept the uncited overview and limitations server-bounded to fixed process language. All candidate-specific output sections require final candidate-turn citations; topic coverage must partition the universal plan and match local topic evidence.
- Semantic completeness validation now requires every available candidate-backed current-context, experience/responsibility/strongest-area, team/work-style, and candidate-question insight to appear in its appropriate output section. The three required fact groups must resolve to distinct summary entries, so one combined fact cannot satisfy all three. Topic validation is bidirectional: every claimed covered topic must match covered local progress, and every locally covered topic must remain in `topicsCovered` with evidence.
- Added deterministic fake summaries plus contract, adapter, use-case, and Supertest coverage for both provenance modes, bounds, precondition zero-call behavior, repair/failure paths, role variants, partial evidence, logging privacy, and stateless repeat requests.
- Final fake-only verification passed the focused contracts suite (3 files / 18 tests), focused backend summary suite (4 files / 41 tests), complete contracts suite (6 files / 47 tests), and complete backend suite (23 files / 256 tests). Both package lint commands, both package builds, Prettier checking for the affected code, and `git diff --check` also passed. The local runtime reported Node 22.23.2 while the repository requires Node 24, but every invoked check completed successfully.
- No credential was read, no provider network request was made, and no standalone paid summary was run. The first controlled real summary remains assigned to SP-021A after SP-021.
- Validation follow-up on 2026-09-22 replaced lexical ISO timestamp comparison with one shared chronological candidate-insight selector. Focused regressions use valid mixed-offset timestamps to prove both semantic grounding and fake summary output preserve the genuinely latest role correction. The follow-up passed the focused backend set (5 files / 48 tests), focused contracts set (3 files / 18 tests), backend typecheck, affected-file lint and Prettier checks, and `git diff --check`; no live verification claim changed.

## Commit boundary

Keep SP-020 reviewable as one logical change represented by `SP-020: summarize local interview evidence`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Summary input/output contracts](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#summary-input)
- [Summary REST route](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#post-v1interviewsummary)
- [Post-call stage contract](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#stage-9--end-and-summarize)
- [Safety rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#safety-rules)
- [OpenAI/Turnstile acquisition and fake-first gate](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)
- [Per-call cost assumptions and free-tier limits](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#13-elevenlabs--openai-research-and-cost-plan)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
