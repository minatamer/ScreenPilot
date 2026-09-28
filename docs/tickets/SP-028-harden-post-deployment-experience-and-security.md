# SP-028 — Harden the post-deployment experience and security boundaries

Status: In progress — Phase 1 complete and owner-approved; Phase 2 application code locally verified and five-minute provider configuration synchronized, Cloud Run/IAM execution gated; Phase 3 not started<br>
Milestone: Milestone 7 — post-deployment portfolio hardening  
Last synchronized: 2026-09-28<br>
Depends on: SP-015A, SP-022, SP-023, SP-024, SP-025A, SP-026<br>
Suggested implementation commit: `SP-028: harden post-deployment experience and security`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Correct the post-deployment issues that block ScreenPilot from being presented
as a finished portfolio project. Execute the ticket in this fixed order:

1. repair the landing page and remove the sample-CV product path;
2. implement and verify the final security architecture and controls;
3. finish focused manual testing, including a previously unused synthetic CV.

The result must remain one stateless, role-neutral application with the existing
`frontend -> contracts <- backend` dependency direction. The ticket does not
authorize deployment, a database, analytics, a second mobile implementation, a
new provider call, or a broad redesign.

## Owner and deployment gate

- This packet records the investigation and the proposed implementation. It
  does not authorize application-code changes by itself. Begin implementation
  only when the owner explicitly asks to execute SP-028.
- Complete and verify all three sections before proposing a release candidate.
  UI/UX implementation comes first, security second, manual testing last.
- Do not deploy, alter Cloud Run, change DNS, publish provider configuration, or
  run a paid provider flow without a separate explicit owner instruction.
- A later deployment must use the repository's manual deployment runbook and
  must identify the exact audited commit. Never opportunistically patch the
  deployed site from an uncommitted working tree.
- Default and automated verification must force `PROVIDER_MODE=fake` and
  `PAID_DEMO_ENABLED=false` before test modules load. It must not read either
  `.env.local`, connect to the running apps, or spend provider credits.
- If implementation changes the chosen Google Cloud trust boundary, public
  runtime contract, or product behavior, update this packet, the source of
  truth, affected operations guidance, and `.env.example` schemas together.

## Investigation baseline

The planning pass was completed on 2026-09-28 against branch `main`, revision
`bd07851c09f1f3bab41ca40d9318c966678dc317`, pnpm `11.24.0`, and the locally
built production frontend/backend. Both applications were started separately
on ports 3000 and 3001; `/`, `/health/live`, and `/health/ready` returned 200.
No `.env.local` file was read, no live provider action was invoked, and nothing
was deployed.

Evidence came from:

- the owner's Chrome/DevTools screenshots at 1920 × 1080, iPad Mini 768 ×
  1024, and iPhone SE 375 × 667;
- local code inspection of the landing, CV, proxy, admission, and rate-limit
  paths;
- local responsive inspection at 375 × 667, 390 × 844, 768 × 1024, 820 ×
  1180, 900 × 1100, 1024 × 600, 1180 × 720, 1366 × 680, 1440 × 800,
  1600 × 900, 1920 × 1080, and 2560 × 1440;
- a production-dependency audit reporting no known vulnerability and the
  repository's tracked-secret and browser inline-style scans passing;
- the official [Express proxy guidance](https://expressjs.com/en/guide/behind-proxies.html),
  [Next.js backend-for-frontend guidance](https://nextjs.org/docs/app/guides/backend-for-frontend),
  [Google Cloud forwarding-header behavior](https://docs.cloud.google.com/load-balancing/docs/https),
  and [Cloud Run service-to-service authentication](https://docs.cloud.google.com/run/docs/authenticating/service-to-service).

The browser used for the agent's local inspection exposed reduced motion. That
state was recorded instead of being mistaken for ordinary-motion behavior.
Implementation verification must explicitly cover both motion preferences.

## Section 1 — UI/UX corrections

### SP028-UX-001 — Remove the sample-CV product path

**Observed behavior**

- `CvDropzone` always renders **Use sample CV**.
- `SAMPLE_CV_URL` is the stable public path
  `/fixtures/screenpilot-sample-cv.pdf`.
- `apps/frontend/public/fixtures/screenpilot-sample-cv.pdf` is copied into the
  public build and is directly retrievable. The local route returned 200 and
  3,588 bytes during this investigation.
- Most CV validation recovery copy also offers the sample, so hiding only the
  button would leave a broken production promise.
- The current Next proxy matcher deliberately excludes `fixtures`, which means
  the security middleware cannot currently deny that static path by hostname.

The sample is synthetic and is not a secret. The defect is that a development
shortcut is exposed as deployed product behavior, not an information leak.

**Superseding owner decision — 2026-09-28**

- Do not expose **Use sample CV** in any runtime, including localhost. The CV
  product path offers only upload; conversation-first remains the equal
  alternative.
- Remove the public bootstrap capability, sample fetch helper, sample-only error
  branch, and sample-specific recovery copy rather than retaining permanently
  disabled product code.
- Keep the synthetic PDF only as an unadvertised deterministic extraction
  fixture and exact loopback engineering resource. The narrow proxy gate still
  returns 404 for custom-domain, `run.app`, malformed-host, and unsupported-
  method requests.
- Uploaded CVs continue through the same reducer, parser, plan, preflight,
  interview, and review behavior. Do not replace the removed shortcut with a
  second CV workflow.

**Likely implementation surface**

- `packages/contracts/src/api/public-runtime-config.ts` and its tests;
- `apps/backend/src/use-cases/get-demo-bootstrap.ts` and focused bootstrap tests;
- `apps/frontend/src/features/entry/use-demo-bootstrap.ts` and the CV-stage
  composition;
- `apps/frontend/src/features/cv/cv-dropzone.tsx`,
  `extract-pdf-text.ts`, `pdf-validation.ts`, and focused tests;
- the narrow Next route/proxy boundary used to serve or deny the local fixture;
- source-of-truth and operations copy that still describes a universally
  bundled public sample.

**Acceptance**

- [x] Localhost, deployed, restored, and failure states contain no **Use sample
  CV** control or sample-specific recovery promise.
- [x] Public bootstrap no longer advertises a sample-CV capability, and the
  frontend contains no sample-fetch or sample-error product branch.
- [x] Direct requests for the former or replacement fixture URL on custom-domain
  and `run.app` hostnames return 404 without redirecting or disclosing a local
  filesystem/build path.
- [x] Uploaded synthetic PDFs and **Start without a CV** remain fully usable.
- [x] Contract, bootstrap, hydration, direct-route, CV-error, and extraction
  regressions cover the upload-only runtime and unadvertised fixture boundary.

### SP028-UX-002 — Give the opening hero a real viewport boundary

**Observed behavior and cause**

`.sp-landing__hero-field` has a viewport-relative minimum height, but the
masthead, feature stack, gap, and product preview are all normal-flow children
of one taller grid. A `min-height` on that outer container does not reserve the
initial viewport for the opening composition. It only ensures that the entire
container is at least that tall. The product preview therefore begins inside
the initial viewport whenever the available width makes the preceding content
short enough.

The live geometry made the defect unambiguous:

| Requested viewport | Product preview top | Visible on first screen |
| --- | ---: | ---: |
| 768 × 1024 | 849 px | about 175 px |
| 820 × 1180 | 868 px | about 312 px |
| 1440 × 800 | 741 px | about 59 px |
| 1600 × 900 | 741 px | about 159 px |
| 1920 × 1080 | 818 px | about 262 px |
| 2560 × 1440 | 869 px | about 571 px |

At 375 × 667, the first feature card also begins at approximately 631 px, so it
peeks into the screen below the second CTA.

**Required design**

- Introduce an explicit opening-stage wrapper whose minimum block size is the
  usable small viewport after the normal-flow header. The product preview must
  follow that stage, not participate in its height calculation.
- Use `svh` for a stable initial shell and `dvh` only where continuous browser-
  chrome changes are desirable. Preserve safe-area padding. Do not use a fixed
  pixel height, clip content, or absolutely position the preview to fake the
  boundary.
- On wide laptop, desktop, large-monitor, and tablet compositions, the opening
  stage includes the headline/copy/actions and the complete four-card feature
  composition. No product-preview pixel may be visible at scroll position zero.
- Let the opening composition use the available viewport instead of preserving
  laptop-sized islands on taller or wider screens. Bound headline, lead, action,
  feature-card, and inter-column sizing with both viewport axes so large screens
  become fuller without overflowing short landscape screens. Tablet rows must
  size to their content and remain centered as one composition rather than
  stretching leftover height into a dead band between the CTAs and cards.
- On phones, the opening stage ends after the second CTA. The same semantic
  feature list follows in normal flow and enters only as the visitor scrolls.
  Achieve that with shared markup and responsive composition; do not create a
  second phone-only feature component.
- If short landscape, 200% zoom, long copy, or browser UI makes the opening
  content taller than the viewport, allow natural vertical growth. The preview
  still follows the content and nothing is clipped.
- Keep the current header order, CTA behavior, focus order, readable line
  lengths, 44 × 44 px targets, and zero horizontal overflow.

**Acceptance**

- [x] At every reference and measured intermediate size, the preview starts at
  or below the first-screen boundary; a one-pixel tolerance may account for
  fractional layout rounding.
- [x] On 320–560 px phones, the first viewport ends after the second CTA and no
  feature card is visible before scrolling.
- [x] 1024 × 600, phone landscape, 200% zoom, long translated-like copy, and
  dynamic browser chrome remain naturally scrollable with no clipped action.
- [x] A geometry regression asserts the relationship among header bottom,
  opening-stage bottom, preview top, and viewport bottom instead of snapshotting
  one device.
- [x] Phone, tablet, laptop, and large-monitor anchors use fluid type, card, and
  gap sizing without horizontal overflow or an unexplained internal dead band;
  compact-height layouts still grow naturally instead of clipping.

### SP028-UX-003 — Reveal hero feature cards when they enter view

**Observed behavior and cause**

Every `.sp-hero-feature-stack__card` receives its entrance animation as soon as
the stylesheet and component mount. The `nth-child` delays only sequence the
mount-time animation; they do not connect it to viewport visibility. On phones
the cards can complete their entrances before the visitor reaches them. The
reduced-motion alternative is also mount-triggered.

**Required design**

- Add a feature-owned intersection hook with cleanup. Wide/tablet layouts may
  reveal the stack once when its composition first intersects. Compact phone
  layouts must reveal each card only when that card enters the viewport, while
  retaining semantic ordered-list order and the readable stagger.
- Drive CSS from explicit `pending`/`revealed` state rather than attaching the
  animation unconditionally. The entrance runs at most once per page mount and
  does not restart when scrolling back.
- Keep content readable when JavaScript or `IntersectionObserver` is
  unavailable: the cards are visible and static, never permanently transparent.
- Keep reduced motion non-spatial and one-shot. Visibility gating still
  applies; reduced motion is not permission to reveal off-screen content at
  mount.
- Disconnect observers and cancel obsolete callbacks on unmount. Do not add an
  animation dependency for this behavior.

**Acceptance**

- [x] Phone cards are absent from the opening screen, reveal in reading order as
  they enter view, and do not replay on reverse scroll.
- [x] Desktop/tablet cards remain a coherent diagonal/grid composition and do
  not flash invisible during hydration.
- [x] Ordinary motion, reduced motion, observer fallback, remount, and cleanup
  all have focused tests.

### SP028-UX-004 — Start the product-preview loop only on first visibility

**Observed behavior and cause**

`useIllustrativeConversation` already pauses on an observer result, page hide,
or deliberate focus. However it initializes `isInView` to `true`, initializes a
completed-looking note frame, and restarts the sequence as soon as the motion
preference resolves. This is not a first-entry gate. Where the broken hero lets
18% of the preview intersect, it begins before the visitor intentionally reaches
the demonstration.

**Required design**

- Separate `hasEnteredViewport` from current `isIntersecting`. With observer
  support, initialize both safely so no timer starts before a real entry.
- Start the first example only after the preview crosses a documented low
  threshold while the page is visible. The threshold/root margin should make
  the loop begin as the visitor scrolls toward the preview, not after the whole
  scene is already visible.
- After first entry, pause and resume the existing phase rather than silently
  resetting progress whenever the preview leaves and re-enters view.
- Before activation, render a stable, truthful first frame with no running
  timers, waveform loop, word reveal, or note transition. Preserve an
  understandable static fallback when observers are unavailable.
- Focus pause, page-visibility pause, unmount cleanup, and both motion
  preferences remain authoritative.

**Acceptance**

- [x] `data-running` or its replacement is false at initial page load across all
  anchors and becomes true only when the preview enters its activation zone.
- [x] The preview does not consume timer work while below the fold, resumes from
  the paused phase after ordinary off-screen scrolling, and restarts only when
  the documented full-loop behavior calls for it.
- [x] Focus, document visibility, observer fallback, reduced motion, and stale
  timer cleanup have deterministic fake-timer tests.

### SP028-UX-005 — Rebuild the responsive four-step scroll story

**Observed behavior and cause**

The tablet failure is a content-pressure bug, not merely a missing device name.
The two-column story remains active until 47 rem. At an emulated 768 px viewport
the effective content width is about 753 px, so the scene and story tracks are
approximately 264 px and 396 px. The **Choose** scene itself expects up to 23 rem
and contains two controls plus a separator. It consequently collides with the
narrative column, matching the owner's screenshot.

Below 35 rem the shared scene becomes non-sticky while all steps become fully
opaque and natural height. The observer continues changing that one scene as
the reader reaches later steps, but the scene has already scrolled away. The
visual and the active narrative are therefore disconnected on phones.

`useScrollStory` also names the first intersecting entry in callback order as
the active step. Callback order is not a stable measure of which step is most
relevant to the viewport, so resize and boundary crossings can jump state.

**Required interaction contract**

- **Wide composition:** retain one sticky visual and one narrative column only
  while both have their measured minimum inline size. Choose the active step
  deterministically from intersection ratio and/or distance to a documented
  viewport activation line; never rely on callback array order.
- **Tablet/content-pressure and phone composition:** switch before the shared
  scene's internal minimum width is violated—expected near the existing 60 rem
  tier, but select the final threshold by drag-resize evidence. Use a sequence
  of self-contained scroll chapters that pair each narrative with its own
  compact visual state in reading order. Supporting browsers may tie a small
  entrance/exit treatment to view progress so content develops as the reader
  swipes; the fallback must use the same markup, reduced motion must be static,
  and short landscapes, zoom, or expanded content must grow naturally. Reuse
  the one `storySteps` data model and visual component; do not fork product copy
  or interaction logic. Vertical swipe/scroll remains the ordinary document
  gesture—do not introduce a mandatory carousel or scroll snap.
- All four steps, privacy action, and final chooser remain semantic and readable
  with CSS/JavaScript/motion unavailable. Decorative scene content stays hidden
  from assistive technology; the narrative contains the meaning.
- Remove perpetual decorative animation when its step is inactive or off-screen.
  Reduced motion uses static/opacity state changes without disabling step
  comprehension.
- Preserve URL, focus, and controlled **How it works** scroll behavior. Avoid
  scroll trapping, scroll-jacking, mandatory snap points, or nested free-scroll
  regions.

**Interaction decision record**

- Use CSS view-progress timelines only as progressive enhancement. MDN defines
  a view timeline as progress based on an element's visibility inside its
  scrollport, which directly matches the requested “content develops while I
  swipe” behavior without taking control of document scrolling:
  <https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations/Timelines>.
- Do not add scroll snapping. CSS Scroll Snap Level 1 warns that mandatory
  snapping can make content between snap positions inaccessible when it is
  larger than the scrollport; ScreenPilot chapters contain variable copy and a
  privacy action, so ordinary vertical flow is the safer contract:
  <https://www.w3.org/TR/css-scroll-snap-1/>.
- Keep motion small, reversible with scroll, and nonessential. WCAG's animation
  guidance calls out scrolling-triggered motion, and Apple recommends
  purposeful, gesture-consistent motion with reduced-motion support. The
  chapter layout therefore remains complete when animation is unsupported or
  disabled:
  <https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions>,
  <https://developer.apple.com/design/human-interface-guidelines/motion>.

**Acceptance**

- [x] 768 × 1024, 820 × 1180, and every intermediate boundary show no overlap,
  cross-column text, clipping, or detached active scene.
- [x] 320, 360 × 800, 375 × 667, and 390 × 844 keep each visual with its matching
  **Choose**, **Talk**, **Notes**, or **Review** narrative while swiping normally.
- [x] 1024 × 600 and phone/tablet landscape choose natural flow when a sticky
  scene cannot fit.
- [x] Step activation remains deterministic during slow scroll, fast scroll,
  reverse scroll, resize, orientation change, zoom, and observer callbacks that
  report multiple entries.
- [x] Keyboard and no-JavaScript reading order is complete; privacy and CTA
  controls remain reachable with visible focus.

### UI implementation order and quality guardrails

1. Remove the sample capability from every runtime surface and retain only the
   unadvertised fail-closed loopback engineering fixture.
2. Separate the opening viewport stage from the feature stack/product preview.
3. Add intersection-driven card and preview lifecycle state.
4. Recompose the scroll story from wide to tablet to phone using the shared data
   and visual primitives.
5. Add focused behavior/geometry tests, then perform the responsive manual pass.

Before adding a hook, observer utility, breakpoint, token, or component, search
for an existing owner with the same responsibility. Keep browser observers,
timers, and visibility listeners in named feature hooks with explicit cleanup.
Do not solve the findings with user-agent detection, JavaScript pixel branching,
duplicated mobile markup containing separate copy/state, fixed screenshots, or
hard-coded viewport heights.

### Phase 1 implementation and verification evidence

Implementation, agent verification, and owner visual approval completed on
2026-09-28. Phase 2 application code was completed afterward; its Cloud Run/IAM
execution and deployed proof remain a separate owner gate.

- The owner superseded the local-only sample exception. Public bootstrap no
  longer contains `sampleCvAvailable`; the CV surface contains only **Choose
  PDF**, and recovery copy never mentions a sample. The exact Next proxy rule
  keeps the unadvertised fixture limited to GET/HEAD on an actual loopback
  `Host` and returns 404 elsewhere.
- The landing opening stage now owns the usable first viewport. The product
  preview is a following sibling, and phone layout lets the CTA stage grow
  naturally before the shared feature list enters normal flow.
- The hero density now scales against both viewport width and stable viewport
  height. Tablet auto rows are center-packed, replacing the measured 125 px
  stretched CTA-to-card void at 768 × 1024 with a deliberate 46 px composition
  gap while increasing the cards and type. At 1920 × 1080 the feature stack
  grows from about 653 px to 799 px; at 2560 × 1440 it reaches 960 px. Short
  laptop and landscape anchors retain their existing natural-growth behavior.
- Hero feature cards use a feature-owned intersection hook with one-shot states,
  observer fallback, reduced-motion behavior, and cleanup. The product preview
  has separate first-entry/current-visibility state and performs no timer work
  below the fold.
- Owner review caught a reduced-motion cascade regression: a generic
  `:nth-child(n)` selector outweighed the per-card delay rules, so every laptop
  card faded at 80 ms and the ordered reveal appeared absent. State-qualified
  per-card selectors restore the 80/680/1280/1880 ms opacity sequence in
  reduced motion. The normal-motion laptop/desktop diagonal cascade and the
  compact per-card viewport reveal remain separate behaviors; compact cards
  keep the same immediate 80 ms post-intersection delay even in reduced motion.
- The initial phone-local/tablet-sticky split failed owner review because the
  pinned tablet scene competed with the incoming narrative. Phone and tablet
  now share self-contained step chapters in natural document flow, with one
  compact visual beside each matching narrative. Supporting browsers tie a
  restrained entrance/exit treatment to view progress; observer and reduced-
  motion fallbacks retain the same readable markup. Wide layouts keep the
  two-column sticky story. No composition uses a carousel, scroll snap, scroll
  trap, or duplicated product state.
- The compact story also activates for short 60–68 rem landscapes below 44 rem
  high. At 1024 × 600 the shared 544 px sticky scene previously extended to 836
  px in a 600 px scrollport; it now becomes a normal-flow chapter instead of
  clipping below the viewport.
- Live geometry/visual checks passed at 320 × 568, 375 × 667, 390 × 844,
  667 × 375, 768 × 1024, 820 × 1180, 900 × 900, 1024 × 600, 1180 × 720,
  1366 × 680, 1500 × 850, 1600 × 900, 1920 × 1080, and 2560 × 1440. The preview stayed below the
  first screen, horizontal overflow stayed zero, phone cards waited below the
  CTA stage, and the story remained paired during forward and reverse swipes.
  The final chapter pass was visually repeated at 375 × 667, 768 × 1024,
  820 × 1180, and 1024 × 600; geometry checks at 320 × 568, 390 × 844, and
  900 × 900 confirmed zero horizontal overflow and step-local scenes. The
  available browser reported reduced motion, so live inspection verified the
  fully static fallback. The owner subsequently granted visual approval for the
  current Phase 1 result; a forced, side-by-side record of both motion
  preferences remains part of the final manual matrix in Section 3. Observer
  absence and cleanup are covered by deterministic tests. A 683-CSS-pixel
  content-pressure anchor covers the layout reflow produced by 200% zoom;
  owner-controlled browser zoom also remains part of the Section 3 matrix.
- The revised local production build shows only **Choose PDF** on `/demo` and
  contains no sample-specific recovery copy. The unadvertised loopback fixture
  remains an engineering resource, while the same URL with a custom `Host`
  returns an ordinary 404. No provider action was invoked. Browser console
  warnings/errors were empty, and keyboard focus order remained skip link,
  brand, header actions, then hero actions.
- Focused unit coverage passes for the runtime contract, backend environment
  projection, proxy gate, upload-only CV/copy path, hero reveal lifecycle,
  preview lifecycle, story rendering, and deterministic active-step selection. The
  affected workspaces pass typecheck and lint, and clean production frontend
  and backend builds complete. The full existing unit suites also pass.

No deployment, paid-provider action, `.env.local` read, Git staging, commit, or
push was performed. The owner accepted Phase 1 visually on 2026-09-28. Section
2 application code is now complete and locally verified; its Cloud Run/IAM
execution remains gated, and Section 3 has not started.

## Section 2 — Security architecture and gated deployment

The security review is complete. SEC-001, SEC-002, and SEC-003 application
code is implemented and locally verified. Cloud Run/IAM mutation, deployed
topology proof, deployed fake/unpaid smoke, paid-provider use, and Phase 3
remain unauthorized and unchecked until the owner separately approves them.

This tracked ticket records only the final maintainable architecture, operating
controls, safe rollout sequence, and non-sensitive verification evidence.

### SP028-SEC-004 — Reduce the live-call exposure ceiling

On 2026-09-28 the owner reviewed the ScreenPilot agent's aggregate 90-day
dashboard without opening conversation content. Four conversations averaged
2:39, cost 8.35K credits in total, averaged 2.09K credits each, and incurred
USD 0.128 of aggregate live-LLM cost. The rounded average implies about 10:36
of total connected time but does not establish an individual maximum.

The earlier eight-minute maximum was a conservative planning ceiling rather
than an observed need. The owner selected five minutes to retain more than two
minutes of headroom above the recorded average while reducing worst-case
connected time and voice exposure by 37.5 percent.

- [x] Set the public runtime contract and every application-owned deadline,
  reconnect budget, persisted completion bound, terminal message, preflight
  disclosure, and timer label to 300 seconds / five minutes.
- [x] Derive the frontend hard-stop timer and backend ElevenLabs target from the
  shared runtime contract instead of retaining an independent duration literal.
- [x] Mark the source-controlled ElevenLabs configuration out of sync while its
  last owner-verified dashboard maximum remained 480 seconds, then clear the
  marker only after the owner publishes and reports the 300-second value.
- [x] Update the source of truth, live-provider runbook, cost formulas, and
  sanitized aggregate-cost record without adding transcript, CV, audio, account,
  or secret content.
- [x] Change **Max conversation duration** to 300 seconds in the private
  ScreenPilot/Main dashboard and publish it. The owner reported completion on
  2026-09-28 at immutable revision
  `agtvrsn_2101m3m80ezpee3bvccqy3ymwamk`; source now records 300 seconds as the
  last verified duration and `dashboardSyncRequired` is false. The
  `agtvrsn_` value is a revision ID, not the unchanged Main `agtbrch_` identity.
  This publication is configuration evidence and does not claim a Preview or
  paid conversation.
- [x] Confirm one five-minute deterministic deadline reaches the same
  first-reason-wins completed workspace at `05:00`; a paid five-minute live
  call is not required merely to prove the timer.

Deterministic verification on 2026-09-28 used fake providers with paid-demo
access disabled. The focused frontend deadline, reconnect, completion,
preflight, transport, and provider-adapter suite passed 124 tests; the focused
backend policy, prompt, and bootstrap suite passed 73 tests; and the contracts
suite passed 63 tests. An additional entry, preflight, and persisted-session
suite passed 60 tests. Contracts, backend, and frontend also passed typecheck,
lint, and production build verification. The local host used Node 22.23.2 and
therefore emitted the repository's expected Node 24 engine warning; the checks
themselves completed successfully.

After the owner published the provider change, the focused source-controlled
ElevenLabs mapping test passed 2 tests with revision
`agtvrsn_2101m3m80ezpee3bvccqy3ymwamk`, last-verified duration 300, and
`dashboardSyncRequired: false`. Backend typecheck and zero-warning lint remained
clean in fake/unpaid mode.

### Final trust boundary

```text
anonymous browser
  -> public Next.js/Cloud Run frontend and same-origin /v1 proxy
      -> audience-bound frontend runtime identity
          -> IAM-authenticated Express/Cloud Run backend
              -> Cloudflare Turnstile, OpenAI, and ElevenLabs

browser-only PDF/microphone/session state
  -> bounded API and provider inputs
  -> browser-only transcript/insight/review state
```

- The frontend is the only unauthenticated visitor-facing origin. Browser code
  uses relative `/v1/**` URLs and never receives the backend origin or service
  token.
- Production frontend-to-backend calls use a Google-signed ID token with the
  stable backend `run.app` origin as the exact audience. The backend Cloud Run
  service requires the Invoker IAM check and grants service-level
  `roles/run.invoker` only to the existing frontend runtime identity.
- Local frontend-to-backend development is explicitly unauthenticated only for
  the canonical loopback backend on port 3001, leaves the audience blank, and
  never contacts Google metadata.
- The system remains stateless: candidate CV, transcript, audio, and summary
  content stays inside the active browser/request lifecycle. No database,
  durable session, candidate registry, analytics payload, queue, cache, or
  object store is introduced.

### Final application controls

- The proxy forwards only `Accept`, `Content-Type`, `Cookie`, and `Origin`,
  recalculates `Content-Length` from the bounded body, creates the internal
  source signal server-side, and preserves upstream `Set-Cookie` plus the
  server-generated `X-Request-Id`. The backend disables Express proxy trust and
  accepts the internal source signal only across the production service hop.
- Request admission remains bounded and per-instance. Fixed route-global,
  source, and signed-session windows are evaluated atomically; identity tables
  never discard active enforcement state to admit new state, memory remains
  bounded, and saturation telemetry is content-free.
- Unsupported request shapes are rejected before body work. Frontend receipt
  has a ten-second whole-body deadline, disconnect cancellation, and a 64 KiB
  maximum. Backend mutation routes use cheap pre-body gates, route-scoped JSON
  parsing, a two-lease body-receipt limit, strict Zod validation, and only then
  acquire provider capacity.
- Readers, timers, listeners, requests, body-receipt leases, provider-capacity
  leases, media tracks, and provider sessions touched by these paths must be
  released on every success, rejection, timeout, disconnect, and unmount path.
- Signed anonymous cookies and interview grants, exact allowed-origin checks,
  action-specific Turnstile verification, CSP/security headers, no-store
  responses, provider timeouts/output limits, content-free redacted logs, the
  paid kill switch, and Cloud Run/provider caps remain mandatory.
- Legitimate CV upload, conversation-first preparation, interview, review,
  Turnstile, provider, and responsive UI behavior remains unchanged.

### Required frontend connection schema

Local `apps/frontend/.env.local` follows the committed blank schema without
placing credentials in the frontend:

```dotenv
BACKEND_AUTH_MODE=local
BACKEND_ORIGIN=http://127.0.0.1:3001
BACKEND_AUTH_AUDIENCE=
```

The production Cloud Run frontend uses:

```dotenv
BACKEND_AUTH_MODE=google-cloud-oidc
BACKEND_ORIGIN=<stable backend run.app HTTPS origin>
BACKEND_AUTH_AUDIENCE=<same stable backend run.app HTTPS origin>
```

The audience must equal the backend origin exactly. A custom domain, path, or
trailing slash is not the default audience contract.

### Local implementation and acceptance

- [x] Production and local connection modes fail closed outside their explicit
  origin/audience contracts. The token client validates audience and expiry,
  deduplicates retrieval, caches with a refresh margin, uses a three-second
  metadata timeout, and never exposes token content in errors or logs.
- [x] Focused tests cover request-header allow-listing, canonical IPv4/IPv6
  source normalization, the production/local trust adapters, independent
  source buckets, and preserved cookie/request-ID behavior.
- [x] Admission tests cover route-global/source/session decisions, bounded
  saturation, stable retry behavior, content-free telemetry, and cleanup.
- [x] Request-body tests cover supported route shapes, declared/observed size,
  receipt timeout, disconnect cancellation, route-scoped parsing, lease
  cleanup, strict validation, and provider-call exclusion before admission.
- [ ] Unauthenticated direct backend calls return `401`/`403`, the
  audience-bound frontend runtime succeeds, owner-token health returns `200`,
  and Cloud Run probes remain healthy. **Blocked by the separately approved
  Cloud Run/IAM change.**
- [ ] The deployed fake/unpaid path confirms the configured platform source
  contract, bounded admission behavior, request receipt limits, cleanup, and
  unchanged legitimate CV/interview/UI behavior. **Blocked by deployment and
  cloud approval.**

### Deterministic verification evidence

- Focused fake/unpaid contract, frontend, and backend suites passed for the
  connection boundary, proxy behavior, source normalization, bounded admission,
  request-body handling, validation ordering, and cleanup.
- The existing full fake/unpaid frontend and backend suites, affected-workspace
  typechecks, zero-warning lints, production builds, tracked-secret and browser-
  style scans, and production dependency audit passed at their recorded local
  checkpoints.
- Automated verification did not read `.env.local`, call a live provider, use
  paid mode, contact Google metadata or Cloud Run, or mutate external state.
- No Cloud Run/IAM change, deployment, Git staging, commit, or push was part of
  the local security implementation.

### Phase 2 remaining gates

- [x] SEC-001, SEC-002, and SEC-003 application code is implemented and locally
  verified.
- [ ] Apply the Cloud Run service-level Invoker policy and deploy the exact
  audited frontend/backend revisions in the safe order below. **Requires
  separate owner approval.**
- [ ] Prove unauthenticated backend denial, authenticated frontend-runtime and
  owner health access, deployed source topology, and the complete fake/unpaid
  production smoke. **Blocked by Cloud Run/IAM and deployment approval.**
- [ ] Complete Section 3 manual testing. Paid-provider use remains separately
  gated.

### Google Cloud execution runbook — separate owner approval required

This runbook documents the later infrastructure step; **do not run it as part
of local implementation or documentation work**. Run it only after the code,
focused tests, production builds, and exact candidate commit exist and the
owner explicitly authorizes Cloud Run/IAM changes. Keep
`PAID_DEMO_ENABLED=false`. The commands follow Google's current Cloud Run IAM,
service-to-service authentication, environment-variable, and traffic-rollback
syntax:

- [Cloud Run service-to-service authentication](https://docs.cloud.google.com/run/docs/authenticating/service-to-service)
- [Cloud Run IAM access management](https://docs.cloud.google.com/run/docs/securing/managing-access)
- [`gcloud run deploy`](https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy)
- [`gcloud run services update-traffic`](https://docs.cloud.google.com/sdk/gcloud/reference/run/services/update-traffic)

The stable backend `run.app` URL is both `BACKEND_ORIGIN` and
`BACKEND_AUTH_AUDIENCE`; a custom domain is not a valid default token audience.
No command below contains or prints a provider secret.

#### 1. Set explicit non-secret variables and inspect current state

Run from the repository root in PowerShell after replacing every angle-bracket
placeholder. Do not use an uncommitted SHA.

```powershell
$screenPilotProject = '<GCP_PROJECT_ID>'
$screenPilotRegion = '<GCP_REGION>'
$screenPilotRepository = '<ARTIFACT_REGISTRY_REPOSITORY>'
$screenPilotSha = '<AUDITED_FULL_GIT_SHA>'
$screenPilotRevisionSuffix = 'sp028-' + $screenPilotSha.Substring(0, 12)
$screenPilotFrontendService = 'screenpilot-frontend'
$screenPilotBackendService = 'screenpilot-backend'
$screenPilotFrontendRuntimeSa = "screenpilot-frontend-runtime@${screenPilotProject}.iam.gserviceaccount.com"
$screenPilotBackendRuntimeSa = "screenpilot-backend-runtime@${screenPilotProject}.iam.gserviceaccount.com"
$screenPilotFrontendImage = "${screenPilotRegion}-docker.pkg.dev/${screenPilotProject}/${screenPilotRepository}/screenpilot-frontend:${screenPilotSha}"
$screenPilotBackendImage = "${screenPilotRegion}-docker.pkg.dev/${screenPilotProject}/${screenPilotRepository}/screenpilot-backend:${screenPilotSha}"

$screenPilotBackendOrigin = (gcloud run services describe $screenPilotBackendService `
  --project $screenPilotProject `
  --region $screenPilotRegion `
  --format 'value(status.url)').Trim()

gcloud run services describe $screenPilotBackendService `
  --project $screenPilotProject `
  --region $screenPilotRegion `
  --format 'yaml(metadata.name,metadata.annotations,spec.template.spec.serviceAccountName,status.url,status.latestReadyRevisionName,status.traffic)'

gcloud run services get-iam-policy $screenPilotBackendService `
  --project $screenPilotProject `
  --region $screenPilotRegion

gcloud run revisions list `
  --project $screenPilotProject `
  --region $screenPilotRegion `
  --service $screenPilotBackendService
```

Privately record the two current 100-percent revisions and save the backend IAM
policy with its `etag` for exact rollback. The chosen directory is already
ignored by Git.

```powershell
$screenPilotPreviousFrontendRevision = '<CURRENT_100_PERCENT_FRONTEND_REVISION>'
$screenPilotPreviousBackendRevision = '<CURRENT_100_PERCENT_BACKEND_REVISION>'
$screenPilotRollbackDirectory = Join-Path (Get-Location) 'docs/operations/private/sp028-rollback'
New-Item -ItemType Directory -Force -Path $screenPilotRollbackDirectory | Out-Null
$screenPilotBackendIamBackup = Join-Path $screenPilotRollbackDirectory 'backend-iam-before.json'

gcloud run services get-iam-policy $screenPilotBackendService `
  --project $screenPilotProject `
  --region $screenPilotRegion `
  --format json | Set-Content -LiteralPath $screenPilotBackendIamBackup -Encoding utf8
```

#### 2. Grant only the frontend runtime identity backend invocation

```powershell
gcloud run services add-iam-policy-binding $screenPilotBackendService `
  --project $screenPilotProject `
  --region $screenPilotRegion `
  --member "serviceAccount:$screenPilotFrontendRuntimeSa" `
  --role 'roles/run.invoker'
```

This is a service-level grant. Do not grant frontend invocation project-wide,
do not create a service-account key, and do not grant the frontend access to
backend provider secrets.

#### 3. Deploy the exact audited, auth-capable revisions

Deploy the frontend revision first. Its OIDC-capable proxy can call the still-
public backend during the short transition. `--update-env-vars` is deliberate:
it preserves unrelated existing variables. The frontend remains the public
visitor origin.

```powershell
gcloud run deploy $screenPilotFrontendService `
  --project $screenPilotProject `
  --region $screenPilotRegion `
  --image $screenPilotFrontendImage `
  --service-account $screenPilotFrontendRuntimeSa `
  --revision-suffix $screenPilotRevisionSuffix `
  --update-labels "git-sha=$screenPilotSha" `
  --update-env-vars "BACKEND_ORIGIN=$screenPilotBackendOrigin,BACKEND_AUTH_MODE=google-cloud-oidc,BACKEND_AUTH_AUDIENCE=$screenPilotBackendOrigin" `
  --min 0 `
  --max 1 `
  --concurrency 80 `
  --allow-unauthenticated
```

Then deploy the backend exact-SHA image with IAM invocation required. Preserve
its existing ordinary variables and Secret Manager mappings; do not use
`--set-env-vars` or put a secret on the command line.

```powershell
gcloud run deploy $screenPilotBackendService `
  --project $screenPilotProject `
  --region $screenPilotRegion `
  --image $screenPilotBackendImage `
  --service-account $screenPilotBackendRuntimeSa `
  --revision-suffix $screenPilotRevisionSuffix `
  --update-labels "git-sha=$screenPilotSha" `
  --min 0 `
  --max 1 `
  --concurrency 4 `
  --invoker-iam-check `
  --no-allow-unauthenticated

gcloud run services remove-iam-policy-binding $screenPilotBackendService `
  --project $screenPilotProject `
  --region $screenPilotRegion `
  --member 'allUsers' `
  --role 'roles/run.invoker' `
  --all
```

If inspection showed no `allUsers` binding, the final removal can report that
nothing matched; the required end state is still an enabled Invoker IAM check,
no public principal, and the frontend runtime service account holding
`roles/run.invoker`.

#### 4. Verify the private boundary and unpaid behavior

The logged-in owner must already have `run.routes.invoke` through an existing
owner/admin or explicit operational role. Never paste or document the token.

```powershell
$screenPilotUnauthenticatedStatus = (& curl.exe --silent --output NUL --write-out '%{http_code}' "${screenPilotBackendOrigin}/health/live").Trim()
if ($screenPilotUnauthenticatedStatus -notin @('401', '403')) {
  throw "Expected unauthenticated backend health to return 401/403, received $screenPilotUnauthenticatedStatus."
}

$screenPilotOwnerIdentityToken = (gcloud auth print-identity-token).Trim()
$screenPilotOwnerHeaders = @{ Authorization = "Bearer $screenPilotOwnerIdentityToken" }
$screenPilotLiveStatus = (Invoke-WebRequest -Uri "${screenPilotBackendOrigin}/health/live" -Headers $screenPilotOwnerHeaders).StatusCode
$screenPilotReadyStatus = (Invoke-WebRequest -Uri "${screenPilotBackendOrigin}/health/ready" -Headers $screenPilotOwnerHeaders).StatusCode
if ($screenPilotLiveStatus -ne 200 -or $screenPilotReadyStatus -ne 200) {
  throw 'Authenticated backend health verification failed.'
}
Remove-Variable screenPilotOwnerIdentityToken, screenPilotOwnerHeaders

$screenPilotFrontendOrigin = (gcloud run services describe $screenPilotFrontendService `
  --project $screenPilotProject `
  --region $screenPilotRegion `
  --format 'value(status.url)').Trim()
$screenPilotBootstrapResponse = Invoke-WebRequest -Uri "${screenPilotFrontendOrigin}/v1/demo/bootstrap" -SessionVariable screenPilotWebSession
if ($screenPilotBootstrapResponse.StatusCode -ne 200) {
  throw 'Same-origin frontend bootstrap verification failed.'
}
```

With `PAID_DEMO_ENABLED=false`, run the documented fake/unpaid boundary suite
through the frontend. Confirm the request-header/source contract, bounded
admission, body receipt/parsing limits, validation ordering, cancellation and
lease cleanup, stable content-free errors, zero provider calls before valid
admission, no backend URL in visitor output, preserved cookie/request-ID
behavior, and normal CV/interview/UI behavior. This is unpaid platform
validation, not authorization for a paid flow.

#### 5. Roll back both revisions and IAM together if any check fails

Restore the saved IAM policy first so the previously public frontend revision
can reach the previous backend, then move both services to the recorded known-
good revisions. The saved `etag` prevents overwriting an IAM policy that changed
after the snapshot; stop and investigate rather than deleting it.

```powershell
gcloud run services set-iam-policy $screenPilotBackendService $screenPilotBackendIamBackup `
  --project $screenPilotProject `
  --region $screenPilotRegion

gcloud run services update-traffic $screenPilotBackendService `
  --project $screenPilotProject `
  --region $screenPilotRegion `
  --to-revisions "${screenPilotPreviousBackendRevision}=100"

gcloud run services update-traffic $screenPilotFrontendService `
  --project $screenPilotProject `
  --region $screenPilotRegion `
  --to-revisions "${screenPilotPreviousFrontendRevision}=100"
```

After rollback, rerun the previous revision's documented unpaid health and
same-origin routing checks. Do not delete the failed or rollback image until the
owner has reviewed the incident and selected the retained recovery revision.

#### Cloud Console fallback

The CLI above is canonical; Google changes Console labels occasionally. If the
CLI is unavailable after separate owner approval:

1. Before changing a service or permission, record the current 100-percent
   frontend and backend revision names and export the backend IAM policy with
   its `etag` to the ignored rollback location documented above. Then open the
   backend service **Permissions** panel and add
   `screenpilot-frontend-runtime@<project>.iam.gserviceaccount.com` as a
   service-level **Cloud Run Invoker** principal. Leave the current backend
   revision public and leave its existing `allUsers` binding in place during
   this transition. Do not change the backend runtime service account's
   separate Secret Manager grants.
2. Open **screenpilot-frontend → Containers / Variables & Secrets**. Deploy the
   exact-SHA frontend revision with the non-secret server-only values
   `BACKEND_ORIGIN=<backend run.app URL>`,
   `BACKEND_AUTH_MODE=google-cloud-oidc`, and
   `BACKEND_AUTH_AUDIENCE=<same backend run.app URL>`. Keep the frontend public,
   on its existing runtime service account, maximum one instance, and
   concurrency 80. Confirm the new frontend revision is ready and its
   same-origin bootstrap can still reach the not-yet-private backend.
3. Only after the auth-capable frontend is ready, open **Cloud Run →
   screenpilot-backend → Security**, select **Require authentication → Identity
   and Access Management (IAM)**, and deploy the exact-SHA backend revision with
   the existing backend runtime service account, variables, secret mappings,
   minimum zero, maximum one, and concurrency four. Then remove `allUsers` from
   **Cloud Run Invoker** and confirm the frontend runtime service account retains
   its service-level Invoker grant.
4. Verify the revision image digests and IAM principals, unauthenticated backend
   `401`/`403`, authenticated owner health `200`, same-origin frontend bootstrap,
   the documented fake/unpaid boundary checks, and preserved legitimate
   CV/interview/UI behavior. Use the saved IAM policy and previous revision
   names for rollback.

## Section 3 — Manual testing and release evidence

Manual testing starts only after Sections 1 and 2 are implemented and their
focused deterministic checks pass. Record browser/version, OS/device or
emulation, viewport, motion preference, zoom, input method, scenario, result,
and defect link. A screenshot alone is not a pass.

### 3.1 Landing and motion matrix

- [ ] Inspect 320; 360 × 800; 375 × 667; 390 × 844; 768 × 1024; 820 ×
  1180; 1024 × 600/768; 1280 × 800; 1366 × 680; 1440 × 800/900; 1600 ×
  900; 1920 × 1080; and 2560 × 1440.
- [ ] Drag-resize slowly through both content-pressure breakpoints instead of
  testing only presets. Confirm no preview peek, overlap, horizontal overflow,
  visual jump, or disconnected story state.
- [ ] Check phone/tablet portrait and landscape, dynamic browser chrome, safe
  areas, 200% zoom, keyboard-only navigation, touch, trackpad/wheel, fast and
  reverse swipes, background/foreground, and long translated-like copy.
- [ ] Force both `prefers-reduced-motion: no-preference` and `reduce`. Confirm
  feature cards and preview wait for visibility, run once as designed, pause
  off-screen/hidden/focused, and clean up without flashes or stale timers.
- [ ] Disable JavaScript/observer support in a focused fallback check and prove
  the complete hero/story content remains visible in reading order.

### 3.2 Removed sample-product boundary

- [ ] On `localhost`, `127.0.0.1`, and a production bootstrap fixture, confirm
  the button, capability, and all sample-specific recovery references are
  absent.
- [ ] Confirm the unadvertised loopback fixture remains usable for deterministic
  extraction checks and direct fixture requests on deployed hostnames return
  404.
- [ ] Confirm an ordinary uploaded synthetic PDF still validates/extracts and
  conversation-first remains available.

### 3.3 Security-control verification

- [ ] Verify the deployed request-header and canonical-source contract through
  frontend and authenticated operational paths without recording source values.
- [ ] Verify configured route/source/session admission, bounded memory,
  deterministic retry behavior, and zero provider calls after rejection.
- [ ] Verify request-shape, receipt, parsing, cancellation, and cleanup limits
  with content-safe errors and no provider work before valid admission.
- [ ] Rerun existing origin, cookie, grant, Turnstile replay/action/hostname,
  capacity, paid-kill-switch, CSP/header, log-redaction, and provider-call-count
  regressions to prove the final controls preserve established behavior.

### 3.4 New-CV assisted path — mandatory owner reminder

Before portfolio approval, remind the owner to run the CV-assisted path with a
text-based PDF that ScreenPilot has never processed before. The purpose is to
test genuine extraction, normalization, evidence, role suggestion/correction,
plan, interview, summary, and Clear-session behavior rather than memorizing the
bundled Riley Vale fixture.

The owner may find a public template through Google, but must not use a random
real person's CV. Use a newly authored synthetic CV or an explicitly licensed,
public template populated only with fictional data. Verify it is text-based,
under 5 MB/eight pages/40,000 extracted characters, contains no real contact or
candidate data, and is materially different from every existing fixture.

- [ ] Record the file's synthetic/licensed provenance without committing the
  PDF or its candidate content.
- [ ] In local deterministic fake mode, confirm extraction evidence is new and
  no sample-placeholder fact leaks into the result.
- [ ] With separate explicit permission for a bounded live test, confirm one CV
  analysis, one voice-token operation, one completed interview, and one summary
  operation; do not rerun unless a named defect invalidates the evidence.
- [ ] Confirm the candidate can correct the suggested role, all questions remain
  universal HR rather than profession-specific assessment, evidence links are
  accurate, summary uncertainty is honest, and Clear session removes browser
  content.
- [ ] Keep OpenAI sharing limited to the selected ScreenPilot project and only
  for synthetic data during the authorized test. Before any real CV, real
  candidate detail, or public/non-synthetic use, stop, disable sharing, and
  verify the dashboard state. The preferred outcome is never to use real data.

### 3.5 Final owner gate

- [ ] Reconcile every acceptance box in this ticket and every open blocker.
- [ ] Run the smallest complete deterministic gate on the exact candidate and
  review the diff for secrets, candidate content, debug output, dead code,
  unsafe casts, stale TODOs, duplicate components/schemas/constants/provider
  calls, and leaked listeners/timers/requests.
- [ ] Present the exact commit, local/manual evidence, remaining unchecked
  credential/paid/hardware items, and rollback considerations to the owner.
- [ ] Wait for explicit deployment permission. Passing SP-028 does not deploy,
  enable paid mode, change DNS, or authorize a live-provider rerun.

## Focused deterministic verification plan

Select the smallest relevant commands for the files changed. Every test command
must set the fake/unpaid environment in the same process before the test runner
loads. The implementation should normally include:

```powershell
$env:PROVIDER_MODE='fake'
$env:PAID_DEMO_ENABLED='false'
corepack pnpm@11.24.0 --filter @screenpilot/contracts test:unit -- public-runtime-config.test.ts
corepack pnpm@11.24.0 --filter @screenpilot/frontend test:unit -- cv-stage.test.tsx backend-proxy.test.ts illustrative-interview-preview.test.tsx
corepack pnpm@11.24.0 --filter @screenpilot/backend test:unit -- app.test.ts stateless-rate-limit.test.ts
```

Add focused landing/story tests under feature-owned filenames rather than
growing one catch-all suite. Then run the affected workspace typechecks/lint,
`corepack pnpm@11.24.0 security:scan`,
`corepack pnpm@11.24.0 security:audit:dependencies`, and production builds.
Run the whole quick gate only once the focused failures are resolved.

Automated tests must not load `.env.local`, connect to ports 3000/3001, or make
network/provider calls. Manual browser checks use the locally built apps only
until the owner separately authorizes deployment or a paid test.

## Commit boundary

The intended implementation is one coherent post-deployment hardening ticket.
It may touch the public runtime contract, bootstrap composition, CV feature,
landing feature/hooks/styles, frontend proxy, backend admission/rate-limit
security, focused tests, and synchronized documentation. It must not include
unrelated visual polish, provider tuning, portfolio recording, dependency
upgrades, or deployment changes.

Do not stage, commit, push, rewrite history, or deploy unless the owner asks for
that exact Git or deployment action. If a ticket commit is later authorized,
its subject begins exactly with `SP-028: `.

## Completion handoff

Report the files changed; every focused and full verification performed; the
responsive/motion/security matrices completed; the unseen synthetic-CV result;
and every unchecked item with its blocker. Phase 1 owner visual approval is
recorded above. Explicitly state that deployment, paid-provider actions,
credentials, real-candidate data, and final release approval remain unchecked
unless the owner separately completed them.
