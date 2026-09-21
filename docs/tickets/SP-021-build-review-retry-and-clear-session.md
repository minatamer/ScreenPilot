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
- The review includes overview, role nuance, facts, clarifications, coverage/gaps, compensation/availability, candidate questions, human follow-ups, limitations, and transcript evidence.
- The role section shows the candidate-stated synthetic session role or an honest undecided state; it never presents a fixed vacancy match or real-employer opening. Compound labels remain candidate wording.
- Label notes as AI-organized and requiring human interpretation; never present a hiring recommendation.
- Conversation-first review is Candidate-only and contains no CV source chips or CV-verification language.
- CV-assisted review may distinguish CV, Candidate, and CV + Candidate while candidate corrections win.
- Summary failure still shows transcript and insight cards and offers Retry with a fresh Turnstile token.
- Both a manual **End interview** action and the provider-owned automatic ending use the same in-place transition from the live two-column workspace into review: the right Insight Board fades and collapses, while the left interview column expands and centers to become the full-width organizing/review surface. Media teardown and local evidence finalization happen immediately and never wait for the animation.
- The expanded surface resolves into a bounded evidence map rather than a second unrelated page. A central **Organizing this conversation** card becomes the summary overview when ready, and the collected insight cards reappear as connected evidence nodes around it. Selecting a node opens its detail without losing the map and shows the associated Pilot question when it can be resolved unambiguously, the candidate answer, an **Interview evidence** subtitle with source/time and transcript navigation, and every GPT-summary item that cites that candidate turn. Missing prompt, evidence, or summary relationships are labelled unavailable instead of inferred.
- Clear session removes all ScreenPilot browser-held session content and returns to landing.
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

- [ ] Execute/reset the shared managed Turnstile gate for `interview_summary` inside the organizing state.
- [ ] Call the summary endpoint with bounded local state and retain transcript/insights throughout pending/failure/retry.
- [ ] Implement one end-transition path for manual and automatic completion: disable ended-call controls and release voice/media resources immediately, fade/collapse the right Insight Board, expand/center the left interview column, and preserve the visible local evidence while summary work begins concurrently.
- [ ] Recompose the expanded column into a responsive evidence map with a central organizing/overview card, deterministic connector lines, and one node per retained insight card; use stable keys and the existing insight categories rather than duplicating or regenerating evidence.
- [ ] Make every evidence node a keyboard-operable disclosure. Its detail presents the nearest preceding final Pilot turn only when that question-to-answer relationship is unambiguous, the cited final candidate answer, an **Interview evidence** source/time label and SP-019 transcript link, and all summary entries whose `evidenceTurnIds` include that answer; render explicit unavailable states for every missing relationship.
- [ ] Build responsive review overview, role preference, confirmed facts, clarifications, topics covered/not covered, compensation, availability, communication notes, candidate questions, follow-ups, and limitations.
- [ ] Present unsupported employer/vacancy questions as human follow-up and never fill missing job facts from the role label.
- [ ] Show mode badge and enforce correct source/provenance language for both modes.
- [ ] Wire every summary/insight evidence chip to the SP-019 transcript navigation.
- [ ] Implement partial/disconnected and unavailable-evidence presentation.
- [ ] Implement Retry summary with a fresh token, Copy summary, and deliberate **Clear & exit** confirmation/action that follows the shared route/session contract.
- [ ] Decide and document whether local JSON download earns its complexity; omit it if not clearly useful.
- [ ] Clear all ScreenPilot session keys/content UI and release remaining in-memory candidate data.
- [ ] Preserve the evidence-map hierarchy at every width: desktop/large-monitor nodes may surround the center card, tablets use a bounded connected grid, and phones/200% zoom use a connected vertical sequence with no hidden content or horizontal page scrolling.
- [ ] Respect reduced motion with an immediate structural reflow plus a short opacity-only state change; do not spatially move, scale, orbit, or float nodes when reduced motion is enabled.
- [ ] Test manual and automatic endings, complete/partial/no-summary, Turnstile failure, summary failure/retry, node expansion, question/answer/summary association, unavailable relationships, evidence navigation, mode provenance, copy, clear, refresh, reduced motion, and responsive behavior.

## Acceptance criteria

- [ ] Both entry modes finish in one coherent review implementation with correct provenance.
- [ ] Manual and automatic endings visibly transform the existing interview workspace into the same review surface without a blank page jump, delaying media cleanup, duplicating evidence, or leaving live controls operable.
- [ ] The evidence map keeps every retained insight reachable and its expanded detail distinguishes the Pilot question, candidate answer, local evidence metadata, and related GPT-organized notes without inventing a relationship.
- [ ] Every displayed summary fact can navigate to evidence or is clearly marked unavailable/limited.
- [ ] Summary/Turnstile failure never destroys transcript or insight review.
- [ ] No hiring recommendation or forbidden score/inference appears.
- [ ] Clear session removes all candidate content and returns to landing with no server-side record.
- [ ] Phone through large monitor retains the same sections/actions in intentional layouts.
- [ ] Graphic Designer, Full Stack Developer, compound wording, corrected role, and undecided state render through one review treatment with synthetic/session-only framing and no fixed-role or employer-fact leakage.

## Focused verification

- [ ] Run focused review/state/Turnstile/copy/clear component tests.
- [ ] Manually exercise manual and provider-owned automatic ending, full, partial disconnect, summary failure/retry, challenge failure/retry, broken evidence, no candidate questions, and both modes.
- [ ] Review arbitrary-role, compound-role, corrected-role, undecided, and unsupported-employer-question fixtures and verify human-follow-up presentation.
- [ ] Inspect storage before/after Clear session and after refresh.
- [ ] Check keyboard/focus flow through the evidence map and its expanded detail, evidence scrolling, long text, reduced motion, 200% zoom, mobile portrait/landscape, and large-monitor widths.
- [ ] If JSON download is retained, inspect it for only local bounded structured data and no secrets/raw CV/audio.
- [ ] Hand both entry modes and the exact fake-verified summary/retry/evidence
  matrix to SP-021A for the consolidated live window; do not claim live review
  acceptance here.

## Commit boundary

Keep SP-021 reviewable as one logical change represented by `feat(review): complete disposable session review`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Local review and clear stage](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#stage-10--local-review-and-clear)
- [Summary schema](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#summary-output)
- [Review screen design](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#review)
- [Definition of done for review](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#review-1)
- [Credential acquisition and fake-first gate](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
