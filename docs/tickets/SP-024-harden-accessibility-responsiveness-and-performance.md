# SP-024 — Harden accessibility, responsiveness, and frontend performance

Status: Implemented — owner-approved Phase B complete; broader release-device QA remains in SP-025<br>
Milestone: Milestone 4 — public-demo hardening  
Last synchronized: 2026-09-24<br>
Depends on: SP-005, SP-011, SP-011A, SP-012, SP-013, SP-016, SP-016A, SP-021<br>
Suggested Phase A commit: `SP-024: document frontend audit proposal`<br>
Suggested Phase B commit: `SP-024: implement approved frontend hardening`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

First produce a comprehensive, evidence-backed audit and an owner-reviewable
proposal for accessibility, continuous responsive behavior, browser/device edge
cases, motion, and frontend runtime performance. Do not change frontend
implementation during Phase A. Implement only the finding IDs the owner
explicitly approves in a later Phase B.

## Owner approval gate

SP-024 is intentionally split into two execution phases:

1. **Phase A — audit and proposal:** inspect, measure, reproduce, classify, and
   document. Phase A may create or update documentation and capture disposable
   local evidence. It must not edit application code, CSS, design tokens, the
   HTML design reference, tests or snapshots, dependencies, build/runtime
   configuration, hooks, or product behavior.
2. **Owner decision:** present the completed audit as individually addressable
   finding IDs. The owner may approve all findings, approve selected IDs,
   request revisions, defer findings, or reject them. Silence, general interest,
   or approval to run the audit is not approval to implement.
3. **Phase B — approved implementation:** begins only after the owner explicitly
   names the approved finding IDs or explicitly approves the whole proposal.
   Implement only that approved set. Any newly discovered or materially changed
   recommendation returns to the owner decision gate before it is implemented.

The Phase A deliverable is
`docs/operations/sp-024-frontend-audit.md`. It must include:

- the audited Git revision, environments, viewports, browsers, input methods,
  emulation/physical-device status, and tools or skills actually used;
- a baseline inventory covering every major stage, state, error, responsive
  anchor, performance path, and motion preference;
- findings with stable IDs, P0–P3 severity, evidence, affected users, exact
  locations, applicable WCAG/performance guidance, and confidence;
- a proposed correction for each finding, files likely to change, scope and
  dependency risks, acceptance criteria, and the smallest verification plan;
- a dedicated reduced-motion matrix for `no-preference` and `reduce`, including
  the cascade responsible for each result and every proposed exemption;
- advice rejected because it conflicts with ScreenPilot's approved product,
  privacy, accessibility, role-neutral, or visual direction;
- an owner-decision table whose initial state is `Pending` for every proposed
  finding. Phase A must not pre-check implementation or verification boxes.

**Owner decision (2026-09-24):** Approved `SP024-RESP-001`,
`SP024-RESP-002`, `SP024-MOTION-001`, `SP024-MOTION-002`,
`SP024-MOTION-003`, and `SP024-TEST-001`. For `SP024-MOTION-002`, reduced
motion must show the completed highlight immediately with no sweep; normal
motion retains the one-second sweep. The approved set is frozen and SP-025 is
not part of this implementation.

## Standalone audit context

- Responsive quality is continuous from 320 px through 2560 px and beyond;
  breakpoints follow content pressure rather than separate device products.
- Reference anchors: 320; 360×800; 390×844; 768/820 tablet; 1024×768;
  1280×800; 1440×900; 1920×1080; 2560×1440, plus drag-resized intermediate
  widths.
- Both landing entry cards remain equally prominent. Both modes converge on
  shared components without duplicated desktop/mobile trees.
- SP-011A's landing preview and centralized `/demo` workspace are release
  surfaces: preserve the one-shot handwritten-headline motion, slow six-example/
  two-board preview loop, reduced-motion opacity-only word entrances, compact
  context band, contextual Privacy access, inert progress status,
  logo-to-landing and **Clear & exit** behavior, dark hierarchy, natural
  short-height/zoom scrolling, and deliberate large-screen composition.
- Mobile interview keeps voice signal, captions, sticky safe-area-aware
  controls, insight categories/states/source chips, swipeable rail, and
  expandable evidence.
- Large monitors use bounded reading widths, deliberate whitespace, and
  expanded composition—not stretched paragraphs and controls.
- Required behavior includes keyboard/focus, ARIA/status/captions, reduced
  motion, 200% zoom, long content, orientation, safe areas, dynamic viewport,
  virtual keyboard, and minimum 44×44 targets.
- Browser PDF extraction, motion, captions, insight updates, fonts, and bundles
  must remain responsive on a representative mid-range mobile profile.

## Personal Codex skills and precedence

The following third-party skills are installed in the owner's personal Codex
scope, not vendored into this repository. They are optional audit accelerators,
not project dependencies or design authority. Their local metadata requires
explicit invocation.

Use this audit sequence when the skills are available:

1. Invoke `$impeccable audit` for the broad technical accessibility,
   responsive, theming, implementation-integrity, and performance report. Use
   audit/report behavior only. Do not invoke Impeccable hooks, live editing,
   automatic fixes, or its implementation commands during Phase A. If its
   launcher or detector requires a new download or cannot run, do not work
   around that silently; record the limitation and complete the reference-guided
   audit with available read-only tools.
2. Invoke `$improve-animations deep accessibility` for the codebase motion
   survey. Stop after vetted findings and missed opportunities; do not enter its
   plan-writing or `execute` phase. Merge its evidence into the single SP-024
   audit rather than creating an implementation queue.
3. Invoke `$review-animations` for specific existing motion and
   reduced-motion rules that need a second, focused review.
4. Optionally invoke `$design-taste-frontend` only for the public landing page
   as a read-only design critique. Its own scope excludes dashboards and
   multi-step product UI, so it must not direct the `/demo` workspace. Treat its
   default visual/motion preferences as suggestions, never requirements.

Do not use `$gpt-taste`, `$design-taste-frontend-v1`, `$animate`, or
implementation-oriented Impeccable commands during Phase A. Their prescriptive
GSAP, continuous-motion, replacement-design, or write-oriented defaults can
conflict with the approved ScreenPilot direction and this ticket's approval
gate. Other installed variants are out of scope unless the owner explicitly
adds them.

Precedence is always:

1. the owner's current direction and explicit approval decision;
2. this ticket, repository instructions, and the source of truth;
3. ScreenPilot privacy, accessibility, role-neutral product, and approved
   Deep Ink + Warm Coral design constraints;
4. measured browser/device evidence;
5. third-party skill advice.

If a skill conflicts with a higher-precedence item, document the conflict and
reject or revise the suggestion. Never let a skill add packages, rewrite copy,
invent product facts, enable analytics/persistence, or broaden product scope.

## Known reduced-motion diagnostic and exemption policy

Preserve this recurring diagnostic verbatim in the audit:

> Found it: your system/browser is exposing reduced-motion preference, and the global accessibility rule was collapsing every animation to one frame.

The current frontend includes a global `prefers-reduced-motion: reduce` rule in
`apps/frontend/src/styles/globals.css` that collapses general animation and
transition durations to `1ms`, plus reduced-motion duration tokens in
`apps/frontend/src/styles/tokens.css`. The HTML design reference contains the
equivalent global collapse at `0.01ms`. Later component-level rules already
express some intentional alternatives and exceptions. This is a known cascade
risk: a browser or operating-system reduced-motion preference can make an
animation appear broken, while a broad exemption can accidentally weaken the
accessibility behavior.

Phase A must:

- explicitly test both `prefers-reduced-motion: no-preference` and `reduce`;
  never infer ordinary animation quality from a browser whose preference state
  was not recorded;
- identify whether each missing/one-frame animation comes from the system
  preference, the global duration/token rule, CSS order or specificity, a
  component rule, JavaScript preference handling, or an unrelated defect;
- inventory existing intentional behavior, including opacity-only entrances,
  static/immediate state changes, functional busy indicators, semantic marker
  sweeps, the owner-approved direct-click scroll behavior, and any shallow
  reduced-motion landing entrance already stated by the source of truth;
- propose exemptions individually. Each proposal must name the selector or
  component, purpose, trigger, duration, spatial movement, repetition, impact on
  motion-sensitive users, and a non-motion alternative;
- prefer an intentional reduced-motion state over a universal one-frame kill,
  but never remove or weaken the global rule during Phase A and never approve a
  spatial, scaling, parallax, spring, or perpetual-motion exemption merely
  because a skill recommends it;
- require explicit owner approval for every new exemption and for any change to
  the global rule. Approved exemptions must remain narrow, preserve task and
  state comprehension, and receive dedicated regression coverage in both
  preference modes.

## Scope boundaries

- Phase A is documentation and read-only evidence only. No frontend
  implementation, dependency change, formatter, generated baseline update,
  hook installation, or automatic skill fix is authorized.
- Do not hide core content/actions on mobile, create a separate mobile
  app/theme/tree, or treat tablet/large monitor as afterthoughts.
- Do not chase pixel parity by breaking accessibility or semantic structure.
- Do not introduce heavy 3D/WebGL/shader effects, force-directed graphs, or
  unnecessary performance dependencies.
- Do not add commercial device-lab scope or optional full Playwright automation
  here.
- Do not change product behavior merely to make a layout easier without
  updating scope and obtaining owner approval.

## Phase A — audit and proposal checklist

- [x] Record the exact revision and produce the audit-environment matrix before
  interpreting results.
- [x] Audit semantic structure, keyboard order, focus management/restoration,
  visible focus, ARIA names/live regions, caption access, contrast, and 44×44
  targets; run automated checks and a full manual keyboard review without
  applying fixes.
- [x] Inspect every reference anchor and drag-resize intermediate widths for
  continuous reflow, overflow, clipping, dead zones, or duplicated
  implementations.
- [x] Audit equal landing-card priority, shared branch convergence,
  portrait/landscape, safe areas, dynamic viewport height, browser chrome,
  virtual keyboard, sticky interview controls, and Turnstile fallback layout.
- [x] Check long names, CV excerpts, captions, card values, summaries, errors,
  and translated-like expansion.
- [x] Audit mobile insight rail/expanded evidence and desktop/large-monitor
  constellation behavior.
- [ ] Profile PDF extraction, animation, live caption/insight updates, render
  churn, input responsiveness, fonts, bundles, PDF worker/assets, and image/icon
  loading on representative mobile/throttled profiles.
- [x] Run the complete reduced-motion diagnostic and proposed-exemption matrix
  in both preference modes.
- [x] Consolidate overlapping skill/tool findings, remove false positives, and
  document rejected advice and unresolved evidence gaps.
- [x] Produce the complete owner-decision table with stable finding IDs and no
  implementation marked approved or complete.
- [x] Stop and request owner approval. Do not begin Phase B in the same run
  unless the owner reviews the proposal and explicitly authorizes it.

## Phase B — approved implementation checklist

The owner approval gate was satisfied on 2026-09-24.

- [x] Record the exact approved finding IDs and freeze the Phase B scope.
- [x] Implement only approved accessibility, responsive, motion, and
  performance corrections without weakening shared design consistency.
- [x] Add or update the smallest tests required by the approved behavior,
  including both motion-preference modes for every approved exemption.
- [x] Re-run the smallest affected checks and manual states after each bounded
  group of changes.
- [x] Re-run the approved audit scenarios and map each implemented finding to
  evidence; return new or materially changed proposals to the owner gate.
- [x] Synchronize approved token or visual-rule changes with the HTML design
  reference and source of truth.

## Acceptance criteria

### Phase A checkpoint

- [x] The complete audit exists at
  `docs/operations/sp-024-frontend-audit.md`, contains reproducible evidence and
  stable finding IDs, and separates observed defects from subjective advice.
- [x] Both motion preference states and the global one-frame-collapse risk are
  explicitly documented, with every suggested exemption pending owner review.
- [x] No application, CSS, token, design-reference, test, dependency, hook, or
  runtime configuration file changed during Phase A.
- [x] The owner-decision table is complete and still records `Pending` unless
  the owner has explicitly ruled on each item.

### Phase B completion

- [x] Every owner-approved finding is implemented and verified; rejected,
  deferred, and unapproved findings remain untouched and documented.
- [x] Every major stage, action, state, error, and evidence relationship is
  present at every viewport class.
- [x] No horizontal page scroll, clipped sticky action, inaccessible focus, or
  device-specific duplicate implementation remains within the approved scope.
- [ ] Both complete flows remain operable in portrait/landscape and with virtual
  keyboard/safe areas.
- [x] Large monitors look intentionally composed and phones remain
  information-complete.
- [ ] Representative mobile CPU/network performance keeps extraction,
  captions, controls, and insights responsive.
- [x] Accessibility-driven token corrections are synchronized with the HTML
  design reference.

## Phase B implementation evidence

The approved implementation completed on 2026-09-24 without a dependency,
provider configuration, or persistence change. The compact completed action now
uses the full mobile track; mobile coverage uses four pages of three readable
12 px rows; reduced passive scrolling is immediate; reduced evidence markers
resolve to their completed painted state without a sweep; and hero cards now
use the approved normal/reduced one-shot travel plus normal-only hover lift.
The landing-preview state test covers both media-query values.

Process-local fake/paid-disabled verification passed 4 affected files / 17
tests, the full frontend suite at 40 files / 295 tests, frontend typecheck,
frontend lint, a Node 24 production build, formatting, and diff checks. A fresh
production-local deterministic conversation-first browser run completed at 320
px with a 197 × 44 px **View summary** action, exactly three active 12 px
coverage rows on every page, zero horizontal overflow, immediate reduced
highlighting, and clean browser warning/error logs. Responsive completion
geometry also passed at 360 × 800, 390 × 844, and 844 × 390; reduced hero
overflow/settled-state checks passed from 320 through 2560 px.

The connected browser reported reduced motion and does not expose a media-
preference override. The normal path was therefore verified through the
compiled production CSS and the no-preference component branch rather than a
second live computed-style capture. Physical Safari/Firefox/Android devices,
screen-reader output, virtual-keyboard/safe-area injection, and throttled
CPU/network profiling remain explicitly unchecked and move to SP-025/manual
release evidence; they are not silently claimed here.

## Focused verification

Phase A may run read-only tests, analyzers, browser inspections, profilers, and
evidence captures. It must not update snapshots or generated files. Phase B,
after approval, performs the implementation verification below:

- [ ] Run the focused frontend tests, accessibility tooling, and manual
  keyboard/screen-reader review.
- [ ] Capture/compare every reference anchor plus intermediate drag-resized
  widths for all major stages and errors.
- [ ] Test iPhone Safari, Android Chrome, desktop Chromium, and Firefox targets
  available to the project, clearly separating emulation from physical-device
  evidence.
- [ ] Profile representative mobile extraction/live-update paths and inspect
  bundle/font/PDF-worker output.
- [ ] Exercise both explicit motion preferences, 200% zoom, long content, slow
  network, orientation, safe area, and virtual keyboard.

## Commit boundary

Phase A is one documentation-only proposal boundary represented by
`SP-024: document frontend audit proposal`; Phase B is a separate, later
approved implementation boundary represented by
`SP-024: implement approved frontend hardening`. Do not combine the audit and
implementation into one unreviewed change, absorb SP-025, or create a commit
unless the user separately authorizes it.

## Precision references

- [Responsive behavior and accessibility](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#responsive-behavior)
- [Complete screen design](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#screen-design)
- [Frontend performance and responsive ticket scope](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#sp-024--harden-accessibility-responsiveness-and-frontend-performance)
- [Required manual acceptance sheet](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#required-manual-acceptance-sheet)

## Completion handoff

At the end of Phase A, report only the audit/documentation files changed, the
read-only checks and manual states inspected, skill/tool limitations, every
finding ID, and every evidence gap. Then stop for owner review. Do not describe
SP-024 as implemented or complete.

At the end of an owner-approved Phase B, report the approved IDs implemented,
files changed, targeted checks and manual states verified, deliberate
deviations, and every unchecked item with its blocker. If approved
implementation changes a material product or architecture decision, update the
parent source of truth and every affected packet before declaring completion.
