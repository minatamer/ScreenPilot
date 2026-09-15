# SP-017 — Write and evaluate the adaptive interview policy

Status: Required  
Milestone: Milestone 2 — browser voice experience  
Last synchronized: 2026-09-15<br>
Depends on: SP-007, SP-010A, SP-011, SP-012, SP-014, SP-016, SP-016A<br>
Suggested commit: `SP-017: implement the screening conversation policy`<br>
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
- The prioritized evidence fields are name, candidate-stated role or undecided state, current context, synthesized high-level experience/responsibilities, team/work style, motivation/next-role priorities, location/work-arrangement preference, availability, compensation expectation, candidate-stated English use where relevant, candidate questions, human follow-ups, and close.
- CV-assisted starts focused from normalized evidence but must confirm role and correct CV facts. Conversation-first starts open, never assumes engineering/CV, and becomes specific from final spoken answers.
- Any bounded non-empty candidate-stated role becomes the session's synthetic demo vacancy. There is no allow-list, unavailable response, forced choice, Full Stack fallback, or profession-specific branch; undecided candidates continue role-neutrally.
- The exact turn order is stop → unclear input → correction → candidate counterquestion → evidence/tool update → highest-value natural topic → one spoken response.
- Prompt size initially targets under 2,000 static input tokens before bounded runtime context. Live reasoning stays disabled.

## Manual credential gate

- Source prompt implementation, deterministic graders, fixtures, and semantic-test wiring require no live credential and must run with fakes first.
- Synchronizing/publishing the prompt to the real agent and controlled live evaluation reuse SP-014's user-supplied `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, and `ELEVENLABS_VOICE_ID`. Manual dashboard synchronization may use authenticated account access without placing a key in the repository.
- Native GPT-5.4 mini selection inside ElevenLabs does not require the app's `OPENAI_API_KEY`; do not add Custom LLM/BYOK configuration. If the ElevenLabs group is blank, keep dashboard-revision and live-evaluation acceptance unchecked and report the credential blocker.

## Scope boundaries

- Do not hardcode a question bank, profession-specific question strings, exact-match dialogue tests, or a hidden fake user message.
- Do not conduct technical, portfolio, competency, roleplay, professional-knowledge, suitability, coding, framework, API, implementation, architecture, debugging, testing, algorithm, trivia, system-design, or scored evaluation.
- Do not infer personality, culture fit, honesty, sentiment, emotion, accent, protected traits, English rating, hire/no-hire, or employability.
- Do not solve VAD, interruption, TTS speed, audio buffering, or latency filler behavior in the prompt; SP-018 owns provider/browser timing.
- Do not let instructions inside CV text, candidate speech/role labels, browser state, or tool output alter the interviewer policy, tools, safety, knowledge boundaries, or output limits.

## Implementation checklist

- [ ] Create `apps/backend/src/ai/prompts/interviewer-prompt.ts`, its co-located test, and a documented synchronization step to the ElevenLabs agent revision.
- [ ] Order prompt sections as role, critical spoken-output contract, bounded runtime context, turn decision order, mode flow, tools, uncertainty/recovery, guardrails, and varied examples/labelled anti-examples.
- [ ] Implement bounded dynamic variables for mode, candidate context/no-CV marker, universal screening plan, candidate-stated role/undecided state, role-neutral demo disclosure, known state, and remaining time; delimit role labels as untrusted data.
- [ ] Implement the one fixed first message and generated follow-up wording.
- [ ] Implement CV-assisted name/alignment handling, high-value CV verification, correction, and no re-asking known basics.
- [ ] Implement conversation-first name capture, open target-role discovery, inclusive background discovery when asked what roles exist, and progressive focusing.
- [ ] Implement ordinary Graphic Designer, Customer Support Representative, Product Manager CV suggestion, Backend Developer, Full Stack Developer, correction, compound/multiple-role, and undecided paths through one shared HR policy.
- [ ] Implement the prioritized `ScreeningFieldState` selection logic, multi-field answer credit, synthesized experience, separate team/work style, 8–10-prompt budget, and one broad role-context clarification maximum.
- [ ] Answer candidate counterquestions first only from explicit server-owned context; otherwise mark human follow-up before asking at most one next question.
- [ ] Define exact evidence eligibility and record/correct/mark/question/follow-up tool behavior.
- [ ] Enforce stop, unclear audio, refusal, uncertainty, privacy, prompt-injection, unsupported-company-fact, and safety behavior.
- [ ] Add checked-in good/bad transcript cases under the filename-level `tests/fixtures/transcripts` tree for both entry modes and every named cross-profession regression branch.
- [ ] Add deterministic graders for length, question count, banned openers/praise, spoken formatting/tool narration, profession-specific assessment questions, unsupported CV/employer/vacancy/source claims, evidence eligibility, and stop.
- [ ] Add narrow semantic checks for direct counterquestion answers, grounded natural follow-ups, neutral tone, and meaning-preserving paraphrases.
- [ ] Read representative outputs aloud and tune one observed prompt failure at a time without requiring the optional SP-028 suite.

## Acceptance criteria

- [ ] Both modes sound like one natural first-screen interviewer rather than a form, assistant, or technical assessor.
- [ ] Routine replies meet the spoken length/question contract and avoid canned acknowledgement/praise.
- [ ] Already covered fields are skipped and later questions follow naturally from evidence.
- [ ] Role counterquestions, arbitrary/compound roles, undecided state, corrections, refusals, unsupported employer questions, unclear input, and stop behave exactly within policy.
- [ ] Graphic Designer and Customer Support Representative receive no portfolio/competency simulation; Backend Developer receives no technical questions; Full Stack Developer receives no redirection; experience/status changes structure only.
- [ ] All fact-changing tool calls have eligible final evidence and preserve uncertainty.
- [ ] The prompt and fixture suite are versioned and traceable to the configured agent/model revision.

## Focused verification

- [ ] Run deterministic prompt-lint and transcript-fixture graders.
- [ ] Run the narrow semantic checks only where deterministic rules cannot decide quality.
- [ ] Review failures one prompt block at a time and rerun the same fixtures.
- [ ] Read representative conversations aloud for both modes, including terse/long/counterquestion/correction/arbitrary-role/undecided/stop cases.
- [ ] Perform focused live text/voice tuning only when explicitly permitted; record prompt version, model alias/snapshot, and agent revision.

## Commit boundary

Keep SP-017 reviewable as one logical change represented by `feat(ai): implement screening conversation policy`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Complete voice-agent policy, examples, and HR question library](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#8-voice-agent-behavior-and-branching)
- [Client-tool/evidence model](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#7-live-insight-board--what-screenpilot-understood)
- [Employer and vacancy knowledge boundary](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#employer-and-vacancy-knowledge-boundary)
- [Prompt evaluation contract](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#prompt-evaluation-contract)
- [Credential acquisition and live-evaluation gate](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
