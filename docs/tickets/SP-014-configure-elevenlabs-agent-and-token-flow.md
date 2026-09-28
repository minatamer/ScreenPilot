# SP-014 — Configure ElevenLabs agent and private token flow

Status: Implementation complete; live provider verification blocked on user credentials<br>
Milestone: Milestone 2 — browser voice experience  
Last synchronized: 2026-09-12<br>
Depends on: SP-003, SP-009, SP-010, SP-010A, SP-013<br>
Suggested commit: `SP-014: connect the private ElevenLabs WebRTC session`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Configure the one approved ElevenLabs browser WebRTC path and authorize it through a protected backend token endpoint without exposing provider secrets or adding telephony.

## Standalone implementation context

- ElevenLabs ElevenAgents owns WebRTC, turn-taking, interruption, Scribe v2 Realtime transcription, and Flash v2.5 speech synthesis.
- OpenAI GPT-5.4 mini through ElevenAgents writes live interviewer language and tool decisions with reasoning/thinking disabled.
- There is no phone number, SIP, PSTN, browser recording, second voice stack, webhook transcript stream, or OpenAI Realtime fallback.
- `POST /v1/voice/token` receives the signed `interviewGrant` and one-time `turnstileToken` with expected action `voice_token`.
- The backend validates origin, safety cookie, grant signature/expiry, Turnstile hostname/action, paid-demo flag, request/rate/capacity conditions, then requests the shortest practical private conversation token.
- The browser supplies bounded dynamic variables: entry mode, role-neutral synthetic-demo disclosure, universal plan, candidate-stated role/undecided state, and optional normalized CV/evidence-linked role suggestion. Every role label is delimited inert data and never replaces or modifies the source-controlled system prompt.
- Configure one short first-message exception; every later question is model-generated from intent/state.
- Maximum live duration is five minutes after the SP-028 measured-usage decision. ElevenLabs audio saving is off and transcript retention is the shortest locked setting.
- After included minutes are exhausted, five standard connected minutes cost **$0.40** before the separate live-model charge; burst minutes would cost **$0.80**. Included minutes and native GPT credits remain separate accounting dimensions.

## Manual credential gate

- A real connection needs user-supplied `ELEVENLABS_API_KEY=`, `ELEVENLABS_AGENT_ID=`, `ELEVENLABS_VOICE_ID=`, `TURNSTILE_SITE_KEY=`, `TURNSTILE_SECRET_KEY=`, and `TURNSTILE_ALLOWED_HOSTNAMES=` in the ignored backend local file. The committed template keeps every value blank.
- Create a restricted ElevenLabs key, set only required scopes plus an expiry/credit quota where available, create the private agent, then copy its agent ID and selected voice ID. Follow the current first-party paths in the [SP-014A live-provider runbook](../operations/live-provider-setup.md#elevenlabs-elevenagents).
- Do not copy `OPENAI_API_KEY` into ElevenLabs. The locked native GPT-5.4 mini selection uses ElevenLabs' integrated model path; Custom LLM/BYOK is out of scope. The app's OpenAI key remains reserved for direct backend CV/summary calls.
- The backend alone uses the ElevenLabs API key to request the shortest-lived private WebRTC conversation token. The browser receives only that token and required public identifiers.
- Fake route/SDK tests complete while fields are blank. Dashboard creation, revision sync, and one paid live connection remain unchecked until the user supplies values and permission. Verify `apps/backend/.env.local` is ignored before filling it.
- The exact dashboard target, deliberately blank revision record, SP-025 cost fields, and owner-only microphone/live checklist are recorded in the [SP-014A live-provider runbook](../operations/live-provider-setup.md#elevenlabs-elevenagents). The former ElevenLabs-only path remains a short pointer for compatibility. No microphone or live-provider test was performed during SP-014 implementation at the user's request.

## Scope boundaries

- Do not expose ElevenLabs API keys, agent secrets, signing keys, prompts, tool definitions, or provider tokens in browser persistence/logs/URLs.
- Do not accept agent/model/voice IDs, prompt text, or tool schemas from the browser.
- Do not add OpenAI Realtime, another TTS/STT provider, telephony, saved audio, provider fallback, or a second agent.
- Do not implement the full conversational prompt policy here; SP-017 owns it.
- Do not add role-specific agents, tools, knowledge, competency paths, or employer facts. One agent handles every candidate-selected role through the same general-HR policy.
- Do not tune latency/fillers beyond safe initial configuration; SP-018 owns measured tuning.

## Implementation checklist

- [x] Define the source-controlled target for Scribe v2 Realtime, GPT-5.4 mini reasoning none, Flash v2.5, user-selected voice, and private WebRTC transport.
- [ ] Create/publish the real ElevenLabs agent and apply the target; blocked on the blank user-owned account values.
- [x] Configure bounded dynamic variables, the five universal client-tool names with safe deferred handlers, initial turn-taking/interruption/timeout settings, five-minute duration, and one concise first message. SP-016 owns strict tool argument schemas and the mutating dispatcher; SP-028 owns the duration reduction and current provider-sync gate.
- [x] Record configuration/model identifiers and a conservative 160-token live output ceiling; the provider revision remains deliberately `null` until publication.
- [x] Record where SP-025 will read connected duration, standard-versus-burst status, included-minute use, credit deduction, and native-model **Detailed costs**; do not infer the final live-model charge from token estimates once dashboard data exists.
- [x] Lock ElevenLabs audio saving off and transcript retention to zero/the shortest setting in source.
- [x] Implement `POST /v1/voice/token` with strict schema, origin/cookie/grant validation, paid-demo/admission gates, Turnstile Siteverify before ElevenLabs, and `Cache-Control: no-store`.
- [x] Return only the short-lived token and provider conversation identifier required by the current private-token SDK flow; keep agent and voice IDs backend-only.
- [x] Use the ElevenLabs React SDK to start WebRTC with bounded validated context and registered client-tool declarations.
- [x] Use a deterministic browser-local bridge in fake/default development and lazy-load the real SDK session only when bootstrap enables paid live voice.
- [x] Keep conversation credentials and Turnstile tokens in memory only; clear them after use/failure.
- [x] Handle grant expiry, Turnstile/provider rejection, connect cancellation, disabled paid demo, capacity errors, and interruption without a fallback provider; terminal SDK failures end the provider session once and unmount the bridge immediately.
- [x] Add fake-provider route/client tests proving validation ordering and no premature provider calls.

## Acceptance criteria

- [ ] A valid preflight starts exactly one browser WebRTC conversation with the locked private agent; deterministic SDK coverage passes, but the live connection requires user credentials and microphone verification.
- [x] Strict Mode and repeated-render coverage prove one start request cannot create concurrent sessions.
- [x] Fake/default browser coverage proves the ElevenLabs session bridge is not mounted, while paid-live selection and terminal teardown have focused regressions.
- [x] Every validation/challenge/capacity failure occurs before ElevenLabs token issuance in deterministic route/use-case coverage.
- [x] Source, storage, route, and logging coverage keep secrets and conversation credentials out of persistence, logs, URLs, and extra response fields; live browser inspection remains owner-only.
- [x] No recording/playback artifact or second voice architecture exists.
- [ ] Provider retention settings and public disclosure agree in source; live dashboard verification requires account access.
- [x] One agent configuration accepts any bounded role label or undecided state as inert dynamic context and exposes identical policy/tool configuration; profession cannot alter tools, policy, or interview type.

## Focused verification

- [x] Run focused backend Supertest and frontend voice-connection tests with fakes.
- [x] Run focused fake-versus-live bridge-selection and terminal SDK teardown tests without a microphone or provider request.
- [x] Inspect request ordering/call counts for invalid origin, cookie, grant, Turnstile, kill switch, and capacity.
- [ ] Perform one controlled live connection only when the user/environment explicitly permits paid testing; blocked on credentials and intentionally not attempted.
- [x] Inspect deterministic storage/logging behavior and confirm cancellation/expiry recovery; live browser network/console inspection remains owner-only.
- [ ] Verify the agent dashboard/revision matches the source-controlled identifiers and retention settings; blocked on account access.
- [x] With fakes, pass Graphic Designer, Backend Developer, Full Stack Developer, compound wording, undecided, and instruction-like role labels; assert identical policy/tool configuration and zero role-specific agents.

## Commit boundary

Keep SP-014 reviewable as one logical change represented by `SP-014: connect the private ElevenLabs WebRTC session`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Locked live provider path and token issuance](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#9-browser-voice-implementation-and-performance-contract)
- [Voice-token REST route](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#post-v1voicetoken)
- [Provider division and retention](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#13-elevenlabs--openai-research-and-cost-plan)
- [Start/connect flow](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#stage-7--start-and-connect)
- [ElevenLabs, Turnstile, and blank-credential guide](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)
- [Full-flow pricing, included minutes, and measurement](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#13-elevenlabs--openai-research-and-cost-plan)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
