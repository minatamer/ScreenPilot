# SP-025 — Complete focused manual release QA

Status: Evidence reconciled — SP-024 and production acceptance are handed off; the SP-025A deterministic gate passed, while free/manual gates, safety restoration, and deployable-candidate approval remain open<br>
Milestone: Milestone 4 — public-demo hardening  
Last synchronized: 2026-09-24<br>
Depends on: SP-010A, SP-017, SP-018, SP-021B, SP-022, SP-023, SP-024<br>
Suggested commit: `SP-025: complete focused demo release checks`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)
Evidence ledger: [`../operations/sp-025-manual-release-qa.md`](../operations/sp-025-manual-release-qa.md)

---

## Objective

Run the complete focused manual acceptance pass and one fast release gate
against the exact owner-approved SP-024 result, resolve release blockers through
their authorized ticket workflow, and approve a deployable candidate for
SP-025A without requiring the optional comprehensive automation suite. SP-025
validates approved work; it is not public-release approval, another frontend
redesign, or implicit approval of deferred SP-024 advice. SP-026 closes public
release only after its bounded production acceptance.

## Standalone implementation context

- Manual approval is intentionally primary. Comprehensive browser/AI automation
  is outside this release gate and cannot block it.
- Run the smallest relevant targeted checks while investigating; run the full quick gate once at this release boundary.
- Current SP-021B evidence supplies one successful post-fix CV-assisted
  controlled live flow. The owner also recalls a conversation-first live path
  succeeding, but retained evidence cannot distinguish a complete
  `standard_live` ElevenLabs voice flow from the successful fake-voice/live-
  summary rehearsals. Preserve that recollection without treating it as a log-
  corroborated live pass.
- By owner decision, SP-025 makes no further paid local call. Definitive paid
  acceptance moves to SP-026 after deployment: exactly one CV-assisted
  production flow using a materially different owner-selected synthetic or
  explicitly licensed public-template text PDF with no real person's data, and
  exactly one conversation-first production flow. A narrow defect may justify
  a documented rerun; otherwise do not add a third bundled-sample flow.
- The pre-measurement reserve remains a planning aid only. SP-025 creates the
  sanitized preliminary cost template and records existing evidence; SP-026
  appends measured production usage/cost from the bounded two-flow set.
- All complete paths must be reviewed on phone, tablet, compact laptop, laptop/desktop, large monitor, and intermediate drag-resized widths.
- Release requires responsive conversational behavior, privacy/retention
  alignment, Turnstile recovery, provider failures, and natural HR-only
  conversation. Content-free timings are troubleshooting diagnostics, not a
  minimum-sample or percentile release gate.

## SP-024 approval handoff and skill boundary

- Do not start SP-025 from an unreviewed SP-024 audit. The handoff must include
  the Phase A report, the owner's decision for every finding ID, the exact IDs
  approved for Phase B, the implemented revision, and verification evidence for
  that approved set.
- Deferred or rejected SP-024 suggestions are not release defects merely
  because a third-party skill recommended them. Validate the owner's accepted
  baseline and record those decisions honestly.
- The owner's personal Impeccable, Emil Kowalski, and Taste skills remain
  optional advisory tools, not repository dependencies. During SP-025 they may
  be invoked explicitly only to compare the result with approved SP-024 finding
  IDs. Do not invoke auto-fix, live-editing, hook, redesign, plan execution, or
  implementation modes.
- Do not use `$gpt-taste`, `$design-taste-frontend-v1`, or another prescriptive
  style generator as a release oracle. `$design-taste-frontend` remains limited
  to the landing page and cannot redefine the multi-step `/demo` UI.
- If SP-025 exposes a new accessibility, responsive, motion, or frontend
  performance correction outside the approved SP-024 set, record evidence and
  a proposed finding ID, then return it to the owner approval gate. A P0/P1 may
  block release, but it is not permission to implement an unapproved design or
  reduced-motion exemption.
- Preserve this diagnostic when investigating apparently missing motion:

  > Found it: your system/browser is exposing reduced-motion preference, and the global accessibility rule was collapsing every animation to one frame.

  Record the active preference before judging the result. Verify both
  `no-preference` and `reduce`; confirm that approved narrow alternatives work
  without weakening the global accessibility rule or accidentally restoring
  spatial, scaling, parallax, spring, or perpetual motion for reduced-motion
  users.

## Production paid-flow handoff

- Run and close every unpaid/fake/manual SP-025 gate without asking for another
  local live window. SP-025 approves a deployable candidate, not public release.
- Hand the exact approved candidate and preliminary sanitized cost file through
  SP-025A. SP-026 alone receives production credentials/identifiers and explicit
  permission for the bounded two-flow production acceptance.
- Never record secret values in the manual matrix, cost file, defect evidence,
  screenshots, network exports, or provider-revision notes.
- Before the production flows or any real candidate content, external tester,
  or public release, require OpenAI input/output sharing to be **Disabled** and
  record only the project name, disabled state, and verification date. The
  production flows remain synthetic; sharing-off, `store: false`, and synthetic
  data are separate requirements.

## Scope boundaries

- Do not expand this into Playwright/visual/AI automation, a device lab, new features, or portfolio packaging.
- Do not waive a release blocker because the happy path works on one desktop.
- Do not use real applicant data or publish latency/cost claims from the bounded
  validation observations.
- Do not make uncontrolled repeated paid calls.
- Do not turn QA fixes into unrelated refactors or adjacent ticket scope.
- Do not implement a deferred, rejected, or newly suggested SP-024 design,
  motion, accessibility, responsive, or performance change inside SP-025. Route
  it through the SP-024 owner-decision ledger first.
- Do not absorb SP-025A's repository-wide code/ticket reconciliation, duplicate
  and dead-code audit, dependency review, lifecycle audit, or final exact-
  candidate deterministic gate. Hand the manually approved candidate to that
  required audit.

## Implementation checklist

- [x] Confirm the SP-024 handoff names the audited revision, owner decision for
  every finding ID, approved Phase B scope, implemented revision, and passing
  evidence; stop if the approval record is missing or ambiguous.
- [x] Cross-check the release candidate against only the owner-approved SP-024
  finding IDs and confirm no deferred/rejected advice was implemented
  opportunistically.
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
- [ ] Verify both complete flows and all error/retry states at every responsive anchor and intermediate widths, including portrait/landscape, safe areas, virtual keyboard, long captions, sticky controls, 200% zoom, and keyboard.
- [ ] Run the motion matrix with the browser preference explicitly forced to
  both `no-preference` and `reduce`. Confirm ordinary motion is not accidentally
  collapsed by an inherited/emulated preference; confirm reduced mode preserves
  comprehensible state feedback and only owner-approved narrow exemptions.
- [ ] Read representative agent turns aloud: 8–25-word target, normal 35-word ceiling, one question, direct tone, no canned acknowledgement/praise/tool narration.
- [ ] Verify candidate counterquestions are answered first, unclear audio is clarified without evidence, and timing/interruption settings—not prompt filler—handle latency.
- [ ] Verify normal 8–10-prompt HR coverage, multi-field answer credit, one broad role-context clarification maximum, and zero technical, portfolio, competency, roleplay, professional-knowledge, or suitability chains.
- [ ] Verify unsupported employer/vacancy questions become human follow-up without blocking completion and that no selected role invents responsibilities, qualifications, salary, benefits, reporting lines, team size, work pattern, location requirements, or hiring timelines.
- [x] Run the smallest targeted release-critical unit/backend checks, then the
  complete fast default commands once. SP-025A completed the focused corrected
  surfaces and the complete deterministic repository gate on 2026-09-24.
- [x] Reconcile SP-021B evidence honestly: retain the successful CV-assisted
  live result, record the owner's conversation-first success recollection as
  uncorroborated by a distinguishable full-live operation ledger, and require no
  additional paid local flow.
- [x] Create `docs/operations/full-flow-cost-baseline.md` as a sanitized
  preliminary template containing existing request-count/timing evidence and
  explicit unknown cost fields. SP-026 appends the two definitive production
  flow measurements.
- [x] Confirm the SP-026 handoff requires exactly two controlled production
  flows unless a defect narrowly requires a rerun: one materially different
  synthetic/licensed text-PDF CV-assisted flow and one conversation-first flow.
  Treat their cost evidence as a spend-safety sanity check, not a portfolio
  unit-cost claim.
- [ ] Record, fix, and retest every release-blocking functional, privacy,
  security, conversational-behavior, and provider issue within its authorized
  scope. Timing values may identify a defect but do not independently create a
  statistical gate.
- [ ] For any new SP-024-class finding, record evidence and block or continue
  release according to severity, but obtain owner approval before changing the
  implementation.

## Acceptance criteria

- [ ] Every required Section 18 manual scenario has a recorded pass across the relevant responsive matrix.
- [x] The complete quick gate passes once on the release candidate. SP-025A
  recorded the locked-runtime command details and exact pass counts in the
  release-candidate audit ledger.
- [x] Existing live evidence and its limitations are recorded without a new
  paid local call; the definitive two-entry-mode paid acceptance, production
  Turnstile/hostname checks, and measured cost finalization are handed to
  SP-026 as public-release gates.
- [ ] No release-blocking conversation, evidence, Turnstile, responsive,
  accessibility, privacy, or provider defect remains; any obvious timing problem
  observed during the walkthrough is investigated as a functional UX defect.
- [ ] The completed matrix proves both explicit motion preference modes and
  distinguishes the global one-frame-collapse symptom from an application
  defect; every surviving reduced-motion exemption maps to an owner-approved
  SP-024 finding or a pre-existing source-of-truth decision.
- [x] No deferred, rejected, or newly proposed SP-024 finding was implemented
  without an owner decision.
- [ ] Every required role-neutral scenario proves one universal HR screen, no allow-list/redirection, no profession-specific assessment, and no invented employer/vacancy fact.
- [x] Any non-blocking known limitation is documented honestly and does not contradict definition of done.
- [ ] SP-025A receives the exact approved release candidate and complete manual
  evidence; SP-026 remains blocked until the repository/ticket audit closes.

## Focused verification

- [x] Run `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, and `pnpm build` once.
  SP-025A invoked the pinned pnpm 11.24.0 workspace commands directly because
  the host's default executable was pnpm 11.19.0; the clean production-build
  snapshot contained no ignored local environment file.
- [ ] Use a written manual matrix recording environment, viewport/browser, scenario, result, evidence, and defect link.
- [ ] Record the effective `prefers-reduced-motion` state in every motion check;
  run a paired `no-preference`/`reduce` comparison rather than relying on the
  system default.
- [ ] Re-run the smallest affected scenario/check after each fix and the complete quick gate only at the final boundary.
- [x] Reconcile existing content-free provider logs into the preliminary cost
  file without inventing token counts, connected duration, or measured cost.
- [x] Record OpenAI input/output sharing as an SP-026 pre-flow/public-release
  gate. It must be disabled before any external/public or non-synthetic use and
  before the two controlled production flows begin.
- [x] Verify the cost file contains no CV/transcript text, candidate identity,
  API key, account ID, Turnstile token, or secret-bearing billing screenshot.
- [ ] Obtain explicit user approval of the release candidate and unresolved non-blocking limitations.
- [ ] Hand the exact approved candidate, manual matrix, current SP-021B evidence,
  cost baseline, fixed defects, and every remaining limitation/blocker to
  SP-025A without treating this manual pass as the repository-wide final audit.

## Commit boundary

Keep SP-025 reviewable as one logical change represented by
`SP-025: complete focused demo release checks`. Do not absorb SP-024 proposals
or the next ticket merely because adjacent code is visible. Do not create a
commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Required manual acceptance sheet](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#required-manual-acceptance-sheet)
- [Performance diagnostics](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#performance-diagnostics)
- [Definition of done](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#20-definition-of-done)
- [Lean verification rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#18-lean-verification-strategy)
- [Credential acquisition and paid-test gate](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)
- [Full-flow cost assumptions, free allowances, and reconciliation](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#13-elevenlabs--openai-research-and-cost-plan)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. Identify the exact candidate and evidence handed to SP-025A; SP-026 remains blocked until that audit closes. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
