# ScreenPilot — Full Project Specification

> **Primary portfolio project** — AI voice screening for recruiting teams.
>
> **Document purpose:** This file is the source of truth for humans and coding agents building the project. If implementation choices conflict with this document, update this document first or explicitly record the decision in `docs/decisions/`.
>
> **Status:** Portfolio demo specification, with a deliberate path to MVP and full product.

---

## 1. Executive summary

ScreenPilot is an AI-powered **first-round recruiting phone screen**. Instead of an HR recruiter repeating the same 5–10 minute intake call for every candidate, ScreenPilot conducts a natural voice conversation, confirms job-relevant information, adapts its questions to the candidate's CV and employment status, records the call with consent, produces a transcript and a structured summary, and gives the recruiter a clean review screen.

The product is intentionally **human-in-the-loop**. The AI collects and organizes evidence; it does **not** automatically rank, reject, score personality, infer emotion, judge accents, or make hiring decisions.

The portfolio demo should feel like a real B2B SaaS product, not an OpenAI playground wrapper. The key proof points are:

- realtime speech-to-speech AI
- natural turn-taking and interruption handling
- tool/function calling against real application state
- a real PostgreSQL data model
- call recording, transcript, and structured post-call processing
- polished recruiter workflows
- strong full-stack architecture
- production-minded privacy, consent, reliability, logging, and error handling
- unusually polished UI/UX for a technical demo

### Recommended one-line portfolio description

> **ScreenPilot is an AI voice screening assistant that conducts first-round recruiter calls, records and transcribes them, verifies structured candidate information, and gives hiring teams a clean human-review workflow.**


---

## 2. Scope hierarchy — read this before building

This project has **three deliberately separate scopes**. Coding agents must never blur them together.

### Scope 1 — Portfolio demo: BUILD THIS NOW

The public demo is intentionally narrow. Its job is to prove one hero workflow exceptionally well:

> **A recruiter reviews a candidate → the candidate completes a natural AI voice screen → the call is recorded/transcribed → the recruiter reviews a structured result and makes the decision.**

The demo has **8 required product experiences**:

1. recruiter workspace with a small seeded set of jobs and candidates
2. CV-aware candidate context
3. a simple screening template/configuration
4. candidate consent + microphone check + screening entry page
5. natural realtime English voice screening with adaptive follow-ups and tool calls
6. call recording + final transcript
7. structured summary, verified answers, discrepancies and key moments
8. recruiter review with audio playback, transcript, notes, manual English review and human next-step decision

The detailed 16-item demo list later in this document is an **implementation checklist supporting these 8 experiences**, not permission to grow the product into 16 unrelated feature areas.

### Scope 2 — Commercial MVP: ROADMAP ONLY

MVP items are documented so the architecture does not paint us into a corner. **Do not implement them for the portfolio demo unless the owner explicitly promotes an item into demo scope.** Examples include real phone/SIP calling, recruiter accounts, organizations/permissions, ATS integration, invitations, multilingual flows, billing and retention controls.

### Scope 3 — Full product: VISION ONLY

Full-product items describe what ScreenPilot could become if the concept gains real users. They must not influence demo scope except where a cheap architectural choice now avoids obvious future rework.

### Demo scope guardrails

For the portfolio demo, do **not** build a full ATS. In particular, do not add pipelines, offer management, payroll, onboarding, broad HRIS functionality, complex enterprise admin, multiple ATS integrations, billing, SSO, or a large settings surface.

If a proposed feature does not improve the hero flow above, it should normally be deferred.

### Demo completion rule

The demo is complete when the hero workflow is smooth enough to show a client without explanation. Prioritize, in order:

1. voice quality and conversational behavior
2. fast, reliable transitions and loading/error states
3. accurate tool use and persistence
4. recording/transcript/review quality
5. UI/UX polish
6. breadth

**A flawless 8-experience demo is better than a feature-rich recruiting platform.**

## 3. Naming

### Working name

**ScreenPilot**

Pros:
- immediately communicates screening + automation
- consistent with the “Pilot” portfolio naming style
- easy to remember

Caution:
- the name already appears in unrelated screen/device automation software, so it should be treated as a **portfolio codename**, not a trademark-cleared startup name.

### Three alternative names

1. **IntakeLoop** — emphasizes the repetitive intake workflow being automated; more B2B/process-oriented.
2. **CandidateLine** — connects candidates, calls, and recruiting; clear voice/phone implication.
3. **RoleCall** — short and descriptive: a first call tied to a particular role.

> **Naming note for agents:** Do not rename routes, package names, database schemas, or UI branding until the owner chooses a final name. Use `screenpilot` internally for repository/package naming for now.

---

## 4. The real problem being solved

Recruiters often perform a short screening call after reviewing a CV. Even when information exists in the CV, recruiters may still confirm:

- which position the candidate intended to apply for
- current employment status
- years and type of experience
- degree, university, and graduation status for junior candidates
- internships/projects for fresh graduates
- role-specific baseline experience
- notice period / earliest start date
- expected compensation
- location and work-arrangement compatibility
- job-specific administrative questions configured by HR
- candidate questions about the company or role
- spoken English level when the company uses the call as an English communication check

The pain is repetition. An HR person may ask almost the same questions dozens of times per role. ScreenPilot should remove the repetitive intake work while preserving the human recruiter as the decision-maker.

### Important product positioning

**Good positioning:**

> AI handles the repetitive first call. Humans make the hiring decisions.

**Bad positioning:**

> AI automatically decides who is qualified.

The first is the core product philosophy.

---

## 5. Target users

### Demo target user

A recruiter at a fictional mid-sized technology company hiring a **Junior Software Engineer / Flutter Developer** in Egypt or MENA.

Why this demo role works well:
- naturally supports junior/fresher branching
- lets the AI verify degree, graduation, internships and projects
- lets the AI ask basic technical-context questions without becoming a technical interview
- English screening is believable
- the hiring/dev team has a reason to review the recording later

### Eventual users

- in-house recruiters
- recruitment agencies
- BPO / call-center hiring teams
- graduate recruitment teams
- high-volume retail/sales/customer-support hiring
- startups with small HR teams
- MENA businesses that screen in English and/or Arabic

---

## 6. Demo philosophy

The demo is not trying to build a complete ATS. It should show **one exceptional workflow end to end**:

1. recruiter creates/views a role and screening template
2. recruiter opens a candidate with a CV
3. candidate starts a browser-based AI voice screening
4. AI discloses that it is AI and that the call will be recorded
5. candidate consents
6. AI conducts a natural adaptive interview in English
7. AI uses application tools to save answers and retrieve job/company facts
8. call is recorded
9. final transcript is generated
10. structured summary and discrepancies are generated
11. recruiter reviews audio, transcript, extracted facts, candidate questions and notes
12. recruiter manually chooses the next step

If this workflow feels flawless, it is more impressive than 40 half-built screens.

---

# PART A — PORTFOLIO DEMO SCOPE

## 7. Demo implementation checklist: 16 items supporting 8 core experiences

The first public portfolio version uses the following **16 implementation items** to deliver the **8 required demo experiences defined above**. These are not 16 separate product bets. Do not expand scope until the hero workflow is smooth and reliable.

### 1. Recruiter overview dashboard

Show:
- screens completed today
- screens awaiting review
- average screening duration
- candidate questions waiting for HR
- recent screening calls
- open jobs

This is a recruiter productivity dashboard, not an “AI score” dashboard.

### 2. Jobs list + job detail

A recruiter can:
- view seeded jobs
- create/edit a demo job
- define title, department, location, work model, short description, salary range (optional), benefits and role FAQ

### 3. Candidate list + candidate profile

Show:
- candidate name
- applied role
- status
- CV
- screening status
- structured candidate information
- call history

Use synthetic/demo candidates only.

### 4. CV upload / candidate-context parsing

Recruiter can upload a PDF CV for a demo candidate.

The backend extracts text and produces a small candidate context object such as:

```json
{
  "currentStatus": "recent_graduate",
  "degree": "BSc Computer Engineering",
  "university": "Cairo University",
  "graduationYear": 2025,
  "skillsMentioned": ["Flutter", "React", "Node.js"],
  "experienceHighlights": ["6-month internship"]
}
```

Do not turn this into automated candidate ranking.

### 5. Screening template builder

Recruiter configures:
- required sections
- custom job questions
- optional admin questions
- maximum call duration
- whether compensation is asked
- whether English-only screening is required

Keep the UI simple. A polished ordered question/section builder is enough; a complex node graph is optional for MVP.

### 6. Candidate demo invitation / screening page

Public candidate page with:
- company/role name
- what the screening covers
- AI disclosure
- recording disclosure
- privacy note
- microphone test
- start button

No candidate account required.

### 7. Realtime AI voice interview

Use OpenAI Realtime speech-to-speech so the conversation feels genuinely natural.

Requirements:
- candidate can interrupt
- AI does not speak in long paragraphs
- AI responds to unexpected but relevant statements
- silence does not immediately break the interview
- AI does not repeatedly ask questions already answered
- latency should feel conversational

### 8. Explicit recording consent

The AI must clearly disclose:
- it is an AI assistant
- the call is recorded/transcribed
- the hiring team will review the result

If the candidate declines:
- do not record
- end politely
- save `candidate_requested_human_screen = true`

### 9. Adaptive branching

At minimum:

**Recent graduate / fresher**
- degree
- university
- graduation year
- internships
- projects
- relevant tools/skills
- availability

**Currently employed / experienced**
- current role
- high-level responsibilities
- total relevant experience
- notice period
- expected compensation
- role-specific baseline questions

Do **not** ask a fresher for previous salary after they have said they have never worked.

### 10. Realtime tool calling

The voice model must interact with the application through controlled backend functions.

Minimum tool set:

```ts
getCandidateContext(candidateId)
getJobContext(jobId)
saveScreeningAnswer(screeningId, field, value, evidence?)
flagInconsistency(screeningId, field, cvValue, spokenValue)
addCandidateQuestion(screeningId, question)
getCompanyAnswer(jobId, question)
requestHumanFollowup(screeningId, reason)
completeScreening(screeningId)
```

All tool arguments must be server-validated.

### 11. Call recording

Record the interview only after consent.

For the browser demo:
- capture local microphone audio + AI playback into a combined browser recording where practical
- store the final recording in **Google Cloud Storage**
- never expose the bucket publicly
- use signed URLs for authorized playback

If combined browser recording becomes unreliable, storing separate candidate/assistant tracks is acceptable for the demo as long as the review UI plays them coherently.

### 12. Final transcript

After the call:
- run the recording through **GPT Transcribe** for a final high-quality transcript
- save transcript segments with timestamps
- display speaker labels (`Candidate`, `AI Recruiter`)

Do not rely only on temporary realtime transcript deltas as the permanent transcript.

### 13. Structured AI summary

After transcription, use a text model with structured output to create:
- neutral screening summary
- confirmed facts
- unconfirmed facts
- inconsistencies with CV
- candidate questions
- follow-up items for recruiter

Recommended low-cost model: **GPT-5.6 Luna**. Escalate to Terra only if quality tests justify it.

The summary must contain factual sourcing from the transcript and must not make a hire/no-hire recommendation.

### 14. Call review experience

The recruiter can:
- play/pause recording
- seek by timestamp
- change playback speed
- click transcript timestamps to jump audio
- view extracted information alongside transcript
- see flagged discrepancies
- see candidate questions

This should be one of the most visually polished screens in the project.

### 15. Manual recruiter review

Include a human review panel:
- recruiter notes
- `advance / hold / archive` status
- manual English communication field (optional)
- follow-up required toggle

If English is being evaluated, the human reviewer should listen to the call and choose a simple manual label such as:
- not reviewed
- basic
- conversational
- professional
- fluent

The AI must **not** infer English quality from accent, emotion, confidence, dialect or personality.

### 16. Basic recruiting analytics

Demo analytics can include:
- screenings completed over time
- completion rate
- average call duration
- review backlog
- candidate-question categories
- screening status by role

Do not build “AI candidate quality” charts.

---

# PART B — VOICE AGENT SPECIFICATION

## 7. Recommended OpenAI models

### Live conversation

**Development/default:** `gpt-realtime-2.1-mini`

Why:
- speech-to-speech
- function calling
- WebRTC / WebSocket / SIP support
- substantially cheaper for repeated development tests
- sufficient for a relatively structured screening workflow

### Showcase-quality experiment

**Optional:** `gpt-realtime-2.1`

Before launch, A/B test the same scripted candidate scenarios with mini vs flagship. Use flagship only if the naturalness/instruction-following improvement is obvious enough to justify the cost.

### Post-call transcription

**`gpt-transcribe`**

Use the asynchronous recording after the interview for the canonical stored transcript.

### Structured summary

**`gpt-5.6-luna`** via Responses API with a strict JSON schema.

---

## 8. Voice conversation behavior

### Tone

The voice should sound:
- calm
- friendly
- concise
- professional
- not overly enthusiastic
- not robotic
- not like a survey narrator

Target average AI answer length: **1–3 short sentences**.

### Opening script

The wording can vary naturally, but the meaning must remain:

> Hi Ahmed, I’m the AI recruiting assistant calling on behalf of Northstar. You recently applied for the Junior Software Engineer role. This should take around 7 minutes. Before we start, I want to let you know that this conversation will be recorded and transcribed so the recruiting team can review it. Is that okay with you?

If yes:

> Great, thank you. Is now still a good time to continue?

If no:

> No problem. I’ll let the recruiting team know that you’d prefer a human follow-up.

Then call `requestHumanFollowup()` and end.

### Role confirmation

> I have you down as applying for the Junior Software Engineer position. Is that the role you’re interested in?

If candidate applied to multiple roles, use application context and let them clarify preference.

### Current-status question

> Just so I understand where you are right now, are you currently working, studying, or have you recently graduated?

This answer should drive the rest of the flow.

### Fresher branch

Examples:

> What did you study and when did you graduate?

> Did you do any internships, freelance work or substantial projects while you were studying?

> I saw Flutter and React mentioned on your CV. Which one have you worked with more?

Never fabricate CV facts. If the CV data is unclear, phrase it as a clarification.

### Experienced branch

Examples:

> What are you currently doing in your role?

> Roughly how many years of relevant professional experience do you have overall?

> If you decided to move, what notice period would you need to give?

### CV verification style

Prefer confirmation/follow-up over forcing the candidate to recite the CV:

> Your CV mentions around two years of Flutter work. Is that still accurate?

If they correct it:

> Got it, I’ll note that.

Call `flagInconsistency()` if the spoken answer materially differs from the CV.

### Role-specific baseline questions

Example for Flutter:

> Have you connected Flutter apps to REST APIs before?

Candidate:

> Yes, in my graduation project.

AI:

> What did the API handle in that project?

This is **context verification**, not a technical exam.

### Compensation

Recommended default:

> Do you have an expected monthly compensation range for your next role?

Avoid previous-salary questions as the default global behavior. A customer can eventually configure jurisdiction-specific questions, but the product should not assume they are appropriate everywhere.

### Availability

> What’s the earliest date you’d realistically be able to start?

### Work arrangement

> This role is hybrid, with three days a week in New Cairo. Would that work for you?

### Candidate questions

Always give the candidate a chance to ask questions:

> That covers everything I needed to confirm. Before we finish, is there anything you’d like to know about the role or the company?

Use `getCompanyAnswer()`.

If the answer is not in approved company/job information:

> I don’t have confirmed information on that, so I’ll add it as a question for the recruiter.

Then `addCandidateQuestion()`.

### Closing

> Thanks, Ahmed. I’ll send a summary of our conversation to the recruiting team for review, and they’ll handle the next step. Have a great day.

Never tell a candidate that they passed or failed unless a human-controlled business workflow explicitly provides that result.

---

## 9. Voice-agent hard rules

The realtime agent must follow these rules even when the conversation becomes unusual:

1. Never claim to be human.
2. Never record before consent.
3. Never make a hiring recommendation.
4. Never automatically reject or rank.
5. Never infer protected/sensitive traits from voice, name, CV or behavior.
6. Never score accent, emotion, nervousness, personality, “culture fit,” confidence or honesty.
7. Never ask a question that the candidate already clearly answered.
8. If the candidate refuses a question, accept that and continue where possible.
9. If the candidate asks to stop, end the call.
10. If the candidate asks for a human, flag human follow-up.
11. If a company policy answer is unknown, do not invent one.
12. If a tool fails, apologize briefly, save the failure, and continue or end safely.
13. Do not read internal tool/function names aloud.
14. Keep turns concise.
15. Use the CV as context, not as unquestionable truth.
16. Collect facts; avoid subjective evaluations.
17. Do not ask military-status, health, religion, family/marital, political, disability, or other sensitive questions by default. Country-specific administrative questions must be explicitly configured by the employer and legally reviewed before production use.

---

# PART C — TECHNICAL ARCHITECTURE

## 10. Chosen stack

The stack is deliberately modern but not exotic. It should look credible to Upwork clients hiring full-stack/backend/AI developers.

### Language

- **TypeScript** everywhere possible
- strict TypeScript mode

### Runtime

- **Node.js 24 LTS** for production services

Avoid Node Current for this demo. LTS is the safer production signal.

### Frontend

- **Next.js 16.3+** (App Router)
- React
- Tailwind CSS
- shadcn/ui primitives where useful
- Radix primitives where shadcn does not cover a need
- Motion/Framer Motion only for restrained transitions
- TanStack Query for client/server API state where needed
- React Hook Form + Zod for forms
- Recharts for simple dashboard charts

### Backend

- **Node.js + Fastify**
- REST API
- Zod validation at all public/API boundaries
- OpenAPI generated from API schemas where practical

Why Fastify instead of putting everything in Next.js route handlers:
- proves independent backend/API engineering
- clean Cloud Run deployment
- strong schema/validation story
- keeps business logic out of UI routes
- leaves a clear path to mobile clients later

### ORM / database

- **PostgreSQL on Google Cloud SQL**
- **Prisma 8** ORM + Prisma Migrate
- explicit indexes for common recruiter queries
- transactions for multi-record state changes

### AI

- OpenAI Realtime API: `gpt-realtime-2.1-mini` initially
- optional `gpt-realtime-2.1` showcase mode
- `gpt-transcribe` for final call transcription
- `gpt-5.6-luna` for structured post-call extraction/summary

### Storage

- **Google Cloud Storage**
- private buckets for recordings/CVs
- signed URLs for temporary access
- lifecycle rules in MVP/product

### Background work

- **Google Cloud Tasks** for post-call processing jobs
- call completion enqueues transcription + summary processing
- idempotency key on every processing job

### Deployment

Everything deployed on Google Cloud:

- **Cloud Run** — Next.js web
- **Cloud Run** — API
- **Cloud Run** — worker (can be merged with API for the earliest demo, but separate is preferred before public launch)
- **Cloud SQL for PostgreSQL**
- **Cloud Storage**
- **Cloud Tasks**
- **Secret Manager**
- **Artifact Registry**
- **Cloud Build** from the Git repository
- Cloud Logging / Monitoring

### Authentication

**Portfolio demo:** no recruiter login/authentication by design.

Instead:
- synthetic data only
- visitor-specific demo session cookie if mutable demo data needs isolation
- candidate interview links use opaque session tokens, not accounts
- reset/seed workflow keeps the public demo clean

**MVP:** Google Cloud **Identity Platform** for recruiter/team authentication.

---

## 11. Google Cloud deployment principles

1. Keep web, API, worker and Cloud SQL in the same region.
2. Use Cloud SQL connectors / supported Cloud Run connection patterns.
3. Use a small connection pool; Cloud Run scaling can otherwise multiply PostgreSQL connections quickly.
4. Store secrets in Secret Manager, never `.env` in production.
5. Use separate service accounts for web/API/worker with least privilege.
6. Do not make recording/CV buckets public.
7. Use signed URLs with short expiration.
8. For portfolio smoothness, consider `min-instances=1` on web/API while actively sharing the demo with clients; allow scale-to-zero when cost is more important.
9. Keep a health endpoint and startup/readiness checks.
10. Log request/session IDs across web → API → worker.

---

## 12. Recommended monorepo structure

Use **pnpm workspaces + Turborepo**.

```text
screenpilot/
├─ apps/
│  ├─ web/                      # Next.js 16 recruiter + candidate UI
│  │  ├─ src/app/
│  │  │  ├─ (dashboard)/
│  │  │  ├─ interview/[token]/
│  │  │  └─ api/               # only Next-specific bridge routes if unavoidable
│  │  ├─ src/features/
│  │  │  ├─ dashboard/
│  │  │  ├─ jobs/
│  │  │  ├─ candidates/
│  │  │  ├─ screening-builder/
│  │  │  ├─ realtime-interview/
│  │  │  └─ call-review/
│  │  └─ src/components/
│  │     ├─ ui/
│  │     └─ layout/
│  │
│  ├─ api/                      # Fastify REST API
│  │  └─ src/
│  │     ├─ modules/
│  │     │  ├─ jobs/
│  │     │  ├─ candidates/
│  │     │  ├─ screenings/
│  │     │  ├─ recordings/
│  │     │  ├─ realtime/
│  │     │  └─ analytics/
│  │     ├─ plugins/
│  │     ├─ middleware/
│  │     └─ server.ts
│  │
│  └─ worker/                   # Cloud Tasks targets / async processing
│     └─ src/
│        ├─ jobs/
│        │  ├─ transcribe-screening.ts
│        │  └─ summarize-screening.ts
│        └─ server.ts
│
├─ packages/
│  ├─ db/                       # Prisma schema/client/migrations/seed
│  ├─ contracts/                # shared Zod API schemas + DTOs
│  ├─ domain/                   # pure business rules/state machines
│  ├─ ai/                       # OpenAI adapters, prompts, tool definitions
│  ├─ storage/                  # GCS abstraction
│  ├─ ui/                       # truly shared design-system pieces only
│  ├─ config/                   # env parsing, constants
│  └─ observability/            # logger/tracing helpers
│
├─ tests/
│  ├─ e2e/
│  ├─ fixtures/
│  └─ ai-evals/
│
├─ docs/
│  ├─ decisions/                # lightweight ADRs
│  ├─ architecture.md
│  └─ demo-script.md
│
├─ AGENTS.md                    # mandatory agent instructions
├─ turbo.json
├─ pnpm-workspace.yaml
└─ package.json
```

### Architecture style

Use a **modular monolith**, not microservices.

Inside each backend module:

```text
screenings/
├─ screening.routes.ts
├─ screening.controller.ts
├─ screening.service.ts
├─ screening.repository.ts
├─ screening.schemas.ts
├─ screening.types.ts
└─ screening.errors.ts
```

Rules:
- controller handles HTTP concerns
- service owns business logic
- repository owns DB access
- schema validates boundaries
- domain package contains reusable pure rules/state transitions
- web app never imports Prisma directly

---

## 13. Core data model

### Demo tables

#### `jobs`
- id
- title
- department
- location
- work_mode
- description
- salary_min / salary_max nullable
- benefits_json
- company_faq_json
- created_at / updated_at

#### `candidates`
- id
- name
- email (synthetic in demo)
- phone (synthetic in demo)
- cv_storage_path
- parsed_context_json
- created_at

#### `applications`
- id
- candidate_id
- job_id
- status
- preferred_role_note

#### `screening_templates`
- id
- job_id
- title
- language_mode
- max_duration_minutes
- ask_compensation
- sections_json or normalized section rows

#### `screening_questions`
- id
- template_id
- order
- key
- question_goal
- branch_condition nullable
- required

#### `screening_sessions`
- id
- application_id
- token_hash
- status
- consent_status
- started_at
- completed_at
- duration_seconds
- model

#### `screening_answers`
- id
- screening_session_id
- field_key
- normalized_value_json
- transcript_evidence
- confidence_for_extraction only (not candidate quality)
- created_at

#### `screening_flags`
- id
- session_id
- type (`cv_mismatch`, `needs_human`, `unknown_company_answer`, etc.)
- message
- metadata_json

#### `recordings`
- id
- session_id
- storage_path
- duration_seconds
- mime_type
- created_at

#### `transcript_segments`
- id
- session_id
- speaker
- start_ms
- end_ms
- text

#### `screening_summaries`
- id
- session_id
- summary_text
- structured_json
- model
- generated_at

#### `candidate_questions`
- id
- session_id
- question
- answered_during_call
- answer_text nullable
- needs_recruiter_followup

#### `recruiter_reviews`
- id
- session_id
- decision_status (`advance`, `hold`, `archive`)
- english_review nullable
- notes
- reviewed_at

### MVP tables to add later

- organizations
- users
- organization_memberships
- integration_connections
- audit_events
- invitations
- usage_events
- billing_accounts
- retention_policies

---

## 14. REST API shape

The exact URL structure can evolve, but the demo should roughly expose:

```text
GET    /v1/jobs
POST   /v1/jobs
GET    /v1/jobs/:id
PATCH  /v1/jobs/:id

GET    /v1/candidates
POST   /v1/candidates
GET    /v1/candidates/:id
POST   /v1/candidates/:id/cv

GET    /v1/screenings/:id
POST   /v1/screenings/:id/start
POST   /v1/screenings/:id/consent
POST   /v1/screenings/:id/complete

POST   /v1/realtime/session
POST   /v1/realtime/tool-call

POST   /v1/screenings/:id/recording/upload-url
POST   /v1/screenings/:id/recording/complete

GET    /v1/screenings/:id/transcript
GET    /v1/screenings/:id/review
PATCH  /v1/screenings/:id/review

GET    /v1/analytics/overview
```

### Important API conventions

- JSON only except file uploads via signed GCS URLs
- version API (`/v1`)
- typed error envelope
- request ID on every response
- idempotency keys for `complete`, uploads, and background processing
- cursor pagination for lists, even if demo data is small
- server-side validation for every AI tool call

---

# PART D — UI/UX AND VISUAL DESIGN

## 15. Design research direction

The recruiting dashboard should borrow **patterns**, not copy visuals, from modern recruiting/SaaS products:

- **Ashby:** strong job/candidate pipelines, drill-down dashboards, dense data that still feels controlled
- **Greenhouse:** structured interview notes, candidate review, human decision workflows
- **Linear / Attio-style SaaS:** restrained typography, fast navigation, low visual noise, excellent keyboard/focus behavior

The interface should communicate competence and trust. This is HR software containing candidate data, so avoid a playful consumer-AI look.

### Avoid the stereotypical AI-generated SaaS aesthetic

Do not use:
- purple/blue gradient on every card
- glassmorphism everywhere
- giant glowing orb backgrounds
- excessive rounded cards nested inside cards
- random AI sparkle icons beside every heading
- emoji as primary UI icons
- excessive motion
- fake charts with meaningless data

Use:
- strong information hierarchy
- whitespace
- excellent tables
- subtle status badges
- meaningful empty/loading/error states
- one accent color
- subtle 150–220ms transitions

---

## 16. Recommended visual structure

### Recruiter application shell

Desktop-first, responsive down to tablet.

```text
┌──────────────────────────────────────────────────────────┐
│ ScreenPilot                 Search            Demo mode  │
├────────────┬─────────────────────────────────────────────┤
│ Overview   │                                             │
│ Jobs       │              Main content                   │
│ Candidates │                                             │
│ Calls      │                                             │
│ Analytics  │                                             │
│ Settings   │                                             │
│            │                                             │
└────────────┴─────────────────────────────────────────────┘
```

Sidebar should be around 220–240px and collapsible only if it improves the experience.

### Candidate screening page

This should feel more focused than the dashboard.

Recommended:
- centered interview panel
- company mark + role title
- clear mic/connection state
- subtle live waveform
- call timer
- large end-call control
- compact live transcript optional, not dominant
- no recruiter dashboard navigation

The candidate should feel like they are on a professional call, not inside an admin panel.

---

## 17. Color theme options

### Option A — Cobalt / neutral (recommended)

**Mood:** trustworthy modern B2B SaaS.

- background: `#F7F8FA`
- surface: `#FFFFFF`
- primary text: `#15171A`
- secondary text: `#667085`
- border: `#E5E7EB`
- accent: `#315EFB`
- accent hover: `#2449CC`
- success: muted emerald
- warning: muted amber
- destructive: muted red

Why it works: familiar enterprise trust without looking like legacy HR software.

### Option B — Graphite / teal

**Mood:** calm, slightly more distinctive.

- background: `#F6F7F6`
- surface: `#FFFFFF`
- primary text: `#171918`
- accent: `#0F766E`
- muted accent: `#CCFBF1`

### Option C — Ink / violet

**Mood:** more AI-forward, still professional.

- background: `#F8F8FA`
- primary text: `#18181B`
- accent: `#6D5DFB`
- use violet sparingly; do not create gradient-heavy UI

### Candidate interview dark mode option

The recruiter dashboard can remain light while the candidate call screen uses:
- deep ink background `#0C0F14`
- off-white text
- cobalt/teal call-state accent

This can create a strong portfolio screenshot without making the whole product dark.

---

## 18. Typography and spacing

Recommended font approach:
- Inter, Geist, or another clean variable sans
- one family only for UI
- tabular numbers for metrics/time where available

Suggested sizes:
- page title: 28–32px
- section title: 18–20px
- body: 14–16px
- table: 13–14px

Use an 8px spacing system.

Do not make the dashboard overly large. Recruiter tools benefit from moderate information density.

---

## 19. High-value portfolio screens

Prioritize polish in this order:

1. **Live candidate interview** — highest wow factor
2. **Call review** — proves full product depth
3. **Candidate profile** — shows structured information architecture
4. **Recruiter overview dashboard** — strong first screenshot
5. **Screening template builder** — shows product thinking
6. Jobs/candidate lists

---

# PART E — RELIABILITY, TESTING, AND DEMO QUALITY

## 20. Demo smoothness targets

A portfolio demo cannot feel flaky.

### UX targets

- route transitions should feel immediate
- no full-page loading spinner for normal navigation
- use skeletons only where data is actually loading
- no layout shift on dashboard load
- buttons respond visually within ~100ms
- optimistic updates where safe
- audio connection state always visible
- tool-call wait states should never look frozen

### Performance targets

Aim for:
- LCP under ~2.0s on a normal broadband desktop test
- CLS close to zero
- API p95 under ~400ms for ordinary DB reads/writes
- realtime first response should feel conversational; measure and record actual latency during QA rather than claiming an unrealistic guaranteed number

### Public-demo resilience

Implement:
- rate limit on starting AI interviews
- maximum interview duration
- OpenAI spend limits externally + application-level usage cap
- graceful “demo capacity reached” message
- a **sample completed screening** always available even if live voice is temporarily unavailable
- optional “Watch sample call” fallback with a pre-recorded synthetic interview

This fallback is important. A portfolio visitor should still understand the project if an external API is unavailable.

---

## 21. Testing strategy

### Unit tests

Focus on:
- screening branching rules
- state transitions
- extraction normalization
- permission/consent rules
- tool-call validation
- cost/usage limits

### Integration tests

Use a real disposable Postgres database in CI for:
- repositories
- transactions
- job/candidate/screening flows

### End-to-end tests (Playwright)

Required flows:

1. recruiter opens seeded candidate
2. candidate opens interview link
3. consent accept path
4. consent decline path
5. simulated voice/tool-call path
6. completed call appears in review
7. reviewer writes notes and changes status
8. demo reset returns environment to known state

Do not depend on a paid realtime call for every CI run. Mock the OpenAI adapter at the boundary for deterministic E2E tests.

### AI eval fixtures

Create `tests/ai-evals/` with scripted personas:

- fresher with no work experience
- employed developer with notice period
- candidate corrects CV detail
- candidate interrupts often
- candidate asks company question not in knowledge
- candidate refuses compensation question
- candidate requests a human
- candidate says they applied for a different role

Record expected behavior and regress prompts against these fixtures.

---

## 22. Observability

At minimum:
- structured JSON logs
- request ID
- screening session ID
- OpenAI model name
- tool call name + duration + success/failure (never log secrets)
- transcription job duration
- summary job duration
- GCS upload status

Metrics worth displaying internally:
- realtime session start failures
- call completion rate
- post-processing failures
- average tool latency
- average transcript processing time

---

# PART F — SECURITY / PRIVACY / PRODUCT GUARDRAILS

## 23. Demo security

Because the demo is public and has no recruiter authentication:

- use synthetic candidate data only
- no real candidate phone numbers/emails
- rate-limit all write endpoints
- use signed candidate session tokens
- never return raw storage bucket paths unnecessarily
- use short-lived signed URLs for CV/audio playback
- prevent arbitrary file types on CV upload
- cap upload size
- validate MIME type and magic bytes
- no secrets in client bundle
- realtime API credential/session must be minted by backend, never expose the long-lived OpenAI key

---

## 24. Hiring-AI guardrails

The product should be designed around **human review**.

Never build as default:
- automatic rejection
- overall candidate score
- ranking candidates by voice
- emotion detection
- accent scoring
- personality inference
- confidence/nervousness scoring
- “culture fit” inference
- honesty/deception inference
- protected-characteristic inference

For a future commercial product, legal requirements vary by jurisdiction. Treat recording consent, retention, candidate access/deletion, AI notices, hiring discrimination law and automated-employment-decision rules as launch blockers, not afterthoughts.

---

# PART G — MVP AND PRODUCT ROADMAP

## 25. MVP expansion: +12 features

Once the focused 8-experience portfolio demo is excellent, a commercial MVP could add **12 major capabilities**:

1. recruiter/team authentication with Google Cloud Identity Platform
2. organizations + recruiter roles/permissions
3. invite candidates by email/SMS
4. actual outbound/inbound phone calls through SIP/telephony
5. reusable interview templates across jobs
6. calendar integration for recruiter follow-up interviews
7. ATS integration starting with one provider (e.g. Greenhouse, Lever, or Workable)
8. configurable retention/deletion rules for audio/transcripts/CVs
9. audit log
10. Arabic + English screening modes and controlled language switching
11. basic usage/billing limits
12. recruiter analytics by job/team/time period

**MVP scope:** the 8-experience demo foundation plus roughly 12 new commercial capability areas. This section is roadmap only during portfolio development.

---

## 26. Full product expansion: +18 additional capabilities

A mature product could then add approximately **18 more major feature areas**:

1. multi-tenant enterprise administration
2. SSO/SAML/OIDC enterprise login
3. granular RBAC and field-level access
4. multiple ATS connectors
5. advanced calendar/scheduling workflows
6. automated candidate reminders and rescheduling
7. branded candidate experiences per customer
8. customizable disclosure/consent text by jurisdiction
9. configurable data residency
10. enterprise retention/legal-hold controls
11. multilingual screening beyond English/Arabic
12. role-specific screening-template library
13. interviewer/hiring-manager collaboration and comments
14. webhook/public API platform
15. SLA/queue analytics for recruiting operations
16. integration marketplace
17. SOC 2/security program and enterprise audit tooling
18. billing/subscriptions/usage plans

**Full-product scope:** a much broader commercial platform beyond the MVP. This is vision only and should not be built for the portfolio.

The product should resist the temptation to become a full ATS unless customers clearly demand it. Its differentiated wedge is **voice-first screening + structured human review**.

---

# PART H — BUILD PHASES

## 27. Recommended implementation sequence

### Phase 0 — repo foundation

- monorepo
- lint/typecheck/test
- API skeleton
- Prisma schema/migrations
- Cloud project setup
- seed data
- design tokens/components

### Phase 1 — recruiter data product

Build without AI first:
- jobs
- candidates
- candidate detail
- screening template
- dashboard

Acceptance criterion: product already looks credible before any voice model is connected.

### Phase 2 — candidate screening UX

- candidate interview link
- consent
- mic test
- realtime connection states
- static/mock interview adapter

### Phase 3 — OpenAI realtime

- server-created realtime session
- WebRTC
- prompt
- tools
- branching
- live transcript UI

### Phase 4 — recording/post-processing

- recording
- GCS
- Cloud Tasks
- GPT Transcribe
- structured summary

### Phase 5 — recruiter review

- audio player
- timestamped transcript
- extracted facts
- flags
- manual English field
- reviewer notes/status

### Phase 6 — demo hardening

- e2e tests
- rate limits
- demo reset
- fallback sample call
- performance pass
- accessibility pass
- mobile/tablet candidate page
- Cloud Run min instances decision

Do not start MVP integrations until the complete demo acceptance criteria are met and the owner explicitly expands scope.

---

# PART I — CODING-AGENT INSTRUCTIONS

## 28. Mandatory agent notes

These rules should also be copied into repository-level `AGENTS.md`.

### Before coding

1. Read this spec and `AGENTS.md`.
2. Inspect existing code before adding a new abstraction.
3. State the smallest implementation plan that satisfies the task.
4. Reuse existing components/contracts before creating new ones.
5. Do not silently change product behavior because an easier implementation exists.

### Code quality

1. TypeScript strict mode stays enabled.
2. No `any` unless explicitly justified in a comment and isolated at an external-library boundary.
3. No duplicated business rules between frontend and API.
4. No direct Prisma access from `apps/web`.
5. All API payloads validated with shared Zod contracts.
6. Keep functions/modules small and domain-named.
7. Avoid “utils.ts” dumping grounds.
8. Prefer explicit code to clever meta-framework abstractions.
9. Do not introduce a new dependency if the platform or existing stack already solves the problem cleanly.
10. Database changes require Prisma migrations; never mutate production schema manually.
11. Side-effect operations should be idempotent where retries are possible.
12. Multi-record business updates use transactions.

### UI quality

1. Every visible control must work. Hide future features rather than shipping dead buttons.
2. Preserve loading, empty, error and success states.
3. Do not add unnecessary gradients/glassmorphism.
4. Animations must be subtle and fast; never delay interaction for animation.
5. Keyboard/focus behavior must work.
6. Tables must remain usable at realistic data density.
7. Use actual seeded data; avoid lorem ipsum and random dashboard numbers.
8. No UI should appear “AI-generated” through excessive cards, glow, rounded pills or marketing copy.

### AI behavior

1. AI outputs are untrusted input; validate before persistence/actions.
2. Never grant the model arbitrary SQL/API access.
3. Tools should be narrow and purpose-specific.
4. Tool descriptions must specify inputs, outputs and failure behavior.
5. The model cannot automatically advance/reject candidates.
6. Do not implement accent/emotion/personality scoring.
7. Changes to the system prompt require updating AI eval fixtures.
8. Use deterministic post-processing schemas.
9. Never include secrets or unnecessary PII in model prompts.
10. Log model/tool failures without logging raw sensitive content unless intentionally configured in a safe dev environment.

### Testing before completion

An agent should not declare a task complete until relevant commands pass:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e   # targeted suite where applicable
```

For UI tasks, manually verify the changed flow in a browser or agent browser.

### Do not overengineer

The demo should remain a modular monolith. Do not introduce:
- Kafka
- Kubernetes
- multiple databases
- event sourcing
- CQRS
- complex microservices
- a vector DB unless a measured requirement appears

Cloud Tasks + PostgreSQL + Cloud Run is enough.

---

# PART J — AGENT Q&A / DEFAULT ASSUMPTIONS

## 29. Questions agents should not repeatedly ask

### Q: Is ScreenPilot a full ATS?
**A:** No. It is a screening-and-review product. Jobs/candidates exist only to support that workflow.

### Q: Should AI score/rank candidates?
**A:** No.

### Q: Should AI assess English automatically?
**A:** No. The call can be conducted in English and recorded; the human reviewer assesses communication manually.

### Q: Does the demo require login?
**A:** No recruiter authentication in the portfolio demo.

### Q: Can the candidate log in?
**A:** No. Candidate uses an opaque screening link/token.

### Q: Where is data stored?
**A:** PostgreSQL on Cloud SQL; files/audio/CVs in private Google Cloud Storage.

### Q: Where is the app hosted?
**A:** Google Cloud Run.

### Q: What backend?
**A:** Fastify + TypeScript + Prisma.

### Q: Can Next.js call Prisma directly?
**A:** Not in this architecture. Use the API.

### Q: What realtime model?
**A:** `gpt-realtime-2.1-mini` during build, with `gpt-realtime-2.1` tested for final showcase quality.

### Q: What is the canonical transcript?
**A:** The post-call `gpt-transcribe` result, not raw temporary realtime deltas.

### Q: What language is the demo call?
**A:** English by default.

### Q: Should the AI ask about military status in Egypt?
**A:** Not by default. Treat it as a future explicitly configured jurisdiction-specific administrative question and keep it outside automated decision-making.

### Q: Should it ask last salary?
**A:** Not by default. Ask expected compensation unless the employer has intentionally configured a lawful previous-compensation question.

### Q: What should happen if a candidate asks something the AI does not know?
**A:** Flag the question for recruiter follow-up; never hallucinate company policy.

### Q: How long should the interview be?
**A:** Target 6–8 minutes; demo hard maximum 10 minutes unless owner changes it.

---

# PART K — OPEN DECISIONS FOR THE OWNER

## 30. Questions that still need an explicit answer

These are intentionally unresolved. Coding agents should use the stated temporary defaults and must not silently make permanent product decisions.

### 1. Final project name

Choose:
- ScreenPilot (current codename)
- IntakeLoop
- CandidateLine
- RoleCall
- another name

**Temporary default:** ScreenPilot.

### 2. Demo company + role

Recommended:
- fictional company: **Northstar Labs**
- role: **Junior Software Engineer / Flutter Developer**
- location: New Cairo
- work model: hybrid

**Decision needed:** keep this or choose another industry/role.

### 3. Voice identity

Decide:
- male/female voice
- neutral international English vs regionally familiar English
- agent display name (e.g. Maya, Ava, Alex)

**Temporary default:** neutral professional English voice, name “Maya.”

### 4. English-only behavior

Should the AI:
- stay strictly in English because English is part of the screening, or
- allow a limited Arabic switch for clarification while recording that the candidate requested it?

**Temporary default:** English-only, with a polite explanation if asked to switch.

### 5. CV upload depth

Choose:
- seeded CV + optional upload for demo visitors
- recruiter upload only
- no public uploads, just seeded candidates

**Temporary default:** seeded candidates plus one optional synthetic PDF upload flow.

### 6. Browser demo vs real phone number

**Temporary default:** browser WebRTC only for portfolio version.

Real SIP/phone calls are MVP scope, not portfolio-demo scope.

### 7. Recording retention in public demo

Recommended public-demo behavior:
- visitor-created recordings auto-delete after 24 hours
- permanent synthetic sample recordings retained

**Decision needed before public launch.**

### 8. Visual theme

Choose A/B/C from the color themes above.

**Temporary default:** Option A — cobalt/neutral dashboard + dark candidate call screen.

### 9. Region

Google Cloud region must be selected based on target latency and service availability.

Candidate options to evaluate:
- `europe-west1`
- `me-central1`

**Do not spread services across regions.**

---

# PART L — RESEARCH BASIS / CURRENT REFERENCES

## 31. Technical references checked for this spec (August 2026)

### OpenAI

- GPT-Realtime-2.1: https://developers.openai.com/api/docs/models/gpt-realtime-2.1
- GPT-Realtime-2.1 mini: https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini
- OpenAI API pricing: https://openai.com/api/pricing/
- Realtime call API / SIP capability: https://developers.openai.com/api/reference/python/resources/realtime/subresources/calls/methods/accept

Current official docs describe GPT-Realtime-2.1 as a speech-to-speech reasoning model with tool use and improved interruption/noise handling, and the mini model as the lower-cost realtime option supporting WebRTC/WebSocket/SIP.

### Google Cloud

- Cloud Run: https://cloud.google.com/run/docs
- Cloud SQL + Cloud Run: https://cloud.google.com/sql/docs/postgres/connect-run
- Cloud SQL connection management: https://cloud.google.com/sql/docs/postgres/manage-connections
- Identity Platform: https://cloud.google.com/identity-platform/docs

Google specifically recommends connection pooling and careful connection limits for Cloud Run ↔ Cloud SQL workloads.

### Framework/runtime

- Next.js release/support info: https://nextjs.org/blog and https://nextjs.org/support-policy
- Node releases: https://nodejs.org/en/about/previous-releases
- Prisma changelog: https://www.prisma.io/changelog

At the time of this document:
- Next.js 16.x is Active LTS; 16.3 is current in August 2026.
- Node.js 24 is LTS.
- Prisma 8 is current.

### Recruiting-product design references

- Ashby recruiting analytics: https://www.ashbyhq.com/analytics
- Ashby job/pipeline patterns: https://docs.ashbyhq.com/analytics-jobs-list-and-dashboard
- Greenhouse AI/recruiting workflows: https://www.greenhouse.com/ai-recruiting
- Greenhouse 2026 interview transcription/structured notes: https://www.greenhouse.com/greenhouse-latest-features

The useful pattern from these products is not “copy their design”; it is the emphasis on structured candidate data, fast drill-down, transcript/notes, and keeping humans in the decision loop.

---

# 32. Definition of done for the portfolio demo

ScreenPilot is ready to pin on an Upwork profile only when all of the following are true:

- [ ] a stranger can understand the product within 10 seconds
- [ ] the recruiter dashboard has realistic seeded data
- [ ] the live AI interview works reliably in Chrome/Edge
- [ ] consent is required before recording
- [ ] candidate can interrupt the AI naturally
- [ ] AI adapts between fresher and experienced flows
- [ ] at least five real backend tools are exercised in the interview
- [ ] recording is stored in private GCS
- [ ] post-call transcript is generated
- [ ] structured summary is generated
- [ ] call-review audio and timestamps work
- [ ] reviewer can add notes / manual English review / status
- [ ] AI never ranks or rejects
- [ ] error states are polished
- [ ] public demo has rate limits and spend protection
- [ ] a sample completed call is always available as fallback
- [ ] page/navigation performance feels immediate
- [ ] responsive candidate interview works on mobile
- [ ] lint, typecheck, tests and E2E pass
- [ ] no visible dead buttons or “coming soon” clutter
- [ ] README contains architecture diagram, screenshots, setup and demo link

**The priority is not feature count. The priority is that the 8 required demo experiences form one exceptionally smooth hero workflow. MVP and full-product ideas stay out of the build until explicitly promoted.**
