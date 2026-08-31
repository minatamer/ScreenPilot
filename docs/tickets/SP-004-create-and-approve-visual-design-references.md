# SP-004 — Create and approve the visual design references

Status: Required  
Milestone: Milestone 0 — repository and visual foundations  
Last synchronized: 2026-08-31  
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
- One ImageGen concept is allowed only after the HTML reference is approved. It contains the same active-interview moment on desktop and mobile and cannot invent product features.
- The HTML reference is a professional lightweight living style guide, not a second application, Figma replacement, Storybook, or screen catalogue.

## Scope boundaries

- Do not build actual React pages, routing, CV logic, provider integration, or application state.
- Do not create a Figma file, Code Connect mapping, design-system application, or multiple visual directions.
- Do not generate landing, CV, plan, preflight, review, or error-screen image sets.
- Do not treat the raster concept as a pixel-exact spec or let it override written behavior, tokens, responsiveness, or accessibility.
- Do not style, imitate, hide, or alter Cloudflare Turnstile internals; style only a stable surrounding fallback container.

## Implementation checklist

- [ ] Create self-contained `docs/SCREENPILOT_DESIGN_SYSTEM.html`.
- [ ] Show named colors with exact values, foreground pairings, light/dark surfaces, and semantic usage.
- [ ] Show approved Geist typography levels with realistic ScreenPilot copy.
- [ ] Document spacing, gutters, widths, responsive anchors, radii, borders, elevation, opacity, limited gradients/glass, motion, and reduced motion.
- [ ] Document a Lucide-aligned icon policy with size, stroke, meaning, and accessible labels.
- [ ] Render compact primitives/cards plus default, hover, focus-visible, disabled, loading, confirmed, clarification, corrected, and error states.
- [ ] Include equal-priority CV-assisted and conversation-first entry cards and the Turnstile fallback container.
- [ ] Include one small paired desktop/mobile composition sample.
- [ ] Render and inspect the HTML at phone, tablet, laptop, large-monitor, and intermediate drag-resized widths.
- [ ] Obtain user approval of the HTML reference.
- [ ] Using the exact approved Section 15 prompt and the ImageGen skill, generate one paired active-interview concept and save the approved result as `docs/assets/screenpilot-active-interview-concept.png`.
- [ ] Reject invented features, reconcile accepted composition refinements into the HTML/reference rules, and obtain final user approval.

## Acceptance criteria

- [ ] The style guide communicates a coherent implementable system without behaving like the application.
- [ ] All exact tokens, type sizes, states, icon rules, and responsive principles are visible and internally consistent.
- [ ] Both entry modes have equal visual weight.
- [ ] Desktop and mobile feel like one system, not separate themes.
- [ ] The generated concept contains only the approved active-interview elements and has been reconciled back into written rules.
- [ ] User approval is recorded before SP-005 begins.

## Focused verification

- [ ] Open the HTML directly in a browser and check console/network behavior.
- [ ] Capture representative renders at 320, 390, 820, 1024, 1440, and 2560 px plus an intermediate width.
- [ ] Check contrast, overflow, focus visibility, font fallbacks, reduced motion, and Turnstile-container stability.
- [ ] Review the ImageGen concept against every Section 15 rejection criterion.

## Commit boundary

Keep SP-004 reviewable as one logical change represented by `docs(design): approve ScreenPilot visual direction`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Complete Signal Canvas design specification](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#14-design-source-of-truth--signal-canvas)
- [Exact ImageGen scope and prompt](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#15-one-imagegen-concept-for-the-primary-experience)
- [Screen flow and visible states](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#4-end-to-end-demo-flow)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
