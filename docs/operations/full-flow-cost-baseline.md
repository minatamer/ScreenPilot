# ScreenPilot full-flow cost baseline

Status: Preliminary sanitized template; production measurements are pending SP-026<br>
Created: 2026-09-24<br>
Planning authority: [Section 13 cost plan](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#13-elevenlabs--openai-research-and-cost-plan)

This file is an engineering spend-safety record, not a public unit-cost claim.
SP-025 creates the sanitized structure and records existing evidence. SP-026
appends and finalizes measurements from exactly two controlled production flows
after the audited deployment is reachable and before public release is
approved.

Never place CV text, transcript text, candidate identity, provider output, API
keys, account IDs, Turnstile tokens, cookies, grants, or secret-bearing billing
screenshots in this file. Record only coarse usage and cost fields.

## Evidence already available

### Aggregate ElevenLabs observation and duration decision — 2026-09-28

The owner reviewed the ScreenPilot agent's 90-day dashboard without opening or
copying conversation content. It reported four conversations, average duration
2:39, total cost 8.35K credits, average cost 2.09K credits, total live-LLM cost
USD 0.128, and average live-LLM cost USD 0.032. The rounded credit total matches
the separately displayed 8,349 credits used. The rounded average implies about
10:36 of aggregate connected time, but the individual durations were not
retained, so this is not evidence of the longest call or a per-run allocation.

Based on that actual average, the owner reduced the ScreenPilot hard maximum
from eight minutes to five minutes. The 300-second application contract and
source-controlled provider target are implemented under SP-028. The provider
dashboard still showed the previously verified 480 seconds at the time of the
decision. Later on 2026-09-28 the owner changed it to 300 seconds and published
private Main at immutable revision `agtvrsn_2101m3m80ezpee3bvccqy3ymwamk`.
This is configuration/cost-control evidence only and does not claim a Preview
or paid conversation.

### Local CV-assisted standard-live observation

| Field | Sanitized evidence |
| --- | --- |
| Date/environment | 2026-09-24; owner-controlled local synthetic run |
| Entry mode | CV-assisted using the checked-in synthetic sample |
| Git/provider revision | Pre-SP-024 product behavior; ElevenLabs `agtvrsn_9501m39701mmet6av5bz53yk6ggp` |
| Request counts | One successful `cv_analyze`, one successful `voice_token`, and one successful `interview_summary`; no duplicate summary request |
| Content-free route durations | CV analysis 9,894 ms; voice token 664 ms; summary 4,848 ms |
| Connected duration | Not retained as validated cost evidence |
| Direct OpenAI usage/cost | Token counts and measured currency cost were not recorded |
| ElevenLabs usage/cost | Connected minutes, Detailed live-LLM cost, credit deduction, and applied included minutes were not recorded |
| Infrastructure cost | Local run; not production infrastructure evidence |
| Total/variance | Not measurable from retained evidence |
| Use | Behavior/request-count evidence only; do not present it as a measured full-flow cost |

### Conversation-first owner recollection

The owner recalls the conversation-first live path succeeding. The retained
records do not clearly distinguish a complete `standard_live` ElevenLabs voice
flow from the successful fake-voice/live-summary rehearsals, and no matching
content-free operation ledger proves a full live flow. Preserve the recollection
as context only: it is neither log-corroborated production acceptance nor a
cost measurement, and it does not justify inventing request counts, duration,
or spend.

### Summary-only rehearsal evidence

Two corrected local summary rehearsals returned HTTP 200 in 4,738 ms and
5,360 ms, with exactly one `interview_summary` request in each session and no
ElevenLabs conversation. They prove the one-request summary boundary, not a
complete-flow cost. Provider token counts and measured currency cost were not
retained.

## SP-026 definitive production measurement set

SP-026 runs exactly these two controlled production flows unless a concrete
defect narrowly requires a documented rerun. Burst pricing stays off. Do not add
a third bundled-sample flow merely to repeat the CV-assisted branch.

1. **CV-assisted:** use an owner-selected wholly synthetic text PDF, or an
   explicitly licensed public-template text PDF with no real person's data. It
   must be materially different from the bundled sample and must first pass the
   free SP-025 grounding/no-leakage check.
2. **Conversation-first:** use synthetic answers only and no uploaded document.

Before either flow, confirm the exact SP-025A-audited Git revision, canonical
production hostname, production Turnstile widget/actions, current ElevenLabs
revision/tools, provider caps, burst-off state, and OpenAI input/output sharing
**Disabled**. After both flows, keep every documented provider and infrastructure
safety control in place. Leave `PAID_DEMO_ENABLED=true` so the public portfolio
site remains a working demo only if both flows pass and the dashboard
usage/cost, retention, privacy, and cleanup review has no unresolved issue. If
any condition fails or remains unverified, set it back to `false` and verify
both entry paths are disabled before release approval.

### Production flow record — CV-assisted

| Field | Measurement |
| --- | --- |
| Status | Pending SP-026 |
| Date / canonical environment | Pending |
| Deployed Git SHA | Pending |
| Synthetic/licensed fixture description | Pending; describe provenance only, never content or identity |
| ElevenLabs agent/prompt/model revision | Pending |
| Tool/system configuration checked | Pending |
| Production Turnstile hostname/actions | Pending |
| Connection duration | Pending |
| Direct OpenAI CV input / cached input / output tokens | Pending |
| Direct OpenAI summary input / cached input / output tokens | Pending |
| Direct OpenAI measured cost | Pending |
| ElevenLabs standard/burst status | Pending; must be standard/burst off |
| ElevenLabs connected-minute charge | Pending |
| ElevenLabs live-LLM Detailed cost | Pending |
| Credits / included minutes applied | Pending |
| Cloud Run / Hosting / Secret Manager / Artifact Registry overage | Pending |
| Measured total | Pending |
| Planning estimate and variance | Pending; explain variance above 20% |
| Functional result | Pending: Turnstile, CV grounding, voice, auto-ending, summary/review, cleanup |

### Production flow record — conversation-first

| Field | Measurement |
| --- | --- |
| Status | Pending SP-026 |
| Date / canonical environment | Pending |
| Deployed Git SHA | Pending |
| Entry data | Synthetic conversation only; no CV |
| ElevenLabs agent/prompt/model revision | Pending |
| Tool/system configuration checked | Pending |
| Production Turnstile hostname/actions | Pending |
| Connection duration | Pending |
| Direct OpenAI CV usage | Not applicable; confirm zero CV-analysis request |
| Direct OpenAI summary input / cached input / output tokens | Pending |
| Direct OpenAI measured cost | Pending |
| ElevenLabs standard/burst status | Pending; must be standard/burst off |
| ElevenLabs connected-minute charge | Pending |
| ElevenLabs live-LLM Detailed cost | Pending |
| Credits / included minutes applied | Pending |
| Cloud Run / Hosting / Secret Manager / Artifact Registry overage | Pending |
| Measured total | Pending |
| Planning estimate and variance | Pending; explain variance above 20% |
| Functional result | Pending: Turnstile, open discovery, voice, auto-ending, summary/review, cleanup |

## Production completion rules

- Inspect provider dashboards once after the bounded pair and record coarse
  usage/cost only. Do not copy provider content or secret-bearing screenshots.
- Record applied allowances separately from underlying usage. A free minute,
  credit, promotion, or infrastructure free quota does not make the provider
  operation intrinsically free.
- Record failed attempts that incurred usage. A narrow defect rerun must name
  the defect and why the original evidence was unusable.
- Compare actual totals with the Section 13 formulas and explain variance above
  20%; do not extrapolate a portfolio unit-cost claim from two observations.
- SP-026 is not complete until both production records above are filled, both
  flows pass, dashboard usage/cost and retention are reviewed, sharing is off,
  every provider/infrastructure safety control is confirmed, and the final
  `PAID_DEMO_ENABLED` state plus its pass/fail rationale is recorded. The switch
  may remain enabled only for the fully accepted working demo.
