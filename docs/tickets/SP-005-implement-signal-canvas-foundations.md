# SP-005 — Implement the approved Signal Canvas foundations

Status: Required  
Milestone: Milestone 0 — repository and visual foundations  
Last synchronized: 2026-08-31  
Depends on: SP-002, SP-004  
Suggested commit: `feat(frontend): establish Signal Canvas design system`  
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Translate the approved visual reference into maintainable frontend tokens, shared primitives, and responsive light/dark shells without implementing later feature flows.

## Standalone implementation context

- The approved HTML living style guide is the visual foundation. Its token names and values must remain synchronized with frontend CSS.
- The approved concept informs composition and atmosphere only; written behavior, accessibility, and tokens win if it conflicts.
- Use shared React primitives and composition. There must not be separate desktop/mobile component trees or scattered page-specific color/spacing values.
- Tokens/global styles belong under `apps/frontend/src/styles`; reusable design primitives belong under `apps/frontend/src/shared/ui`. Feature-specific composed UI stays with its feature rather than growing a universal component catalogue.
- The light shell serves landing, preparation, and review. The dark shell serves preflight and the active interview.
- Responsiveness is continuous from 320 px through large monitors, with content-pressure breakpoints, bounded reading widths, safe-area support, and reduced motion.

## Scope boundaries

- Do not implement the actual entry flows, PDF extraction, voice connection, insight logic, review logic, or provider calls.
- Do not add Figma, Storybook, CSS-in-JS duplication, a second token source, or an unrelated component framework.
- Do not copy raster concept measurements blindly.
- Do not hide features on mobile or build mobile-only alternatives.
- Do not put workflow state, API calls, or feature-specific domain rules into `shared/ui`.

## Implementation checklist

- [ ] Translate approved colors, typography, spacing, radius, elevation, grid, opacity, and motion into maintainable frontend tokens under `apps/frontend/src/styles`.
- [ ] Keep token names and values aligned with `docs/SCREENPILOT_DESIGN_SYSTEM.html`; update both when an approved accessibility correction changes a value.
- [ ] Build the shared ScreenPilot mark, navbar, entry-mode card/badge, buttons, cards, stage indicator, error panel, and layout primitives under the narrow `shared/ui` boundary.
- [ ] Implement reusable light landing/review and dark preflight/interview shells.
- [ ] Provide focus-visible, disabled, loading, error, reduced-motion, high-contrast, safe-area, and long-text behavior.
- [ ] Use semantic HTML and composable variants rather than duplicated markup.
- [ ] Constrain large-screen reading widths and prove fluid intermediate-width behavior.
- [ ] Document any deliberate implementation deviation from the approved reference.

## Acceptance criteria

- [ ] Representative primitives match the approved HTML reference in both light and dark contexts.
- [ ] A single token change propagates without hunting through page-specific magic values.
- [ ] Phone, tablet, laptop, desktop, and large-monitor shell examples preserve the same hierarchy and actions.
- [ ] Keyboard focus, contrast, reduced motion, and 200% zoom remain usable.
- [ ] No feature workflow or duplicate device-specific system has leaked into this foundation ticket.
- [ ] `shared/ui` remains free of session/provider/API imports and feature-specific business rules.

## Focused verification

- [ ] Run the frontend targeted typecheck/unit checks.
- [ ] Render a development primitive/shell harness or temporary route, then inspect at the approved reference widths and one drag-resized intermediate width.
- [ ] Compare against the approved HTML reference and concept.
- [ ] Search for duplicated literal token values and parallel mobile/desktop component implementations.

## Commit boundary

Keep SP-005 reviewable as one logical change represented by `feat(frontend): establish Signal Canvas design system`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Approved design authority and tokens](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#14-design-source-of-truth--signal-canvas)
- [Frontend routes and screen requirements](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#5-frontend-routes-and-screen-requirements)
- [Mandatory React/frontend quality rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#reactfrontend-quality)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
