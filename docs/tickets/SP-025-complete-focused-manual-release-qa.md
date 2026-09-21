# SP-025 — Complete focused manual release QA

Status: Required  
Milestone: Milestone 4 — public-demo hardening  
Last synchronized: 2026-09-21<br>
Depends on: SP-010A, SP-017, SP-018, SP-021A, SP-022, SP-023, SP-024<br>
Suggested commit: `SP-025: complete focused demo release checks`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Run the complete focused manual acceptance pass and one fast release gate, resolve every release blocker, and approve the demo without requiring the optional comprehensive automation suite.

## Standalone implementation context

- Manual approval is intentionally primary. SP-028 remains optional and cannot block release.
- Run the smallest relevant targeted checks while investigating; run the full quick gate once at this release boundary.
- Current SP-021A evidence supplies the controlled live flow for each entry mode.
  Repeat a paid flow here only when a later code, provider, configuration,
  hostname, or release-candidate change invalidates that evidence.
- The pre-measurement reserve is $0.80 per standard eight-minute flow or $1.40 if burst is deliberately enabled. The base estimate is about $0.70, but release evidence must use the provider dashboards rather than restating the estimate as measured fact.
- All complete paths must be reviewed on phone, tablet, compact laptop, laptop/desktop, large monitor, and intermediate drag-resized widths.
- Release requires measured latency gates, privacy/retention alignment, Turnstile recovery, provider failures, and natural HR-only conversation.

## Manual live-credential gate

- Run all unpaid/fake release checks before asking for live values. The controlled live pass needs the complete user-supplied OpenAI, ElevenLabs, Turnstile, signing, and cookie groups plus explicit permission to incur provider charges.
- Confirm both local `.env.local` paths are ignored and absent from `git status` before the user fills the backend file. Never record secret values in the manual matrix, defect evidence, screenshots, network exports, or provider-revision notes.
- Before any real candidate content, external tester, or public release, explicitly warn the owner if OpenAI input/output sharing is enabled, require `Organization settings > Data controls > Share inputs and outputs with OpenAI` to be **Disabled**, and record only the project name, disabled state, and verification date. Localhost and `store: false` do not waive this gate.
- If credentials, account balance, production widget, or paid-test permission are unavailable when SP-021A evidence must be refreshed, do not fake a live pass. Record every unpaid result, mark the invalidated live evidence blocked, and withhold release approval until the manual gate is satisfied.

## Scope boundaries

- Do not expand this into Playwright/visual/AI automation, a device lab, new features, or portfolio packaging.
- Do not waive a release blocker because the happy path works on one desktop.
- Do not use real applicant data or publish unmeasured latency/cost claims.
- Do not make uncontrolled repeated paid calls.
- Do not turn QA fixes into unrelated refactors or adjacent ticket scope.
- Do not absorb SP-025A's repository-wide code/ticket reconciliation, duplicate
  and dead-code audit, dependency review, lifecycle audit, or final exact-
  candidate deterministic gate. Hand the manually approved candidate to that
  required audit.

## Implementation checklist

- [ ] Verify sample CV → local extraction → protected analysis → grounded plan preview → shared preflight.
- [ ] Verify a different uploaded text PDF produces materially different grounded facts/topics and no sample leakage.
- [ ] Verify conversation-first skips CV/provider preparation, begins open, focuses progressively, and yields Candidate-only review.
- [ ] Verify missing/incorrect name, evidence-linked CV suggestion/confirmation, correction to another role, Graphic Designer, Customer Support Representative, Product Manager, Backend Developer without technical questions, Full Stack Developer without redirection, compound/multiple-role wording, and undecided role-neutral completion.
- [ ] Verify invalid/scanned PDF failure remains local and does not affect conversation-first.
- [ ] Verify consent, microphone, valid grant, and Turnstile readiness prevent premature voice-token requests.
- [ ] Verify fake/controlled live voice produces captions, evidence-linked insight cards, corrections, transcript, summary, and review in both modes.
- [ ] Verify mid-call disconnect/refresh produces honest partial review and never auto-reconnects.
- [ ] Verify Turnstile missing/invalid/replayed/expired/wrong-host/action blocks paid providers and fresh retry preserves safe local state.
- [ ] Verify summary failure preserves transcript/insights and can retry.
- [ ] Verify Clear session removes all browser candidate content.
- [ ] Verify both complete flows and all error/retry states at every responsive anchor and intermediate widths, including portrait/landscape, safe areas, virtual keyboard, long captions, sticky controls, reduced motion, 200% zoom, and keyboard.
- [ ] Read representative agent turns aloud: 8–25-word target, normal 35-word ceiling, one question, direct tone, no canned acknowledgement/praise/tool narration.
- [ ] Verify candidate counterquestions are answered first, unclear audio is clarified without evidence, and timing/interruption settings—not prompt filler—handle latency.
- [ ] Verify normal 8–10-prompt HR coverage, multi-field answer credit, one broad role-context clarification maximum, and zero technical, portfolio, competency, roleplay, professional-knowledge, or suitability chains.
- [ ] Verify unsupported employer/vacancy questions become human follow-up without blocking completion and that no selected role invents responsibilities, qualifications, salary, benefits, reporting lines, team size, work pattern, location requirements, or hiring timelines.
- [ ] Run the smallest targeted release-critical unit/backend checks, then the complete fast default commands once.
- [ ] Review SP-021A's controlled live flow for each entry mode and record its
  provider revision, date, measured behavior, and cost; repeat only evidence
  invalidated by later release-candidate or provider/configuration changes.
- [ ] Create `docs/operations/full-flow-cost-baseline.md` from a blank sanitized template and record each flow's date, mode, revision, connection duration, direct OpenAI usage, ElevenLabs standard/burst minute charge, live-LLM Detailed costs, credits/free minutes applied, infrastructure overage, and total.
- [ ] Run at least three complete flows before publishing a portfolio unit-cost claim; compare estimated versus actual totals and explain any variance greater than 20%.
- [ ] Record, fix, and retest every release-blocking functional, responsive, privacy, security, latency, and provider issue.

## Acceptance criteria

- [ ] Every required Section 18 manual scenario has a recorded pass across the relevant responsive matrix.
- [ ] The complete quick gate passes once on the release candidate.
- [ ] Current controlled live evidence for both entry modes passes without
  retention/privacy/scope drift, whether reused from SP-021A or narrowly rerun
  because later changes invalidated it.
- [ ] No release-blocking conversation, latency, evidence, Turnstile, responsive, accessibility, privacy, or provider defect remains.
- [ ] Every required role-neutral scenario proves one universal HR screen, no allow-list/redirection, no profession-specific assessment, and no invented employer/vacancy fact.
- [ ] Any non-blocking known limitation is documented honestly and does not contradict definition of done.
- [ ] SP-025A receives the exact approved release candidate and complete manual
  evidence; SP-026 remains blocked until the repository/ticket audit closes.

## Focused verification

- [ ] Run `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, and `pnpm build` once.
- [ ] Use a written manual matrix recording environment, viewport/browser, scenario, result, evidence, and defect link.
- [ ] Re-run the smallest affected scenario/check after each fix and the complete quick gate only at the final boundary.
- [ ] Review provider dashboards/logs/browser storage after controlled live smokes for cost and privacy expectations.
- [ ] Verify OpenAI input/output sharing is disabled before any real-data or public run; block release if the dashboard state cannot be confirmed.
- [ ] Verify the cost file contains no CV/transcript text, candidate identity, API key, account ID, Turnstile token, or secret-bearing billing screenshot.
- [ ] Obtain explicit user approval of the release candidate and unresolved non-blocking limitations.
- [ ] Hand the exact approved candidate, manual matrix, current SP-021A evidence,
  cost baseline, fixed defects, and every remaining limitation/blocker to
  SP-025A without treating this manual pass as the repository-wide final audit.

## Commit boundary

Keep SP-025 reviewable as one logical change represented by `test: complete focused demo release checks`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Required manual acceptance sheet](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#required-manual-acceptance-sheet)
- [Performance gates](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#performance-gates)
- [Definition of done](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#20-definition-of-done)
- [Lean verification rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#18-lean-verification-strategy)
- [Credential acquisition and paid-test gate](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)
- [Full-flow cost assumptions, free allowances, and reconciliation](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#13-elevenlabs--openai-research-and-cost-plan)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. Identify the exact candidate and evidence handed to SP-025A; SP-026 remains blocked until that audit closes. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
