# SP-004 — Create and approve the visual design references

Status: Required  
Implementation state: Completed, user-approved, reviewed, revised, and committed; the Deep Ink + Warm Coral direction supersedes the earlier `6f94d0a` visual direction and SP-005 may begin

Milestone: Milestone 0 — repository and visual foundations  
Last synchronized: 2026-09-08<br>
Depends on: SP-001, SP-002  
Suggested commit: `SP-004: approve ScreenPilot visual direction`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Produce one lightweight browser-viewable HTML living style guide and one approved desktop/mobile active-interview concept before broad React styling.

## Standalone implementation context

- The design language is **Signal Canvas** in its **Deep Ink + Warm Coral** direction: a calm, precise, modern, transparent AI workspace—not an HR dashboard, sci-fi interface, or neon robot theme.
- The original reference moved from a clean light document surface into a dark live signal field and back to a light evidence review. SP-011A supersedes that route-level surface split: landing, setup, live interview, and review now share one Deep Ink/plum/coral atmosphere, while hierarchy comes from layered dark surfaces and near-white type rather than white page or card backgrounds.
- Core colors: `ink-950 #18243A`, `ink-900 #22314B`, `paper-50 #FAFAF8`, `paper-0 #FFFFFF`, `coral-300 #FCA39A`, `coral-500 #F26B5B`, `coral-700 #CC493F`, `coral-800 #B93831`, `coral-100 #FDE8E4`, `line-200 #E4E7EC`, `line-strong #7D899B`, and `slate-500 #667085`. Confirmed, clarification, and danger states keep separate green, amber, and red tokens.
- Typography uses Geist Sans, with Geist Mono only for technical metadata. Display is 56/60 desktop and 38/44 mobile at weight 600; body is 16/25.
- Use an 8 px spacing base, 12 px control radius, 18–22 px card radius, and 28 px main-canvas radius. Borders do most separation; shadows and glass are sparse.
- One final ImageGen concept artifact is allowed only after the HTML reference is approved. Corrective refinements may replace that same paired direction when explicitly requested; they cannot branch into extra screens or invent product features.
- The HTML reference is a simple, easy-to-read visual guide, not the internal implementation specification, a second application, Figma replacement, Storybook, or screen catalogue. Detailed rules live in this ticket and the parent source of truth. The HTML opens with the polished final-looking landing hero direction, then uses plain sections such as Color theme, Typography & font, Layout, Components, Interview screen, and Responsive & accessible.

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
- [x] Obtain user approval of the revised simplified HTML reference.
- [x] Using the revised Section 15 prompt and the ImageGen skill, replace the existing paired active-interview concept at `docs/assets/screenpilot-active-interview-concept.png`.
- [x] Reject invented features, reconcile accepted composition refinements into the HTML/reference rules, and obtain final user approval.

## Acceptance criteria

- [x] The style guide communicates a coherent implementable system without behaving like the application.
- [x] All exact tokens, type sizes, states, icon rules, and responsive principles are visible and internally consistent.
- [x] Both entry modes have equal visual weight.
- [x] Desktop and mobile feel like one system, not separate themes.
- [x] The generated concept contains only the approved active-interview elements and has been reconciled back into written rules.
- [x] User approval of this revision is recorded before SP-005 begins.

## Previous completion summary (TL;DR)

- Built the browser-viewable Signal Canvas living style guide with the approved color, typography, spacing, component, state, motion, accessibility, and responsive rules.
- Generated and refined one paired desktop/mobile active-interview concept, saved the final selected artifact locally, and embedded it in the HTML as the primary composition reference.
- Reworked the coded interview samples to closely match the approved image-led framing, voice signal, captions, vertical insight cards, controls, and mobile selected-card rail.
- Named the visible interviewer **Pilot** while reserving “AI” for transparent disclosure, consent, privacy, and explanatory copy.
- Reconciled all accepted visual decisions into the source of truth and rejected invented generated details or unsupported product behavior.
- Verified the result from 320 through 2560 px, including keyboard focus, target sizing, contrast, reduced motion, Turnstile stability, console/network behavior, formatting, lint, types, tests, and production builds.
- No checklist item or acceptance criterion remains open; no credentialed, paid-provider, or user-only verification is required for this design-reference ticket.

## Current revision (2026-09-08)

- The user reopened SP-004 before SP-005 and approved replacing violet/cyan with the Deep Ink + Warm Coral palette.
- The attached recruiter-dashboard image is used only for palette and visual mood. Its dashboard navigation, profiles, pipeline, analytics, scoring, phone controls, and unrelated features are out of scope.
- The HTML was simplified for user review: the internal specification remains here and in the source of truth, while the browser artifact is a short visual summary with a finalized landing hero sample first.
- Accessibility corrections are part of the palette: White text uses darker `coral-700 #CC493F`; normal Warm Coral uses Deep Ink text; subtle Cool Gray is not the sole boundary for interactive controls; statuses retain distinct semantic colors.
- The active-interview concept is a replacement of the same desktop/mobile direction, not an additional screen or competing theme.
- The user approved the simplified HTML's Deep Ink rounded-square / Warm Coral forward-mark logo for the actual web app. SP-005 should extract and reuse that code-native SVG with an accessible ScreenPilot label rather than tracing the generated raster.
- The user approved the corrected revision and authorized its immediate commit; SP-005 may begin after this ticket commit.

## SP-011A composition correction (2026-09-11)

- SP-011A keeps the approved Deep Ink + Warm Coral tokens, logo, type character, active-interview concept, and accessibility rules, but supersedes the original generic light landing composition with the research-backed **Editorial Live Signal** mixed-surface hero.
- The HTML opening sample now demonstrates the intended product-first hierarchy: Deep Ink editorial copy, a clearly illustrative role-neutral signal → transcript → evidence preview, equal entry actions immediately afterward, and Privacy/source access outside primary navigation.
- This corrective implementation was explicitly authorized without a new approval pause. It is a composition extension of the existing Signal Canvas authority, not a second design direction or replacement raster concept.

## Previous focused verification

- [x] Open the HTML directly in a browser and check console/network behavior.
- [x] Capture representative renders at 320, 390, 820, 1024, 1440, and 2560 px plus an intermediate width.
- [x] Check contrast, overflow, focus visibility, font fallbacks, reduced motion, and Turnstile-container stability.
- [x] Review the ImageGen concept against every Section 15 rejection criterion.
- [x] Run `pnpm verify:quick`; formatting, lint, typechecks, 23 unit tests, and production builds pass.

## Current revision verification

- [x] Review the replacement concept against the Section 15 rejection criteria and correct unknown availability/experience states, unsupported evidence cues, and generated device chrome.
- [x] Render the simplified HTML at 320, 390, 820, 1024, 1180, 1440, and 2560 px; confirm no horizontal page overflow and no visible interactive target below 44 × 44 px.
- [x] Confirm a sequential heading outline, unique IDs, successful local image loading, no external runtime request, and no browser console warning/error.
- [x] Confirm key text/action/status pairings meet WCAG AA contrast and the coral focus ring has at least 3:1 contrast on Deep Ink.
- [x] Run the complete deterministic `pnpm verify:quick` gate with bundled Node.js 24.19.0 and repository-pinned pnpm 11.24.0; formatting, lint, all typechecks, 37 unit tests, and all production builds pass.
- [x] Obtain final user visual approval of the revised HTML and concept.

## Implementation record

### Previous approved direction (2026-08-31)

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
### Current approved Deep Ink + Warm Coral revision (2026-09-08)

- Reviewed on 2026-09-08 against the previous artifacts, ticket requirements, source of truth, and commit history. The user then reopened this ticket for the Deep Ink + Warm Coral visual revision. The new HTML uses a sequential heading outline and the interview control now exposes the unambiguous action/state copy **Mute — Microphone on** with the accessible name **Mute Pilot's microphone input**.
- Replaced the dense 91 KB internal-style HTML with a 56 KB plain-language visual guide whose first section is the final-looking landing hero direction. Detailed implementation authority remains in this ticket and the parent source of truth.
- Replaced the single paired raster in place with the Deep Ink + Warm Coral direction. Corrective passes removed generated device chrome, changed unknown availability and experience to **Needs clarification**, and removed unsupported evidence claims from those unknown cards.
- Recorded the simplified HTML's code-native Deep Ink / Warm Coral forward-mark SVG as the logo to reuse in the actual frontend; the generated raster logo is not authoritative.
- Verified the revision at 320, 390, 820, 1024, 1180, 1440, and 2560 px with no horizontal overflow or undersized visible interactive target. The document has a sequential heading outline, unique IDs, no external runtime request, successful local image loading, and no console warning/error. Contrast checks and the complete deterministic `pnpm verify:quick` gate pass.

## Commit boundary

Keep SP-004 reviewable as one logical change represented by `docs(design): approve ScreenPilot visual direction`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Complete Signal Canvas design specification](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#14-design-source-of-truth--signal-canvas)
- [Exact ImageGen scope and prompt](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#15-one-imagegen-concept-for-the-primary-experience)
- [Screen flow and visible states](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#4-end-to-end-demo-flow)

## Completion handoff

- Outcome: SP-004 is complete, user-approved, reviewed, revised, and committed; the Deep Ink + Warm Coral direction is authoritative and SP-005 may begin.
- Files: `docs/SCREENPILOT_DESIGN_SYSTEM.html`, `docs/assets/screenpilot-active-interview-concept.png`, this ticket, the ticket index, and the parent source of truth.
- Deliberate deviation: the user explicitly replaced the earlier violet/cyan visual direction before SP-005. The replacement retains the same single paired-concept scope and does not add a competing direction or product feature.
- Verification: the current responsive anchors, semantic/document checks, local asset/runtime checks, contrast audit, formatting, lint, typechecks, 37 unit tests, and production builds pass.
- Blockers and unchecked items: none for SP-004.
- Git state: the previous visual direction is represented by `6f94d0a`; the approved Deep Ink + Warm Coral replacement is represented by this ticket's current revision commit.
