# SP-018 — Tune latency, interruption, and filler behavior

Status: Required  
Milestone: Milestone 2 — browser voice experience  
Last synchronized: 2026-08-31  
Depends on: SP-014, SP-015, SP-017  
Suggested commit: `SP-018: enforce conversational latency gates`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Measure and tune the deployed real-time experience so latency, interruption, visual waiting states, the single allowed filler, and the eight-minute cap meet explicit release gates.

## Standalone implementation context

- TTFA is candidate speech end to first substantive agent audio. A filler never stops the TTFA timer.
- Targets: TTFA p50 ≤800 ms and p95 ≤1,500 ms; release blocks above 1,200/2,000 ms respectively.
- Interruption-to-audio-stop p95 target is ≤250 ms and blocks above 400 ms.
- Client-tool-to-card p95 target is ≤300 ms and blocks above 600 ms.
- Connect-request-to-ready p95 target is ≤3,000 ms and blocks above 5,000 ms.
- Conversation-first preparation p95 target is ≤500 ms and blocks above 1,000 ms.
- Latency UI: 0–800 ms visual state only; 800–1,500 ms adds **Reviewing your answer…**; above 1,500 ms may play one static **“Mm-hm…”** soft-timeout filler.
- At most one filler per turn; more than three per interview or fillers on consecutive turns fail review. The filler is non-evaluative and never GPT-generated.
- Measure at least 50 representative deployed turns and 50 preparation requests across desktop/mobile and normal/throttled profiles.
- Complete SP-015's deliberately deferred active-session browser checks for captions, speaking/listening/reconnect states, mute, End, hard stop, keyboard operation, reduced motion, and sticky safe-area controls across the responsive reference anchors.

## Manual credential gate

- Instrumentation, aggregation, filler limits, and fake timing tests need no credential. Complete them first with the fake voice path.
- The required deployed sample reuses SP-014's ElevenLabs key/agent/voice and Turnstile group; the native ElevenLabs GPT model does not consume the app's direct `OPENAI_API_KEY`.
- If those values or paid-test permission are missing, do not fabricate measurements or tune against fake latency. Leave the 50-turn deployed sample and live release thresholds unchecked with the explicit blocker, while retaining all unpaid implementation results.
- Fake traces do not complete SP-015's deferred manual interaction and visual checks; keep them unchecked until a controlled active session is explicitly authorized.

## Scope boundaries

- Do not add a library of fillers, random verbal tics, GPT-generated filler, a second voice path, or fake latency metrics.
- Do not log transcript/CV/insight content while instrumenting.
- Do not fix platform timing by bloating the system prompt.
- Do not relax thresholds merely because local development is slower; measure deployed representative paths.
- Do not let a filler imply agreement, praise, comprehension, or hiring judgment.

## Implementation checklist

- [ ] Instrument content-free browser timestamps for preparation, Start/connect, speech end, first substantive audio, interruption/audio stop, and client-tool/card render.
- [ ] Define measurement IDs and aggregation that exclude candidate text/audio and do not create an analytics product.
- [ ] Tune bounded prompt/runtime context, output ceiling, ElevenLabs turn eagerness/interruption settings, audio buffering, and Flash v2.5 delivery.
- [ ] Implement the approved visual latency stages with reduced-motion behavior.
- [ ] Implement exactly one static soft-timeout filler path and ensure it does not stop TTFA measurement.
- [ ] Enforce per-turn, consecutive-turn, per-interview filler limits and the eight-minute hard stop.
- [ ] Measure at least 50 deployed turns and 50 preparation requests across representative desktop/mobile normal/throttled conditions.
- [ ] Document p50/p95, sample date/size, device/network profiles, provider revisions, and any outliers.
- [ ] Treat release-blocking thresholds as failures and tune before approval.

## Acceptance criteria

- [ ] All required metrics are measured from the documented boundaries without content logging.
- [ ] The deployed representative sample meets every release gate.
- [ ] Interruption stops audio promptly and does not leave overlapping speech.
- [ ] Fillers occur only after the threshold, never consecutively, never more than three times, and never alter evidence.
- [ ] The call ends reliably at eight minutes and produces partial review if necessary.
- [ ] Published portfolio claims use measured results with date/sample size.

## Focused verification

- [ ] Run focused timer/filler/hard-stop unit tests.
- [ ] Use deterministic delayed provider/event fixtures for every latency threshold boundary.
- [ ] Run the required deployed measurement sample across desktop/mobile and normal/throttled profiles.
- [ ] Inspect logs/telemetry payloads to confirm no candidate content is captured.
- [ ] Manually test captions, speaking/listening/reconnect states, mute, End, hard stop, keyboard operation, sticky safe-area controls, interruption, consecutive slow turns, cancellation, disconnect, and reduced motion across the responsive reference anchors.

## Commit boundary

Keep SP-018 reviewable as one logical change represented by `perf(voice): enforce conversational latency gates`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Performance gates and latency policy](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#performance-gates)
- [Prompt/platform responsibility boundary](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#prompt-ownership-versus-platform-configuration)
- [Operational logs](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#operational-logs)
- [Cost controls](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#cost-controls)
- [Credential acquisition and paid live-test gate](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
