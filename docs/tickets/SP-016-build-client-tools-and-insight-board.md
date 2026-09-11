# SP-016 — Build browser client tools and Insight Board

Status: Required  
Milestone: Milestone 2 — browser voice experience  
Last synchronized: 2026-09-11<br>
Depends on: SP-005, SP-006, SP-010A, SP-015<br>
Suggested commit: `feat(insights): visualize live interview understanding`  
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
- Desktop uses a fixed constellation; mobile retains identical categories/sources/states in a vertical composition with swipeable rail and expandable evidence.
- Card lifecycle is empty → appearing → confirmed, with confirmed → corrected or needs-clarification.

## Manual credential gate

- Client-tool schemas, dispatcher logic, evidence validation, and Insight Board behavior require no key and use fake tool calls first.
- Registering/verifying the tools against the published agent reuses SP-014's ElevenLabs account/agent values. Do not put `ELEVENLABS_API_KEY` or any other secret in frontend configuration; the browser operates through the authorized session only.
- If the private agent is not yet created or credentials are blank, complete local acceptance and leave provider-registration/live-tool verification unchecked with the manual blocker.

## Scope boundaries

- Do not build a force-directed/draggable/zoomable graph, confidence percentages, card editing UI, or a second mobile data model.
- Do not score, rank, infer personality/culture fit, sentiment, emotion, accent, protected traits, employability, or English proficiency.
- Do not save or replay audio; replayable evidence audio remains a future exploration note only.
- Do not accept a fact-changing tool call without a valid eligible final candidate turn.
- Do not allow CV provenance in conversation-first.

## Implementation checklist

- [ ] Define strict shared schemas for all five client-tool arguments and allowed insight categories/statuses/sources.
- [ ] Register the five tools with the ElevenLabs client and route calls through one validated dispatcher.
- [ ] Attach the latest eligible final candidate turn ID locally; reject missing, stale, wrong-speaker, malformed, or duplicate evidence.
- [ ] Implement the fixed desktop constellation and intentional mobile rail/expanded-card composition.
- [ ] Implement appearance, confirmed, corrected, clarification, and evidence-chip states with reduced-motion alternatives.
- [ ] Synchronize preferred name and role preference from record/correct events while preserving candidate wording/evidence.
- [ ] Support current context, relevant experience, broad responsibility, strongest areas, team/work style, availability, location/work-arrangement preference, compensation expectation, English-use context when relevant, motivation, candidate question, and human-follow-up categories.
- [ ] Seed only validated CV facts in CV-assisted and leave conversation-first fact state empty.
- [ ] Treat salary, English, availability, and team/work preferences neutrally.
- [ ] Test malformed calls, wrong sources, no-evidence calls, duplicates, corrections, source transitions, role/name synchronization, layout, and reduced motion.

## Acceptance criteria

- [ ] A final candidate salary statement can create a neutral evidence-linked range card in real time.
- [ ] A correction replaces the prior card value, displays Corrected, and preserves valid evidence history without duplication.
- [ ] Conversation-first cannot create a CV-sourced card by type, reducer, or malformed tool call.
- [ ] Name/role cards and `DemoSession` values stay synchronized from candidate evidence.
- [ ] Any bounded role label, compound wording, correction, and undecided state use one role-card/session contract with no classification, splitting, allow-list check, or unavailable status.
- [ ] Desktop and mobile show the same categories, source chips, clarification/correction states, and evidence access.
- [ ] No backend write, audio control, hidden score, or unsupported inference exists.
- [ ] Unsupported employer/vacancy questions create evidence-linked human-follow-up cards without inventing responsibilities, qualifications, compensation, benefits, reporting lines, team size, work pattern, location requirements, or timelines.

## Focused verification

- [ ] Run focused tool-schema, dispatcher, reducer, and component tests.
- [ ] Replay fake events for salary, availability, team style, name correction, role correction, candidate question, and clarification.
- [ ] Replay Graphic Designer, Full Stack Developer, compound-role, undecided, and unsupported-employer-question events and verify universal categories plus evidence-linked human follow-up.
- [ ] Attempt invalid source, missing final turn, invented ID, duplicate, and unsupported category calls.
- [ ] Manually inspect desktop/mobile appearance, correction, long values, evidence chips, reduced motion, and conversation-first empty state.

## Commit boundary

Keep SP-016 reviewable as one logical change represented by `feat(insights): visualize live interview understanding`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Complete Insight Board contract and tool signatures](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#7-live-insight-board--what-screenpilot-understood)
- [Conversation-confirmed role preference](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#conversation-confirmed-role-preference)
- [Active interview and responsive design](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#active-interview)
- [Browser client-tool security rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#safety-rules)
- [Credential acquisition and published-agent gate](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
