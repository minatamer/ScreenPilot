# SP-024 — Harden accessibility, responsiveness, and frontend performance

Status: Required  
Milestone: Milestone 4 — public-demo hardening  
Last synchronized: 2026-08-26  
Depends on: SP-005, SP-011, SP-011A, SP-012, SP-013, SP-016, SP-021  
Suggested commit: `SP-024: harden demo quality`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Bring the complete product path to equal release quality across accessibility, continuous responsive layouts, browser/device edge cases, and frontend runtime performance.

## Standalone implementation context

- Responsive quality is continuous from 320 px through 2560 px and beyond; breakpoints follow content pressure rather than separate device products.
- Reference anchors: 320; 360×800; 390×844; 768/820 tablet; 1024×768; 1280×800; 1440×900; 1920×1080; 2560×1440, plus drag-resized intermediate widths.
- Both landing entry cards remain equally prominent. Both modes converge on shared components without duplicated desktop/mobile trees.
- SP-011A's landing preview and centralized `/demo` workspace are release surfaces: preserve the one-shot handwritten-headline motion, slow six-example/two-board preview loop, reduced-motion opacity-only word entrances, compact context band, contextual Privacy access, inert progress status, logo-to-landing and **Clear & exit** behavior, dark hierarchy, natural short-height/zoom scrolling, and deliberate large-screen composition.
- Mobile interview keeps voice signal, captions, sticky safe-area-aware controls, insight categories/states/source chips, swipeable rail, and expandable evidence.
- Large monitors use bounded reading widths, deliberate whitespace, and expanded composition—not stretched paragraphs and controls.
- Required behavior includes keyboard/focus, ARIA/status/captions, reduced motion, 200% zoom, long content, orientation, safe areas, dynamic viewport, virtual keyboard, and minimum 44×44 targets.
- Browser PDF extraction, motion, captions, insight updates, fonts, and bundles must remain responsive on a representative mid-range mobile profile.

## Scope boundaries

- Do not hide core content/actions on mobile, create a separate mobile app/theme/tree, or treat tablet/large monitor as afterthoughts.
- Do not chase pixel parity by breaking accessibility or semantic structure.
- Do not introduce heavy 3D/WebGL/shader effects, force-directed graphs, or unnecessary performance dependencies.
- Do not add commercial device-lab scope or optional full Playwright automation here.
- Do not change product behavior merely to make a layout easier without updating scope.

## Implementation checklist

- [ ] Complete semantic structure, keyboard order, focus management/restoration, visible focus, ARIA names/live regions, caption access, contrast, and 44×44 targets.
- [ ] Run automated accessibility checks and a full manual keyboard review.
- [ ] Tune all reference anchors and drag-resize intermediate widths for continuous reflow without overflow, clipping, dead zones, or duplicated implementations.
- [ ] Verify equal landing-card priority and shared branch convergence.
- [ ] Verify portrait/landscape, safe-area insets, dynamic viewport height, browser chrome, virtual keyboard, sticky interview controls, and Turnstile fallback layout.
- [ ] Check long names, CV excerpts, captions, card values, summaries, errors, and translated-like expansion.
- [ ] Verify mobile insight rail/expanded evidence and desktop/large-monitor constellation behavior.
- [ ] Profile PDF extraction, animation, live caption/insight updates, render churn, and input responsiveness on mid-range mobile/throttled network.
- [ ] Optimize fonts, bundle splitting, PDF worker/assets, image/icon loading, shared components, and motion.
- [ ] Test reduced motion, slow network, provider errors, session expiry, and 200% zoom.
- [ ] Fix every release-blocking accessibility/responsive/performance defect without weakening shared design consistency.

## Acceptance criteria

- [ ] Every major stage, action, state, error, and evidence relationship is present at every viewport class.
- [ ] No horizontal page scroll, clipped sticky action, inaccessible focus, or device-specific duplicate implementation remains.
- [ ] Both complete flows remain operable in portrait/landscape and with virtual keyboard/safe areas.
- [ ] Large monitors look intentionally composed and phones remain information-complete.
- [ ] Representative mobile CPU/network performance keeps extraction, captions, controls, and insights responsive.
- [ ] Accessibility-driven token corrections are synchronized with the HTML design reference.

## Focused verification

- [ ] Run the focused frontend tests, accessibility tooling, and manual keyboard/screen-reader review.
- [ ] Capture/compare every reference anchor plus intermediate drag-resized widths for all major stages and errors.
- [ ] Test iPhone Safari, Android Chrome, desktop Chromium, and Firefox targets available to the project.
- [ ] Profile representative mobile extraction/live-update paths and inspect bundle/font/PDF-worker output.
- [ ] Exercise reduced motion, 200% zoom, long content, slow network, orientation, safe area, and virtual keyboard.

## Commit boundary

Keep SP-024 reviewable as one logical change represented by `fix(frontend): harden demo quality`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Responsive behavior and accessibility](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#responsive-behavior)
- [Complete screen design](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#screen-design)
- [Frontend performance and responsive ticket scope](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#sp-024--harden-accessibility-responsiveness-and-frontend-performance)
- [Required manual acceptance sheet](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#required-manual-acceptance-sheet)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
