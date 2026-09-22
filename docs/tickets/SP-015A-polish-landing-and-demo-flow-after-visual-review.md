# SP-015A — Polish the landing and demo flow after visual review

Status: Required corrective ticket — implementation complete; consolidated owner visual acceptance pending  
Milestone: Milestone 2 — browser voice experience  
Last synchronized: 2026-09-14  
Depends on: SP-005, SP-011A, SP-012, SP-013, SP-015  
Suggested commit: `SP-015A: polish the landing and demo flow`  
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Turn the owner’s post-SP-015 visual review into one explicit, reviewable correction boundary. Polish the landing demonstration and every currently reachable `/demo` state so motion communicates the product clearly, controls navigate predictably, and typography, spacing, cards, headings, and responsive composition all come from the shared ScreenPilot design system.

## Why this corrective ticket exists

SP-011A established the modern landing and early demo direction, SP-012/SP-013 built the two preparation paths and preflight, and SP-015 completed the deterministic live-call surface. Once these parts could be viewed together in the running fake-mode application, the owner found cross-ticket UI/UX defects that were not clear in isolated implementation:

- the illustrative conversation highlighted evidence before the spoken lines had fully appeared and applied the highlight as an abrupt state change instead of a readable left-to-right marker stroke;
- Pilot had no equally clear speaking response on the laptop, and the participant/laptop drawing read as an unnatural white cartoon figure looking at the wrong side of a laptop;
- related landing CTAs did not share navigation behavior, scrolling felt abrupt, reflowed market statistics used mixed number alignment, and transformed feature-card text could look soft;
- the `/demo` shell repeated dense technical/privacy explanations, placed unrelated explanatory copy beside titles, retained a redundant footer, and varied page-heading markup, typography, card spacing, and vertical rhythm between stages;
- preflight exposed infrastructure details instead of giving the candidate a short, friendly explanation of microphone use, adaptive questions, human-reviewed notes, consent, and starting the interview.

This ticket records those owner-directed corrections without reopening the reducer, provider, privacy, role-neutral, or no-automated-decision contracts.

## Authoritative visual-review decisions

### Landing motion and navigation

- Keep the four hero feature cards as semantic HTML with code-native SVG icons and crisp text. Avoid scale-based resting transforms or raster enlargement that softens typography; rotation/translation may shape the desktop composition only when the final rendered text remains sharp.
- Reveal each illustrative Pilot question and candidate answer completely before highlighting evidence. Draw the question and answer evidence highlights at the same time from left to right, then create the corresponding note card only after both highlight strokes finish.
- Animate the participant waveform only during the candidate turn. During Pilot’s turn, animate the ScreenPilot mark/voice rings on the outside of the laptop lid so both speakers have a clear but restrained active state.
- Keep the participant generic, featureless, and warm-toned. Remove eyes, smile, and ambiguous white limb shapes. From the viewer’s position across the desk, show the broad outside rear lid facing the viewer, centered in front of the participant, with the keyboard deck mostly hidden behind it and only a thin hinge/base silhouette visible.
- Route the product mark to clean `/` and header **Start demo** directly to `/demo`. The header **How it works**, hero **See it step by step**, and hero entry CTA use the reusable deliberate-scroll behavior, retain target markup as fallback, and use the owner-approved brisk smooth duration without writing `#top`, `#how-it-works`, or `#start` into the address during ordinary activation.
- When market-evidence cards stack at tablet/phone widths, left-align every percentage with its card copy. Desktop asymmetry may use different placement only while the board remains a side-by-side composition.

### `/demo` information hierarchy

- Remove the repeated safeguard footer from every `/demo` state. Keep one **Privacy details** dialog trigger in the header immediately before **Clear & exit**.
- Every reachable state—bootstrap/error, choose, CV intake/status/error, conversation preparation/error, plan, preflight, connection, live interview, and future-state fallback—starts with one short uppercase pretitle followed immediately by one page-level title.
- At widths that can hold them, page titles use the full task width and remain on one line. Compact widths wrap naturally. Do not force a two-line title through a narrow column, and do not float a detached explanatory sentence to its right.
- Put necessary guidance inside the relevant card or error panel. Keep status/error headings subordinate to the single page-level `h1`.
- Use one shared demo-stage heading primitive and one token-owned vertical rhythm. Page titles, section titles, body copy, metadata, stage gaps, card gaps, and card padding must use the established typography and spacing tokens rather than stage-specific approximations.
- Preserve denser component-specific layouts only where their information density requires it (for example live controls and evidence cards); those exceptions still use design-system tokens.

### Candidate-friendly preflight

- Keep preflight to two stacked cards below the standard pretitle/title: one short **How the interview works** card and one privacy/consent/microphone card.
- Explain only what the candidate needs to know: ScreenPilot uses microphone audio during the interview, the AI uses the candidate’s answers (and CV only on the CV-assisted path) to ask follow-ups, key details become notes for a person to review, the demo can be stopped, and ScreenPilot does not score or decide.
- Do not reveal provider names, WebRTC, Turnstile, API architecture, storage implementation, retention configuration, anti-abuse internals, or other infrastructure on the preflight page.
- Keep **Check microphone** next to its plain-language explanation. Keep **Start interview** as the clear final action at the lower right on wide layouts and full-width/reachable on compact layouts.

## Scope boundaries

- Do not implement SP-016 client tools, Insight Board behavior, evidence correction, or role/preferred-name capture.
- Do not change live-event normalization, transcript contracts, provider adapters, API schemas, environment configuration, or reducer stage authority.
- Do not add analytics, persistence, a database, durable sessions, saved audio, saved transcripts, or candidate profiles.
- Do not expose OpenAI, ElevenLabs, or Turnstile credentials or identifiers to the browser. Do not read or modify ignored `.env.local` files; fake mode remains the default verification path.
- Do not add a second mobile implementation. Reuse the same semantic components and state with responsive composition.
- Do not stage, commit, or push as part of ticket creation. The ticket ID only defines the later commit boundary.

## Implementation checklist

- [x] Correct the illustrative conversation sequence so complete question/answer text precedes synchronized drawn highlights and the note appears last.
- [x] Add a restrained Pilot-speaking animation on the outside laptop mark and preserve the candidate-only waveform state.
- [x] Redraw the generic participant and rear laptop orientation without facial features, white skin/limbs, a visible front screen, or ambiguous geometry.
- [x] Keep hero feature cards and their copy crisp at rest across common device-pixel ratios.
- [x] Share the clean-route deliberate-scroll function across same-page CTAs, route the product mark to `/`, and route **Start demo** directly to `/demo`.
- [x] Left-align reflowed market-evidence percentages at tablet and phone widths.
- [x] Remove the `/demo` safeguard footer and move **Privacy details** into the header before **Clear & exit**.
- [x] Give every reachable `/demo` state the same pretitle-plus-page-title hierarchy.
- [x] Simplify preflight into two candidate-language cards with no infrastructure disclosure.
- [x] Consolidate demo heading markup, page/section typography, stage rhythm, card spacing, and responsive gaps into shared primitives and tokens; remove superseded one-off selectors and duplicated markup.
- [x] Update focused component tests and synchronized design/source documentation for the corrected behavior.

## Acceptance criteria

- [ ] The landing animation visibly follows speak question → speak answer → draw both highlights together → add note, without a layout shift or instant highlight flash.
- [ ] Candidate and Pilot speaking turns are visually distinguishable without adding playback controls, noisy motion, or an AI-avatar implication.
- [ ] The participant reads as a humane, anonymous person using a laptop whose outside lid faces the viewer.
- [ ] All landing CTAs reach their intended target, same-page CTAs share one interruptible brisk implementation, and ordinary activation leaves the address fragment-free while target markup remains available as fallback.
- [ ] Reflowed statistics use one consistent left alignment; transformed hero-card typography remains visually crisp.
- [ ] `/demo` has no repeated safeguard footer, while **Privacy details** and **Clear & exit** remain reachable in the header.
- [ ] Every reachable `/demo` state has exactly one page-level `h1`, immediately preceded by the standard pretitle; desktop titles use available width and compact titles wrap without overflow.
- [ ] Preflight presents two stacked cards in candidate-friendly language, keeps microphone consent explicit, reveals no provider/infrastructure setup, and leaves the start action obvious.
- [x] Computed page-title typography, pretitle typography, heading gap, stage gap, section-title typography, and card rhythm resolve from the same design-system primitives/tokens across choose, both preparation paths, plan, preflight, connection, and live interview.
- [x] The work introduces no persistence, provider call, candidate-data leak, secret exposure, duplicate workflow state, or SP-016 behavior.

## Focused verification

- [x] Run the smallest relevant landing, illustration, anchor-scroll, entry, CV, plan, preflight, connection, interview, and shared-foundation component tests.
- [x] Run frontend lint and typecheck plus `git diff --check`.
- [ ] In deterministic fake mode, inspect the landing animation and the `/demo` choose, CV, conversation-first preparation, plan, preflight, connection-error/fake connection, and live-interview surfaces without granting real microphone access or making a paid provider call.
- [ ] Check phone portrait, tablet, compact laptop, laptop/desktop, large monitor, and at least one intermediate drag-resized width. Confirm no horizontal overflow, accidental two-column title treatment, nested scroll trap, clipped action, or inconsistent reflowed statistic alignment.
- [ ] Check keyboard focus, clean-route scrolling plus fallback target semantics, scroll interruption cleanup, reduced-motion behavior, one-`h1` hierarchy, and Privacy-dialog focus return.
- [x] Compare computed typography and spacing on representative states to confirm shared token values rather than visually similar one-off rules.
- [x] Record anything that requires real microphone hardware, credentials, or paid/live provider calls as explicitly unchecked and deferred; those are not authorized by this ticket.

## Verification evidence

- The `/demo` bootstrap, choose, CV intake/status, plan, preflight, connection, fallback, and live-interview heading markup now converges on `DemoStageHeading`; the old CV/plan heading variants and their responsive selectors are removed.
- The shared token source now owns page title, 22/28 panel title, 15/20 card title, live caption, body, metadata, narrow-phone progress metadata, title/label tracking, and the missing 28 px spacing step. `/demo` owns one responsive stage gap, card gap, and card padding variable, and the checkbox uses the semantic accent instead of an undefined color token.
- The task region is top-aligned directly beneath progress, so short stages no longer acquire a content-height-dependent blank band. Compact layouts keep natural document scrolling.
- Ten focused files pass all 51 tests. Frontend ESLint and TypeScript generation/typecheck pass; Prettier reports all touched implementation files formatted; `git diff --check` passes; a CSS custom-property audit reports no undefined `--sp-*` reference.
- The deterministic local browser was inspected at 320 × 844, 390 × 844, 768 × 1024, 1024 × 768, 1100 × 820, 1280 × 800, 1440 × 900, and 1920 × 1080. Representative choose, CV, plan, and preflight states show an 8 px pretitle/title gap, token-owned stage/card rhythm, 32 px desktop and 28 px compact page titles, 22 px panel titles, natural phone wrapping, and no horizontal overflow or console warning/error. At 320 px, the tokenized compact progress labels remain single-line and both header actions remain fully inside the viewport; the wordmark yields to the still-accessibly-named brand mark at this constrained width.
- No microphone permission was requested and no real voice/provider operation was started. Hardware, credentialed Turnstile, and paid/live provider checks remain explicitly deferred.

## Commit boundary

Keep this corrective pass as one logical change with the subject `SP-015A: polish the landing and demo flow`. The commit may include the current owner-reviewed landing, early-demo, preflight, responsive-style, shared-primitive, focused-test, and synchronized-documentation changes. Do not absorb SP-016 client tools or later review/summary work. Do not create the commit unless the user explicitly asks.

## Precision references

- [Signal Canvas design source of truth](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#14-design-source-of-truth--signal-canvas)
- [Landing](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#landing)
- [Demo route and early-stage responsive behavior](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#responsive-behavior)
- [Preflight](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#preflight)
- [Active interview](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#active-interview)
- [Security, privacy, and public-demo controls](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#16-security-privacy-and-public-demo-controls)

## Completion handoff

Report every file changed, targeted automated check, and manually inspected state/viewport. Call out any remaining visual decision that still needs owner approval. Leave hardware-, credential-, and paid-provider-only checks explicitly unchecked with their blocker. If implementation changes another material product or architecture decision, synchronize this packet, the parent source of truth, and every affected ticket before declaring completion.
