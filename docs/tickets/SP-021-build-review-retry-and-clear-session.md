# SP-021 — Build review, retry, and clear-session experience

Status: Required  
Milestone: Milestone 3 — same-session review  
Last synchronized: 2026-09-21<br>
Depends on: SP-005, SP-006, SP-010A, SP-019, SP-020<br>
Suggested commit: `SP-021: complete disposable session review`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Complete the same-tab experience with an evidence-linked, provenance-correct review that survives summary failure and offers an explicit privacy-clearing exit.

## Standalone implementation context

- When a call ends, obtain a fresh managed Turnstile token for `interview_summary`, then request the SP-020 summary while preserving all local evidence.
- The review includes overview, role nuance, facts, clarifications, coverage/gaps, compensation/availability, candidate questions, human follow-ups, limitations, and bounded evidence excerpts. It does not render the full transcript as a user-facing section.
- The role section shows the candidate-stated synthetic session role or an honest undecided state; it never presents a fixed vacancy match or real-employer opening. Compound labels remain candidate wording.
- Label notes as AI-organized and requiring human interpretation; never present a hiring recommendation.
- Conversation-first review is Candidate-only and contains no CV source chips or CV-verification language.
- CV-assisted review may distinguish CV, Candidate, and CV + Candidate while candidate corrections win.
- Summary failure still preserves the local transcript for retry/evidence resolution, keeps the insight map visible, and offers Retry with a fresh Turnstile token; the review does not expose the full transcript.
- Both a manual **End interview** action and the provider-owned automatic ending use the same in-place transition from the live two-column workspace into review: the reducer renders `ending` for the bounded 420 ms morph so React cannot batch it away, the right Insight Board fades and collapses (including its compact-layout grid row), and the left interview column expands and centers to become the full-width organizing/review surface. Media teardown and local evidence finalization happen immediately and never wait for the animation.
- The expanded surface resolves into a bounded evidence map rather than a second unrelated page. A central **Organizing this conversation** card becomes the summary overview when ready, and the collected insight cards reappear as connected evidence nodes around it. Selecting a node replaces that central overview in place with the node's bounded detail; selecting another node swaps the center preview, while selecting the active node again or using its minimize control restores the overview. The preview shows the associated Pilot question when it can be resolved unambiguously, the candidate answer, an **Interview evidence** source/time label, and every summary item that cites that candidate turn. Missing prompt, evidence, or summary relationships are labelled unavailable instead of inferred.
- User-facing review copy describes a ScreenPilot conversation summary and must not expose model/provider names such as GPT.
- Clear session removes and verifies all ScreenPilot browser-held session content before clearing reducer state or returning to landing. A blocked removal keeps the review on screen, reports a retryable privacy error, and never claims success.
- Copy summary is in scope. Local JSON download remains a final-scope decision and is the first optional cut.
- Review retains SP-011A's centralized Deep Ink/plum/coral `/demo` workspace. Calmer spacing and quieter borders distinguish completion; no white/Warm White page, card, transcript, or summary surface is reintroduced.

## Manual credential gate

- This frontend ticket receives the public `TURNSTILE_SITE_KEY` through bootstrap and never receives OpenAI or Turnstile secrets.
- Reuse SP-020's fake challenge and fake summary responses while backend credential fields are blank. Do not run a standalone paid summary/retry walkthrough in this ticket; SP-021A owns the first real complete-flow validation after this implementation is deterministically complete.
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
- [x] Implement one end-transition path for manual and automatic completion: disable ended-call controls and release voice/media resources immediately, fade/collapse the right Insight Board, expand/center the left interview column, and preserve the visible local evidence while summary work begins concurrently.
- [x] Recompose the expanded column into a responsive evidence map with a central organizing/overview card, deterministic connector lines, and one node per retained insight card; use stable keys and the existing insight categories rather than duplicating or regenerating evidence.
- [x] Make every evidence node a keyboard-operable disclosure. Its center-card preview presents the nearest preceding final Pilot turn only when that question-to-answer relationship is unambiguous, the cited final candidate answer, an **Interview evidence** source/time label, and all summary entries whose `evidenceTurnIds` include that answer; corrected nodes make the latest cited candidate turn primary while retaining older citations as history, render explicit unavailable states for every missing relationship, and restore the overview on minimize.
- [x] Build responsive review overview, role preference, confirmed facts, clarifications, topics covered/not covered, compensation, availability, communication notes, candidate questions, follow-ups, and limitations.
- [x] Present unsupported employer/vacancy questions as human follow-up and never fill missing job facts from the role label.
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
- [x] Manual and automatic endings visibly transform the existing interview workspace into the same review surface without a blank page jump, delaying media cleanup, duplicating evidence, or leaving live controls operable.
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
  matrix to SP-021A for the consolidated live window; do not claim live review
  acceptance here.
- [x] Defer owner visual feedback and approval of the ending transition, connected
  evidence map, center-card replacement interaction, and responsive composition
  to SP-021A. Engineering browser inspection in this ticket is not owner visual
  acceptance, and SP-021A must remain open until the owner explicitly passes the
  adjusted result.

## Implementation record — 2026-09-21

- Replaced the temporary transcript-first review with the completed same-workspace transition and deterministic evidence map. Manual, provider-owned, and interrupted endings now share the reducer-owned completion path; media cleanup remains independent of the visual morph.
- Added the fresh `interview_summary` Turnstile/request lifecycle, abort cleanup, retry behavior, bounded request validation, failure-preserving local evidence, complete structured summary sections, copy feedback, and deliberate clear confirmation.
- Preserved the mind-map identity through connected desktop branches, a bounded tablet grid, and a connected phone/zoom sequence. Browser visual checks covered 1440 px desktop, 1024 px tablet/compact layout, 820 px narrow tablet, 678 px intermediate, and 390 px phone widths; selected-node replacement and minimize/restore behavior were exercised directly.
- Those browser checks are implementation evidence only. The owner did not have
  time to provide final visual feedback on SP-021, so owner-requested adjustments
  and an explicit owner visual pass are mandatory SP-021A work and cannot be
  inferred from automated tests or agent inspection.
- Applied the owner-directed final interaction: no user-facing GPT/model naming, no full transcript timeline, and selected evidence appears inside the center card until another node replaces it or the active preview is minimized. Exact bounded question/answer excerpts remain available only for the selected node; static evidence references preserve traceability without overwhelming the review.
- Replaced the three-turn placeholder fake call with a bounded Riley Vale trace aligned to the bundled synthetic CV. The deterministic path now records realistic role, context, experience, team-style, logistics, English-use, motivation, candidate-question, and recruiter-follow-up nodes, while the fake summary returns safe candidate-specific evidence notes so every expansion state can be reviewed. CV-assisted mode corrects the seeded experience node into combined provenance; conversation-first keeps the same synthetic story Candidate-only. The redundant long-form disclosure panel was removed, leaving the concise interpretation/no-decision note in the center summary card and the partial-state badge in the heading.
- Closed the completion-validation gaps: browser cleanup now fails closed and leaves the review recoverable when `sessionStorage` removal is blocked; corrected nodes preview the latest correction turn while keeping earlier evidence as history; and manual/provider-owned endings retain one rendered 420 ms transition interval with the compact grid row collapsed before summary composition replaces the interview. The owner-directed centered preview is now explicitly documented as superseding SP-019's temporary full transcript timeline rather than being treated as an undocumented requirement rewrite.
- Local JSON download was omitted as the first optional cut. Copy summary supplies the bounded disposable handoff, while omitting JSON avoids a second local candidate-data export surface.
- Deterministic verification passed the focused review/fake-provider set (6 files / 36 tests), the complete frontend suite (35 files / 247 tests), the complete backend suite (23 files / 256 tests), frontend/backend lint and typecheck, frontend/backend production builds, targeted formatting checks, and `git diff --check`. After the completion-validation fixes, the focused privacy/evidence/ending regression set passed again (6 files / 65 tests), together with frontend lint and typecheck. The local runtime reported Node 22.23.2 while the repository requires Node 24, but every direct package check completed successfully; the root wrapper scripts could not be used because they resolve an older global pnpm inside nested scripts, so the pinned Corepack package commands were invoked directly.
- No credential was read and no paid/provider request was made. The repaired provider-owned ending hold is covered deterministically at the hook boundary, and the compact-layout row collapse is enforced in the review transition styles; a new live visual observation of that automatic ending was not performed. The broad live end-to-end matrix, storage inspection in a credentialed complete flow, named-role fixture walkthroughs, screen-reader pass, 200% zoom/landscape/large-monitor acceptance, and provider evidence remain explicitly deferred to SP-021A/SP-024/SP-025 as assigned below; they are not claimed as passed here.

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
