# SP-021 — Build review, retry, and clear-session experience

Status: Required  
Milestone: Milestone 3 — same-session review  
Last synchronized: 2026-09-22<br>
Depends on: SP-005, SP-006, SP-010A, SP-019, SP-020<br>
Suggested commit: `SP-021: complete disposable session review`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Complete the same-tab experience with an evidence-linked, provenance-correct review that survives summary failure and offers an explicit privacy-clearing exit.

## Standalone implementation context

- After normal voice cleanup enters the read-only completed workspace, obtain a fresh managed Turnstile token for `interview_summary`, then request the SP-020 summary while preserving all local evidence. Keep that request single-flight when the user chooses **View summary**.
- The review includes overview, role nuance, facts, clarifications, coverage/gaps, compensation/availability, candidate questions, human follow-ups, limitations, and bounded evidence excerpts. It does not render the full transcript as a user-facing section.
- The role section shows the candidate-stated synthetic session role or an explicit evidence-backed undecided state; when a partial summary omits role preference entirely, it says **Not established** with unavailable evidence rather than inventing an undecided answer. It never presents a fixed vacancy match or real-employer opening. Compound labels remain candidate wording.
- Label notes as AI-organized and requiring human interpretation; never present a hiring recommendation.
- Conversation-first review is Candidate-only and contains no CV source chips or CV-verification language.
- CV-assisted review may distinguish CV, Candidate, and CV + Candidate while candidate corrections win.
- Summary failure still preserves the local transcript for retry/evidence resolution, keeps the insight map visible, and offers Retry with a fresh Turnstile token; the review does not expose the full transcript.
- Manual **End interview** keeps the live two-column workspace visually stable while shutdown is pending: the CTA replaces its stop icon with a continuous spinner and disables both itself and mute. Provider-owned automatic ending and the eight-minute deadline perform the same immediate cleanup without showing an ending interstitial. Normal shutdown enters the reducer-owned read-only completed workspace with retained transcript/insights, frozen elapsed time, microphone-disconnected copy, and **View summary**; the full review appears only after that explicit action. Unexpected interruption remains partial.
- The expanded surface resolves into a bounded evidence map rather than a second unrelated page. A central **Organizing this conversation** card becomes the summary overview when ready, and the collected insight cards reappear as connected evidence nodes around it. Selecting a node replaces that central overview in place with the node's bounded detail; selecting another node swaps the center preview, while selecting the active node again or using its minimize control restores the overview. The preview shows the associated Pilot question when it can be resolved unambiguously, the candidate answer, an **Interview evidence** source/time label, and every summary item that cites that candidate turn. Missing prompt, evidence, or summary relationships are labelled unavailable instead of inferred.
- Once a summary is ready, the review heading exposes a theme-matched **Evidence map** / **Organized notes** tab switch. Evidence remains the default view; both panels retain their local UI state, but only the selected panel occupies page flow so the full map and full notes workspace never stack vertically.
- User-facing review copy describes a ScreenPilot conversation summary and must not expose model/provider names such as GPT.
- Clear session removes and verifies all ScreenPilot browser-held session content before clearing reducer state or returning to landing. A blocked removal keeps the review on screen, reports a retryable privacy error, and never claims success.
- Copy summary is in scope. Local JSON download remains a final-scope decision and is the first optional cut.
- Review retains SP-011A's centralized Deep Ink/plum/coral `/demo` workspace. Calmer spacing and quieter borders distinguish completion; no white/Warm White page, card, transcript, or summary surface is reintroduced.

## Manual credential gate

- This frontend ticket receives the public `TURNSTILE_SITE_KEY` through bootstrap and never receives OpenAI or Turnstile secrets.
- Reuse SP-020's fake challenge and fake summary responses while backend credential fields are blank. Do not run a standalone paid summary/retry walkthrough in this ticket; SP-021B owns the first real complete-flow validation after both this implementation and the SP-021A documentation gate are complete.
- Do not add provider keys to `apps/frontend/.env.local`. If live values are missing, complete all local review/retry/clear behavior and leave only the real-host provider walkthrough unchecked.

## Scope boundaries

- Do not create saved history, recruiter dashboard, account, shareable/return-later URL, server persistence, summary regeneration history, editable notes, or provider artifact retrieval.
- Do not hide partial/missing topics, broken evidence, or summary limitations.
- Do not clear local evidence merely because Turnstile or summary generation fails.
- Do not add scores, rankings, sentiment, personality, English rating, or pass/fail UI.
- Do not treat Clear session as an ordinary primary action beside Copy; keep it visibly separated and deliberate.
- Do not turn the evidence map into a graph editor: no dragging, zooming, physics simulation, editable relationships, hidden off-canvas nodes, or newly inferred links. It is one deterministic responsive composition of the existing bounded insight, transcript, and summary data.

## Implementation checklist

- [x] Execute/reset the shared managed Turnstile gate for `interview_summary` inside the organizing state.
- [x] Call the summary endpoint with bounded local state and retain transcript/insights throughout pending/failure/retry.
- [x] Implement one shutdown path for agent, manual, and deadline completion: preserve the first reason, disable ended-call controls, show the spinner only on a manually clicked End interview CTA, release voice/media/runtime resources immediately, and enter the read-only completed workspace without an ending interstitial.
- [x] Keep transcript/insights visible after cleanup, freeze elapsed time, remove mute/dynamic voice UI, state that the microphone is disconnected, and require **View summary** without reconnecting or duplicating summary work.
- [x] Recompose the expanded column into a responsive evidence map with a central organizing/overview card, deterministic connector lines, and one node per retained insight card; use stable keys and the existing insight categories rather than duplicating or regenerating evidence.
- [x] Make every evidence node a keyboard-operable disclosure. Its center-card preview presents the nearest preceding final Pilot turn only when that question-to-answer relationship is unambiguous, the cited final candidate answer, an **Interview evidence** source/time label, and all summary entries whose `evidenceTurnIds` include that answer; corrected nodes make the latest cited candidate turn primary while retaining older citations as history, render explicit unavailable states for every missing relationship, and restore the overview on minimize.
- [x] Build responsive review overview, role preference, confirmed facts, clarifications, topics covered/not covered, compensation, availability, communication notes, candidate questions, follow-ups, and limitations.
- [x] Place the complete evidence map and organized notes behind an accessible two-tab switch opposite the review heading in place of redundant header tags, preserving panel state while removing the inactive panel from page flow.
- [x] Present an unsupported employer/vacancy/onboarding/work-arrangement question as paired Candidate question and Human follow-up evidence from the same final candidate turn; preserve both in the evidence map, Organized notes, and copied review text without filling missing job facts.
- [x] Show mode badge and enforce correct source/provenance language for both modes.
- [x] Keep evidence references concise and static in review; do not render or navigate to a full transcript timeline.
- [x] Implement partial/disconnected and unavailable-evidence presentation.
- [x] Implement Retry summary with a fresh token, Copy summary, and deliberate **Clear & exit** confirmation/action that follows the shared route/session contract.
- [x] Decide and document whether local JSON download earns its complexity; it is omitted because Copy summary provides the useful disposable handoff without adding another candidate-data export surface.
- [x] Clear and verify all ScreenPilot session keys before clearing content UI or routing away; preserve a retryable review state when browser removal fails, then release remaining in-memory candidate data only on verified success.
- [x] Preserve the evidence-map hierarchy at every width: desktop/large-monitor nodes may surround the center card, tablets use a bounded connected grid, and phones/200% zoom use a connected vertical sequence with no hidden content or horizontal page scrolling.
- [x] Respect reduced motion with an immediate structural reflow plus a short opacity-only state change; do not spatially move, scale, orbit, or float nodes when reduced motion is enabled.
- [ ] Test manual and automatic endings, complete/partial/no-summary, Turnstile failure, summary failure/retry, node expansion, question/answer/summary association, unavailable relationships, evidence navigation, mode provenance, copy, clear, refresh, reduced motion, and responsive behavior.

## Acceptance criteria

- [x] Both entry modes finish in one coherent review implementation with correct provenance.
- [x] Agent, manual, and deadline endings enter the same read-only completed workspace without a blank page jump, delayed media cleanup, duplicated evidence, or operable live controls; **View summary** alone exposes pending/ready review.
- [x] The evidence map keeps every retained insight reachable and its center preview distinguishes the Pilot question, candidate answer, local evidence metadata, and related summary notes without inventing a relationship.
- [x] Every displayed summary fact carries a bounded local evidence reference or is clearly marked unavailable/limited, without exposing the full transcript.
- [x] Summary/Turnstile failure never destroys transcript or insight review.
- [x] No hiring recommendation or forbidden score/inference appears.
- [x] Clear session removes all candidate content and returns to landing with no server-side record.
- [x] Phone through large monitor retains the same sections/actions in intentional layouts.
- [ ] Graphic Designer, Full Stack Developer, compound wording, corrected role, and undecided state render through one review treatment with synthetic/session-only framing and no fixed-role or employer-fact leakage.

## Focused verification

- [x] Run focused review/state/Turnstile/copy/clear component tests.
- [ ] Manually exercise manual and provider-owned automatic ending, full, partial disconnect, summary failure/retry, challenge failure/retry, broken evidence, no candidate questions, and both modes.
- [ ] Review arbitrary-role, compound-role, corrected-role, undecided, and unsupported-employer-question fixtures and verify human-follow-up presentation.
- [ ] Inspect storage before/after Clear session and after refresh.
- [ ] Check keyboard/focus flow through the evidence map and its center preview, selection replacement/minimize behavior, long text, reduced motion, 200% zoom, mobile portrait/landscape, and large-monitor widths.
- [x] JSON download was deliberately omitted, so no export payload exists to inspect.
- [x] Hand both entry modes and the exact fake-verified summary/retry/evidence
  matrix to SP-021B for the consolidated live window; do not claim live review
  acceptance here.
- [x] Defer owner visual feedback and approval of the ending transition, connected
  evidence map, center-card replacement interaction, and responsive composition
  to SP-021A. Engineering browser inspection in this ticket is not owner visual
  acceptance, and SP-021A must remain open until the owner explicitly passes the
  adjusted result.

## Implementation record — 2026-09-21

- Replaced the temporary transcript-first review with the completed deterministic evidence map. Normal agent/manual/deadline endings share the reducer-owned `interview_complete` path; unexpected interruption remains a distinct partial path, and media cleanup remains independent of review rendering.
- Added the fresh `interview_summary` Turnstile/request lifecycle, abort cleanup, retry behavior, bounded request validation, failure-preserving local evidence, complete structured summary sections, copy feedback, and deliberate clear confirmation.
- Preserved the mind-map identity through connected desktop branches, a bounded tablet grid, and a connected phone/zoom sequence. Browser visual checks covered 1440 px desktop, 1024 px tablet/compact layout, 820 px narrow tablet, 678 px intermediate, and 390 px phone widths; selected-node replacement and minimize/restore behavior were exercised directly.
- Those browser checks are implementation evidence only. The owner did not have
  time to provide final visual feedback on SP-021, so owner-requested adjustments
  and an explicit owner visual pass are mandatory SP-021A work and cannot be
  inferred from automated tests or agent inspection.
- Applied the owner-directed final interaction: no user-facing GPT/model naming, no full transcript timeline, and selected evidence appears inside the center card until another node replaces it or the active preview is minimized. Exact bounded question/answer excerpts remain available only for the selected node; static evidence references preserve traceability without overwhelming the review.
- Replaced the three-turn placeholder fake call with a bounded Riley Vale trace aligned to the bundled synthetic CV. The deterministic path now records realistic role, context, experience, team-style, logistics, English-use, motivation, candidate-question, and recruiter-follow-up nodes, while the fake summary returns safe candidate-specific evidence notes so every expansion state can be reviewed. CV-assisted mode corrects the seeded experience node into combined provenance; conversation-first keeps the same synthetic story Candidate-only. Redundant disclosure copy was removed from the center summary card; interpretation limits remain explicit in the structured Organized notes while partial state remains in the heading pretitle.
- Closed the completion-validation gaps: browser cleanup now fails closed and leaves the review recoverable when `sessionStorage` removal is blocked; corrected nodes preview the latest correction turn while keeping earlier evidence as history; and manual/provider-owned endings converge on one completion path. The owner-directed centered preview is explicitly documented as superseding SP-019's temporary full transcript timeline rather than being treated as an undocumented requirement rewrite.
- Local JSON download was omitted as the first optional cut. Copy summary supplies the bounded disposable handoff, while omitting JSON avoids a second local candidate-data export surface.
- Deterministic verification passed the focused review/fake-provider set (6 files / 36 tests), the complete frontend suite (35 files / 247 tests), the complete backend suite (23 files / 256 tests), frontend/backend lint and typecheck, frontend/backend production builds, targeted formatting checks, and `git diff --check`. After the completion-validation fixes, the focused privacy/evidence/ending regression set passed again (6 files / 65 tests), together with frontend lint and typecheck. The local runtime reported Node 22.23.2 while the repository requires Node 24, but every direct package check completed successfully; the root wrapper scripts could not be used because they resolve an older global pnpm inside nested scripts, so the pinned Corepack package commands were invoked directly.
- No credential was read and no paid/provider request was made. Provider-owned completion and manual pending-shutdown behavior are covered deterministically at the hook/component boundary; a new live visual observation of automatic ending was not performed. The broad live end-to-end matrix, storage inspection in a credentialed complete flow, named-role fixture walkthroughs, screen-reader pass, 200% zoom/landscape/large-monitor acceptance, and provider evidence remain explicitly deferred to SP-021B/SP-024/SP-025 as assigned below; they are not claimed as passed here.
- Owner visual feedback removed the staged ending page and its artificial 420 ms morph. Manual shutdown preserves the interview layout with a disabled spinner CTA until provider cleanup or the bounded fallback completes. Agent/manual/deadline completion then retains that layout read-only with a frozen timer, disconnected microphone, and **View summary**; it no longer advances directly to review.
- SP-021A Prompt 2 adds one persistent summary-preparation owner across the
  completed workspace and review handoff. Preparation starts only after voice
  disconnect, survives **View summary**, and cannot issue a second request.
  Completed-state persistence is allow-listed and restore never requests a
  voice token or mounts the provider bridge.
- The 2026-09-22 SP-021A documentation review found that the review center card and copied summary collapsed an omitted partial-summary `rolePreference` into **Undecided** and hid role evidence. The follow-up now derives both surfaces from one role-review resolver: omitted means **Not established** plus unavailable evidence, **Undecided** requires the explicit summary state, and candidate-stated/undecided roles expose their bounded final-candidate-turn references. Focused regression coverage exercises missing partial role data, explicit undecided data, evidence-backed stated-role copy, and matching UI/copy evidence wording; owner visual acceptance remains documented in SP-021A and live acceptance remains deferred to SP-021B.
- Owner review feedback replaced the vertically stacked evidence map and organized-notes workspace with a themed, keyboard-operable two-tab switch. A later refinement moved that switch into the former header-tag position, vertically centered against the step/title block on wide screens and stacked full-width only on narrow screens. Both panels stay mounted so map selection state survives a switch, while the inactive panel is removed from page flow to bound review-page height.
- The phone tab switcher now resets the desktop row-axis flex basis after the heading stacks vertically. It renders as a content-height, full-width segmented control with two single-line 44 px tabs instead of allowing the desktop `30rem` width basis to become an oversized mobile height.
- The center conversation overview is deliberately tag-free: the role remains readable as plain text, while redundant mode/readiness badges and compact role-evidence chips are omitted. Detailed evidence remains available through the surrounding evidence nodes and the copied review.
- Dense organized-note sections now occupy one full-width combined panel instead of forcing a short neighboring panel to share their height. Any list with four or more entries balances across two internal columns; Coverage and gaps keeps its gaps in a compact row beneath the balanced topics, and narrow screens return every section to one column. This covers confirmed facts, clarifications, communication notes, candidate questions, human follow-ups, limitations, and coverage through one layout rule.
- The notes grid now also packs compact orphan panels across dense full-width boundaries. Two compact sections that would each occupy a separate half-empty row are paired in the earlier row—with DOM order matching the visual order—so the fake summary places Clarifications beside Limitations while preserving the other complete compact pairs.
- The evidence-map center now uses a taller viewport-responsive shared height for both its overview and selected-node state. Overview content stays vertically centered, while long evidence details retain their internal scroll instead of changing the map geometry.
- SP-021A Prompt 1 now carries the actual unsupported candidate question and
  bounded human-follow-up reason through the existing review model. Both cards
  cite the same eligible final candidate turn. Summary validation requires each
  exact captured value and complete evidence-ID set; a paraphrase with the
  correct turn ID triggers one bounded provider repair and otherwise fails
  closed. Selected-node review exposes both connected notes, Organized notes
  retains both sections, and copied text includes an explicit
  `Candidate · turn N` evidence line for each item. Focused deterministic tests
  cover complete and duplicate callbacks, reducer idempotence, live-card
  rendering, adversarial same-ID/changed-value summary output, successful
  repair, evidence-map/notes rendering, and copied output. This local review
  behavior is verified in fake/provider-shaped state only; publication and live
  observation remain SP-021B work.

## Commit boundary

Keep SP-021 reviewable as one logical change represented by `SP-021: complete disposable session review`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Local review and clear stage](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#stage-10--local-review-and-clear)
- [Summary schema](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#summary-output)
- [Review screen design](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#review)
- [Definition of done for review](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#review-1)
- [Credential acquisition and fake-first gate](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. Record that owner visual feedback and approval remain explicitly deferred to SP-021A rather than passed here. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
