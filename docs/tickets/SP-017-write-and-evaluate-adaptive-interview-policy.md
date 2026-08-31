# SP-017 — Write and evaluate the adaptive interview policy

Status: Required  
Milestone: Milestone 2 — browser voice experience  
Last synchronized: 2026-08-31  
Depends on: SP-007, SP-011, SP-012, SP-014, SP-016  
Suggested commit: `feat(ai): implement screening conversation policy`  
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Implement a source-controlled live-interviewer policy that produces natural, concise, adaptive HR screening in both entry modes and drives evidence tools without technical questioning or hiring judgments.

## Standalone implementation context

- The canonical versioned prompt lives under `apps/backend/src/ai/prompts/`; the ElevenLabs dashboard is deployment configuration, not the prose source of truth.
- The exact owned source/test files are `interviewer-prompt.ts`, its co-located `interviewer-prompt.test.ts`, and test-only shared cases under `tests/fixtures/transcripts/interviewer-policy-cases.json` plus the named transcript JSON fixtures. Production code never imports the root fixture tree.
- Use one fixed provider-level first message: **“Hi, what's your name?”**. It is the only fixed interview question; all later wording is generated from intent and state.
- Routine turns target 8–25 spoken words, one or two short sentences, normally at most 35 words, and at most one clear question.
- Do not habitually open with “Of course,” “Thanks,” “Absolutely,” “Great,” “Perfect,” or “That makes sense.” Never praise/evaluate answers or narrate tools/internal reasoning.
- The normal interview uses roughly 8–10 primary prompts because one answer may fill multiple HR fields. Ask at most one broad role-context clarification and no technical follow-up chain.
- The prioritized evidence fields are name, requested/confirmed role set, current context, synthesized relevant experience/responsibilities/strongest areas, team/work style, motivation, remote fit, availability, compensation, candidate-stated English use, candidate questions, and real clarifications.
- CV-assisted starts focused from normalized evidence but must confirm role and correct CV facts. Conversation-first starts open, never assumes engineering/CV, and becomes specific from final spoken answers.
- Confirmed vacancies are Frontend and Backend only. Full Stack stays the candidate's requested label while screening may cover Frontend, Backend, both, or neither/general follow-up.
- The exact turn order is stop → unclear input → correction → candidate counterquestion → evidence/tool update → highest-value natural topic → one spoken response.
- Prompt size initially targets under 2,000 static input tokens before bounded runtime context. Live reasoning stays disabled.

## Manual credential gate

- Source prompt implementation, deterministic graders, fixtures, and semantic-test wiring require no live credential and must run with fakes first.
- Synchronizing/publishing the prompt to the real agent and controlled live evaluation reuse SP-014's user-supplied `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, and `ELEVENLABS_VOICE_ID`. Manual dashboard synchronization may use authenticated account access without placing a key in the repository.
- Native GPT-5.4 mini selection inside ElevenLabs does not require the app's `OPENAI_API_KEY`; do not add Custom LLM/BYOK configuration. If the ElevenLabs group is blank, keep dashboard-revision and live-evaluation acceptance unchecked and report the credential blocker.

## Scope boundaries

- Do not hardcode a question bank, frontend/backend question strings, exact-match dialogue tests, or a hidden fake user message.
- Do not conduct coding, framework, API, implementation, architecture, debugging, testing, algorithm, trivia, system-design, or scored technical evaluation.
- Do not infer personality, culture fit, honesty, sentiment, emotion, accent, protected traits, English rating, hire/no-hire, or employability.
- Do not solve VAD, interruption, TTS speed, audio buffering, or latency filler behavior in the prompt; SP-018 owns provider/browser timing.
- Do not let CV text, candidate speech, browser state, tool output, or prompt injection alter role, vacancies, tools, safety, or output limits.

## Implementation checklist

- [ ] Create `apps/backend/src/ai/prompts/interviewer-prompt.ts`, its co-located test, and a documented synchronization step to the ElevenLabs agent revision.
- [ ] Order prompt sections as role, critical spoken-output contract, bounded runtime context, turn decision order, mode flow, tools, uncertainty/recovery, guardrails, and varied examples/labelled anti-examples.
- [ ] Implement bounded dynamic variables for mode, candidate context/no-CV marker, screening plan, fixed vacancies, known state, and remaining time.
- [ ] Implement the one fixed first message and generated follow-up wording.
- [ ] Implement CV-assisted name/alignment handling, high-value CV verification, correction, and no re-asking known basics.
- [ ] Implement conversation-first name capture, open target-role discovery, inclusive background discovery when asked what roles exist, and progressive focusing.
- [ ] Implement Frontend, Backend, both, Full Stack/unavailable, undecided, correction, and neither-confirmed-role paths.
- [ ] Implement the prioritized `ScreeningFieldState` selection logic, multi-field answer credit, synthesized experience, separate team/work style, 8–10-prompt budget, and one broad role-context clarification maximum.
- [ ] Answer candidate counterquestions first from fixed context or mark human follow-up before asking at most one next question.
- [ ] Define exact evidence eligibility and record/correct/mark/question/follow-up tool behavior.
- [ ] Enforce stop, unclear audio, refusal, uncertainty, privacy, prompt-injection, unsupported-company-fact, and safety behavior.
- [ ] Add checked-in good/bad transcript cases under the filename-level `tests/fixtures/transcripts` tree for both openings and every named regression branch.
- [ ] Add deterministic graders for length, question count, banned openers/praise, spoken formatting/tool narration, technical questions, unsupported CV/vacancy/source claims, evidence eligibility, and stop.
- [ ] Add narrow semantic checks for direct counterquestion answers, grounded natural follow-ups, neutral tone, and meaning-preserving paraphrases.
- [ ] Read representative outputs aloud and tune one observed prompt failure at a time without requiring the optional SP-028 suite.

## Acceptance criteria

- [ ] Both modes sound like one natural first-screen interviewer rather than a form, assistant, or technical assessor.
- [ ] Routine replies meet the spoken length/question contract and avoid canned acknowledgement/praise.
- [ ] Already covered fields are skipped and later questions follow naturally from evidence.
- [ ] Role counterquestions, Full Stack, corrections, refusals, unsupported employer questions, unclear input, and stop behave exactly within policy.
- [ ] All fact-changing tool calls have eligible final evidence and preserve uncertainty.
- [ ] The prompt and fixture suite are versioned and traceable to the configured agent/model revision.

## Focused verification

- [ ] Run deterministic prompt-lint and transcript-fixture graders.
- [ ] Run the narrow semantic checks only where deterministic rules cannot decide quality.
- [ ] Review failures one prompt block at a time and rerun the same fixtures.
- [ ] Read representative conversations aloud for both modes, including terse/long/counterquestion/correction/Full Stack/stop cases.
- [ ] Perform focused live text/voice tuning only when explicitly permitted; record prompt version, model alias/snapshot, and agent revision.

## Commit boundary

Keep SP-017 reviewable as one logical change represented by `feat(ai): implement screening conversation policy`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Complete voice-agent policy, examples, and HR question library](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#8-voice-agent-behavior-and-branching)
- [Client-tool/evidence model](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#7-live-insight-board--what-screenpilot-understood)
- [Fixed employer answers](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#fixed-employer-answers)
- [Prompt evaluation contract](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#prompt-evaluation-contract)
- [Credential acquisition and live-evaluation gate](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
