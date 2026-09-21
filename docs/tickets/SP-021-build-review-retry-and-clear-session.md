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

## Implementation checklist

- [ ] Execute/reset the shared managed Turnstile gate for `interview_summary` inside the organizing state.
- [ ] Call the summary endpoint with bounded local state and retain transcript/insights throughout pending/failure/retry.
- [ ] Build responsive review overview, role preference, confirmed facts, clarifications, topics covered/not covered, compensation, availability, communication notes, candidate questions, follow-ups, and limitations.
- [ ] Present unsupported employer/vacancy questions as human follow-up and never fill missing job facts from the role label.
- [ ] Show mode badge and enforce correct source/provenance language for both modes.
- [ ] Wire every summary/insight evidence chip to the SP-019 transcript navigation.
- [ ] Implement partial/disconnected and unavailable-evidence presentation.
- [ ] Implement Retry summary with a fresh token, Copy summary, and deliberate **Clear & exit** confirmation/action that follows the shared route/session contract.
- [ ] Decide and document whether local JSON download earns its complexity; omit it if not clearly useful.
- [ ] Clear all ScreenPilot session keys/content UI and release remaining in-memory candidate data.
- [ ] Test complete/partial/no-summary, Turnstile failure, summary failure/retry, evidence navigation, mode provenance, copy, clear, refresh, and responsive behavior.

## Acceptance criteria

- [ ] Both entry modes finish in one coherent review implementation with correct provenance.
- [ ] Every displayed summary fact can navigate to evidence or is clearly marked unavailable/limited.
- [ ] Summary/Turnstile failure never destroys transcript or insight review.
- [ ] No hiring recommendation or forbidden score/inference appears.
- [ ] Clear session removes all candidate content and returns to landing with no server-side record.
- [ ] Phone through large monitor retains the same sections/actions in intentional layouts.
- [ ] Graphic Designer, Full Stack Developer, compound wording, corrected role, and undecided state render through one review treatment with synthetic/session-only framing and no fixed-role or employer-fact leakage.

## Focused verification

- [ ] Run focused review/state/Turnstile/copy/clear component tests.
- [ ] Manually exercise full, partial disconnect, summary failure/retry, challenge failure/retry, broken evidence, no candidate questions, and both modes.
- [ ] Review arbitrary-role, compound-role, corrected-role, undecided, and unsupported-employer-question fixtures and verify human-follow-up presentation.
- [ ] Inspect storage before/after Clear session and after refresh.
- [ ] Check keyboard/focus flow, evidence scrolling, long text, 200% zoom, mobile portrait/landscape, and large-monitor widths.
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
