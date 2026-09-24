# SP-024 frontend audit and correction proposal

Status: Phase B implemented and verified within the available local browser matrix  
Audited revision: `59441b488e423aaf28884413d03ea1e60a74f90f` (`main`)  
Audit date: 2026-09-24  
Owner decision state: all six findings approved on 2026-09-24

## Executive conclusion

ScreenPilot's production-local frontend is broadly sound across the audited
responsive range. Both fake-provider entry paths completed through review with
paid operations disabled. The shared shell, plan, preflight, interview, and
review retained all required content without horizontal page overflow from 320
through 2560 CSS pixels. Keyboard order, visible focus, modal focus restoration,
review-tab navigation, evidence expansion, and the 44 px control contract also
passed the available browser checks.

Phase A identified six individually addressable findings. The owner approved
the complete set, and Phase B implemented each one without adding a dependency
or absorbing SP-025:

| Finding | Severity | Summary | Confidence | Decision |
| --- | --- | --- | --- | --- |
| `SP024-RESP-001` | P1 | The completed-interview **View summary** action collapsed into a one-character-per-line column at 320 px. | High | Implemented and verified |
| `SP024-RESP-002` | P2 | The mobile coverage carousel showed four topics per page at 10/9 px instead of at most three at readable metadata size. | High | Implemented and verified |
| `SP024-MOTION-001` | P2 | Global CSS smooth scrolling remained active under reduced motion outside the deliberately controlled 900 ms CTA journey. | High | Implemented and verified |
| `SP024-MOTION-002` | P2 | The source of truth gave contradictory reduced-motion requirements for the semantic evidence-marker sweep, and implementation preserved the sweep. | High | Implemented: immediate static reduced state |
| `SP024-MOTION-003` | P2 | Hero feature cards faded only; the approved diagonal normal entrance, shallow reduced entrance, and normal hover lift were absent. | High | Implemented and verified |
| `SP024-TEST-001` | P3 | Motion regression coverage was not paired across both preference modes for the landing preview and component exceptions. | High | Implemented and verified |

No application code, CSS, token, test, dependency, design-reference, hook, or
runtime-configuration file changed during Phase A.

## Scope and authority

The audit used the SP-024 ticket and these source-of-truth sections as its
authority:

- Screen design, especially landing, plan, active interview, and review.
- Responsive behavior, including the complete 320–2560 px range.
- Motion and reduced-motion behavior.
- Accessibility and the required manual acceptance sheet.

This report began as the Phase A proposal. On 2026-09-24 the owner explicitly
approved all six named findings. Phase B is therefore frozen to
`SP024-RESP-001`, `SP024-RESP-002`, `SP024-MOTION-001`,
`SP024-MOTION-002`, `SP024-MOTION-003`, and `SP024-TEST-001`. A newly
discovered or materially changed recommendation still returns to the approval
gate and SP-025 remains out of scope.

## Audit environment

| Area | Recorded environment |
| --- | --- |
| Git | `main` at `59441b488e423aaf28884413d03ea1e60a74f90f`; repository was four commits ahead of `origin/main` when audited. |
| OS | Microsoft Windows `10.0.26200`, x64, as reported by the local runtime. |
| Runtime | Bundled Node `v24.19.0`; pnpm `11.24.0`. |
| Frontend | Production Next.js `16.3.3` server on `http://localhost:3000`; `/` and `/demo` returned `200`. |
| Backend | Production-local server on `http://localhost:3001`; `/health/ready` returned `200`. |
| Provider safety | `/v1/demo/bootstrap` reported `providerMode: fake`, `effectiveMode: deterministic_fake`, and `paidOperationsEnabled: false`. No paid or live-provider operation was run. |
| Browser | Codex in-app browser. Its connected browser runtime did not expose a browser-version string. |
| Active motion preference | `matchMedia('(prefers-reduced-motion: reduce)').matches === true`; `no-preference === false`. |
| Pointer/input used | Semantic browser automation, mouse-equivalent activation, and keyboard Tab/Shift/arrow/Enter/Escape paths. No physical touch device was used. |
| Device status | All device sizes were emulated CSS viewports. No physical phone, tablet, cutout, or virtual keyboard was available. |
| Browser matrix | Only the Codex in-app browser was connected. Safari, Firefox, Android Chrome, and iPhone Safari were not available in this run. |
| Console | No warning/error/CSP entries were present after the complete conversation-first browser flow. |
| Tools | `rg`, PowerShell read-only inspection, Browser Use DOM/AX/computed-style/console/page-asset inspection, and Vitest. |
| Optional personal skills | `$impeccable audit`, `$improve-animations deep accessibility`, `$review-animations`, and `$design-taste-frontend` were not installed in this Codex session. No download, substitute package, hook, or auto-fix was attempted. |

### Viewport matrix

The landing and every major shared `/demo` stage were measured at:

- 320 × 800
- 360 × 800
- 390 × 844
- 600 × 900 intermediate
- 768 × 1024
- 820 × 1180
- 900 × 700 intermediate/landscape
- 1024 × 768
- 1280 × 800
- 1440 × 900
- 1920 × 1080
- 2560 × 1440

Additional short/landscape checks covered 844 × 390, 1024 × 600,
1180 × 820, and 1366 × 680. Viewport measurements were taken after a settled
reflow rather than immediately after changing the emulation size.

## Reproducible safety and verification evidence

### Runtime health and mode

```text
GET http://localhost:3000/                    -> 200
GET http://localhost:3000/demo                -> 200
GET http://localhost:3001/health/ready        -> 200
GET http://localhost:3000/v1/demo/bootstrap   -> 200

providerMode             = fake
effectiveMode            = deterministic_fake
paidOperationsEnabled    = false
```

The HTML routes returned `Cache-Control: no-store`, a nonce-based CSP, denied
framing, `no-referrer`, `nosniff`, and a permissions policy that limits
microphone access to the same origin. The bootstrap API also returned
`no-store` and a deny-by-default API CSP.

### Focused automated checks

Tests were run from `apps/frontend` with process-local
`PROVIDER_MODE=fake` and `PAID_DEMO_ENABLED=false` before Vitest loaded.

```text
7 files / 49 tests passed
- shared foundations
- illustrative landing interview
- deliberate anchor scroll
- preflight handoff
- insight board
- live captions
- evidence review

4 files / 41 tests passed
- CV stage, including validation and retry errors
- voice connection, including fake/live gating and provider errors
- summary preparation, including sanitized failure behavior
- canonical demo experience, including both paths and summary states
```

Total focused result: **11 files / 90 tests passed** on Node 24.19.0.

The reproducible runner form was:

```powershell
$env:PROVIDER_MODE='fake'
$env:PAID_DEMO_ENABLED='false'
& '<bundled-node-24>\node.exe' '..\..\node_modules\vitest\vitest.mjs' run <focused-files>
```

No snapshot was updated and no generated file changed.

## Baseline inventory

| Surface/state | Browser or source evidence | Result |
| --- | --- | --- |
| Landing | AX tree, keyboard walk, settled screenshots, geometry at every reference width | Pass except the motion findings below. The two entry cards had equal heights at every anchor and no visible target measured below 44 px. |
| Landing keyboard order | Skip link → home mark → How it works → Start demo → hero CTAs → focusable preview → research links | Pass; order matches the visual/semantic hierarchy. |
| Privacy dialog | Opened from landing; initial focus landed on **Close**; Escape closed it and restored focus to **Privacy details** | Pass. |
| Bootstrap/loading | Shared stage heading and persistent Privacy/Clear actions inspected through source and focused tests | Pass; failure presentation was test-covered, not manually injected. |
| Entry chooser | Browser measurement at all anchors; keyboard order Skip → home → Privacy → Clear → Use CV → Start without CV | Pass. At 320 px the equal cards were both 239 × 304 px with natural page scrolling and zero horizontal overflow. |
| CV intake | Browser measurement at all anchors; sample and picker controls; static validation/error review | Pass. Natural document flow was used on phones and short viewports; bounded fit was used on capable tablet/laptop sizes. |
| PDF extraction/analysis | Bundled synthetic sample through the real browser extraction path | Pass. The plan appeared in about 1,111 ms on the unthrottled local machine. The parser/worker loaded only after the sample action. |
| Plan preview | Browser measurement at all anchors; mobile stacked composition; desktop internal fact/topic lists | Pass. At 1024 × 768 the page itself fit the viewport and the topic list owned its 305 px internal scroll region. |
| Conversation-first preparation | Browser path from the shared chooser to the shared preflight | Pass; no CV UI or plan preview appeared. |
| Preflight | Browser measurement at all anchors; consent/microphone readiness gates | Pass. The native checkbox was 20 px, but its clickable label ranged from 203–463 px wide and 76–176 px high on compact sizes, satisfying the effective target contract. |
| Active interview | CV-assisted and conversation-first deterministic fake sessions; captions, status, controls, insights, and topic progress | Pass. Phase B limits compact coverage pages to three 12 px topic rows without horizontal overflow. |
| Phone landscape | 844 × 390 deterministic fake interview | Pass with natural document scrolling; required controls remained reachable and no horizontal overflow occurred. |
| Completed workspace | Read-only transcript/insights, microphone-disconnected status, frozen timer, View summary | Pass after Phase B. The completed action measured 197 × 44, 237 × 44, and 267 × 44 px at 320, 360, and 390 px respectively, with no horizontal overflow. |
| Summary pending/failure | Component and canonical-flow tests | Pass in tests. The fake runtime settled too quickly to retain a repeatable pending frame; failure was not injected into the production-local browser. |
| Review | Evidence map, Organized notes, responsive anchors, natural page flow | Pass. Review intentionally used content-driven document scrolling at every width and had no horizontal page overflow. |
| Review tabs | ArrowRight/ArrowLeft after keyboard focus | Pass; `aria-selected`, roving `tabindex`, focus, and the visible tabpanel moved together. |
| Evidence detail | Enter expanded the selected node; minimize removed the detail and restored focus to the triggering evidence node | Pass. |
| Clear dialog | Dialog opened from review; focus landed on **Keep review**; Escape restored focus to **Clear & exit** | Pass. Destructive confirmation was deliberately not activated during this audit. |
| Error states | Shared error panel and CV/voice/summary error tests | Pass in component/canonical tests. Browser-injected network, permission-denial, Turnstile, and provider errors remain evidence gaps. |
| Long content | Bounded schemas, pervasive `overflow-wrap: anywhere`, internal scroll regions, real synthetic transcript/summary | No observed overflow in the synthetic paths. Extreme unbroken strings, translated expansion, and 200% zoom were not independently injected. |
| Large monitors | 1920 × 1080 and 2560 × 1440 | Pass. Landing content stopped at its documented wide cap and `/demo` stayed bounded rather than stretching its task workspace. |

### Responsive measurements

- No audited surface produced `scrollWidth > clientWidth`.
- Phone setup stages used natural document scroll. Review did so at every width,
  as required.
- At 1024 × 768, choosing, CV intake, plan, preflight, and active interview
  settled to the viewport height; variable collections scrolled inside their
  owning panels.
- At 900 × 700 and 844 × 390, the short-height fallback returned to natural
  document flow rather than clipping the task.
- Landing entry cards stayed equal at every anchor. At 320 they were both
  231 × 368 px; at 768 they were both 289 × 368 px.
- Review tabs measured exactly 44 px high at every audited size.
- The live/completed interview control region remained reachable in all
  measured sizes; only its 320–390 px completed-state action composition failed
  visually as recorded below.

## Accessibility evidence

### Passed checks

- The first keyboard stop was a 44 px **Skip to main content** link on both
  routes.
- All visible audited links/buttons had a non-empty text or ARIA label.
- The focused runtime control exposed a 3 px solid coral outline
  (`rgb(252, 163, 154)`) with a 3 px offset.
- Headings and main/banner landmarks were exposed in the browser accessibility
  tree.
- Modal dialogs used native dialog behavior, initial focus, Escape handling,
  and focus restoration.
- Review tabs exposed `tablist`/`tab`/`tabpanel` behavior with roving focus.
- Mute had a changing action label (**Mute microphone**/**Unmute microphone**)
  rather than relying on icon/color alone.
- Live status/caption regions exposed text labels for Pilot/candidate and
  current connection state.
- Previous/next carousel controls were at least 44 × 44 px and exposed
  descriptive labels plus position feedback.
- Basic solid-token contrast calculations met WCAG AA for the audited pairs:
  dark text/ink-950 14.86:1, muted text/ink-950 10.53:1,
  coral-300/ink-950 8.02:1, coral-500/ink-950 5.20:1,
  dark text/ink-900 12.49:1, muted text/ink-900 8.85:1, and
  white/coral-700 primary buttons 4.57:1.
- Forced-colors and increased-contrast rules are present without disabling the
  browser's adjustments.

### Accessibility limits

No axe/Lighthouse package is installed, and adding one is outside Phase A.
No NVDA, JAWS, VoiceOver, TalkBack, high-contrast OS session, or 200% browser
zoom run was available. Layered alpha/gradient surfaces therefore received a
token-level contrast check, not a pixel-composited contrast certification.

## Frontend performance evidence

### Network and bundle inventory

Before PDF extraction the CV stage had 13 observed resources:

- 10 scripts
- 2 stylesheets
- 1 same-origin bootstrap request
- 0 remote fonts
- 0 raster images

The observed initial resources totalled approximately 1,151,322 raw bytes and
293,123 gzip bytes in the local production build. The CSS accounted for about
149 KB raw / 24 KB gzip. ScreenPilot uses its offline-safe system font stack and
inline SVGs, so no font or image request was added to this path.

Using the sample CV added the synthetic 3.6 KB PDF, `/v1/cv/analyze`, and the
lazy PDF/parser worker chunks. Those lazy chunks totalled approximately
1,656,499 raw bytes / 505,729 gzip bytes. The largest PDF chunk was about
1.19 MB raw / 364 KB gzip. This weight was absent before the user chose the
sample.

The public ElevenLabs/libsamplerate worklet asset is approximately 2.02 MB raw.
It was not fetched by either deterministic fake interview. The live/provider
path was intentionally not run.

### Runtime behavior

- Browser PDF extraction imports `pdfjs-dist/webpack.mjs` lazily, bounds the
  PDF to 5 MB/8 pages/40,000 extracted characters, propagates aborts, and
  destroys its loading task.
- The representative local sample reached its plan in about 1.1 seconds.
- Voice/provider modules are dynamically selected. Fake completion added only
  the small fake/interview chunks and fetched no audio worklet.
- Landing preview timers pause off-screen, while the page is hidden, and while
  the figure has deliberate focus; listeners/timers are cleaned up.
- Captions preserve stable turn identity, cap the per-word delay, and memoize
  normalized messages. Insight sorting operates on a small bounded collection.
- No console error, warning, CSP violation, or runtime crash was recorded in
  the complete conversation-first path.

No CPU/network-throttling capability or browser performance trace was exposed,
so these are local production-build results rather than a mid-range-mobile
performance certification.

## Reduced-motion diagnostic

The required diagnostic is preserved verbatim:

> Found it: your system/browser is exposing reduced-motion preference, and the global accessibility rule was collapsing every animation to one frame.

That diagnosis applies to the active audit browser: `reduce` was true. The
global rule in `apps/frontend/src/styles/globals.css` sets all general animation
and transition durations to `1ms` and one iteration; the tokens in
`apps/frontend/src/styles/tokens.css` also become `1ms`. Later selectors then
restore a small set of named alternatives/exceptions.

The audit did not mistake every absent motion for the one-frame rule. In
particular, the hero-card exceptions won the cascade at 720 ms under `reduce`,
yet the cards still did not slide because the selected keyframe changes only
opacity. That is an unrelated implementation defect (`SP024-MOTION-003`).

### Motion matrix

| Surface | `no-preference` authority/source result | `reduce` actual/source result | Winning cascade | Audit result |
| --- | --- | --- | --- | --- |
| Global tokens/transitions | 180/240/400 ms tokens; ordinary component transitions | Tokens and general durations become 1 ms / one iteration | Token media rule plus global universal media rule | Expected global safeguard. |
| Handwritten headline | Individual stroke timing totals about 1.1 s; underline 560 ms | Runtime: word and underline use 520 ms opacity-only finishes; paths are already drawn | Later landing reduced-motion selectors override the global 1 ms rule | Pass. |
| Hero feature cards | 1,100 ms one-shot diagonal entrance with readable stagger; normal hover adds a 6 px lift | Runtime: 720 ms one-shot 24 px horizontal entrance with 80/680/1280/1880 ms stagger; hover translation is zero | Later `!important` landing exception wins | Pass after `SP024-MOTION-003`. |
| Preview spoken words | 260 ms fade-and-rise per mounted word | 180 ms opacity-only entrance, no transform | Later reduced selector wins | Pass by source; normal JS timing passed focused test. |
| Semantic marker | One-second left-to-right paint sweep | Immediate fully painted two-layer highlight with `animation: none` | Late landing selector intentionally supplies the completed state | Pass after the owner's accessibility-conservative `SP024-MOTION-002` decision. |
| Landing preview voice | 420 ms alternating opacity + scale travel while speaking | 820 ms opacity-only repetition; scale removed | Late landing reduced selector wins | Matches the landing-specific screen-design paragraph. |
| Story mini-bars/notes | Normal authored motion | Animation disabled | Later reduced selector | Pass. |
| Active captions/signal | Pilot word delays, tentative caret, candidate bubble, active signal | Word delay becomes 0; candidate bubble, tentative caret, and active signal animation become `none` | Earlier component-specific reduced selectors after global collapse | Pass. |
| Functional busy indicators | Normal 800 ms rotation/pulse | Button/CV spinners retain 1,600 ms infinite rotation; summary-organizing indicator retains 1,200 ms opacity-only pulse | Narrow component exceptions | Existing functional exceptions; no new exemption proposed. |
| Review entry/detail | Normal bounded entry/detail motion | 180/160 ms opacity-only | Narrow component exceptions | Pass. |
| Deliberate landing CTA scroll | Explicit 900 ms requestAnimationFrame path using instant scroll steps | Same 900 ms path | JavaScript handler intentionally does not branch on preference | Approved product exception; both branches passed unit coverage. |
| Browser/default smooth scroll | `html { scroll-behavior: smooth; }` | Runtime computed style is `auto` | Reduced media rule overrides the base; the explicit CTA hook is unchanged | Pass after `SP024-MOTION-001`. |

### Existing exemptions and alternatives

These existing narrow exceptions were inventoried; the audit does not broaden
them:

| Selector/component | Purpose | Trigger/duration/repetition | Movement | Non-motion or reduced alternative |
| --- | --- | --- | --- | --- |
| `.sp-button__spinner`, `.sp-cv-analysis__spinner` | Communicate blocking work | 1,600 ms, infinite while busy | Rotation | Adjacent loading label remains the semantic fallback. |
| `.sp-summary-center-card__organizing > span:first-child` | Communicate summary preparation | 1,200 ms, infinite alternate | Opacity only after transform removal | Visible organizing text remains available. |
| `.sp-review-stage`, `.sp-evidence-detail` | Preserve state-change comprehension | 180/160 ms, one-shot | Opacity only | Immediate mounted state remains understandable. |
| Landing headline reduced selectors | Preserve brand word completion | 520 ms, one-shot | Opacity only | Fully drawn static word/underline. |
| Landing hero reduced selector | Preserve ordered feature reveal | 720 ms each, one-shot stagger | 24 px shallow horizontal travel; no scaling | Static settled list remains the fallback and hover has no reduced-mode travel. |
| Landing preview voice | Show current speaker | 820 ms, infinite only while the preview is running | Opacity only | Speaker label and static bars remain. |
| Semantic marker reduced selector | Link evidence phrase to created note | Immediate state change | No movement; both paint layers resolve to 100% width | Owner selected this conservative alternative under `SP024-MOTION-002`. |
| Direct CTA scroll hook | Fulfil an explicitly requested navigation control | 900 ms, one-shot and cancellable | Page scroll | Fragment target remains the progressive fallback; the owner has already approved this direct-click exception. |

## Findings and proposed corrections

### SP024-RESP-001 — Completed View summary action collapses on small phones

- **Severity:** P1
- **Confidence:** High
- **Affected users:** 320–390 px phone users and users whose zoom/text size
  creates an equivalent narrow content track.
- **Guidance:** WCAG 1.4.10 Reflow, WCAG 1.4.12 Text Spacing, source-of-truth
  responsive completeness and readable-action requirements.
- **Exact locations:**
  `apps/frontend/src/styles/globals.css` base
  `.sp-interview-controls[data-state="complete"]`, the compact
  `.sp-interview-controls` rules, and the shared `.sp-button > span`
  overflow behavior; component markup is in
  `apps/frontend/src/features/interview/interview-controls.tsx`.

Evidence:

| Viewport | View summary size | Observed rendering |
| --- | --- | --- |
| 320 × 800 | 53 × 198 px | One character per line; primary completion action is not readable as a phrase. |
| 360 × 800 | 93 × 88 px | Multi-line compressed action. |
| 390 × 844 | 123 × 66 px | Two-line action. |
| 600 × 900 and wider | 138 × 44 px | Normal single-line action. |

The mobile media rule changes `.sp-interview-controls` to one column, but the
more-specific base selector
`.sp-interview-controls[data-state="complete"]` retains its two-column
`minmax(8rem, 1fr) auto` definition. The action receives the narrow remainder,
and `.sp-button > span { overflow-wrap: anywhere; }` permits the destructive
character-by-character wrap.

**Proposed correction:** In the compact media query, explicitly override the
completed-state grid to one column and give the action group/button a full-width
track. Retain `overflow-wrap: anywhere` for genuinely untrusted long values, but
prevent ordinary control labels from breaking inside a word. Do not change the
summary workflow or copy.

**Likely Phase B files:**

- `apps/frontend/src/styles/globals.css`
- the smallest relevant interview-controls/component test or responsive
  contract test

**Risks/dependencies:** The same controls render active, ending, summary-pending,
and summary-ready states. The override must not make mute/end actions overflow,
must retain safe-area padding, and must not hide the loading spinner.

**Acceptance:** At 320, 360, and 390 px, both pending and ready states keep the
entire **View summary** phrase readable, the button at least 44 × 44 px, the
timer and disconnected status visible, no horizontal page scroll, and no action
covered by browser/safe-area padding.

**Smallest verification:** Focused component test for pending/ready accessible
names plus production-browser screenshots and geometry at 320 × 800,
360 × 800, 390 × 844, and 844 × 390 in both motion modes.

### SP024-RESP-002 — Mobile coverage carousel is denser and smaller than authority

- **Severity:** P2
- **Confidence:** High
- **Affected users:** Phone users, especially users with low vision, larger
  system text, or cognitive load from dense status grids.
- **Guidance:** WCAG 1.4.4 Resize Text, WCAG 1.4.10 Reflow, source-of-truth
  mobile carousel limit and 12 px metadata contract.
- **Exact locations:**
  `apps/frontend/src/features/insights/insight-board.tsx`
  (`MOBILE_TOPICS_PER_SLIDE = 4`) and the compact topic typography/grid rules in
  `apps/frontend/src/styles/globals.css`.

At 320 px the first coverage page exposed four active topics and position
feedback `1 of 3`. Computed sizes were 10 px for topic names and 9 px for their
statuses. The source of truth requires a coverage slideshow of **up to three
topics per page** and preserves 12 px metadata in the compact responsive
contract.

**Proposed correction:** Set the mobile page size to three, revise the mobile
topic grid/slide transforms for three items, and restore the topic/status text
to at least the shared 12 px metadata size. Keep all topics, state text,
position feedback, keyboard buttons, swipe behavior, and one shared DOM tree.

**Likely Phase B files:**

- `apps/frontend/src/features/insights/insight-board.tsx`
- `apps/frontend/src/styles/globals.css`
- `apps/frontend/src/features/insights/insight-board.test.tsx`

**Risks/dependencies:** Page-count math, `data-carousel-index` placement,
next/previous disabled states, transform offsets, drag resistance, and topic
state announcements must remain synchronized. The correction must not increase
the sticky control height enough to hide the evidence rail.

**Acceptance:** 320–700 px mobile layouts expose at most three coverage topics
per page at 12 px or larger; all topic labels/states remain present; controls
stay 44 px; page count and swipe/keyboard navigation are correct; no horizontal
page scroll occurs.

**Smallest verification:** Update the existing carousel unit assertions, then
inspect 320 × 800, 360 × 800, 390 × 844, and 844 × 390 with short and expanded
topic labels.

### SP024-MOTION-001 — Passive smooth scrolling ignores reduced motion

- **Severity:** P2
- **Confidence:** High
- **Affected users:** Motion-sensitive keyboard users and users reaching native
  fragments/focus targets outside the deliberately controlled CTA handler.
- **Guidance:** WCAG 2.3.3 Animation from Interactions and the project's
  preference contract.
- **Exact location:** `apps/frontend/src/styles/globals.css` global
  `html { scroll-behavior: smooth; }` and the reduced-motion media block.

The active browser reported `reduce: true`, yet the computed root
`scroll-behavior` remained `smooth`. This is separate from the owner-approved
900 ms CTA hook in
`apps/frontend/src/features/entry/use-deliberate-anchor-scroll.ts`, which
explicitly performs cancellable instant scroll steps and has a reduced-mode
unit test.

**Proposed correction:** Set `html { scroll-behavior: auto; }` inside the
reduced-motion media query. Keep the explicit 900 ms controlled CTA handler
unchanged so only the approved direct-click exception remains smooth.

**Likely Phase B files:**

- `apps/frontend/src/styles/globals.css`
- an existing style-contract/manual motion check; the deliberate-scroll unit
  test should remain unchanged and passing

**Risks/dependencies:** Progressive fragment fallback becomes immediate under
reduced motion, which is intended. The normal mode must retain native smooth
fallback behavior.

**Acceptance:** Computed root scroll behavior is `smooth` in no-preference and
`auto` in reduce; the controlled How-it-works/entry CTAs still run their
900 ms cancellable journey in both modes; focus restoration and skip-link
navigation do not acquire unintended motion.

**Smallest verification:** Paired computed-style browser checks plus the
existing deliberate-anchor tests.

### SP024-MOTION-002 — Reduced semantic-marker authority is contradictory

- **Severity:** P2
- **Confidence:** High
- **Affected users:** Motion-sensitive users and maintainers who cannot know
  which source-of-truth sentence to implement.
- **Guidance:** WCAG 2.3.3 and the ticket's narrow-exemption policy.
- **Exact locations:** source of truth landing paragraph (one-second sweep
  retained), source of truth Motion paragraph (resolve without a sweep), and
  `apps/frontend/src/styles/globals.css` reduced selector for
  `.sp-live-conversation mark[data-highlighted="true"]`.

The landing screen-design authority says the synchronized highlight remains a
one-second paint-only sweep in reduced motion because it is the semantic bridge
to the created note. The later Motion section says reduced motion resolves the
highlight **without a sweep**. Implementation currently chooses the first:
the late `animation-duration: 1s !important` override defeats the global 1 ms
duration.

**Proposed correction:** Resolve the authority conflict before editing CSS.
The accessibility-conservative recommendation is to show the completed marker
immediately under reduce while preserving the one-second sweep under
no-preference. If the owner instead retains the semantic paint sweep, update
the contradictory Motion sentence and document the selector as a narrow,
one-shot, non-spatial exception. Do not retain both contradictory rules.

**Likely Phase B files:**

- `docs/SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`
- `apps/frontend/src/styles/globals.css` only if the owner chooses immediate
  reduced highlighting
- `apps/frontend/src/features/entry/illustrative-interview-preview.test.tsx`
  and the paired browser motion evidence

**Risks/dependencies:** Removing the sweep must not make the note appear before
the highlighted evidence is perceptible. Retaining it may affect users who
request minimal visual progression. Both choices must preserve the phase order
and static highlighted end state.

**Acceptance:** The source of truth contains one unambiguous rule; normal mode
keeps the one-second semantic sweep; reduced mode follows the owner's chosen
single behavior; the note appears only after the highlight state is established;
both modes have focused regression evidence.

**Smallest verification:** One paired component timing test and two browser
computed-style/visual observations at the highlight phase.

### SP024-MOTION-003 — Approved hero-card travel and hover lift are absent

- **Severity:** P2
- **Confidence:** High
- **Affected users:** All landing visitors; this is a visual-authority and
  preference-differentiation defect rather than a functional blocker.
- **Guidance:** Approved landing composition and reduced-motion alternative.
- **Exact locations:** the two hero-card keyframes and hover rule in
  `apps/frontend/src/styles/globals.css`.

The source of truth requires a one-shot diagonal normal entrance, a shorter
shallow horizontal reduced entrance with no scaling, and a small normal-mode
hover lift. Both `sp-hero-feature-card-in` and
`sp-hero-feature-card-reduced-in` currently animate only opacity. The hover
rule changes border/shadow/z-index but has no compositor lift.

This is not the global one-frame issue. Under the active reduced preference,
the late selector won with the expected 720 ms duration and stagger, but the
computed transform remained `none` because the selected keyframe contains no
movement. The default keyframe is also opacity-only by source inspection.

**Proposed correction:** Restore a restrained one-shot diagonal translate in
the normal keyframe and a materially smaller horizontal-only translate in the
reduced keyframe; neither may scale. Restore the normal pointer-hover lift while
the reduced hover state keeps only stacking/border emphasis. Keep the ordered
list, settled layout, stagger, compact no-overlap composition, and static final
state.

**Likely Phase B files:**

- `apps/frontend/src/styles/globals.css`
- the smallest landing/motion regression test plus paired browser evidence

**Risks/dependencies:** Transform values must not move text outside the clipped
viewport, create horizontal page overflow, compound with card offsets, or
cause layout/paint churn. Reduced travel must remain shallow and one-shot.

**Acceptance:** In no-preference, the four cards enter diagonally once in
reading order and eligible pointer hover lifts only the targeted card. In
reduce, they use a shorter shallow horizontal one-shot entrance with no scale,
and hover has no travel. Both settle without overflow from 320–2560 px.

**Smallest verification:** Paired preference capture at 1280 × 800 and
2560 × 1440; compact settled-state checks at 320/390/768; computed transform,
duration, iteration-count, and overflow assertions.

### SP024-TEST-001 — Paired motion regression coverage is incomplete

- **Severity:** P3
- **Confidence:** High
- **Affected users:** Indirectly all users; missing coverage raises the chance
  that a future global-rule or exception change silently breaks one preference.
- **Guidance:** SP-024 requires dedicated coverage for every approved exception
  in both preference modes.
- **Exact locations:**
  `apps/frontend/src/features/entry/illustrative-interview-preview.test.tsx`
  and the motion/style verification surface.

The illustrative preview test stubs `matchMedia` to no-preference only. The
deliberate anchor hook does cover both values, but there is no paired automated
component check for the preview's reduced JS branch and no existing browser
test that proves which reduced CSS exceptions win the 1 ms global cascade.

**Proposed correction:** After the owner decides the motion findings, add the
smallest reduced-mode component case for preview timing/state and retain a
documented paired computed-style browser check for the approved CSS exceptions.
Do not add a broad Playwright suite or new dependency in SP-024.

**Likely Phase B files:**

- `apps/frontend/src/features/entry/illustrative-interview-preview.test.tsx`
- existing focused test/configuration only if strictly necessary; no new package

**Risks/dependencies:** A DOM-only test cannot prove the browser CSS cascade.
Keep JS timing assertions in Vitest and browser computed-style evidence in the
manual matrix rather than creating brittle static CSS-string assertions.

**Acceptance:** Both `matches: false` and `matches: true` component paths are
covered, every owner-approved exception has paired browser evidence, and no
snapshot or dependency is added.

**Smallest verification:** Run the focused landing tests and the documented
two-preference browser motion matrix.

## Approved Phase B scope and file-by-file plan

The owner approved every finding above on 2026-09-24. For
`SP024-MOTION-002`, the chosen behavior is the accessibility-conservative
alternative: reduced motion shows the completed highlight immediately with no
sweep, while no-preference retains the one-second sweep. This section freezes
the implementation boundary before application edits begin. No dependency,
provider setting, API contract, persistence behavior, product copy, or SP-025
release-QA work is included.

### SP024-RESP-001 implementation plan

- **Exact code:** In the `max-width: 43.75rem` block of
  `apps/frontend/src/styles/globals.css`, add a specificity-matched
  `.sp-interview-controls[data-state="complete"]` override with a single
  `minmax(0, 1fr)` track. Keep the existing full-width action group/button rule
  and add a completed-action label rule that preserves the ordinary
  **View summary** phrase without changing the shared overflow protection for
  untrusted text elsewhere. No markup or reducer change is planned in
  `interview-controls.tsx`.
- **Current → target:** The base two-column completed selector currently wins
  over the compact one-column selector, leaving a 53 px button at 320 px and
  allowing one-character-per-line wrapping. The target is one full-width
  completed action beneath the timer, with pending spinner and ready label both
  readable in the same stable layout.
- **Architecture/code quality:** A narrow state-and-breakpoint override fixes
  the cascade at its owner rather than weakening the shared button primitive or
  creating a mobile component tree.
- **Edge cases and regression risks:** Preserve the active mute/end layout,
  safe-area padding, 44 px minimum target, disabled/loading state, frozen timer,
  200% zoom reflow, and short landscape reachability. The completed label must
  not overflow if fonts expand.
- **Smallest verification:** Existing interview-stage/component coverage for
  ready and pending summary controls, followed by production-browser geometry
  and overflow checks at 320 × 800, 360 × 800, 390 × 844, and 844 × 390.

### SP024-RESP-002 implementation plan

- **Exact code:** Change `MOBILE_TOPICS_PER_SLIDE` from four to three in
  `apps/frontend/src/features/insights/insight-board.tsx`. In the compact
  `globals.css` topic viewport, use one implicit full-width column per page and
  three auto-sized rows with column-first placement, remove the now-redundant
  hard-coded index-to-cell selectors, and restore both topic and status text to
  the shared 12 px metadata token. Update the carousel assertions in
  `apps/frontend/src/features/insights/insight-board.test.tsx` from four-item to
  three-item pages while retaining swipe direction, active-state, index, and
  position-feedback checks.
- **Current → target:** Compact pages currently show a two-by-two group of four
  at 10/9 px. The target shows at most three full-width topic rows per page at
  12 px, with all 12 topics still reachable through the same controls and
  swipe surface.
- **Architecture/code quality:** The existing single DOM tree and generic
  page-count/state logic stay authoritative. Native CSS grid auto-placement
  replaces 16 index-specific rules, reducing drift when the topic library
  changes without introducing inline styles or a second renderer.
- **Edge cases and regression risks:** Verify incomplete final pages, all
  disabled previous/next states, touch axis locking, edge resistance, long
  translated-like labels, evidence-card height, and no page-level horizontal
  overflow.
- **Smallest verification:** The focused insight-board test plus browser checks
  at the four compact anchors, including the first, middle, and final coverage
  pages.

### SP024-MOTION-001 implementation plan

- **Exact code:** Add `html { scroll-behavior: auto; }` to the global reduced-
  motion media block in `apps/frontend/src/styles/globals.css` and mirror that
  rule in `docs/SCREENPILOT_DESIGN_SYSTEM.html`. Do not change
  `use-deliberate-anchor-scroll.ts`.
- **Current → target:** Native/fragment scrolling remains smooth even when the
  browser reports reduce. The target makes passive scrolling immediate under
  reduce while preserving the explicitly approved, cancellable 900 ms CTA
  journey in both modes.
- **Architecture/code quality:** Preference handling remains declarative at the
  global CSS boundary; the deliberate interaction stays isolated in its one
  hook instead of gaining another code path.
- **Edge cases and regression risks:** Skip links, focus restoration, fragment
  fallback, and normal-mode smooth behavior must remain correct.
- **Smallest verification:** Keep the paired deliberate-anchor unit tests
  passing and record computed root `scroll-behavior` as `smooth` for
  no-preference and `auto` for reduce.

### SP024-MOTION-002 implementation plan

- **Exact code:** Replace the late reduced-motion duration override for
  `.sp-live-conversation mark[data-highlighted="true"]` in `globals.css` with
  `animation: none !important` and the fully painted two-layer
  `background-size` end state. Reconcile the contradictory landing sentence in
  `docs/SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md` with the existing Motion section so
  both specify an immediate completed reduced state. Leave the normal one-
  second `sp-live-highlight-draw` rule and phase timing unchanged.
- **Current → target:** Reduced mode currently defeats the global collapse and
  retains the full one-second sweep. The target establishes the highlighted
  evidence immediately, holds that visible state before note creation, and
  leaves no-preference unchanged.
- **Architecture/code quality:** CSS owns visual preference while the semantic
  React phase order remains shared; no duplicate reduced-motion rendering or
  JavaScript animation branch is introduced.
- **Edge cases and regression risks:** Both background layers must reach their
  final size, unhighlighted text must remain clear, the note must not precede
  the highlight state, and runtime preference changes must not leave a partial
  marker.
- **Smallest verification:** Paired illustrative-preview timing coverage plus
  computed animation/background-size observations at the highlight phase in
  both preferences.

### SP024-MOTION-003 implementation plan

- **Exact code:** Restore the approved transforms in the two hero-card
  keyframes in `globals.css`: restrained diagonal travel for
  `sp-hero-feature-card-in` and materially smaller horizontal-only travel for
  `sp-hero-feature-card-reduced-in`, both settling at zero and neither adding
  scale. Add `translate` to the card transition and a small negative-Y
  `translate` in the existing pointer-hover rule. In the late reduced block,
  force hover translate to zero while retaining z-index/border/shadow emphasis.
  Align the equivalent hover rule in `SCREENPILOT_DESIGN_SYSTEM.html` to the
  approved lift-without-scale behavior; its keyframes already document the
  intended normal/reduced travel.
- **Current → target:** Both entrance keyframes currently fade only and hover
  never lifts. The target is one diagonal normal entrance per card, one shorter
  shallow horizontal reduced entrance per card, a static settled state, and a
  normal-pointer lift that disappears under reduce.
- **Architecture/code quality:** Existing CSS keyframes, stagger, semantic
  ordered list, and responsive tree are reused. Compositor properties avoid
  layout and paint-driven movement, and no animation library is added.
- **Edge cases and regression risks:** Avoid clipping and horizontal overflow
  while cards enter; do not compound hover with the entrance; preserve compact
  no-overlap layout, readable stagger, one iteration, and reduced no-scale
  behavior.
- **Smallest verification:** Paired computed keyframe/duration/iteration/hover
  observations at 1280 × 800 and 2560 × 1440, plus settled overflow checks at
  320, 390, and 768 px.

### SP024-TEST-001 implementation plan

- **Exact code:** Parameterize
  `apps/frontend/src/features/entry/illustrative-interview-preview.test.tsx` so
  its complete question → answer → highlight → note contract runs with both
  `matchMedia(...).matches === false` and `true`. Keep the existing paired
  deliberate-anchor tests unchanged. Record the CSS cascade checks in this
  audit rather than adding brittle CSS-string assertions or a new browser-test
  dependency.
- **Current → target:** Only the no-preference preview path is exercised today.
  The target gives both preference branches the same semantic phase-order
  guarantee while browser evidence verifies the CSS-only differences.
- **Architecture/code quality:** One table-driven test prevents duplicated
  fixture logic and respects the split between DOM timing tests and real CSS
  cascade verification.
- **Edge cases and regression risks:** Fake timers must be reset between cases,
  the initial preference restart must settle, listeners must still clean up,
  and reduced-only note holds must not create cross-test leakage.
- **Smallest verification:** Run the preview, deliberate-anchor, insight-board,
  and affected interview-stage tests, then the paired production-browser
  matrix. No snapshot, provider request, or new package is permitted.

### Frozen documentation and verification edits

- Update `docs/tickets/SP-024-harden-accessibility-responsiveness-and-performance.md`
  with the approved IDs, chosen marker behavior, implementation state, exact
  focused checks, and explicit device/browser evidence gaps.
- Update the SP-024 section of
  `docs/SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md` only for the approved decision and
  final implementation evidence; do not mark SP-025 release QA complete.
- Update this ledger from `Planned` to `Complete`/`Passed` only after the
  relevant automated and browser checks succeed. If a plan above must change
  materially, stop and return that finding to the owner instead of absorbing
  the change.

## Phase B implementation and verification evidence

The frozen plan was implemented without a material deviation:

| Finding | Implemented surface | Result |
| --- | --- | --- |
| `SP024-RESP-001` | Compact completed controls now use a specificity-matched one-column grid; the ordinary action label can wrap only between words. | Pass |
| `SP024-RESP-002` | Mobile page size is three; CSS grid auto-placement replaces the index map; label and status text use the 12 px metadata token. | Pass |
| `SP024-MOTION-001` | Reduced media sets native root scrolling to `auto`; the deliberate 900 ms CTA hook is unchanged. | Pass |
| `SP024-MOTION-002` | Reduced markers use no animation and render both paint layers at full width; the source-of-truth conflict is removed. | Pass |
| `SP024-MOTION-003` | Normal hero keyframes travel 96 px left/16 px up, reduced keyframes travel 24 px horizontally, normal hover lifts 6 px, and reduced hover travel is zero. No scale was added. | Pass |
| `SP024-TEST-001` | The complete landing-preview semantic sequence now runs under both `matchMedia` preference values. | Pass |

### Deterministic checks

Every test command set `PROVIDER_MODE=fake` and `PAID_DEMO_ENABLED=false`
before modules loaded. No live-provider or paid request was made.

| Check | Result |
| --- | --- |
| Affected preview, anchor-scroll, insight-board, and interview-stage tests | 4 files / 17 tests passed |
| Complete frontend unit suite | 40 files / 295 tests passed |
| Frontend typecheck | Passed (`next typegen` and `tsc --noEmit`) |
| Frontend lint | Passed with zero warnings |
| Production contracts/frontend build | Passed on Node 24.19.0 / pnpm 11.24.0 |
| Prettier check and `git diff --check` | Passed for all changed files |

The root `build:frontend` convenience script initially re-entered the default
terminal's pnpm 11.19.0 and failed the repository's engine guard. The verified
build invoked the same filtered build directly through the bundled Node 24.19.0
runtime and Corepack pnpm 11.24.0. This was a local launcher-version issue, not
an application/build failure.

### Production-local browser checks

The freshly built frontend was restarted outside the restricted sandbox on
port 3000. Backend readiness, `/`, `/demo`, and proxied bootstrap all returned
`200`; bootstrap again reported `providerMode: fake`,
`effectiveMode: deterministic_fake`, and `paidOperationsEnabled: false`.
Browser warning/error logs remained empty.

The deterministic conversation-first flow reached the read-only completed
workspace at 320 px. Its completion action and page overflow measured:

| Viewport | View summary button | Label box | Grid | Page overflow |
| --- | --- | --- | --- | --- |
| 320 × 800 | 197 × 44 px | 104 × 22 px | one 197 px track | 0 px |
| 360 × 800 | 237 × 44 px | 104 × 22 px | one 237 px track | 0 px |
| 390 × 844 | 267 × 44 px | 104 × 22 px | one 267 px track | 0 px |
| 844 × 390 | 138 × 44 px | 104 × 22 px | desktop two-track layout | 0 px |

At 320 px, all 12 coverage topics were reachable as exactly four pages of
three. Every visible topic label and status computed to 12 px, the pages
advanced as `1 of 4` through `4 of 4`, and document overflow remained 0 px.

The connected browser reported reduced motion. Runtime evidence showed:

- root `scroll-behavior: auto`;
- hero cards using `sp-hero-feature-card-reduced-in` for 720 ms, one iteration,
  with an observed 24 px horizontal start and zero settled transform;
- no horizontal overflow at 320, 390, 768, 1280, and 2560 px while the cards
  entered and after they settled;
- both synchronized markers in the live highlight phase using
  `animation-name: none`, `animation-duration: 0s`, and final background sizes
  `100% 62%, 100% 20%`;
- the compiled normal-mode CSS retained the 1.1-second diagonal keyframe,
  one-second marker sweep, native smooth fallback, and 6 px hover lift, while
  the compiled reduced hover override resolved translation to zero.

The browser-control surface cannot override `prefers-reduced-motion`, so the
no-preference CSS path was verified through the compiled production stylesheet
and the no-preference component branch rather than a second computed-style
runtime capture. Physical Safari/Firefox/Android devices, screen-reader output,
virtual-keyboard/safe-area injection, and throttled CPU/network profiling remain
the explicitly documented SP-025/manual evidence gaps; they did not authorize
or require another SP-024 code change.

## Advice deliberately rejected

The following directions were excluded because they conflict with ScreenPilot
authority or Phase A scope:

- No application/CSS/token/test/dependency/configuration edit or auto-fix was
  made during the audit.
- No new animation library, GSAP timeline, WebGL/3D/shader effect, parallax,
  spring, perpetual decorative motion, or force-directed evidence graph is
  proposed.
- No separate mobile component tree, hidden mobile content, simplified mobile
  evidence model, or role-specific layout is proposed.
- The owner-approved 900 ms direct-click landing journey is not removed merely
  because reduced motion is active; only unrelated passive CSS smoothing is
  proposed for removal.
- The Deep Ink + Warm Coral direction, equal entry-card priority, semantic
  evidence map, and role-neutral product behavior are not reopened.
- No analytics, real-user monitoring, candidate persistence, external font,
  or performance telemetry is proposed to compensate for missing local
  throttling evidence.
- No live-provider call, real CV, public candidate data, or paid test was used.

## Evidence gaps and required follow-up

These gaps are not silently treated as passes:

1. The connected browser exposed only the active `reduce` preference and no
   media-emulation control. No-preference behavior is supported by source
   inspection and focused unit tests, not a paired runtime capture.
2. No physical iPhone, Android phone, tablet, display cutout, safe-area inset,
   or virtual keyboard was available.
3. Safari, Firefox, Android Chrome, iPhone Safari, and external desktop Chrome
   were not connected.
4. No screen reader session was available. AX semantics were inspected, but
   actual announcement timing/noise was not heard.
5. 200% browser zoom, OS text scaling, translated locale expansion, and extreme
   unbroken user strings were not independently injected.
6. The fake bootstrap had a blank Turnstile site key, so a real interactive
   fallback, challenge iframe, expired token, and virtual-keyboard interaction
   were not rendered in the browser. Existing deterministic tests covered the
   gates without a paid call.
7. The browser runtime exposed no CPU/network throttle or performance timeline.
   PDF and update timing is unthrottled local evidence only.
8. The live-provider audio path and 2.02 MB libsamplerate worklet were not loaded
   because paid/live calls were prohibited.
9. Provider/network/microphone-denial/summary-failure visuals were covered by
   focused tests and source review, not production-browser fault injection.
10. Layered translucent surfaces were not certified by a pixel-based contrast
    tool; only solid token pairs and computed styles were checked.
11. Swipe gestures were reviewed through source and unit behavior, not a
    physical touch screen.

Before public deployment, run the missing physical/browser/accessibility and
throttled-performance rows after Phase B settles. Those checks should not
broaden the approved implementation scope without returning any new finding to
the owner gate.

## Owner-decision table

Every proposal began as `Pending`. The owner explicitly approved the complete
set on 2026-09-24 and selected the immediate static reduced highlight for
`SP024-MOTION-002`.

| Finding | Severity | Proposed disposition | Owner decision | Implementation | Verification |
| --- | --- | --- | --- | --- | --- |
| `SP024-RESP-001` | P1 | Approve compact completed-controls reflow | Approved | Complete | Passed |
| `SP024-RESP-002` | P2 | Approve three-topic pages and readable mobile metadata | Approved | Complete | Passed |
| `SP024-MOTION-001` | P2 | Approve reduced-mode `scroll-behavior: auto` outside the explicit CTA hook | Approved | Complete | Passed |
| `SP024-MOTION-002` | P2 | Show the completed highlight immediately under reduce; retain the normal one-second sweep | Approved | Complete | Passed |
| `SP024-MOTION-003` | P2 | Approve restoration of bounded normal/reduced hero-card travel and normal hover lift | Approved | Complete | Passed with the documented browser preference limit |
| `SP024-TEST-001` | P3 | Approve paired motion regression coverage without a new dependency | Approved | Complete | Passed |

## Phase B gate

The owner approval gate is satisfied for the exact six-ID set above, and Phase
B implemented and verified that frozen plan. No new recommendation was absorbed.
The broader physical-device, browser, assistive-technology, and throttled
release matrix belongs to SP-025 and still requires separate authorization.
