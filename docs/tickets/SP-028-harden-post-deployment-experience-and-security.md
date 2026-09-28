# SP-028 — Harden the post-deployment experience and security boundaries

Status: In progress — Phase 1 UI/UX complete and owner-approved; Phase 2 security work not yet authorized<br>
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
2. remediate the confirmed, material threats from a complete STRIDE review;
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
- the official [Microsoft STRIDE categories](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats),
  [Express proxy guidance](https://expressjs.com/en/guide/behind-proxies.html),
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
2026-09-28. Section 2 remains a separate explicit owner gate.

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
2 and Section 3 remain intentionally untouched until the owner explicitly asks
to continue.

## Section 2 — Material STRIDE security review and remediation

### Threat model boundary

The security review covers these real boundaries:

```text
anonymous browser
  -> public Next.js/Cloud Run frontend and same-origin /v1 proxy
  -> Express/Cloud Run backend
  -> Cloudflare Turnstile, OpenAI, and ElevenLabs

browser-only PDF/microphone/session state
  -> bounded API and provider inputs
  -> browser-only transcript/insight/review state
```

Assets are provider credentials and spend, Turnstile tokens, the signed
anonymous cookie and interview grant, candidate CV/transcript/audio/summary
content, evidence integrity, service availability, and the interview/tool
policy. The system has no user accounts, recruiter roles, database, or durable
candidate records; the threat model must not pretend those assets exist.

### Finding summary

Only threats with a concrete path and a useful correction are implementation
findings. Severity accounts for the existing maximum-one-instance/provider-cap
controls and the deliberately small anonymous portfolio audience.

| ID | STRIDE | Severity | Confidence | Concrete risk |
| --- | --- | --- | --- | --- |
| SP028-SEC-001 | Spoofing, Tampering, DoS | High | High | The frontend forwards client-controlled forwarding headers while Express trusts a numeric one-hop topology. Cloud forwarding chains can therefore resolve the source bucket to a shared proxy or another unintended hop, allowing one actor to exhaust a bucket for unrelated visitors and making abuse attribution unreliable. |
| SP028-SEC-002 | DoS, Elevation of resource use | High | High | A stream of fresh source/session identities evicts active rate-limit buckets. Existing tests prove 2,000 fresh sources are all accepted with a two-entry table and an evicted source is immediately accepted again. Attackers can churn identity to bypass the intended request window and pressure paid routes. |
| SP028-SEC-003 | DoS | High | High | The frontend can wait indefinitely while buffering a bounded but slow request stream, and Express parses the complete JSON body before route admission. A few slow bodies can occupy the configured frontend/backend concurrency before rate or provider-capacity gates run. |

#### SP028-SEC-001 — Establish one trustworthy request-source boundary

**Evidence**

- `backend-proxy.ts` clones all incoming request headers and removes only Host
  and standard hop-by-hop headers. It does not remove `Forwarded`,
  `X-Forwarded-*`, `X-Real-IP`, or provider-specific client-address headers.
- Production Express uses `trust proxy = 1`; admission keys `request.ip`.
- Google documents that a forwarding chain may include an unverified supplied
  prefix followed by the client and load-balancer addresses. Express warns that
  numeric hop counts are safe only when every route has the same verified proxy
  distance and the last trusted proxy overwrites forwarding values.
- ScreenPilot has at least frontend-proxied and operational direct-backend paths,
  so a one-hop assumption is not an adequate trust contract.

**Correction**

- Replace clone-and-delete proxying with an explicit allow-list of headers the
  backend actually needs: content type/length, Origin, Cookie, accepted request
  tracing, and nothing else. Strip all inbound forwarding, host/proto, internal
  authentication, platform, and connection headers before constructing the
  upstream request.
- Choose and document exactly one production ingress/source model. Preferred:
  make the backend invokable only by the frontend runtime identity, authenticate
  service-to-service calls, and propagate a canonical client source in an
  internal header that public callers cannot forge. If that infrastructure
  change is rejected, move the source-keyed edge limiter to the frontend and
  let the backend enforce session/global budgets without trusting a client-
  supplied address. Do not invent a magic `trust proxy` number.
- Keep direct backend health operations compatible with the chosen private
  ingress through an authenticated operational path. Do not expose a second
  visitor-facing API origin.
- Centralize source parsing and test Google-documented chains, malformed values,
  IPv4/IPv6, multiple values, direct/proxied requests, and hostile forwarding
  headers. Never log the source address or raw headers.

**Acceptance**

- [ ] A public request cannot select the address used for a source rate bucket.
- [ ] Two legitimate sources do not share a bucket merely because the final hop
  is Cloud Run or the Next service.
- [ ] Direct and proxied paths have one explicit, tested policy; ambiguous paths
  fail closed or omit source identity rather than trusting a caller string.
- [ ] Frontend proxy tests enumerate every forwarded request header and prove
  forwarding/client-IP/internal-platform headers are absent.

#### SP028-SEC-002 — Make bounded rate limiting resistant to identity churn

**Evidence**

`stateless-rate-limit.ts` evicts the soonest-expiring unrelated active entry
when `maxEntries` is full. Its unit tests intentionally accept 2,000 unique
sources into a two-entry limiter and then show that the first evicted source can
start a fresh window. This bounds memory by deleting enforcement state.

**Correction**

- Never evict an unexpired bucket merely to admit a new identity. Expire entries
  normally. When the table is saturated, route unseen identities through a
  bounded overflow/global bucket or reject them with a stable retry window.
- Add a per-route global request budget ahead of the source/session budgets so
  identity rotation cannot create unbounded aggregate operations. Paid-route
  provider/concurrency caps remain the final backstop, not the primary request
  limiter.
- Preserve atomic admission when one request needs both source and session keys;
  it must not increment one and fail to create the other.
- Emit only content-free counters/events for saturation and rejections. Never
  log fingerprints, raw IPs, cookies, grants, or candidate content.
- Preserve bounded memory and the current efficient expiry index. Do not add a
  database, Redis, browser fingerprinting, or a persistent IP ledger.

**Acceptance**

- [ ] A churn test cannot reset an existing actor's window or obtain one allowed
  request per new identity indefinitely.
- [ ] Table saturation is bounded and observable without disclosing identity.
- [ ] Global, source, and session decisions have stable `Retry-After` behavior
  and route-specific limits.
- [ ] Existing Turnstile, paid kill switch, Cloud Run maximum instance, provider
  credit/usage caps, and fail-closed provider behavior remain intact.

#### SP028-SEC-003 — Bound work before reading/parsing request bodies

**Evidence**

- The Next proxy checks a 64 KiB size ceiling but each `reader.read()` can wait
  without a route-owned deadline.
- Express installs the global JSON parser before cookie parsing and route-level
  request admission. A direct request can therefore consume the complete body
  read/parse path before rate and capacity decisions.
- The backend request timeout is 30 seconds and production backend concurrency
  is four. Repeated slow bodies can occupy all four slots even though no paid
  provider operation starts.

**Correction**

- Reject unsupported methods, content types, invalid/oversized Content-Length,
  and disallowed origins before reading a body.
- Give the frontend stream reader an explicit short deadline and combined abort
  signal; cancel the reader and upstream work on timeout or disconnect.
- Add a cheap pre-body admission layer at the backend, then use route-scoped
  bounded JSON parsing/validation. Keep the provider-capacity lease after strict
  body validation so malformed/slow bodies do not hold scarce paid-operation
  capacity. A separate small body-read concurrency gate is acceptable.
- Keep the 64 KiB maximum, strict JSON, typed terminal error mapping, no retries,
  and content-free logs. Choose timeout values from measured local/Cloud Run
  behavior and document them in `.env.example` if configurable.

**Acceptance**

- [ ] Never-ending, slow-chunked, missing-length, invalid-length, oversized,
  wrong-content-type, aborted, and disconnected requests terminate within the
  documented bound and never contact a provider.
- [ ] Admission occurs before expensive body parsing while provider capacity is
  acquired only for a validated paid operation.
- [ ] The frontend and backend release readers, listeners, timers, and leases on
  every success/error/abort path.

### Complete STRIDE disposition

| Category | Disposition after code review |
| --- | --- |
| Spoofing | Actionable through SP028-SEC-001: the source identity used for rate limiting does not have a trustworthy ingress contract. The signed anonymous cookie and HMAC interview grant otherwise provide the intended anonymous-session binding. |
| Tampering | Actionable where forwarded address metadata changes enforcement identity (SEC-001). Candidate/provider payload tampering is already constrained by strict Zod boundaries, grant/session/plan binding, evidence IDs, local summary reconciliation, and client-tool schemas; no separate defect was found. |
| Repudiation | No separate actionable defect. The app makes no real-world identity or hiring-decision claim. Server-generated request IDs and content-free structured result/error logs provide appropriate operational evidence. SEC-002 adds saturation counters without candidate/IP logging. |
| Information disclosure | No new actionable defect found. Secrets remain backend-only; candidate content is absent from logs/URLs; CSP/no-store/redaction and browser-only state are present. The synthetic sample PDF is not confidential and UX-001 must not be mislabeled as a leak. |
| Denial of service | Actionable through all three findings: shared/incorrect source buckets, active-bucket eviction under churn, and pre-admission slow-body work. |
| Elevation of privilege | There is no account/role privilege model. SEC-002 is the relevant elevation of anonymous resource allowance: rotating identity can exceed the rate window. Existing provider caps limit impact but do not make the bypass acceptable. |

### Controls validated and deliberately not filed as “findings”

Do not pad the audit with generic checklist observations. The following controls
were inspected and should be preserved, not rewritten without evidence:

- exact allowed-origin enforcement on mutations, signed HttpOnly/SameSite
  anonymous cookies, HMAC grants bound to session/plan/entry mode and expiry;
- Turnstile action and hostname verification before paid operations;
- strict bounded request/provider schemas, provider timeouts and output limits,
  abort propagation, one-operation summary behavior, and no retry of validation,
  authentication, rate-limit, or non-retryable failures;
- CSP nonce, no broad script `unsafe-inline`, exact provider origins, security
  headers, `Cache-Control: no-store`, and content-free redacted logs;
- prompt-injection instructions, untrusted-data boundaries, strict client tools,
  evidence grounding, and deterministic local reconciliation;
- stateless browser-only candidate state, explicit Clear session, no raw PDF/CV
  persistence, and no server candidate registry;
- passing tracked-secret scan and no known production dependency vulnerability
  on the audited revision.

The audit intentionally rejects low-value claims such as “add authentication”
to an anonymous demo, “encrypt the public synthetic fixture,” “add a database
for rate limits,” “sessionStorage is always insecure,” or generic reminders to
use HTTPS/CSP/secure cookies that the product already uses. New security work
must identify an exploitable boundary, precondition, impact, and regression.

### Security implementation order

1. Fix and test the header allow-list and choose the production ingress/source
   identity model. Any Cloud Run IAM change requires separate owner approval.
2. Replace active-entry eviction with overflow/global fail-closed admission and
   expand adversarial churn coverage.
3. Add pre-body checks, read deadline/cancellation, and route-scoped parsing.
4. Rerun focused backend/frontend tests, the secret scans, production dependency
   audit, and an unpaid local negative-request smoke. Do not deploy.

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

### 3.3 Security-negative matrix

- [ ] Exercise hostile forwarding-header chains through frontend-proxied and
  direct test paths; record the trusted source decision without recording an IP.
- [ ] Exercise source/session churn beyond the entry ceiling; existing buckets
  remain enforced, aggregate overflow closes, memory stays bounded, and no
  provider fake is called after rejection.
- [ ] Exercise slow/chunked/aborted/oversized/invalid JSON and unsupported
  method/content-type requests against both boundaries; verify deadlines,
  cleanup, `Retry-After` where applicable, and content-safe errors.
- [ ] Rerun existing origin, cookie, grant, Turnstile replay/action/hostname,
  capacity, paid-kill-switch, CSP/header, log-redaction, and provider-call-count
  regressions to prove the fixes did not weaken working controls.

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
