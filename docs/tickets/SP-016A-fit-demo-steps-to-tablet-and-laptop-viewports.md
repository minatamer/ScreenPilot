# SP-016A — Fit demo steps to tablet and laptop viewports

Status: Implementation complete; owner visual acceptance and commit pending<br>
Milestone: Milestone 2 — browser voice experience<br>
Last synchronized: 2026-09-15<br>
Depends on: SP-005, SP-011A, SP-012, SP-013, SP-015A, SP-016<br>
Suggested commit: `SP-016A: fit demo steps to tablet and laptop viewports`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)<br>
Ticket index: [`README.md`](README.md)

---

## Objective

Make every currently reachable `/demo` step read as one complete application screen on ordinary tablet and laptop browser viewports, and make the public landing composition use roomy laptop/desktop width intentionally. Use fluid type, spacing, panel sizing, responsive composition, and bounded inner scrolling so the demo document itself does not need to scroll during standard non-error states. Keep phone layouts intentionally natural and scrollable.

## Why this corrective ticket exists

After SP-016 was viewed on a real 14-inch laptop, the owner found that technically responsive pages still exceeded the usable browser height. The progress panel, headings, generous cards, repeated explanations, and live-interview content combined into a document taller than the screen. The candidate could not see the full step or its primary actions without scrolling, which made the five-step experience feel like a long web page instead of a bounded product workspace.

This ticket records the owner-directed correction before SP-017. It supersedes earlier guidance whenever that guidance would allow a standard tablet or laptop state to grow the outer document merely because cards stack naturally. It does not change workflow, evidence, provider, privacy, or hiring-decision behavior.

## Authoritative viewport-fit decisions

- Treat browser content height—not marketed screen diagonal or width alone—as the constraint. Density must respond continuously to both `dvh` and inline size.
- At 768/820 px tablet widths and practical tablet/laptop browser heights, every standard non-error `/demo` state keeps the header, step indicator, active content, and primary/recovery actions visible without outer document scrolling.
- Verify compact laptop browser viewports that approximate browser chrome on 14-inch screens, including 1024 × 600, 1280 × 650, and 1366 × 680, plus 1440 × 800 and the tablet anchors. These are stress/reference anchors, not separate implementations.
- Phones remain a distinct composition case: preserve natural document scrolling, safe-area-aware actions, readable type, and no nested-scroll traps rather than shrinking the interface to force one-screen height.
- Prefer a shared bounded workspace contract. Use inner scrolling only for repeatable/variable collections such as CV facts, screening topics, insight cards, transcript/evidence, or an explicitly bounded detail region. Keep the region heading and the page’s primary actions visible.
- Do not solve height pressure by hiding page overflow, clipping content, removing required disclosures/actions, or shrinking interactive targets below 44 × 44 px.
- Use fluid type and density within readable floors. Body text remains at least 14 px, metadata at least 12 px, and controls remain legible. Short-height modes may tighten leading, card padding, gaps, decorative space, and heading scale before changing composition.
- The shared preparation action footer remains the final bottom row of its card/workspace. It must not overlay content or drift upward when the stage is short.
- In the demo workspace, the two entry choices stack as full-width horizontal cards so they use the available height instead of leaving a large empty lower canvas.
- CV intake and processing surfaces expand through the available middle row while their action footer stays anchored at the workspace bottom.
- Preflight uses icon-led information tiles and a distinct consent panel instead of dense bullet lists or narrow vertical step labels.
- The laptop interview gives the voice/caption side slightly more width and uses one efficient, vertically scrollable insight-card rail with its heading and coverage summary fixed.
- Roomy laptops and desktops may change composition again: stack preflight sections, cap content-light entry/CV/completion cards, and reorganize the interview voice panel so captions do not become oversized. Deliberate open canvas is preferable to stretching sparse cards merely to consume height.
- The public landing is not constrained like a task workspace. At 1440 px and wider, its navbar and content containers break out of the shared 75 rem application cap, grow fluidly toward the viewport, and stop at a readable large-monitor cap. The hero copy, feature cascade, product preview, market grid, story, and entry choices share that wider alignment; the `/demo` workspace keeps its existing bounded rules.
- Live captions use a top-aligned, vertically scrollable AI-chat log that retains finalized turns and follows every new Pilot or candidate update. Candidate captions sit on the right in coral/plum bubbles with one short bubble entrance; Pilot responses remain unboxed on the left and keep the received-word reveal. Each normalized caption carries the stable turn identity used by its local transcript event, so tentative-to-final updates preserve the mounted message while a later same-speaker turn restarts the appropriate entrance even when it repeats the same prefix. Pilot tentative text reads **Speaking…**, candidate tentative text reads **Listening…**, and the coral voice signal animates only while the provider phase says Pilot is speaking. Reduced motion removes Pilot word delays, candidate bubble travel, the tentative caret, and waveform travel.
- Fake mode paces alternating Pilot/candidate tentative captions so the caption and waveform behavior is visible without paid calls. The installed live SDK's typed callback exposes completed turns rather than audio-synchronized interim words; animate only received text and never inspect untyped provider/debug payloads or add a second audio transcription path to imitate unavailable live data.
- Until the real Review ticket lands, a successful interview end dispatches the canonical reducer's `DEMO_INTERVIEW_COMPLETED` transition from `ending` into a scrubbed, non-persistable `complete_placeholder` stage. That stage shows a safe in-app completion placeholder with a Return home action; it must not enter an unfinished summary path, retain candidate/session content, or expose a development error.
- Trim redundant or infrastructure-heavy copy and remove decorative/duplicated blocks when the same meaning already exists nearby. Preserve concise AI, synthetic-vacancy, human-review, microphone, privacy, and no-hiring-decision disclosures at the point they are needed.
- Future SP-021 Review work must inherit the same tablet/laptop viewport-fit contract. This ticket does not fabricate or pre-build a Review page that is not yet reachable.

## In-scope surfaces

- Bootstrap and entry choice.
- CV intake, extraction, protected-analysis, retry, and prepared-plan states.
- Conversation-first preparation and retry.
- Shared preflight in not-ready and ready states.
- Voice connecting and retry/error states.
- Live interview with empty, short, and populated Insight Board states.
- The future-state fallback that is currently reachable from defensive reducer handling.
- The temporary post-interview completion placeholder used until the Review flow is implemented.
- The public landing header and section containers at roomy laptop and large-monitor widths.

## Scope boundaries

- Do not change the planned interview/review transitions, API contracts, provider adapters, prompt policy, tool schemas, or evidence semantics. The temporary completion path is an explicit reducer-owned exception: it clears the disposable browser session into `complete_placeholder` instead of persisting or rendering an unfinished summary state.
- Do not implement SP-017 interview policy, SP-019 transcript review, SP-020 summary, or SP-021 Review.
- Do not add a separate tablet/laptop component tree. Reuse the same semantic components and apply responsive composition through shared tokens and feature-owned layout rules.
- Do not add dependencies, analytics, durable state, candidate data, credentials, or paid calls.
- Do not read or modify `.env.local`. Verification remains deterministic and fake.
- Do not stage, commit, or push unless the owner explicitly authorizes that Git action.

## Implementation checklist

- [x] Measure every in-scope state at the tablet/laptop stress anchors and record which outer documents overflow, which actions fall below the fold, and which inner regions cannot scroll.
- [x] Add one shared tablet/laptop bounded-workspace and height-aware density contract using existing design tokens and dynamic viewport units.
- [x] Make the step indicator, stage heading, cards, and action footer compact continuously with available height without compromising readable floors or 44 px targets.
- [x] Give variable CV/plan/insight collections bounded inner scroll regions with persistent headings and no horizontal overflow.
- [x] Recompose the live interview so signal, current caption/status, controls, and the Insight Board all remain visible in a standard tablet/laptop viewport.
- [x] Simplify redundant copy and oversized cards across the in-scope pages while retaining required candidate-facing disclosures.
- [x] Stack and recompose the entry choices, fill CV middle states, replace preflight bullets with icon-led tiles, and tune the interview column balance from owner screenshot feedback.
- [x] Replace the unfinished post-interview summary transition with a tested, reducer-owned, session-clearing completion placeholder and Return home action.
- [x] Add the roomy-laptop composition tier from owner feedback without changing compact-laptop or phone behavior.
- [x] Add the top-aligned conversation-caption log, Pilot word reveal, candidate chat bubbles, automatic scroll following, and a paced fake-mode trace whose waveform is active only for Pilot speech.
- [x] Add a landing-only roomy-width tier that expands its navbar, hero, preview, and later sections without changing tablet, compact-laptop, or `/demo` workspace sizing.
- [x] Preserve phone natural scrolling, safe areas, content order, and full feature parity.
- [x] Add focused regression coverage for any structural/class/copy behavior changed by this ticket.
- [x] Synchronize this ticket, the ticket index, affected downstream dependencies, and the parent source of truth with the implemented behavior and evidence.

## Acceptance criteria

- [x] At 768 × 1024, 820 × 1180, 1024 × 600, 1280 × 650, 1366 × 680, and 1440 × 800, every standard in-scope state has `document.scrollHeight <= document.clientHeight + 1`, no horizontal document overflow, and visible primary/recovery actions.
- [x] Variable content scrolls inside an obvious bounded region while its heading and the stage action row remain visible; keyboard and wheel users can enter and leave the region without a trap.
- [x] The live interview keeps the active status/caption, mute/end controls, and meaningful insight content visible together at every tablet/laptop anchor.
- [x] Entry choices stack without wasted lower-canvas space; CV middle states use the available card height; every preparation footer is anchored to the workspace bottom.
- [x] Preflight contains no default bullet markers or vertical step-label gutter, and its four interview facts remain visually distinct and readable.
- [x] End interview reaches a calm reducer-owned completion placeholder, clears the disposable session and browser projection, and offers Return home without a runtime/schema error.
- [x] Text and controls remain readable: body ≥14 px, metadata ≥12 px, targets ≥44 px, no clipped labels, and no layout-dependent loss of disclosures or evidence meaning.
- [x] Phone portrait and landscape use natural document flow without horizontal overflow, clipped actions, or a desktop inner-scroll layout forced into the smaller surface.
- [x] Copy/card cleanup removes only genuine repetition or implementation detail; the experience still clearly states AI use, synthetic role scope, human review, microphone use, and no automated hiring decision where relevant.
- [x] Deterministic screenshots exist for every currently reachable page-level step at 1024 × 600 and 1366 × 680, with representative tablet and large-monitor checks. Screenshot fixtures contain synthetic data only and temporary preview infrastructure is removed afterward.
- [x] No paid provider request, real microphone permission, persistent data, secret access, reducer duplication, or later-ticket feature is introduced.
- [x] At 1440 × 800, 1600 × 900, and 1920 × 1080, sparse cards keep bounded natural heights, preflight sections stack compactly, and the interview caption panel uses the extra width rather than inflating vertically.
- [x] Fake mode visibly alternates Pilot and candidate captions; Pilot words reveal progressively, candidate text grows inside a stable right-side bubble, labels match the speaker, the log follows new text, and computed waveform animation is present for Pilot speech but absent while Pilot listens.
- [x] At 1440 × 800, 1600 × 900, and 1920 × 1080, the landing header, hero, and product preview expand fluidly beyond the old 1200 px cap with no horizontal overflow; 2560 × 1440 retains a deliberate readable outer margin instead of stretching without limit.

## Verification plan

- Run focused tests for demo shell/stage composition, CV, plan, preparation, preflight, connection, and live interview plus frontend lint, typecheck, formatting, build, and `git diff --check`.
- In fake mode, inspect each in-scope page/state at 768 × 1024, 820 × 1180, 1024 × 600, 1280 × 650, 1366 × 680, 1440 × 800, and at least one drag-resized intermediate viewport.
- Capture every currently reachable page-level step at 1024 × 600 and 1366 × 680. Confirm outer document fit, action visibility, bounded-region scrolling, equal/aligned cards, and absence of horizontal overflow.
- Inspect 390 × 844 phone portrait and one phone landscape viewport for natural flow, safe actions, and no desktop-only scroll trap.
- Leave real microphone hardware, credentialed Turnstile, published-agent callbacks, paid/live provider behavior, 200% zoom, and owner visual approval explicitly unchecked unless separately authorized and performed.

## Implementation and verification evidence

The shared `/demo` shell now becomes a bounded `100dvh` workspace only when both width and height represent a tablet/laptop surface; short phone-landscape viewports retain natural document flow. Entry choices use two equal-height horizontal rows, CV intake/processing owns the flexible middle row on compact laptops, plan and interview collections scroll internally, and preflight replaces native bullets with four icon-led fact tiles plus a separate consent surface. The interview uses a 48/52 laptop split so the voice/caption workspace has more room while the right board remains one efficient vertical rail.

At roomy laptop and desktop sizes, a second composition tier stops content-light surfaces from stretching merely to match the viewport. Entry and CV cards keep bounded natural heights, preflight's interview and consent sections stack as compact full-width rows, and its four facts use the available width instead of card height. The interview voice panel reorganizes status, time, and controls beside a capped caption surface and no longer stretches to the full Insight Board height. The completion message follows the same compact-card rule while its action footer remains at the workspace bottom, leaving deliberate open canvas where content does not require more space.

The caption surface is now a top-aligned conversation log rather than one oversized centered line. It retains finalized turns, places candidate captions in compact right-side coral/plum bubbles, keeps Pilot responses as unboxed left-side text, and automatically follows every incoming update within its own bounded scroll region. Normalization supplies a stable `turnId`: tentative and final updates for one provider event preserve the mounted Pilot words or candidate bubble, while a later same-speaker event receives a new identity and restarts the appropriate entrance even when its opening words match. Pilot responses keep the received-word animation and tentative caret; candidate messages use one short bubble entrance instead of the word-rise animation. Fake mode stretches its deterministic exchange across visible speaking/listening phases and sends bounded tentative updates before each final turn. The signal bars are active only during Pilot's speaking phase; candidate speech keeps the same bars intentionally still and dim while the visible status says Pilot is listening. The reduced-motion media contract forces computed Pilot word delays to `0s` and removes candidate bubble travel, tentative-caret animation, and active-signal animation. This remains a presentation layer over validated provider events: the installed live SDK continues to supply typed completed turns only, so no untyped callbacks or duplicate browser transcription were introduced.

The final conversation-first browser run rendered all three fake turns at both compact anchors. At 1024 × 600 the caption log finished exactly at its 70 px internal scroll maximum; at 1366 × 680 all three turns fit without scrolling. Computed styles reported the candidate `sp-live-caption-bubble-in` animation, the Pilot `sp-live-caption-word` animation, and 15.68/16 px caption text. The same run measured the lone Preferred Name card at 183 px high inside 220.9 px and 290.2 px rails, with `align-self: start` and a `max-content` grid row, proving that one card no longer inflates to consume the rail.

The landing now owns a separate roomy-width composition tier beginning at 1440 px. Its header and content containers grow to 92% of the viewport until a 128 rem large-monitor cap, while the product preview can grow to 120 rem. The hero headline, copy, feature cascade, market grid, sticky story, and entry-choice section use the added width rather than retaining the demo workspace's 75 rem ceiling; compact laptop and tablet rules are unchanged.

The preparation-footer defect came from implicit grid rows combined with start alignment: `margin-top: auto` had no flexible track to absorb unused height. Every footer-bearing stage now uses explicit `auto minmax(0, 1fr) auto` rows, which anchors actions to the bottom at narrow tablets as well as laptops. The End interview error had a separate event-shape cause: React's click event was reaching the optional string parameter of `requestEnd`, so `voice.endReason` became a `SyntheticBaseEvent`. The control now invokes `requestEnd()` through a zero-argument wrapper, and a regression test requires the completed voice metadata to retain the string reason. Until SP-021 supplies Review, `DEMO_INTERVIEW_COMPLETED` moves `ending` into the reducer-owned `complete_placeholder` stage, returns a fully scrubbed session shape, deletes the session-storage projection, and shows the temporary Review-step completion surface. No component-local flag overrides the canonical workflow stage.

Deterministic fake-mode measurement passed choose, CV intake, conversation preparation, plan, preflight, connecting, and interview at 768 × 1024, 820 × 1180, 1024 × 600, 1280 × 650, 1366 × 680, and 1440 × 800 with zero outer or horizontal overflow, visible 44 px primary/recovery actions, and 12 px-or-larger metadata. Representative 1180 × 720 checks also passed. The compact-anchor evidence was then rerun through the real `/demo` flow—not a preview route—at 1024 × 600 and 1366 × 680. All 16 captured page-state checks explicitly reset and asserted `scrollX = 0` and `scrollY = 0`, asserted the full header, brand, header actions, progress panel/content, stage heading, and every primary/recovery action were inside the viewport, and found exact document-height fit with zero horizontal overflow. The stale preview-route measurement script was removed and the earlier misleading top-level captures were replaced from this run. Roomy-layout inspection at 1440 × 800, 1600 × 900, and 1920 × 1080 verified the natural card-height caps, stacked preflight composition, reorganized interview voice panel, visible actions, and exact outer-viewport fit. A fresh 1440 × 800 fake conversation then captured partial Pilot, candidate, and Pilot follow-up captions: computed bar animation was `sp-interview-signal` during both Pilot phases and `none` during the candidate phase, while speaker/stability attributes and progressive word counts matched each turn. The corrected real-flow harness also emulated reduced motion during a tentative Pilot turn at both compact anchors and measured `0s` word delays plus `none` for the caret and all seven signal bars. Landing measurements at 1440 × 800, 1600 × 900, and 1920 × 1080 showed the header, hero, and product frame using 92% of viewport width with zero horizontal overflow; at 2560 × 1440 the content capped at 2048 px and the preview at 1920 px. Hero, market, story, and entry-choice captures confirmed the wider alignment across the complete landing page. Phone 390 × 844 and 844 × 390 retain natural vertical flow without horizontal overflow. The real fake-mode entry → preflight → interview → End interview path passed again at 1024 × 600, 1366 × 680, and 1920 × 1080: it reached Review, showed Return home, cleared the versioned session key, produced zero outer overflow, and showed no runtime overlay.

Frontend verification passed 31 files / 189 unit tests, typecheck, zero-warning lint, targeted Prettier for every SP-016A file, and `git diff --check`. Focused completion coverage proves the legal reducer transition, full in-memory scrub, non-persistable terminal state, browser-storage deletion, Review-step rendering, and rejection of premature completion. The final production build ran inside a fresh snapshot assembled only from Git-visible tracked/untracked files and dependency-only junctions. It contained the committed `.env.example` schemas, reported zero local environment files before build, and could not include ignored owner files; Next's webpack production builder was used because Turbopack rejects dependencies that resolve outside an isolated filesystem root. No credential was read and no package was downloaded. Real microphone hardware, credentialed Turnstile, published-agent callbacks, paid/live provider behavior, 200% zoom, and final owner visual acceptance remain unchecked.

### Local verification artifacts

The synthetic artifacts are intentionally outside the repository and uncommitted. They live under the local Codex visualization task root `2026/09/15/01a0a482-eb8a-7cd0-b998-afb09f0e7a38/` in these exact directories:

- `sp-016a-evidence/` — canonical per-step 1024 × 600 and 1366 × 680 captures, refreshed from the final real `/demo` run.
- `sp-016a-final-viewport/` — the same final actual-flow captures plus `actual-flow-metrics.json` containing the top-of-page, element-visibility, action-size, overflow, and reduced-motion measurements.
- `sp-016a-qa/` — tablet, phone, compact-laptop, and intermediate-width comparisons.
- `sp-016a-roomy/` — 1440 × 800, 1600 × 900, and 1920 × 1080 roomy-layout comparisons.
- `sp-016a-caption-animation/` — Pilot/candidate/Pilot fake-caption phase captures.
- `sp-016a-landing-wide/` — 1366 through 2560 landing-width and section captures.

The retained `sp016a-actual-flow-check.mjs` harness navigates only to `/demo`, resets both scroll axes before every measurement/capture, and asserts the header brand/actions, progress content, stage heading, and primary/recovery actions. Temporary browser profiles and the superseded preview-route harness are removed after verification.

## Precision references

- [Early `/demo` workspace](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#early-demo-workspace)
- [Plan preview](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#plan-preview)
- [Preflight](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#preflight)
- [Active interview](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#active-interview)
- [Responsive behavior](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#responsive-behavior)
- [Accessibility](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#accessibility)

## Completion handoff

Report each changed file, each page/state and viewport inspected, screenshot locations, automated checks, remaining owner visual decision, and every credential/hardware-only gate left unchecked. Leave the worktree unstaged and uncommitted unless the owner explicitly requests the SP-016A commit.
