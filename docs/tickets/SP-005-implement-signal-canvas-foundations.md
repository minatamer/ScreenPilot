# SP-005 — Implement the approved Signal Canvas foundations

Status: Required  
Implementation state: Completed, revised against the approved Deep Ink + Warm Coral SP-004 revision in `d2a350c`, and committed in `24d256c`

Milestone: Milestone 0 — repository and visual foundations  
Last synchronized: 2026-09-08
Depends on: SP-002, SP-004  
Suggested commit: `SP-005: establish the Signal Canvas design system`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Translate the approved visual reference into maintainable frontend tokens, shared primitives, and responsive light/dark shells without implementing later feature flows.

## Standalone implementation context

- The approved HTML living style guide in `docs/SCREENPILOT_DESIGN_SYSTEM.html`, committed by SP-004 revision `d2a350c`, is the visual foundation. Its token names and values must remain synchronized with frontend CSS; the historical violet/cyan direction in `6f94d0a` is superseded and must not be implemented.
- The current palette is Deep Ink + Warm Coral: `ink-950 #18243A`, `ink-900 #22314B`, `paper-50 #FAFAF8`, `paper-0 #FFFFFF`, `coral-300 #FCA39A`, `coral-500 #F26B5B`, `coral-700 #CC493F`, `coral-800 #B93831`, `coral-100 #FDE8E4`, `line-200 #E4E7EC`, `line-strong #7D899B`, and `slate-500 #667085`, plus the documented green, amber, and red semantic-state pairs.
- Reuse the approved code-native ScreenPilot mark from the HTML reference: a Deep Ink rounded square with a Warm Coral forward/paper-plane shape and Pale Coral inner facet. Do not trace or substitute the generated raster logo.
- The approved concept informs composition and atmosphere only; written behavior, accessibility, and tokens win if it conflicts.
- Use shared React primitives and composition. There must not be separate desktop/mobile component trees or scattered page-specific color/spacing values.
- Tokens/global styles belong under `apps/frontend/src/styles`; reusable design primitives belong under `apps/frontend/src/shared/ui`. Feature-specific composed UI stays with its feature rather than growing a universal component catalogue.
- The original foundation exposed light and dark shell variants. SP-011A supersedes their route assignment: landing and every `/demo` state now use the continuous Deep Ink/plum/coral atmosphere, with layered dark task surfaces and near-white type instead of white page, card, form, or review backgrounds.
- SP-011A reuses this token system for its stacked landing story and centralized `/demo` workspace with a compact context band. This is an approved composition correction, not a second token system or device-specific theme.
- Responsiveness is continuous from 320 px through large monitors, with content-pressure breakpoints, bounded reading widths, safe-area support, and reduced motion.

## Scope boundaries

- Do not implement the actual entry flows, PDF extraction, voice connection, insight logic, review logic, or provider calls.
- Do not add Figma, Storybook, CSS-in-JS duplication, a second token source, or an unrelated component framework.
- Do not copy raster concept measurements blindly.
- Do not hide features on mobile or build mobile-only alternatives.
- Do not put workflow state, API calls, or feature-specific domain rules into `shared/ui`.

## Implementation checklist

- [x] Translate approved colors, typography, spacing, radius, elevation, grid, opacity, and motion into maintainable frontend tokens under `apps/frontend/src/styles`.
- [x] Keep token names and values aligned with `docs/SCREENPILOT_DESIGN_SYSTEM.html`; update both when an approved accessibility correction changes a value.
- [x] Build the shared ScreenPilot mark, navbar, entry-mode card/badge, buttons, cards, stage indicator, error panel, and layout primitives under the narrow `shared/ui` boundary.
- [x] Implement reusable shell primitives; SP-011A later standardizes landing and every `/demo` stage on the continuous dark product atmosphere.
- [x] Provide focus-visible, disabled, loading, error, reduced-motion, high-contrast, safe-area, and long-text behavior.
- [x] Use semantic HTML and composable variants rather than duplicated markup.
- [x] Constrain large-screen reading widths and prove fluid intermediate-width behavior.
- [x] Document any deliberate implementation deviation from the approved reference.

## Acceptance criteria

- [x] Representative primitives match the approved HTML reference in both light and dark contexts.
- [x] A single token change propagates without hunting through page-specific magic values.
- [x] Phone, tablet, laptop, desktop, and large-monitor shell examples preserve the same hierarchy and actions.
- [x] Keyboard focus, contrast, reduced motion, and 200% zoom remain usable.
- [x] No feature workflow or duplicate device-specific system has leaked into this foundation ticket.
- [x] `shared/ui` remains free of session/provider/API imports and feature-specific business rules.

## Focused verification

- [x] Run the frontend targeted typecheck/unit checks.
- [x] Render a development primitive/shell harness or temporary route, then inspect at the approved reference widths and one drag-resized intermediate width.
- [x] Compare against the approved HTML reference and concept.
- [x] Search for duplicated literal token values and parallel mobile/desktop component implementations.

## Implemented result

- `apps/frontend/src/styles/tokens.css` is the single frontend token source for the approved SP-004 palette, typography, spacing, radii, elevations, bounded layouts, opacity, motion, and semantic light/dark aliases.
- `apps/frontend/src/shared/ui` now owns the code-native ScreenPilot mark, site header, light/dark app shell, buttons and groups, cards, badges, entry-mode presentation, progress, error, container, and stack primitives. These components contain no workflow, provider, HTTP, storage, or candidate rules.
- `/` is intentionally a temporary SP-005 foundation harness. It proves the primitives in representative light and dark compositions but does not implement the final landing content, routing, or entry behavior owned by SP-011.
- The implementation uses one component tree and semantic theme aliases. The same primitives adapt continuously rather than branching into phone/desktop implementations.

## Deliberate implementation notes

- No custom `postcss.config.mjs` was added. The ticket uses plain CSS supported directly by Next.js, and an empty custom PostCSS configuration would add no behavior while replacing framework defaults. A real config should be introduced only with a real plugin requirement.
- The mobile header keeps its navigation visible on a second row instead of hiding it without an equivalent menu. The stage indicator becomes vertical at constrained widths so all stages remain visible without a precision horizontal scroll. These are accessibility-preserving compositions of the same content, not separate mobile implementations.
- Buttons retain the 44 px minimum target but may grow taller for localized or zoomed labels. Long text may wrap rather than clip.
- The concept image remains mood/composition guidance only. No dashboard, scoring, candidate-profile, analytics, phone-control, or recruiter-workflow feature was copied into the application.

## Verification evidence

- Passed frontend TypeScript generation/typecheck, ESLint with zero warnings, 6 Vitest tests across 2 files, Prettier check, and the required Next.js production build using the repository-pinned Node 24/pnpm 11.24 toolchain.
- Inspected the local harness at 320, 720, 768, 1133, 1440, and 2560 CSS-pixel widths. The 720 px pass exercises the same reflow pressure as a 1440 px viewport at 200% zoom; no inspected width had document-level horizontal overflow.
- Verified keyboard-only focus produces a visible 3 px outline and keeps a 44 px target, all application controls remain at least 44 px tall, mobile navigation remains exposed, and reduced-motion mode collapses animation to 1 ms/one iteration without exposing the skip link.
- Measured representative contrast pairs: primary action 4.57:1, light secondary copy 4.76:1, dark secondary copy 10.53:1, dark destructive control 8.02:1, light destructive control 6.57:1, and the Coral/Ink progress marker 5.20:1.
- Compared the token values and exact inline logo paths against `docs/SCREENPILOT_DESIGN_SYSTEM.html`; no approved reference value needed to change.
- Searched the frontend for superseded violet/cyan values, scattered hexadecimal colors, provider/API/session imports under `shared/ui`, duplicate device component trees, and stale SP-004 language; none remain.

## Commit boundary

Keep SP-005 reviewable as one logical change represented by `feat(frontend): establish Signal Canvas design system`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Approved design authority and tokens](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#14-design-source-of-truth--signal-canvas)
- [Frontend routes and screen requirements](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#5-frontend-routes-and-screen-requirements)
- [Mandatory React/frontend quality rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#reactfrontend-quality)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
