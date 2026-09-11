# SP-011A — Modernize the entry and early demo experience

Status: Required  
Implementation state: In progress — research and design direction recorded before product-code changes

Milestone: Milestone 1 — interview preparation paths  
Last synchronized: 2026-09-11  
Depends on: SP-005, SP-006, SP-010A, SP-011  
Suggested commit: `feat(frontend): modernize the ScreenPilot entry experience`  
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Replace the generic card-led landing and early `/demo` shell with a distinctive, current, product-first ScreenPilot experience. The redesign must explain the conversation-to-evidence workflow at a glance, preserve equal entry paths and privacy boundaries, and remain lightweight, accessible, responsive, role-neutral, and deterministic.

## Why this corrective ticket exists

SP-011 completed the functional conversation-first path, but its first visual composition still reads like a conventional light SaaS template: a text hero, a separate reassurance card, two ordinary feature cards, and utility-heavy navigation. It explains the product but does not let a visitor *see* the product early enough. The `/demo` route also exposes correct controls without yet feeling like the same authored product environment.

The user explicitly reopened this boundary to correct the product's visual purpose and direction before SP-012 extends it. This packet therefore supersedes only the affected SP-004/SP-005/SP-011 landing and early-demo composition decisions; the Deep Ink + Warm Coral palette, approved logo, privacy model, role-neutral domain, equal entry modes, and later active-interview concept remain authoritative.

## Research method and evidence limits

Research was completed on 2026-09-11 across current official standards and design systems, maintained library documentation and repositories, product-demo research, gallery/trend collections, live voice/AI interview product sites, journalism and candidate research, Reddit, and X search results.

- Standards, accessibility guidance, local framework documentation, and repository evidence can create requirements.
- Competitor sites can reveal useful presentation patterns but cannot validate their own product, performance, privacy, fairness, or conversion claims.
- Vendor reports can suggest patterns but are treated as directional because the vendor benefits from the conclusion.
- Galleries and trend roundups are visual-signal sources only. Popularity is not usability evidence.
- Reddit and X are anecdotal. They are used to find concerns and anti-patterns, never as proof.

## Research synthesis

### Durable principles adopted

1. **Show the real product idea before listing features.** Vapi, Retell, ElevenLabs, Greenhouse Voice AI, and Gahiz all place a voice/product interaction or a product-like preview near the opening story. Navattic's vendor dataset also reports that top demos are usually ungated, short, and value-focused. ScreenPilot will use a truthful illustrative interface—not a video, fake live state, or provider call—to show how speech becomes evidence.
2. **Trust must be visible before the sensitive action.** Gartner's 2025 candidate survey, Greenhouse's 2026 candidate research, CareerPlug's 2025 report, contemporary journalism, and highly visible community complaints all point to low trust when AI use or evaluation boundaries are unclear. ScreenPilot will state that Pilot is AI-assisted, that the session is disposable, and that a human makes the decision before either start action.
3. **Keep the first decision simple.** NN/g's long-lived progressive-disclosure guidance supports moving secondary material out of primary navigation while keeping the two actual entry choices obvious. Privacy remains readily available in the page trust section and persistent demo context rail; project source moves to the footer.
4. **Motion must carry meaning and then get out of the way.** Apple HIG and W3C guidance favor brief, purposeful, optional motion. The preview will run once in less than five seconds, use motion only to connect listening, transcript, and structured evidence, expose the same information without motion, and stop spatial animation under `prefers-reduced-motion`.
5. **Animate only compositor-friendly properties.** web.dev recommends `transform` and `opacity` and warns against layout/paint-heavy animation. The preview therefore uses fixed layout, opacity, and small transforms; no animated dimensions, canvas, WebGL, parallax, blur choreography, or continuous scroll effect.
6. **Use expression to clarify hierarchy, not to imitate a template.** Google's Material 3 Expressive research supports purposeful scale, space, shape, and rhythm. ScreenPilot applies this quietly through an editorial headline, asymmetric product preview, strong surface contrast, and a small number of shaped signal elements—not a wholesale Material skin.
7. **Every deep route needs orientation.** `/demo` must independently answer where the visitor is, what is private, and what action is available. The persistent progress header plus compact session context rail provides that orientation without repeating a marketing navbar.

### Current visual signals used cautiously

- Dark product heroes, product-UI previews, editorial typography, restrained bento-like grouping, tactile borders, and atmospheric gradients recur across Webflow's 2025 roundup, Framer's 2026 inspiration feed, Godly, SaaS landing galleries, and current voice-agent sites.
- These are treated as short-lived style signals. The chosen design keeps only the pieces that reinforce ScreenPilot's existing Signal Canvas narrative: Deep Ink as the live-signal field, Warm Coral as the active path, Warm White as the explanatory canvas, and structured evidence cards emerging from conversation.
- Large glow fields, liquid-glass everywhere, neon grids, scroll hijacking, kinetic type, 3D scenes, cursor effects, and animated bento resizing were rejected because they add distraction, motion risk, paint cost, or generic AI-site sameness.

### Product and competitor review

| Source | Useful pattern | Rejected boundary |
| --- | --- | --- |
| [Vapi](https://vapi.ai/) | Immediate voice identity, dark hero, waveform as product language, direct trial path | Developer-console framing, neon treatment, telephone-first metaphor |
| [ElevenLabs Agents](https://elevenlabs.io/agents) | Product examples and agent states appear early; restrained platform storytelling | Enterprise logo wall, broad omnichannel scope, human-like marketing claim |
| [Retell AI](https://www.retellai.com/) | Live-demo CTA and explicit conversation use cases | Requesting a phone number/call and category selector |
| [PolyAI](https://poly.ai/) | Large conversational headline and focused primary action | Enterprise performance claims and autonomous-agent framing |
| [Synthflow](https://synthflow.ai/) | Clear staged build/evaluate/launch/learn explanation | Dense metrics, telephony operating-system story, analytics dashboard |
| [Greenhouse Voice AI](https://www.greenhouse.com/voice-ai-interviewing) | “See it in action,” product interaction, structured conversation positioned as a first step | Candidate scoring, pipeline funnel, real-employer outcome claims |
| [Paradox candidate experience](https://www.paradox.ai/solutions/candidates) | Lightweight, conversational, no-login candidate framing | Job search, matching, scheduling, and employer workflow scope |
| [Gahiz](https://www.gahizai.com/) | Sample interview, captions, and evidence together in the opening story | Real candidate persona, scores, ranking, shortlist, proctoring |
| [HeyMilo](https://www.heymilo.ai/) | Strong product UI and multiple interview modalities | Auto-scoring, cheat detection, ATS and pipeline framing |
| [Sapia](https://sapia.ai/) | Candidate-facing explanation and conversational presentation | Competency measurement, scoring, ranking, and “best candidate” claims |
| [ConverzAI](https://www.converzai.com/) | Real-conversation narrative and video/product proof | Autopilot replacement language, ATS data, metrics, testimonials |

The reusable visual lesson is narrow: show a believable product moment, clearly label its status, and make the next action obvious. ScreenPilot does **not** copy competitor claims, people, data, employer context, dashboards, scoring, ranking, proctoring, or phone-call controls.

### Candidate trust and community signals

- [Gartner's 2025 candidate survey](https://www.gartner.com/en/newsroom/press-releases/2025-07-31-gartner-survey-shows-just-26-percent-of-job-applicants-trust-ai-will-fairly-evaluate-them) reports low trust in AI evaluation and recommends clear expectations. This reinforces ScreenPilot's no-automated-decision boundary.
- [Greenhouse's 2026 Candidate AI Interview report](https://www.greenhouse.com/newsroom/63-of-job-seekers-have-faced-an-ai-interview-most-havent-had-a-good-one-yet), [CareerPlug's 2025 Candidate Experience Report](https://www.careerplug.com/wp-content/uploads/2025/02/2025-Candidate-Experience-Report.pdf), and [TIME's 2025 reporting](https://time.com/7306955/ai-job-interview-recruitment/) all reinforce upfront disclosure and human context. Survey/vendor methodology limitations are retained.
- Reddit threads about [undisclosed automated interview scoring](https://www.reddit.com/r/recruitinghell/comments/1o6cglm/tldr_an_undisclosed_ai_keyword_scored_my/) and [recruiter skepticism about AI-led hiring](https://www.reddit.com/r/recruiting/comments/1ph6qhq/ai_recruiting_is_going_nowhere/) are anecdotes, but they are useful stress tests for wording that could feel deceptive or dehumanizing.
- Reddit discussions about [generic AI/SaaS homepages](https://www.reddit.com/r/SaaS/comments/1np0h8c), [Framer-site sameness](https://www.reddit.com/r/webdesign/comments/1vjv8is/i_think_were_all_secretly_tired_of_the_same/), and [animation fatigue](https://www.reddit.com/r/framer/comments/1vbzuyb/whats_one_web_design_trend_everyone_loves_but_you/) support rejecting template-like card stacks and motion volume, but do not establish conversion facts.
- X searches returned current voice-AI launch/demo posts such as [Vapi's event demo post](https://x.com/Vapi_AI/status/1973923591184941435) and [Fin's voice product post](https://x.com/fin_ai/status/2062611809568256060), but little verifiable design guidance. No design decision depends on X engagement or claims.

### UX, accessibility, and performance authorities

- [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) — keep frequent choices primary and defer secondary material with clear labels.
- [NN/g trust and credibility](https://www.nngroup.com/reports/ecommerce-ux-trust-and-credibility/) — professional visual quality, respectful information handling, performance, and clear policies influence trust.
- [GOV.UK focus states](https://design-system.service.gov.uk/get-started/focus-states/) — focus must remain unmistakable across light and dark backgrounds.
- [W3C Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) — automatic parallel motion beyond five seconds requires user control.
- [W3C Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) — nonessential interaction motion must be disableable.
- [MDN `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion) — use the established system preference to remove or replace nonessential spatial motion.
- [Apple HIG motion](https://developer.apple.com/design/human-interface-guidelines/motion) and [Reduced Motion criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria) — keep custom motion purposeful, brief, optional, and free of problematic large-scale movement.
- [web.dev animation performance](https://web.dev/articles/animations-guide) — prefer opacity/transform and avoid layout- or paint-triggering animation.
- [Google Material 3 Expressive design notes](https://design.google/library/design-notes-material-3-expressive-liam-spradlin) and [Material design eras](https://design.google/library/material-design-eras) — expression can serve usability through purposeful hierarchy, scale, shape, and spacing.

### Product-demo and gallery sources

- [Navattic State of the Interactive Product Demo 2025](https://www.navattic.com/report/state-of-the-interactive-product-demo-2025) and [HowdyGo's demo hierarchy](https://www.howdygo.com/blog/the-interactive-demo-hierarchy) support short, ungated, value-first product demonstrations. Both are vendors, so their conversion claims are not treated as independent evidence.
- [Webflow's 2025 web-design trends](https://webflow.com/blog/web-design-trends-2025), [Framer inspiration](https://www.framer.com/blog/inspiration), [Godly](https://godly.design/sites/), and [SaaS Landing Page](https://saaslandingpage.com/) were reviewed for current composition signals. They influence mood and pattern vocabulary only.

## Dependency and library decision

The repository currently uses React 19.2, Next.js 16, plain CSS, semantic native controls, and no animation or component framework. The required hero sequence is fixed, short, and non-interactive, so an added runtime dependency would have no proportional benefit.

| Option | Maintenance / compatibility | License / footprint | Accessibility / SSR | Decision |
| --- | --- | --- | --- | --- |
| Native semantic HTML + CSS | Browser platform; works with current React/Next without a client animation runtime | No package or bundle addition | Static server markup, system reduced-motion query, native focus and dialog behavior | **Chosen** |
| [Motion for React](https://motion.dev/docs/react-installation) / [GitHub](https://github.com/motiondivision/motion) | Actively maintained, React 18.2+, documents Next App Router/client import paths | MIT; still adds shipped JS and another client boundary | Strong API, but reduced-motion and lifecycle still require product decisions | Rejected as unnecessary for a four-state fixed preview |
| [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) / [GitHub](https://github.com/radix-ui/primitives) | Active and accessible; current repository issues show React 19 ref-composition fixes continue to matter | MIT; additional packages for a dialog already implemented natively | Excellent focus/keyboard behavior and SSR guidance | Rejected because native `<dialog>` already provides the needed behavior with less code shipped |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | Active source-component ecosystem | MIT, but expects a broader component/Tailwind convention absent here | Accessibility depends on selected underlying primitive and local maintenance | Rejected to avoid replacing the established design-system architecture |
| [GSAP](https://github.com/greensock/GSAP) | Mature and active with React cleanup guidance | Free standard license, not the repository's simple MIT dependency model; substantial capability beyond need | Can respect media queries, but requires JS lifecycle and careful cleanup | Rejected as excessive for brief compositor-only motion |
| [Magic UI](https://github.com/magicuidesign/magicui) and similar registries | Active but many effects depend on Motion/Tailwind and are optimized for visual novelty | Copy-in code plus transitive dependencies varies by component | Quality and reduced-motion behavior require component-by-component audit | Rejected to avoid generic AI-template effects and unowned copied code |
| [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) | Newly baseline in 2025; older-browser behavior still needs fallback | No package | Useful for state/page transitions, not needed for a static illustrative preview | Rejected for this ticket; later route transitions may reconsider it separately |

The existing native privacy dialog remains. Its explicit close control, labeling, Escape behavior, and modal focus model follow [MDN's `<dialog>` guidance](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog).

## Selected direction — Editorial Live Signal

The chosen direction is a mixed-surface extension of Signal Canvas:

- A Deep Ink opening field contains a strong editorial promise and a bounded illustrative product preview.
- The preview shows Pilot listening to a synthetic, role-neutral exchange and organizing candidate-stated details into unscored evidence cards. It is explicitly labeled as illustrative and contains no real candidate, employer, vacancy, or provider state.
- A small one-shot sequence connects listening bars, transcript, and evidence. It completes in less than five seconds, never moves layout, never loops, and becomes an immediate still state under reduced motion.
- Warm White sections overlap and continue the story with the two equal entry choices, a concise three-step explanation, and a visible trust/privacy section.
- Landing navigation contains only the product mark, one “How it works” anchor, and one “Start demo” action. Privacy and project source are removed from the navbar; privacy has a clearly labeled trigger in the trust section and project source moves to the footer.
- `/demo` uses the same warm canvas and Deep Ink/coral signal motifs. The header owns progress and Clear session only. A compact context rail within the main experience owns session-only/privacy/human-decision orientation across early stages.
- Large monitors gain deliberate two-column composition; phones receive the same content in one column. No separate device component tree is created.

### Rejected directions

1. **Polished light SaaS:** safer and closer to SP-011, but still reads as generic card-template marketing and under-communicates voice/product behavior.
2. **Cinematic voice spectacle:** full-bleed animated gradients, audio-reactive canvas, scroll choreography, and kinetic type are visually loud, expensive, and conflict with accessibility and trust.
3. **Recruiter command center:** dashboards, candidates, pipelines, metrics, scores, and rankings misstate ScreenPilot's stateless candidate-facing demo.
4. **Friendly avatar interviewer:** stock people, AI faces, robots, and humanlike avatars add deception and bias risk without explaining the actual evidence workflow.

## Scope boundaries

- Do not change reducer state, API contracts, provider calls, CV parsing, deterministic preparation, or active-interview behavior.
- Do not add a dependency, external media request, image asset, video, canvas, WebGL, analytics, or paid/live call.
- Do not invent a candidate, employer, vacancy, hiring result, score, ranking, sentiment, emotion, qualification, or application status.
- Do not make one entry path visually secondary.
- Do not remove privacy access; relocate it from navigation to contextual surfaces.
- Do not edit `docs/SCREENPILOT_PROJECT_SPEC.md`.

## Implementation checklist

- [ ] Update the parent source of truth, ticket index/dependencies/milestones, design reference, and affected downstream tickets before product code.
- [ ] Build the semantic, synthetic, role-neutral hero product preview with one-shot CSS motion and reduced-motion still state.
- [ ] Redesign the landing hierarchy and surfaces around the preview while keeping both entry cards equal.
- [ ] Remove Privacy and Project source from landing/demo navigation; preserve Privacy in the landing trust section and `/demo` context rail; move Project source to the footer.
- [ ] Redesign the early `/demo` shell with persistent progress, Clear session, and context rail without duplicating stage state.
- [ ] Identify the floating “N” options control as Next.js's development indicator and disable only that indicator through the documented Next.js 16 `devIndicators: false` configuration; keep compile/runtime error reporting.
- [ ] Update focused component tests for navigation, privacy placement, preview semantics, equal entry actions, and demo orientation.
- [ ] Verify no old landing decision-note composition or header privacy/source control remains.

## Acceptance criteria

- [ ] A first-time visitor can identify voice interview, candidate-sourced evidence, session-only privacy, and human decision ownership from the opening viewport.
- [ ] The hero preview is visibly illustrative, contains no real/person-specific data, makes no hiring judgment, and works as a static explanation without animation.
- [ ] All automatic preview motion finishes within five seconds, does not loop, uses only opacity/transform, and is removed under reduced motion.
- [ ] **Use a CV** and **Start without a CV** retain equal visual weight, complete explanatory copy, keyboard order, and primary action treatment.
- [ ] Privacy and Project source are absent from the navbar. Privacy remains keyboard-accessible from the landing trust section and every early `/demo` stage; Project source remains available in the landing footer.
- [ ] `/demo` exposes progress, Clear session, session-only context, and the same visual language across choose, CV entry, preparation, and preflight.
- [ ] The Next.js development indicator no longer appears, while development compile/runtime errors remain available.
- [ ] No page-level horizontal overflow or clipped required action appears at phone, tablet, laptop/desktop, large-monitor, or an intermediate drag-resized width.
- [ ] No dependency, provider call, candidate persistence, or separate mobile implementation is added.

## Focused verification

- [ ] Run focused landing/demo component tests, frontend lint, frontend typecheck, frontend unit tests, and frontend production build.
- [ ] Verify keyboard order, visible focus, native dialog open/Escape/close/focus return, and 44 px targets.
- [ ] Verify normal motion completes and stops; emulate `prefers-reduced-motion: reduce` and confirm immediate stable content with no spatial travel.
- [ ] Inspect `/` and early `/demo` at 320, 390, 768, 1024, 1280, 1440, 1920, and one intermediate drag-resized width; confirm no document/header/preview overflow.
- [ ] Inspect development mode and confirm the floating Next.js “N” control is absent and the browser/server console has no application error.
- [ ] Search the final diff for duplicate components/tokens, stale old composition, secrets, candidate content, debug output, unsafe casts, TODOs, or unintended provider/API changes.

## Downstream coordination

- SP-012 inherits the redesigned early-demo workspace and context rail for CV extraction/analysis/plan stages.
- SP-013 inherits privacy access from the context rail but still owns the full provider/AI/microphone disclosure immediately before consent.
- SP-024 performs complete release-level accessibility, device/browser, long-content, and performance hardening; SP-011A must still meet the local responsive and reduced-motion checks above.

## Commit boundary

Keep SP-011A reviewable as one corrective design-and-implementation change. Do not stage, commit, amend, revert, reset, push, or rewrite history unless the user explicitly gives a later Git instruction. All work from this ticket remains unstaged for combined review.

## Precision references

- [Design source of truth — Signal Canvas](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#14-design-source-of-truth--signal-canvas)
- [Landing and demo screen design](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#screen-design)
- [SP-011 conversation-first path](SP-011-build-conversation-first-frontend-path.md)
- [SP-024 accessibility, responsiveness, and performance](SP-024-harden-accessibility-responsiveness-and-performance.md)

## Completion handoff

Report the final files, functional result, research-driven decisions, deterministic and manual checks, any unchecked user-only/credentialed item, deviations, and final unstaged Git state.
