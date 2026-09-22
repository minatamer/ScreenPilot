# SP-016 — Build browser client tools and Insight Board

Status: Implementation complete; live-provider and reduced-motion manual checks pending<br>
Milestone: Milestone 2 — browser voice experience  
Last synchronized: 2026-09-15<br>
Depends on: SP-005, SP-006, SP-010A, SP-015, SP-015A<br>
Suggested commit: `SP-016: visualize live interview understanding`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Make ScreenPilot's understanding visible by validating five browser client tools and turning final candidate evidence into local, correctable insight cards.

## Standalone implementation context

- The Insight Board is the demo's visual signature, but it represents candidate/CV evidence—not objective AI truth.
- The five ElevenLabs browser client tools are `recordInsight`, `correctInsight`, `markTopic`, `recordCandidateQuestion`, and `requestFollowup`.
- Tool calls never write to the backend. The browser validates arguments and attaches the latest eligible final candidate turn ID; the model cannot invent turn IDs.
- CV-assisted may seed grounded cards with `CV`; candidate confirmation/correction changes provenance to `CV + Candidate` or `Candidate`.
- Conversation-first begins with no candidate fact cards and allows only `Candidate` provenance.
- Preferred-name and role-preference tool updates synchronize the typed `DemoSession` fields from the same evidence.
- Role-preference tools accept any bounded candidate-stated label or an undecided state. They do not classify professions, check an allow-list, split compound labels, or create unavailable-role behavior.
- Desktop uses one aligned Insight Board column that scrolls vertically inside a panel matched to the voice/caption panel height; mobile retains identical categories/sources/states in a vertical composition with swipeable rail and expandable evidence.
- Card lifecycle is empty → appearing → confirmed, with confirmed → corrected or needs-clarification.
- The live Insight Board stays inside SP-011A's centralized Deep Ink/plum/coral `/demo` workspace. It preserves the same home/exit/status language and layered dark hierarchy; cards use raised dark surfaces rather than white panels or a separate dashboard shell.

## Manual credential gate

- Client-tool schemas, dispatcher logic, evidence validation, and Insight Board behavior require no key and use fake tool calls first.
- Registering/verifying the tools against the published agent reuses SP-014's ElevenLabs account/agent values. Do not put `ELEVENLABS_API_KEY` or any other secret in frontend configuration; the browser operates through the authorized session only.
- If the private agent is not yet created or credentials are blank, complete local acceptance and leave provider-registration/live-tool verification unchecked with the manual blocker.

## Scope boundaries

- Do not build a force-directed/draggable/zoomable graph, confidence percentages, card editing UI, or a second mobile data model.
- Do not score, rank, infer personality/culture fit, sentiment, emotion, accent, protected traits, employability, or English proficiency.
- Do not save or replay audio; replayable evidence audio remains a future
  exploration note only. That later research must compare browser-local capture
  with ElevenLabs `Store Call Audio`, including provider storage/access,
  retrieval APIs and scopes, retention/deletion behavior, and reliable
  start/end timestamp alignment. The current agent keeps provider audio saving
  off, and real candidate recording requires a separate owner-approved
  privacy/scope decision.
- Do not accept a fact-changing tool call without a valid eligible final candidate turn.
- Do not allow CV provenance in conversation-first.

## Implementation checklist

- [x] Define strict shared schemas for all five client-tool arguments and allowed insight categories/statuses/sources.
- [x] Register the five tools with the ElevenLabs client and route calls through one validated dispatcher.
- [x] Attach the latest eligible final candidate turn ID locally; reject missing, stale, wrong-speaker, malformed, or duplicate evidence.
- [x] Implement the aligned, height-matched, vertically scrollable desktop board and intentional mobile slideshow/expanded-card composition.
- [x] Implement appearance, confirmed, corrected, clarification, and evidence-chip states with reduced-motion alternatives.
- [x] Synchronize preferred name and role preference from record/correct events while preserving candidate wording/evidence.
- [x] Support current context, relevant experience, broad responsibility, strongest areas, team/work style, availability, location/work-arrangement preference, compensation expectation, English-use context when relevant, motivation, candidate question, and human-follow-up categories.
- [x] Seed only validated CV facts in CV-assisted and leave conversation-first fact state empty.
- [x] Treat salary, English, availability, and team/work preferences neutrally.
- [ ] Test malformed calls, wrong sources, no-evidence calls, duplicates, corrections, source transitions, role/name synchronization, layout, and reduced motion.

## Acceptance criteria

- [x] A final candidate salary statement can create a neutral evidence-linked range card in real time.
- [x] A correction replaces the prior card value, displays Corrected, and preserves valid evidence history without duplication.
- [x] Conversation-first cannot create a CV-sourced card by type, reducer, or malformed tool call.
- [x] Name/role cards and `DemoSession` values stay synchronized from candidate evidence.
- [x] Any bounded role label, compound wording, correction, and undecided state use one role-card/session contract with no classification, splitting, allow-list check, or unavailable status.
- [x] Desktop and mobile show the same categories, source chips, clarification/correction states, and evidence access.
- [x] No backend write, audio control, hidden score, or unsupported inference exists.
- [x] Unsupported employer/vacancy questions create evidence-linked human-follow-up cards without inventing responsibilities, qualifications, compensation, benefits, reporting lines, team size, work pattern, location requirements, or timelines.

## Focused verification

- [x] Run focused tool-schema, dispatcher, reducer, and component tests.
- [x] Replay fake events for salary, availability, team style, name correction, role correction, candidate question, and clarification.
- [x] Replay Graphic Designer, Full Stack Developer, compound-role, undecided, and unsupported-employer-question events and verify universal categories plus evidence-linked human follow-up.
- [x] Attempt invalid source, missing final turn, invented ID, duplicate, and unsupported category calls.
- [ ] Manually inspect desktop/mobile appearance, correction, long values, evidence chips, reduced motion, and conversation-first empty state.

## Verification evidence

- Deterministic verification on 2026-09-15 passed with the repository's bundled Node 24 runtime: 3 contract files/59 tests, 12 focused frontend files/90 tests, both contract and frontend TypeScript projects, targeted ESLint, Prettier, and diff-whitespace checks.
- The fake/client-tool coverage exercises neutral salary, availability, team/work style, English-use context, preferred-name and role corrections, Graphic Designer, Full Stack Developer, compound and undecided roles, candidate questions, human follow-up, malformed/missing/stale evidence, duplicate rejection, and CV-to-candidate source transitions without a paid provider call.
- Owner visual feedback replaced the disclosure's open-state flex-basis jump with an explicit accessible toggle and grid placement. Evidence remains fixed at the bottom-right of the provenance row when collapsed or expanded, while opened excerpts occupy a separate full-width row below so the card's value and metadata are not compressed.
- A later roomy-laptop correction removed the left voice card's independent `34rem` cap. Both live-interview columns now stretch across the same workspace row at standard and large laptop sizes, while the transcript and Insight Board retain their separate internal scrolling.
- A later visual correction moved the compact speaker-status rail into the transcript's own scrolling layer. Its sticky 3 rem frosted-ink treatment now blurs captions in the same compositing context instead of depending on a separate sibling scroll layer that could remain visually transparent in Chromium.
- The phone transcript now owns a bounded `clamp(18rem, 48dvh, 28rem)` viewport rather than growing with every turn. Caption updates synchronously scroll that shared viewport after layout, keeping the latest message visible while preventing the interview card from becoming indefinitely tall.
- The phone Insight Board was recomposed from two free-scrolling horizontal rails into two controlled carousels: one full-width, vertically proportioned evidence card per slide, and conversation coverage paged in groups of four. Both accept direct horizontal swipe as well as theme-matched 44 px previous/next controls. Their tracks follow the pointer continuously, reveal the adjacent slide during the gesture, apply bounded edge resistance, and settle or return after release while preserving vertical page scrolling, live position text, and horizontal containment; desktop and tablet board semantics remain unchanged.
- Corrective coverage proves a later same-value observation cannot erase a card's Corrected state or reason, fixed category metadata owns labels/order/marks, and persisted preferred-name/role projections cannot diverge from their evidence-linked insight cards. One shared contract-level boundary now guards every model-authored visible insight field and CV-analysis description while leaving verbatim candidate questions untouched; the frontend tool map is exhaustively keyed by the voice-token contract. The obsolete direct name/role reducer setters were removed.
- Credential-free production builds passed for contracts, backend, and frontend. A clean fake-mode runtime smoke check then returned `200` for `/`, `/demo`, the frontend-proxied `/v1/demo/bootstrap`, and the direct backend bootstrap on `localhost:3000`/`3001`; no `.env.local` file was read and no provider call was made.
- A credential-free local browser harness was inspected at 390 × 844, 768 × 1024, 1120 × 800, 1440 × 900, and 1920 × 1080. The height-matched desktop composition and internal board scroll, tablet grid, mobile swipe rail, aligned cards, long/corrected values, evidence disclosure, source/status chips, topic states, and conversation-first empty state remained usable without horizontal page overflow. The harness was removed after verification.
- The shared stylesheet contains the reduced-motion fallback, but OS/browser reduced-motion emulation was not available in the controlled preview. A real preference-mode inspection remains the only unverified portion of the two unchecked reduced-motion items above; all other listed cases passed.
- Published-agent callback verification remains credential-gated by SP-014/SP-014A. No local secret was read and no live or paid provider call was made.

## Commit boundary

Keep SP-016 reviewable as one logical change represented by `SP-016: visualize live interview understanding`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Complete Insight Board contract and tool signatures](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#7-live-insight-board--what-screenpilot-understood)
- [Conversation-confirmed role preference](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#conversation-confirmed-role-preference)
- [Active interview and responsive design](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#active-interview)
- [Browser client-tool security rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#safety-rules)
- [Credential acquisition and published-agent gate](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
