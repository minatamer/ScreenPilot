# SP-004 — Create and approve the visual design references

Status: Required  
Implementation state: Completed, user-approved, reviewed, revised, and committed as `6f94d0a`; SP-005 may begin

Milestone: Milestone 0 — repository and visual foundations  
Last synchronized: 2026-09-08<br>
Depends on: SP-001, SP-002  
Suggested commit: `docs(design): approve ScreenPilot visual direction`  
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Produce one lightweight browser-viewable HTML living style guide and one approved desktop/mobile active-interview concept before broad React styling.

## Standalone implementation context

- The design language is **Signal Canvas**: a calm, precise, modern, transparent AI workspace—not an HR dashboard, sci-fi interface, or neon robot theme.
- The experience moves from a clean light document surface into a dark live signal field and back to a light evidence review.
- Core colors: `ink-950 #070A12`, `ink-900 #0D1220`, `paper-50 #F7F8FC`, `paper-0 #FFFFFF`, `violet-500 #7C5CFC`, `cyan-400 #35D4E7`, `mint-400 #52D6A2`, `amber-400 #F1B84B`, `rose-400 #F06A8A`, and `slate-500 #667085`.
- Typography uses Geist Sans, with Geist Mono only for technical metadata. Display is 56/60 desktop and 38/44 mobile at weight 600; body is 16/25.
- Use an 8 px spacing base, 12 px control radius, 18–22 px card radius, and 28 px main-canvas radius. Borders do most separation; shadows and glass are sparse.
- One final ImageGen concept artifact is allowed only after the HTML reference is approved. Corrective refinements may replace that same paired direction when explicitly requested; they cannot branch into extra screens or invent product features.
- The HTML reference is a professional lightweight living style guide, not a second application, Figma replacement, Storybook, or screen catalogue.

## Scope boundaries

- Do not build actual React pages, routing, CV logic, provider integration, or application state.
- Do not create a Figma file, Code Connect mapping, design-system application, or multiple visual directions.
- Do not generate landing, CV, plan, preflight, review, or error-screen image sets.
- Do not treat the raster concept as a pixel-exact spec or let it override written behavior, tokens, responsiveness, or accessibility.
- Do not style, imitate, hide, or alter Cloudflare Turnstile internals; style only a stable surrounding fallback container.

## Implementation checklist

- [x] Create self-contained `docs/SCREENPILOT_DESIGN_SYSTEM.html`.
- [x] Show named colors with exact values, foreground pairings, light/dark surfaces, and semantic usage.
- [x] Show approved Geist typography levels with realistic ScreenPilot copy.
- [x] Document spacing, gutters, widths, responsive anchors, radii, borders, elevation, opacity, limited gradients/glass, motion, and reduced motion.
- [x] Document a Lucide-aligned icon policy with size, stroke, meaning, and accessible labels.
- [x] Render compact primitives/cards plus default, hover, focus-visible, disabled, loading, confirmed, clarification, corrected, and error states.
- [x] Include equal-priority CV-assisted and conversation-first entry cards and the Turnstile fallback container.
- [x] Include one small paired desktop/mobile composition sample.
- [x] Render and inspect the HTML at phone, tablet, laptop, large-monitor, and intermediate drag-resized widths.
- [x] Obtain user approval of the HTML reference.
- [x] Using the exact approved Section 15 prompt and the ImageGen skill, generate one paired active-interview concept and save the approved result as `docs/assets/screenpilot-active-interview-concept.png`.
- [x] Reject invented features, reconcile accepted composition refinements into the HTML/reference rules, and obtain final user approval.

## Acceptance criteria

- [x] The style guide communicates a coherent implementable system without behaving like the application.
- [x] All exact tokens, type sizes, states, icon rules, and responsive principles are visible and internally consistent.
- [x] Both entry modes have equal visual weight.
- [x] Desktop and mobile feel like one system, not separate themes.
- [x] The generated concept contains only the approved active-interview elements and has been reconciled back into written rules.
- [x] User approval is recorded before SP-005 begins.

## Completion summary (TL;DR)

- Built the browser-viewable Signal Canvas living style guide with the approved color, typography, spacing, component, state, motion, accessibility, and responsive rules.
- Generated and refined one paired desktop/mobile active-interview concept, saved the final selected artifact locally, and embedded it in the HTML as the primary composition reference.
- Reworked the coded interview samples to closely match the approved image-led framing, voice signal, captions, vertical insight cards, controls, and mobile selected-card rail.
- Named the visible interviewer **Pilot** while reserving “AI” for transparent disclosure, consent, privacy, and explanatory copy.
- Reconciled all accepted visual decisions into the source of truth and rejected invented generated details or unsupported product behavior.
- Verified the result from 320 through 2560 px, including keyboard focus, target sizing, contrast, reduced motion, Turnstile stability, console/network behavior, formatting, lint, types, tests, and production builds.
- No checklist item or acceptance criterion remains open; no credentialed, paid-provider, or user-only verification is required for this design-reference ticket.

## Focused verification

- [x] Open the HTML directly in a browser and check console/network behavior.
- [x] Capture representative renders at 320, 390, 820, 1024, 1440, and 2560 px plus an intermediate width.
- [x] Check contrast, overflow, focus visibility, font fallbacks, reduced motion, and Turnstile-container stability.
- [x] Review the ImageGen concept against every Section 15 rejection criterion.
- [x] Run `pnpm verify:quick`; formatting, lint, typechecks, 23 unit tests, and production builds pass.

## Implementation record

- Implemented on 2026-08-31 with the repository-pinned Node.js 24.20.0 and pnpm 11.24.0 toolchain.
- Created the lightweight HTML reference with exact Signal Canvas tokens, Geist Sans/Mono fallback stacks, spacing/shape/elevation rules, Lucide-aligned icons, semantic states, equal entry modes, stable Turnstile surround, responsive composition pair, reduced-motion behavior, and no application/provider logic.
- The user explicitly approved the initial HTML reference, then selected the corrected paired ImageGen concept for inclusion. After reviewing the hybrid, the user preferred the generated UI/UX and authorized a closer image-led corrective refinement of the same direction.
- Saved only the final refined concept as `docs/assets/screenpilot-active-interview-concept.png` and embedded it in the HTML as the primary composition reference; it replaces the earlier rendition rather than adding a competing direction.
- Rebuilt the coded composition sample around the concept's compact branded app header, two bordered desktop work areas, larger cyan/violet voice signal, spacious caption panel, separated timer/controls, vertical desktop insight stack with icon tiles, and selected-card mobile rail. Retained the HTML's exact tokens, grounded content, semantics, accessibility, continuous responsive rules, and still background atmosphere.
- Named the visible interviewer **Pilot** throughout live status copy. The UI uses “Pilot is interviewing” and “Pilot is listening…”; “AI” remains reserved for disclosure, consent, privacy, and explanatory copy so the persona stays friendly without obscuring what the system is.
- Rejected and corrected invented company identity, unsupported privacy/training claims, phone-call controls, evidence counts, unspecified availability/experience details, salary-cadence and B2-interpretation additions, and device chrome/generated measurements as implementation requirements.
- Inspected the final image-led composition at 320, 390, 820, 1024, 1180, 1440, and 2560 px and swept 1220–1280 px across the paired-sample breakpoint. No page overflow, clipped required content, undersized focusable target, or unequal entry-card emphasis remained.
- Browser checks found no console warning/error. The HTML and the one local approved PNG loaded successfully with no external font/script/style request; the inline favicon avoids a missing-asset request.
- Contrast-aware pairings passed the local text audit; keyboard focus rendered as a 3 px cyan ring; the active reduced-motion environment removed signal/loading/insight animation and smooth scrolling; the 320 px Turnstile slot retained its dimensions when focused.
- Revised on 2026-09-08 against the approved artifacts, ticket requirements, source of truth, and commit history. The reference remains complete and implementation-ready. Minor production guidance is carried into SP-005: preserve a sequential heading outline and use unambiguous visible microphone state/action copy; neither changes the approved visual direction.

## Commit boundary

Keep SP-004 reviewable as one logical change represented by `docs(design): approve ScreenPilot visual direction`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Complete Signal Canvas design specification](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#14-design-source-of-truth--signal-canvas)
- [Exact ImageGen scope and prompt](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#15-one-imagegen-concept-for-the-primary-experience)
- [Screen flow and visible states](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#4-end-to-end-demo-flow)

## Completion handoff

- Outcome: SP-004 is complete, user-approved, reviewed, and committed; SP-005 may begin.
- Files: `docs/SCREENPILOT_DESIGN_SYSTEM.html`, `docs/assets/screenpilot-active-interview-concept.png`, this ticket, and the parent source of truth.
- Deliberate deviation: after the first approved raster, the user requested closer image-led alignment and explicitly authorized one corrective refinement of the same concept. Only the final direction is retained.
- Verification: required responsive anchors and breakpoint sweeps passed with no overflow, clipped required content, undersized focus target, console error, or external runtime dependency. `pnpm verify:quick` passed.
- Blockers and unchecked items: none for SP-004.
- Git state: the approved design work was committed as `6f94d0a` and is present on `main` and `origin/main`. The 2026-09-08 documentation reconciliation remains available for review.
