# SP-011A — Modernize the entry and early demo experience

Status: Required  
Implementation state: User visual review accepted — awaiting deferred final automated verification

Milestone: Milestone 1 — interview preparation paths  
Last synchronized: 2026-09-11  
Depends on: SP-005, SP-006, SP-010A, SP-011  
Suggested commit: `SP-011A: modernize the ScreenPilot entry experience`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Replace the generic card-led landing and early `/demo` shell with a distinctive, current, product-first ScreenPilot experience. The redesign must explain the conversation-to-evidence workflow at a glance, preserve equal entry paths and privacy boundaries, and remain lightweight, accessible, responsive, role-neutral, and deterministic.

## Why this corrective ticket exists

SP-011 completed the functional conversation-first path, but its first visual composition still reads like a conventional light SaaS template: a text hero, a separate reassurance card, two ordinary feature cards, and utility-heavy navigation. It explains the product but does not let a visitor *see* the product early enough. The `/demo` route also exposes correct controls without yet feeling like the same authored product environment.

The user explicitly reopened this boundary to correct the product's visual purpose and direction before SP-012 extends it. This packet therefore supersedes only the affected SP-004/SP-005/SP-011 landing and early-demo composition decisions; the Deep Ink + Warm Coral palette, approved logo, privacy model, role-neutral domain, equal entry modes, and later active-interview concept remain authoritative.

## User visual-review correction — interview in focus

The first Editorial Live Signal implementation was rejected in visual review because it remained copy-led, jargon-heavy, and visually split between a static text column and a passive product card. The pale lower-page transition, detached privacy slab, and footer also made the page feel assembled from separate sections instead of one authored experience. This review supersedes the affected composition, copy, and motion choices below without reopening workflow state, providers, entry-mode parity, privacy behavior, or the no-automated-decision boundary.

The revised implementation plan is:

1. Keep the landing navigation compact, fully transparent, and in normal document flow so it scrolls away with the top of the page: place the enlarged ScreenPilot mark and wordmark at the left edge and group the larger **How it works** and **Start demo** actions at the right. Extend one page-owned atmospheric field and quiet grid behind the entire header and hero so the background reaches every top edge without a separate navbar band or a glow rectangle beginning below it.
2. Keep the interview central through a left-aligned opening masthead: lead immediately with **Automate the first interview. ScreenPilot takes the notes.** followed by one plain-language explanation and the two actions grouped at the left edge. Do not place a separate category eyebrow or human-decision reassurance line in the hero; use the recovered vertical space to move the complete hero story upward and keep the gap beneath the navbar tight. Fill the wide-screen right side with a code-native diagonal cascade of four overlapping feature cards: **Voice interviews**, **Adaptive follow-ups**, **Clear interview notes**, and **Human decisions**. Build the cards as one semantic ordered list with custom inline SVG icons, not a raster/external asset; slide each card diagonally into place once in reading order over roughly 1.1 seconds with a slow near-sequential stagger so each item can be read as it arrives, then keep the complete stack still. Keep enough overlap to read as a connected cascade without covering the short descriptions. While a pointer hovers an exposed card, raise that card above the rest of the stack without making it a link or control. At narrower widths, remove the overlap and rotation and reflow the same four cards into a readable grid/stack without hiding copy. State the detailed human-decision boundary contextually in the later market/story content and `/demo` safeguards. Keep the wide code-native interview preview directly beneath the masthead rather than squeezing it beside the copy. Do not publish an unvalidated ScreenPilot percentage claim.
3. Show a clearly fictional conversation moving through six practical examples in two three-topic boards. The first board fills salary expectation, relevant experience, and availability; the second fills role preference, work setup, and growth goal. Each example connects a Pilot question and candidate answer revealed at a 200 ms-per-word subtitle cadence. Once both lines are fully written, draw their relevant phrase highlights simultaneously from left to right, then create one of the three visible note slots. The cards fill one by one instead of acting as topic-switching tabs, each completed board holds before the next board appears, and the second board returns to the first. The figure keeps an accessible name but no redundant visible “Example interview” header or “Synthetic answers” subline. No example represents a real person, employer, score, or decision.
4. Animate the active speaker's voice bars in place, including a clear waveform beside the illustrated participant while the candidate answers and a gently illuminated ScreenPilot mark with expanding voice rings on the back of the laptop lid while Pilot speaks. Keep the page layout fixed while subtitles and the corresponding note state change.
5. Replace internal language such as “reviewable signal,” “candidate-sourced evidence,” and “session-only synthetic vacancy” in primary marketing copy with short everyday explanations. Detailed privacy and product boundaries remain available where they are relevant.
6. Remove the hero's “8 minute demo,” “No account,” and “Session only” chip row. Keep only one useful reassurance: ScreenPilot takes notes; a person makes decisions.
7. Replace the ordinary three-card explanation with a scroll-led, story-like timeline. A sticky preview and segmented progress rail show **Choose**, **Talk**, **Notes**, and **Review** as the reader moves through the section.
8. Fold the concise privacy explanation and Privacy dialog trigger into the final timeline step. Remove the standalone privacy slab and the landing footer entirely.
9. Add a generic code-native participant-and-laptop illustration inside the interview scene. It is an abstract participant cue, not an AI avatar or a real candidate likeness. Use a warm human skin tone and omit cartoon facial features. Avoid ambiguous pale hand/arm shapes and mechanical duplicate equalizers. Since the viewer faces the candidate across the desk, center the broad outside lid over the candidate's lower torso, place the keyboard deck behind it, and reveal only a thin hinge/base silhouette; only the lid's ScreenPilot mark acts as Pilot's speaking surface.
10. Use one continuous Deep Ink/coral/plum atmospheric background across the landing. The entry chooser uses elevated dark surfaces rather than white cards so the final action stays inside the same visual world.
11. Start the six-example loop automatically with no playback or topic-switching controls. Reveal spoken subtitles every 200 ms, while retaining the existing question, answer, note, and completed-board holds so state changes remain readable. Pause it on deliberate keyboard or click focus, when the preview is off-screen, or when the page is hidden. Move from the first trio to three different topics, and return to the first board after the second trio. Under reduced motion, keep the same word-by-word speaking rhythm with opacity-only word entrances and no spatial movement; voice activity also uses slow opacity-only changes. Retain the one-second left-to-right color sweep that connects the completed question and answer to the created note; it changes paint only, starts on both phrases in the same render, and remains interruptible by focusing the preview.
12. Implement the scroll effect with native sticky layout plus an IntersectionObserver-driven active step. All steps remain ordinary readable DOM content when sticky positioning, JavaScript, or motion is unavailable. Every same-page landing link scrolls smoothly instead of jumping; the header's **How it works** action and hero's **See it step by step** CTA share one brisk 0.9-second ease-in/ease-out journey with real fragment links, interruption cleanup, and native fallback. Because that journey is the controls' explicitly requested behavior and begins only after a direct click, keep it active when the operating system reports reduced motion while all passive spatial landing motion continues to honor the system preference. Route the header's **Start demo** CTA directly to `/demo`; keep the hero's primary action as the same-page path to the equal entry chooser.
13. Market the landing to company hiring teams that want to automate repeatable first-round HR conversations. Introduce the evidence with one centered two-line statement and constrained explanation, then use an asymmetric evidence board instead of identical cards: stack current adoption and the same survey's hiring-change expectation as two separate cards in the left track, with their combined height plus gap matching the right side; keep time saved wide above the paired candidate-exposure and trust cards. Keep every source, sample/geography, and market-evidence label so the findings remain clearly attributed without a separate disclaimer chip. When the cards reflow vertically on tablet or phone layouts, align every percentage to the left with its copy instead of mixing centered and left-aligned metrics. Do not present the findings as ScreenPilot performance or invent a worldwide company count.

## User visual-review correction — one dark `/demo` workspace

The next review moved from the landing into the product route and rejected the remaining light, card-stacked early-demo shell. This correction applies to every implemented and downstream `/demo` state. It supersedes earlier Warm White page, card, panel, input, context-rail, and review-surface guidance inside `/demo`; Warm White remains a typography/icon/detail color, not a product-workspace canvas.

### Reachable-state and routing audit

The source and running app were inspected before this correction was documented:

| Reachable state | Current problem | Corrected behavior |
| --- | --- | --- |
| Bootstrap / retry | A generic card appears inside the same oversized light document shell; failure recovery has no explicit exit. | The centered workspace owns loading/error status. Retry stays local and **Clear & exit** safely clears and returns home when retry cannot proceed. |
| Choose entry mode | Two large white cards sit below a detached dark context block and routinely fall beneath a desktop viewport. | Two equal authored dark choices sit inside the main workspace, with the decision and primary actions visible together. |
| CV intake / local extraction / ready / error | White document well, pale context slab, repeated Back actions, and a locally ready state with no honest forward owner until SP-012. | One dark intake composition keeps grouped PDF/privacy guidance inside the upload surface, an animated local scan and progress track, result, retry/change-file, and a coral-primary **Change starting option** together. The ready state clearly marks SP-012's analysis/Continue boundary rather than inventing stage skipping. |
| Conversation preparation / retry | A generic light status card briefly replaces the choice and can feel disconnected from the selected mode. | A compact dark preparation signal preserves the selected path, shows what is happening, and exposes Retry or **Change starting option** on failure. |
| Shared preflight handoff | Separate pale cards and both **Back to choices** and **Start over** perform the same transition. | One dark handoff composition confirms mode and preparation. Two stacked cards explain the interview and combine privacy, consent, and microphone readiness in candidate language without exposing infrastructure. A single **Change starting option** returns through the reducer, and **Start interview** stays at the lower right. |
| Later reducer-owned stages not implemented by SP-011A | Generic fallback copy has no useful next action. | The stable shell explains that the step belongs to a later ticket and provides **Clear & exit**; it never dispatches an invalid stage transition. |

The layout failure is architectural rather than a color-token problem: the route currently composes a header, sticky context sidebar, white page well, nested generic cards, and stage-local footers. The correction replaces that stack with one bounded, viewport-aware product frame whose header, status, context, task, and actions read as a single interface.

### Stage-transition and navigation map

```text
landing /
  -> choose either entry action -> router.push('/demo')
  -> bootstrap -> choosing_entry_mode

choosing_entry_mode
  -> Use a CV -> awaiting_cv
  -> Start without a CV -> preparing_conversation

awaiting_cv
  -> choose/sample PDF -> local extracting -> local ready or local error
  -> use another PDF -> awaiting_cv presentation reset
  -> Change starting option -> reducer START_OVER -> choosing_entry_mode
  -> SP-012 later owns validated analysis and Continue to plan_ready

preparing_conversation
  -> successful deterministic preparation -> preflight
  -> retryable error -> Retry remains in preparing_conversation
  -> Change starting option -> reducer START_OVER -> choosing_entry_mode

preflight
  -> Change starting option -> reducer BACK_FROM_PREFLIGHT
     conversation-first -> choosing_entry_mode
     CV-assisted -> plan_ready once SP-012 owns that route
  -> SP-013 later owns consent/readiness and Continue into voice connection

all /demo states
  -> ScreenPilot logo -> '/' without clearing; landing offers Continue or Clear for the active tab session
  -> browser Back -> previous history entry, normally landing, without inventing reducer history
  -> Clear & exit -> reducer CLEAR_SESSION, then router.replace('/')
  -> noninteractive progress reports current position only; it never skips stages
```

The canonical reducer remains the only workflow-stage authority. Browser history represents page navigation, not internal workflow history; local component state remains limited to legitimate within-stage UI such as CV extraction status.

### First-party competitor flow review

Current first-party pages and demos were revisited on 2026-09-11 specifically for product-workspace continuity and recovery, not marketing imitation:

| Source | Principle selected | Boundary rejected |
| --- | --- | --- |
| [Gahiz](https://www.gahizai.com/) | Keep the active task, current conversation state, and ordered setup/interview/review sequence immediately legible. | Candidate identity, recruiter dashboard, scores, ranking, shortlist, and proctoring. |
| [Greenhouse Voice AI](https://www.greenhouse.com/voice-ai-interviewing) | Use an explicit current step within a stable guided sequence and keep human decision ownership visible. | Rubrics, scoring, employer pipeline data, and outcome claims. |
| [HeyMilo](https://www.heymilo.ai/) | Give each stage a plain name and one obvious local action. | Disconnected tabbed marketing, applicant-volume dashboards, scoring, and cheat detection. |
| [ElevenLabs Agents](https://elevenlabs.io/agents) | Preserve one product frame while state changes, with consistent Configure/Deploy/Monitor-style orientation. | Admin console density, broad analytics/integration scope, and human-like agent claims. |
| [Vapi](https://vapi.ai/) | Put Back/recovery beside the active task and expose microphone/readiness status where it becomes relevant. | Telephony/developer-console framing and premature microphone interaction. |
| [Retell AI](https://www.retellai.com/) | Use broad stage grouping and a stable bounded dark frame rather than a new page composition for each task. | Call-centre dashboards, business metrics, phone-number collection, and autonomous replacement language. |

The selected principles are therefore narrow: one stable dark workspace, explicit current-step status, one dominant task, contextual recovery, and human-readable transitions. No competitor asset, copy, claim, person, employer information, interaction data, or candidate data is copied.

### Corrected implementation contract

1. Extend the landing's Deep Ink/plum/coral atmospheric field into all of `/demo`, including bootstrap, choices, CV intake/status, preparation, preflight, interview, summary, error, and review states.
2. Author hierarchy for dark surfaces: page atmosphere → bounded product frame → raised task regions → quiet status/details. Do not simulate the old white card stack with dark fills.
3. Keep the `/demo` header limited to ScreenPilot, **Privacy details**, and **Clear & exit**, with Privacy immediately before the exit action. Place the inert five-step progress indicator in the workspace's top block and do not render a workspace footer.
4. Keep the active step centralized, but align its working surface to the same inner inline gutter as the progress panel instead of adding a second centered-stage inset; individual headings and paragraphs retain readable line lengths. At ordinary desktop/tablet heights, use fluid viewport-height-aware header, frame, type, spacing, and panel density so the complete progress → task composition fits beneath the browser chrome without document scrolling. Standard states must fit at the 1024 × 768, 1280 × 800, and 1440 × 900 reference anchors without clipping or introducing an inner scroll area. Phones, unusually short viewports, zoom, errors, and long future content use ordinary document scrolling with no nested scroll trap.
5. The `/demo` logo links to `/`. The explicit **Clear & exit** action clears the reducer/session projection and replaces the route with `/`; merely returning home preserves the active session so the landing can offer Continue or Clear.
6. Progress is an inert status group, not navigation. Completed/current/future styling must not resemble enabled buttons or links.
7. Normalize recovery language: **Change starting option** for reversible preparation-path changes, **Retry** for the failed operation, **Continue** only when the next reducer transition is actually implemented, and **Clear & exit** for destructive session exit. Do not render duplicate controls with the same effect.
8. Keep components shared and feature-owned. Do not create separate mobile stage trees, mirror reducer state, add persistence, or implement SP-012/SP-013 functionality early.
9. Start every reachable `/demo` state with the same hierarchy: one short uppercase pretitle followed immediately by one page-level title. Keep desktop titles on one line whenever the task width can hold them. Do not force a title into a narrow left column or place a detached explanatory sentence on its right; put necessary guidance inside the relevant task surface and allow natural wrapping only at compact widths.
10. Render that hierarchy through the shared `DemoStageHeading` primitive. Top-align every stage beneath progress and use the centralized page-title, panel-title, card, body, metadata, stage-gap, card-gap, and card-padding tokens instead of stage-specific heading margins or arbitrary type scales.

## Research method and evidence limits

Research was completed on 2026-09-11 across current official standards and design systems, maintained library documentation and repositories, product-demo research, gallery/trend collections, live voice/AI interview product sites, journalism and candidate research, Reddit, and X search results.

- Standards, accessibility guidance, local framework documentation, and repository evidence can create requirements.
- Competitor sites can reveal useful presentation patterns but cannot validate their own product, performance, privacy, fairness, or conversion claims.
- Vendor reports can suggest patterns but are treated as directional because the vendor benefits from the conclusion.
- Galleries and trend roundups are visual-signal sources only. Popularity is not usability evidence.
- Reddit and X are anecdotal. They are used to find concerns and anti-patterns, never as proof.

## Research synthesis

### Durable principles adopted

1. **Show the real product idea before listing features.** Vapi, Retell, ElevenLabs, Greenhouse Voice AI, and Gahiz all place a voice/product interaction or a product-like preview near the opening story. Navattic's vendor dataset also reports that top demos are usually ungated, short, and value-focused. ScreenPilot will use a truthful illustrative interface—not a video, fake live state, or provider call—to show how speech becomes evidence.
2. **Trust must be visible before the sensitive action.** Gartner's 2025 candidate survey, Greenhouse's 2026 candidate research, CareerPlug's 2025 report, contemporary journalism, and highly visible community complaints all point to low trust when AI use or evaluation boundaries are unclear. ScreenPilot will state that Pilot is AI-assisted, that the session is disposable, and that a human makes the decision before either start action.
3. **Keep the first decision simple.** NN/g's long-lived progressive-disclosure guidance supports moving secondary material out of primary navigation while keeping the two actual entry choices obvious. Privacy remains readily available in the final landing story step and the `/demo` header; neither landing nor `/demo` uses a safeguards footer.
4. **Motion must explain the interview and remain controllable.** Apple HIG and W3C guidance favor purposeful, optional motion. The revised preview loops slowly through six synthetic turns and two completed three-card boards, pauses on deliberate keyboard/click focus and when it is off-screen or the page is hidden, and contains no playback or topic-switching controls. Under `prefers-reduced-motion`, the speaking rhythm remains word-by-word through opacity-only entrances, with no spatial movement; the essential voice-status bars also change opacity slowly.
5. **Keep animated layout stable.** web.dev recommends `transform` and `opacity` and warns against layout-heavy animation. Voice activity and card/board entrances use transforms/opacity, while both questions and answers reveal one spoken word at a time inside fixed-height subtitle regions. The meaningful scroll story uses sticky positioning and observed section state rather than scroll hijacking, canvas, WebGL, or continuous parallax.
6. **Use expression to clarify hierarchy, not to imitate a template.** Google's Material 3 Expressive research supports purposeful scale, space, shape, and rhythm. ScreenPilot applies this quietly through an editorial headline, asymmetric product preview, strong surface contrast, and a small number of shaped signal elements—not a wholesale Material skin.
7. **Every deep route needs orientation.** `/demo` must independently answer where the visitor is, what is private, and what action is available. The in-workspace progress panel provides stage orientation, while the header keeps Privacy and exit actions persistently available.

### Current visual signals used cautiously

- Dark product heroes, product-UI previews, editorial typography, restrained bento-like grouping, tactile borders, and atmospheric gradients recur across Webflow's 2025 roundup, Framer's 2026 inspiration feed, Godly, SaaS landing galleries, and current voice-agent sites.
- These are treated as short-lived style signals. The chosen design keeps only the pieces that reinforce ScreenPilot's existing Signal Canvas narrative: Deep Ink/plum as the continuous product field, Warm Coral as the active path, near-white as typography and detail, and structured evidence cards emerging from conversation.
- Large glow fields, liquid-glass everywhere, neon grids, scroll hijacking, kinetic type, 3D scenes, cursor effects, and animated bento resizing were rejected because they add distraction, motion risk, paint cost, or generic AI-site sameness.

### Product and competitor review

| Source | Useful pattern | Rejected boundary |
| --- | --- | --- |
| [Vapi](https://vapi.ai/) | Immediate voice identity, dark hero, waveform as product language, direct trial path | Developer-console framing, neon treatment, telephone-first metaphor |
| [ElevenLabs Agents](https://elevenlabs.io/agents) | Product examples and agent states appear early; restrained platform storytelling | Enterprise logo wall, broad omnichannel scope, human-like marketing claim |
| [Retell AI](https://www.retellai.com/) | Live-demo CTA and explicit conversation use cases | Requesting a phone number/call and category selector |
| [PolyAI](https://poly.ai/) | Large conversational headline and focused primary action | Enterprise performance claims and autonomous-agent framing |
| [Synthflow](https://synthflow.ai/) | Clear staged build/evaluate/launch/learn explanation | Dense metrics, telephony operating-system story, analytics dashboard |
| [Greenhouse Voice AI](https://www.greenhouse.com/voice-ai-interviewing) | “See it in action,” product interaction, structured conversation positioned as a first step | Candidate scoring, pipeline funnel, real-employer outcome claims |
| [Paradox candidate experience](https://www.paradox.ai/solutions/candidates) | Lightweight, conversational, no-login candidate framing | Job search, matching, scheduling, and employer workflow scope |
| [Gahiz](https://www.gahizai.com/) | Sample interview, captions, and evidence together in the opening story | Real candidate persona, scores, ranking, shortlist, proctoring |
| [HeyMilo](https://www.heymilo.ai/) | Strong product UI and multiple interview modalities | Auto-scoring, cheat detection, ATS and pipeline framing |
| [Sapia](https://sapia.ai/) | Candidate-facing explanation and conversational presentation | Competency measurement, scoring, ranking, and “best candidate” claims |
| [ConverzAI](https://www.converzai.com/) | Real-conversation narrative and video/product proof | Autopilot replacement language, ATS data, metrics, testimonials |

The reusable visual lesson is narrow: show a believable product moment, clearly label its status, and make the next action obvious. ScreenPilot does **not** copy competitor claims, people, data, employer context, dashboards, scoring, ranking, proctoring, or phone-call controls.

### Focused visual audit and decision matrix

A second pass inspected the opening viewport and narrow-mobile reflow of ten of the strongest references on 2026-09-11. The audit looked specifically at composition, navigation, CTA path, trust, motion, and whether a product preview remained useful when the layout collapsed. Media or video that a site did not deliver in the research browser was treated as unavailable rather than inferred.

| Reference | Desktop/mobile observation | ScreenPilot borrows | ScreenPilot rejects |
| --- | --- | --- | --- |
| Vapi | Full-bleed moving visual, large left-aligned promise, two CTAs, and an inline call control; mobile compresses the same story and call control below the CTAs | Voice state close to the opening promise; short path from explanation to action | Continuous cinematic background, microphone request in the hero, developer navigation, phone-call framing |
| ElevenLabs Agents | Editorial split copy above a prominent media/product strip; mobile serializes copy, two CTAs, and a horizontally clipped media treatment | Strong type hierarchy; product proof remains adjacent to the promise; orderly mobile stacking | Dual navigation bars, human-like positioning, photography as proof, horizontally clipped required information |
| Retell AI | Large rounded dark signal field with centered editorial headline, supporting proof and live-demo action at opposite lower corners; mobile becomes a vertical story | A bounded Deep Ink hero field and generous editorial scale | Ambient spectacle as the main explanation, ratings/logo proof, phone-centre framing |
| PolyAI | High-contrast dark hero dominated by an abstract signal object, with headline and a separate offer panel; mobile reduces both into one narrow sequence | Deep surface contrast and one memorable signal motif | Oversized 3D object, competing product offer, neon accent, enterprise-agent language |
| Synthflow | Contained pale-gradient hero pairs long product copy with analyst-proof artwork and one main demo CTA; mobile preserves the proof but feels dense | A clearly bounded hero and a single local next step | Analyst badge as hero content, generic gradient wash, telephony claims, proof replacing the product itself |
| Greenhouse Voice AI | Human-decision-aware copy and paired “see it/book” actions precede a product explainer; mobile places the promise and action before media | Explicit human ownership, structured-conversation explanation, product demonstration after clear copy | Candidate scoring, ranking funnel, applicant metrics, autoplay video as the only proof |
| Paradox candidates | Candidate-first promise and large illustrative product/lifestyle media; mobile simplifies navigation to mark, search, and menu | Candidate-facing language and low-friction orientation | Job-search scope, avatar/personality framing, announcement bar, hidden menu required for the primary path |
| Gahiz | Centered promise and two CTAs lead directly into a labelled sample-interview UI; mobile stacks full-width CTAs and keeps the sample immediately visible | **Primary reference:** explicit sample label, visible conversation state, captions/evidence relationship, clean mobile serialization | Real person, named role, employer-only CTA, scores/comparison, video-call chrome |
| HeyMilo | Desktop split pairs copy with a tabbed recruiter-product animation; mobile keeps copy/CTA but defers the product preview below trust logos | Controlled copy width and strong single CTA | Recruiter dashboard, applicant volume framing, animated tabs, product proof disappearing from the opening mobile viewport |
| Sapia | Single-colour editorial field, short centered copy, one CTA, and media below the fold; mobile remains simple but has little product proof | Calm focus and one clear action | Candidate-ranking claim, monochrome trend treatment, consultation gate, product hidden below the opening story |

The resulting ScreenPilot composition uses Retell's bounded dark field, Gahiz's immediately labelled interface sample, ElevenLabs' straightforward mobile serialization, and Greenhouse's explicit human-decision wording. Those references are combined only at the level of information hierarchy; no visual asset, copy, person, employer, role, metric, interaction, or claim is copied.

### Candidate trust and community signals

- [Gartner's 2025 candidate survey](https://www.gartner.com/en/newsroom/press-releases/2025-07-31-gartner-survey-shows-just-26-percent-of-job-applicants-trust-ai-will-fairly-evaluate-them) reports low trust in AI evaluation and recommends clear expectations. This reinforces ScreenPilot's no-automated-decision boundary.
- [Greenhouse's 2026 Candidate AI Interview report](https://www.greenhouse.com/newsroom/63-of-job-seekers-have-faced-an-ai-interview-most-havent-had-a-good-one-yet), [CareerPlug's 2025 Candidate Experience Report](https://www.careerplug.com/wp-content/uploads/2025/02/2025-Candidate-Experience-Report.pdf), and [TIME's 2025 reporting](https://time.com/7306955/ai-job-interview-recruitment/) all reinforce upfront disclosure and human context. Survey/vendor methodology limitations are retained.
- Reddit threads about [undisclosed automated interview scoring](https://www.reddit.com/r/recruitinghell/comments/1o6cglm/tldr_an_undisclosed_ai_keyword_scored_my/) and [recruiter skepticism about AI-led hiring](https://www.reddit.com/r/recruiting/comments/1ph6qhq/ai_recruiting_is_going_nowhere/) are anecdotes, but they are useful stress tests for wording that could feel deceptive or dehumanizing.
- Reddit discussions about [generic AI/SaaS homepages](https://www.reddit.com/r/SaaS/comments/1np0h8c), [Framer-site sameness](https://www.reddit.com/r/webdesign/comments/1vjv8is/i_think_were_all_secretly_tired_of_the_same/), and [animation fatigue](https://www.reddit.com/r/framer/comments/1vbzuyb/whats_one_web_design_trend_everyone_loves_but_you/) support rejecting template-like card stacks and motion volume, but do not establish conversion facts.
- X searches returned current voice-AI launch/demo posts such as [Vapi's event demo post](https://x.com/Vapi_AI/status/1973923591184941435) and [Fin's voice product post](https://x.com/fin_ai/status/2062611809568256060), but little verifiable design guidance. No design decision depends on X engagement or claims.

### Market adoption and efficiency signals

- [LinkedIn's 2025 Future of Recruiting report](https://business.linkedin.com/hire/resources/future-of-recruiting) surveyed 1,271 recruiting professionals at management level or above across 23 countries in September 2024. It reports that **37%** of recruiting organizations were actively integrating or experimenting with generative AI in hiring, up from 27% the prior year.
- The same LinkedIn report found that **73%** of talent-acquisition professionals agreed AI would change how organizations hire. The landing keeps this expectation beside the report's current-adoption figure so it reads as a directional survey finding rather than current usage, then uses a clearly separate plain-language sentence to connect that change to automating repetitive screening while preserving hiring-team judgment.
- Among the LinkedIn respondents already integrating or experimenting with generative AI in hiring, the average reported time saving was about **20% of the workweek**, or roughly one day. This is a third-party, self-reported market finding—not a measured ScreenPilot time-saving claim.
- [Greenhouse's 2026 Candidate AI Interview research](https://www.greenhouse.com/newsroom/63-of-job-seekers-have-faced-an-ai-interview-most-havent-had-a-good-one-yet) surveyed 2,950 active job seekers across five markets; unless otherwise stated, published findings refer to its 1,200 U.S. respondents. Its **63%** AI-interview exposure finding is therefore labelled as U.S.-specific on the landing rather than presented as worldwide adoption.
- [Gartner's 2025 candidate survey](https://www.gartner.com/en/newsroom/press-releases/2025-07-31-gartner-survey-shows-just-26-percent-of-job-applicants-trust-ai-will-fairly-evaluate-them) found that only **26%** of 2,918 job candidates trusted AI to evaluate them fairly. This provides the counterweight to adoption and reinforces explicit AI disclosure, clear notes rather than scoring, and human decision ownership.
- No authoritative source reviewed provides a defensible count of all companies worldwide using AI interviews. The landing therefore uses these bounded survey percentages and exposes their sources instead of estimating a global total.

### UX, accessibility, and performance authorities

- [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) — keep frequent choices primary and defer secondary material with clear labels.
- [NN/g trust and credibility](https://www.nngroup.com/reports/ecommerce-ux-trust-and-credibility/) — professional visual quality, respectful information handling, performance, and clear policies influence trust.
- [GOV.UK focus states](https://design-system.service.gov.uk/get-started/focus-states/) — focus must remain unmistakable across light and dark backgrounds.
- [W3C Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) — automatic parallel motion beyond five seconds requires user control.
- [W3C Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) — nonessential interaction motion must be disableable.
- [MDN `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion) — use the established system preference to remove or replace nonessential spatial motion.
- [Apple HIG motion](https://developer.apple.com/design/human-interface-guidelines/motion) and [Reduced Motion criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria) — keep custom motion purposeful, brief, optional, and free of problematic large-scale movement.
- [web.dev animation performance](https://web.dev/articles/animations-guide) — prefer opacity/transform and avoid layout- or paint-triggering animation.
- [Google Material 3 Expressive design notes](https://design.google/library/design-notes-material-3-expressive-liam-spradlin) and [Material design eras](https://design.google/library/material-design-eras) — expression can serve usability through purposeful hierarchy, scale, shape, and spacing.

### Product-demo and gallery sources

- [Navattic State of the Interactive Product Demo 2025](https://www.navattic.com/report/state-of-the-interactive-product-demo-2025) and [HowdyGo's demo hierarchy](https://www.howdygo.com/blog/the-interactive-demo-hierarchy) support short, ungated, value-first product demonstrations. Both are vendors, so their conversion claims are not treated as independent evidence.
- [Webflow's 2025 web-design trends](https://webflow.com/blog/web-design-trends-2025), [Framer inspiration](https://www.framer.com/blog/inspiration), [Godly](https://godly.design/sites/), and [SaaS Landing Page](https://saaslandingpage.com/) were reviewed for current composition signals. They influence mood and pattern vocabulary only.

## Dependency and library decision

The repository currently uses React 19.2, Next.js 16, plain CSS, semantic native controls, and no animation or component framework. The revised hero needs a small stateful conversation sequence and an observed scroll step, but neither requires a general animation runtime. A focused React hook can own timers, visibility, reduced-motion, and cleanup while CSS owns presentation.

| Option | Maintenance / compatibility | License / footprint | Accessibility / SSR | Decision |
| --- | --- | --- | --- | --- |
| Native semantic HTML + CSS | Browser platform; works with current React/Next without a client animation runtime | No package or bundle addition | Static server markup, system reduced-motion query, native focus and dialog behavior | **Chosen** |
| [Motion for React](https://motion.dev/docs/react-installation) / [GitHub](https://github.com/motiondivision/motion) | Actively maintained, React 18.2+, documents Next App Router/client import paths | MIT; still adds shipped JS and another client boundary | Strong API, but reduced-motion and lifecycle still require product decisions | Rejected as unnecessary for a four-state fixed preview |
| [Rive](https://rive.app/docs/runtimes/web/web-js) / [runtime sizes](https://rive.app/docs/runtimes/runtime-sizes) | Active JS/WASM runtime with React support, canvas rendering, state machines, and an external `.riv` asset workflow | MIT runtime; even `canvas-lite` lists a 707 KB uncompressed / 222 KB Brotli WASM payload before the authored asset | Reduced motion requires programmatic pause/autoplay policy and the canvas still needs separate semantic HTML | Rejected because an interactive vector state machine and renderer are disproportionate to a fixed explanatory sequence |
| [Lottie Web](https://github.com/airbnb/lottie-web) / [load options](https://github.com/airbnb/lottie-web/wiki/loadAnimation-options) | Mature SVG/canvas/HTML player with exported JSON assets; latest repository package metadata remains MIT | Adds a player plus authored animation data and renderer lifecycle | SVG can receive a title/description, but autoplay/loop default on and reduced-motion behavior still belongs to application code | Rejected because transcript/evidence semantics would have to be duplicated around a decorative player |
| [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) / [GitHub](https://github.com/radix-ui/primitives) | Active and accessible; current repository issues show React 19 ref-composition fixes continue to matter | MIT; additional packages for a dialog already implemented natively | Excellent focus/keyboard behavior and SSR guidance | Rejected because native `<dialog>` already provides the needed behavior with less code shipped |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | Active source-component ecosystem | MIT, but expects a broader component/Tailwind convention absent here | Accessibility depends on selected underlying primitive and local maintenance | Rejected to avoid replacing the established design-system architecture |
| [GSAP](https://github.com/greensock/GSAP) | Mature and active with React cleanup guidance | Free standard license, not the repository's simple MIT dependency model; substantial capability beyond need | Can respect media queries, but requires JS lifecycle and careful cleanup | Rejected as excessive for brief compositor-only motion |
| [Magic UI](https://github.com/magicuidesign/magicui) and similar registries | Active but many effects depend on Motion/Tailwind and are optimized for visual novelty | Copy-in code plus transitive dependencies varies by component | Quality and reduced-motion behavior require component-by-component audit | Rejected to avoid generic AI-template effects and unowned copied code |
| [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) | Newly baseline in 2025; older-browser behavior still needs fallback | No package | Useful for state/page transitions, not needed for a static illustrative preview | Rejected for this ticket; later route transitions may reconsider it separately |

The existing native privacy dialog remains. Its explicit close control, labeling, Escape behavior, and modal focus model follow [MDN's `<dialog>` guidance](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog).

For the actual preview, native React state plus CSS remains the proportional choice. Motion's smallest imperative path is documented at roughly 2.3 KB, while its common declarative component can be much larger; both still require a client animation boundary. Rive adds a canvas/WASM renderer and a separate accessible fallback. Lottie adds a player and exported asset whose visual layers do not replace the transcript and note semantics. ScreenPilot already needs semantic HTML and React on the landing; a narrow hook can loop slowly through six examples, reveal questions and answers by word, alternate two three-card boards, pause on deliberate keyboard/click focus and when off-screen or hidden, clean up its timers/listeners, and retain word-by-word opacity-only entrances plus opacity-only voice activity under `prefers-reduced-motion`, with no new runtime or asset request.

## Selected direction — Conversation in Focus

The revised direction keeps Signal Canvas but makes the interview the visual and narrative center:

- One continuous Deep Ink-to-plum field carries the full landing. Coral light, a quiet grid, and contained pale surfaces create depth without a navy-to-white page break.
- The opening masthead is left aligned and sits close beneath the navbar: company-buyer copy and actions form one strong block at the left edge, while four overlapping feature cards cascade diagonally across the right. The cards identify **Voice interviews**, **Adaptive follow-ups**, **Clear interview notes**, and **Human decisions** through compact plain-language copy and custom inline SVG icons. They are semantic HTML rather than an image, slide diagonally into place once from top-left to bottom-right over roughly 1.1 seconds each with a readable near-sequential stagger, and then remain still. The cards overlap enough to read as one connected composition without hiding their descriptions. Hovering an exposed card raises it over the other cards without changing its semantics; compact layouts remove the overlap and rotation and preserve all four items in a grid/stack. The wide framed interview product view stays directly below this masthead. The code-native preview is the current truthful stand-in and can later become a real capture once that UI is stable. **Automate the first interview. ScreenPilot takes the notes.** opens the story without a separate category eyebrow or reassurance line, and the complete group moves upward to use that recovered space. Supporting copy explains that every candidate gets a consistent first conversation without recruiters repeating the same questions all day; later content owns the detailed human-decision boundary without repeating it in the hero.
- Immediately after the hero, a centered market-evidence introduction leads into one asymmetric five-card board. Current adoption (**37%**) and the same survey's hiring-change expectation (**73%**) occupy two separate stacked cards in the left track whose total height and gap align with the right side; reported time saved (**20%**) uses a wide upper-right card, while candidate AI-interview exposure (**63% U.S.**) and candidate trust (**26%**) form the lower-right pair. The percentage itself is the sole metric graphic; plain titles, sample labels, and original-source links make each finding easy to scan and clearly attributed without a separate disclaimer chip.
- A large interview scene sits directly beneath the promise. A generic code-native participant speaks toward a laptop while Pilot's question and the candidate's answer appear word by word. Once both lines are complete, both evidence phrases receive a synchronized two-pass marker sweep before the matching interview note is created.
- Six role-neutral examples loop slowly across two uses of the persistent three-column board. Salary expectation → **25k–30k**, relevant experience → **three years in customer support**, and availability → **in about four weeks** fill the first board. Role preference → **customer-facing problem solving**, work setup → **remote or hybrid**, and growth goal → **product knowledge and leadership** fill the second. Each completed board holds, the second returns to the first, and every item remains an illustrative candidate-stated note—never a score or inferred fact.
- The active speaker's voice bars animate in place, and the refined participant illustration has its own waveform while the candidate answers. Pilot's turn activates a gently illuminated ScreenPilot mark and expanding voice rings on the back of the laptop lid. The warm-toned participant remains featureless rather than using cartoon eyes or a mouth. Questions and answers appear one spoken word at a time at a deliberately readable pace; their evidence highlights draw together only after both are complete. The loop keeps an accessible example name without redundant visible header copy or playback/topic controls, pauses on deliberate keyboard/click focus and outside the viewport/hidden page, and holds each complete notes board before changing. Reduced-motion users retain the word-by-word rhythm through opacity-only word entrances, with no spatial movement and slow opacity-only voice activity; the semantic highlight remains a one-second paint-only sweep.
- The non-sticky transparent header keeps the larger ScreenPilot mark and wordmark at the left, with **How it works** and **Start demo** grouped at the right. Its DOM order matches the familiar visual order, it scrolls away naturally, and the page-owned atmospheric field extends behind the whole header and hero without restarting at their boundary.
- A four-step scroll story uses segmented progress like a story viewer. The sticky visual responds to ordinary page scrolling while the readable steps explain choose → talk → notes → human review. Privacy belongs inside the final step, not a detached promotional card.
- The two entry paths remain equal and use simpler copy on elevated Deep Ink cards rather than white panels. The landing ends with the choice itself; there is no standalone privacy slab or footer.
- `/demo` retains the already redesigned early-stage workspace, but its context-rail copy is simplified as part of the same language pass.
- Every viewport keeps the same story order. Large monitors leave room for a right-side masthead visual while the wide interview stage remains centered beneath it; narrower layouts stack any approved masthead visual and keep every control and note readable. No separate device component tree is created.

### Rejected directions

1. **Polished light SaaS:** safer and closer to SP-011, but still reads as generic card-template marketing and under-communicates voice/product behavior.
2. **Cinematic voice spectacle:** audio-reactive canvas, scroll hijacking, kinetic type, and uncontrolled parallax are visually loud, expensive, and conflict with accessibility and trust. The selected background and scroll response stay bounded, progressive, and controllable.
3. **Recruiter command center:** dashboards, candidates, pipelines, metrics, scores, and rankings misstate ScreenPilot's stateless candidate-facing demo.
4. **Friendly avatar interviewer:** stock people, photorealistic AI faces, robots, and a humanlike Pilot avatar add deception and bias risk. The selected abstract person-at-laptop illustration represents the participant only and has no identity or evaluative meaning.

## Scope boundaries

- Do not change reducer state, API contracts, provider calls, CV parsing, deterministic preparation, or active-interview behavior.
- Do not add a dependency, external media request, raster/content image asset, video, canvas, WebGL, analytics, or paid/live call. The approved code-native mark may also be reused as a small local SVG favicon; it is not a photographic or externally fetched content asset.
- Do not invent a candidate, employer, vacancy, hiring result, score, ranking, sentiment, emotion, qualification, or application status.
- Do not make one entry path visually secondary.
- Do not remove privacy access; relocate it from navigation to contextual surfaces.
- Do not edit `docs/SCREENPILOT_PROJECT_SPEC.md`.

## Implementation checklist

- [x] Update the parent source of truth, ticket index/dependencies/milestones, design reference, and affected downstream tickets before product code.
- [x] Build the semantic, synthetic, role-neutral hero product preview with a controlled looping sequence and complete, non-spatial reduced-motion states.
- [x] Redesign the landing hierarchy and surfaces around the preview while keeping both entry cards equal.
- [x] Keep landing navigation limited to the product journey actions, preserve Privacy in the final landing story step, and remove the standalone landing footer.
- [x] Redesign the early `/demo` shell with persistent progress plus header-level **Privacy details** and **Clear & exit** actions, without a workspace footer or duplicated stage state.
- [x] Identify the floating “N” options control as Next.js's development indicator and disable only that indicator through the documented Next.js 16 `devIndicators: false` configuration; keep compile/runtime error reporting.
- [x] Update focused component tests for navigation, privacy placement, preview semantics, equal entry actions, and demo orientation.
- [x] Verify no old landing decision-note composition or header privacy/source control remains.

### Feedback-led revision checklist

- [x] Keep the landing header non-sticky and transparent with the enlarged ScreenPilot mark and wordmark on the left, move **How it works** and **Start demo** to the right, and extend one seamless atmospheric field behind it and the hero to every top edge.
- [x] Replace the original split copy/card hero with an interview-led composition and plain-language product promise.
- [x] Remove the hero category eyebrow and standalone reassurance line, then keep the supporting copy focused on reducing repetitive recruiter screening effort without an unsupported percentage claim.
- [x] Reposition the hero for company hiring teams and add a centered, asymmetric five-card market-evidence board without inventing a worldwide total or ScreenPilot ROI claim.
- [x] Left-align the masthead copy, fill its wide-screen right side with the four-card code-native diagonal feature cascade, and keep the screenshot-like product frame directly below it.
- [x] Render **notes.** as a slightly informal handwritten SVG that draws letter by letter over about 1.1 seconds, immediately followed by an imperfect coral underline; retain ordinary accessible text, keep the final word stable, and use only a gentle opacity finish under reduced motion.
- [x] Build the slow six-example loop with word-by-word questions and answers, in-place speaker activity, a generic participant-at-laptop illustration, and two alternating sets of three note cards that fill in order.
- [x] Refine the participant's face, posture, hands, and laptop composition; animate the participant waveform and mouth only while the candidate is answering.
- [x] Remove the redundant visible preview title/subline while retaining the figure's accessible example name and fictional-content explanation.
- [x] Remove all playback/topic-switching controls; pause the slow loop on deliberate keyboard/click focus, off-screen, and on hidden pages, hold each completed notes board before the next set, return to the first set after the second, and preserve word-by-word timing with opacity-only word and voice activity under reduced motion.
- [x] Replace the light page break with one continuous atmospheric landing background.
- [x] Replace the ordinary explanation grid with the four-step sticky scroll story and segmented progress.
- [x] Fold concise trust/privacy copy into the final story step; remove the standalone privacy slab and landing footer.
- [x] Simplify the entry chooser and early-demo context language without changing behavior or entry parity.
- [x] Replace the entry chooser's white card backgrounds with elevated dark surfaces and dark-surface icon, badge, and copy treatments.
- [x] Keep all same-page landing anchors smooth, including logo-to-top, both **How it works** actions, the hero entry action, and the scroll cue; make the two **How it works** actions share one brisk, user-interruptible implementation without replacing their fragment-link semantics, while routing header **Start demo** directly to `/demo`.
- [x] Update the design reference and focused landing tests for the revised composition.

### Shared `/demo` correction checklist

- [x] Inspect every currently reachable `/demo` state and its navigation in source and in the running app before editing the shared shell.
- [x] Document the dark-workspace correction, competitor principles, responsive contract, and stage-transition map before product code.
- [x] Replace the light page/card stack and detached context rail with one centralized Deep Ink/plum/coral workspace and a top progress panel; keep Privacy and exit in the header and render no workspace footer.
- [x] Make the logo return to `/`, make **Clear & exit** explicit, and keep browser Back/session-resume behavior predictable.
- [x] Render progress as noninteractive status and normalize valid Back, Retry, Change starting option, Continue, and exit actions without stage skipping.
- [x] Migrate bootstrap/error, entry choice, CV intake/status, conversation preparation/error, preflight handoff, and future-stage fallback into the shared workspace.
- [x] Inspect every reachable state across the requested responsive/short-height matrix before broad verification.
- [x] Make the early-demo shell height-responsive so standard choose, CV intake, preparation, and preflight states fit without document scrolling at ordinary laptop/tablet anchors while short or content-heavy states continue to scroll naturally.

## Acceptance criteria

- [x] A first-time visitor can identify voice interviewing, adaptive follow-ups, clear note-taking, and human decision ownership from the left-aligned hero and its four-card diagonal feature cascade without decoding internal product language.
- [x] A company buyer can identify the repetitive first-round screening problem, the ScreenPilot value, and the human-review boundary; each market KPI exposes its sample scope and original source so it remains clearly attributed without a separate disclaimer chip.
- [x] The hero word **notes.** traces as a slightly informal handwritten SVG over about 1.1 seconds, receives its imperfect coral underline immediately afterward, does not shift or loop, remains ordinary text in the accessible headline, and stays complete with opacity-only emphasis under reduced motion.
- [x] The preview is visibly illustrative, contains no real/person-specific data, makes no hiring judgment, and preserves a complete readable example without motion.
- [x] All six examples visibly connect word-by-word question → word-by-word answer → simultaneous left-to-right question/answer evidence highlights → one of three persistent note cards; candidate and Pilot activity are distinct on the participant and laptop, the two three-topic boards alternate without changing the layout height, and the second board returns to the first.
- [x] The preview starts automatically at a readable pace, has no playback or topic-switching controls, pauses on deliberate keyboard/click focus and when off-screen or hidden, holds each completed board before transitioning, and preserves word-by-word speaking through opacity-only entrances without spatial motion under reduced motion.
- [x] **Use a CV** and **Start without a CV** retain equal visual weight, complete plain-language copy, keyboard order, and primary action treatment.
- [x] The entry chooser remains inside the continuous Deep Ink environment with no detached white card backgrounds, and its text, icons, badges, and controls remain clearly legible.
- [x] The non-sticky transparent header keeps its enlarged ScreenPilot mark and wordmark on the left and only **How it works** and **Start demo** on the right; it scrolls away in normal document flow, the page-owned atmosphere and grid continue behind it and the hero with no visible seam, and keyboard order matches that layout. Header **Start demo** routes directly to `/demo`; every same-page landing anchor glides to its target without retaining a sticky-header offset. Privacy remains keyboard-accessible inside the how-it-works story and every early `/demo` stage; no landing footer remains.
- [x] The four-step story responds meaningfully to scrolling, exposes all step content without animation/JavaScript, and ends in the entry chooser without a detached privacy slab.
- [x] `/demo` exposes progress plus adjacent header-level **Privacy details** and **Clear & exit** actions; relevant task surfaces own human-decision and synthetic-role context using the same visual language across choose, CV entry, preparation, and preflight.
- [x] Every implemented `/demo` state uses one centralized layered-dark workspace with no white/Warm White page, card, panel, or form surface; near-white is limited mainly to type, icons, and small high-contrast details.
- [x] The ScreenPilot logo returns to `/` without clearing, browser Back returns predictably to the landing/history entry, and **Clear & exit** clears the session before replacing the route with `/`.
- [x] Progress is visibly noninteractive; every implemented state explains its task and exposes only reducer-valid Continue, Retry, Change starting option, or exit recovery, with no duplicate actions or dead ends.
- [x] Bootstrap/error, entry choice, CV preparation/error, plan preview, preflight, connection, live interview, and the future-stage fallback each expose a short uppercase pretitle followed by one page-level title; headings use the full task width, remain single-line at desktop anchors when space permits, and contain no detached right-hand lead sentence.
- [x] Ordinary desktop/tablet viewports, including 1024 × 768, 1280 × 800, and 1440 × 900, keep the complete header actions, progress, active task, and primary/recovery action visible without document scrolling; phones, zoom, unusually short heights, errors, and long content use natural document scrolling without clipped controls or nested scroll traps.
- [x] The Next.js development indicator no longer appears, while development compile/runtime errors remain available.
- [x] No page-level horizontal overflow or clipped required action appears at phone, tablet, laptop/desktop, large-monitor, or an intermediate drag-resized width.
- [x] No dependency, provider call, candidate persistence, or separate mobile implementation is added.

## Focused verification

- [x] Run the four focused changed-surface frontend test files; all 22 tests pass.
- [ ] Run frontend lint, frontend typecheck, the complete frontend unit suite, and the frontend production build after visual direction is accepted.
- [x] Verify keyboard order, visible focus, absence of preview controls, native dialog open/Escape/close/focus return, and 44 px targets.
- [x] Verify word-by-word question/answer timing, all six ordered card creations, both completed-board holds, second-board-to-first-board loop, deliberate keyboard/click-focus and off-screen/hidden-page pause, and opacity-only reduced-motion progression.
- [x] Inspect `/` and early `/demo` at 320, 390, 768, 1024, 1280, 1440, 1920, and one intermediate drag-resized width; confirm no document/header/preview/story overflow.
- [x] Inspect smooth same-page anchor navigation plus the meaningful scroll progression and its readable non-sticky/narrow-screen fallback; unit-check the custom CTA's midpoint, destination, fragment update, frame-level instant positioning, and reduced-motion execution.
- [x] Inspect development mode and confirm the floating Next.js “N” control is absent and the browser/server console has no application error.
- [x] Search the final diff for duplicate components/tokens, stale old composition, secrets, candidate content, debug output, unsafe casts, TODOs, or unintended provider/API changes.

## Downstream coordination

- SP-012 inherits the centralized dark workspace, top progress panel, and header-level Privacy/exit actions for CV extraction/analysis/plan stages.
- SP-013 inherits contextual Privacy access from the header but still owns the full provider/AI/microphone disclosure immediately before consent.
- SP-016, SP-019, and SP-021 retain the same workspace/header/navigation language for live insights, transcript evidence, and review; none returns `/demo` to a light document canvas.
- SP-024 performs complete release-level accessibility, device/browser, long-content, and performance hardening for this stable shell; SP-011A must still meet the local responsive and reduced-motion checks above.

## Commit boundary

Keep SP-011A reviewable as one corrective design-and-implementation change. Do not stage, commit, amend, revert, reset, push, or rewrite history unless the user explicitly gives a later Git instruction. All work from this ticket remains unstaged for combined review.

## Precision references

- [Design source of truth — Signal Canvas](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#14-design-source-of-truth--signal-canvas)
- [Landing and demo screen design](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#screen-design)
- [SP-011 conversation-first path](SP-011-build-conversation-first-frontend-path.md)
- [SP-024 accessibility, responsiveness, and performance](SP-024-harden-accessibility-responsiveness-and-performance.md)

## Completion handoff

Report the final files, functional result, research-driven decisions, deterministic and manual checks, any unchecked user-only/credentialed item, deviations, and final unstaged Git state.

The first implementation pass completed locally on 2026-09-11 and passed 68 unit tests, lint, typecheck, production build, and its manual responsive/accessibility checks. User visual review then reopened the landing composition, language, motion, background, and lower-page story. The feedback-led revision is implemented and was inspected in the browser at desktop, 390 px, and 320 px widths: the original four examples, fixed subtitle/note layout, sticky desktop scroll story, readable narrow-screen story, integrated privacy, transparent navigation, continuous background, entry cards, and absence of a footer were all observed. The header was subsequently restored to the familiar brand-left/action-right order, with matching DOM/keyboard order. It now remains in normal document flow so it scrolls away; the quiet grid and upper glow are owned by the page-wide atmosphere and continue behind the header and hero without a section-boundary rectangle. The separate Play/Pause control and topic tabs remain removed. The preview now loops slowly through six role-neutral examples: salary, experience, and availability fill the first three-column board; role preference, work setup, and growth goal fill the second; then the sequence returns to the first. Pilot questions and candidate answers reveal one spoken word at a time, each completed board holds before transitioning, and deliberate keyboard/click focus plus off-screen/hidden-page states pause the loop without restoring a visible playback control. A later visual correction refined the participant illustration and added a prominent candidate waveform plus mouth movement during answers. The reduced-motion path now keeps that word-by-word timing through opacity-only entrances and uses opacity-only bar animation. The entry chooser's white panels were subsequently replaced with dark layered cards, and the live narrow layout was inspected. The redundant visible preview title/subline was then removed while preserving its accessible name. The hero now sells the company value directly—automate the repeatable first interview, capture clear notes, and keep every decision with the hiring team. Same-page landing actions retain native smooth scrolling instead of jumping, including in the current reduced-motion browser. The masthead copy is now left aligned and leaves room for a later user-approved photo or SVG on its wide-screen right side, while the full-width interview product frame remains directly beneath it. The visible word **notes.** is now a slightly informal handwritten SVG whose individual pen strokes draw over about 1.1 seconds before an imperfect coral underline follows immediately; the ordinary word remains in the accessible headline, the treatment never loops or shifts layout, and reduced motion keeps the completed word with a gentle opacity-only finish. The source-linked market section now uses a centered typographic introduction and an asymmetric evidence board for the bounded LinkedIn, Greenhouse, and Gartner adoption, expected hiring change, time-saving, exposure, and trust findings without presenting them as ScreenPilot results or inventing a worldwide company count. The LinkedIn **37%** and **73%** findings are separate stacked cards in the left track, and together with their gap match the right side's two-row height. The user subsequently accepted the corrected visual direction and confirmed the requested manual experience checks. The broad automated suite and production build remain the final deferred verification; no credentialed or paid provider call is required.

The standalone market-research disclaimer chip was later removed at user request. Attribution remains attached to each statistic through its sample/geography line and original-source link.

The subsequent product-route correction migrated every currently reachable `/demo` state—bootstrap/retry, entry choice, CV intake/extraction/ready/error, conversation preparation/retry, preflight, and the future-stage fallback—into one centralized layered-dark workspace with a top inert progress panel, a bottom safeguards footer, home-link logo, and explicit **Clear & exit** behavior. The navigation header now keeps only the brand and exit action. Stage actions use reducer-valid Retry, Change starting option, Continue, and exit paths without duplicate or dead-end controls. The live flow was inspected at 320, 390, 768, 1024, 1180 short-height, and 1440 px layouts with no horizontal overflow or clipped required action; keyboard focus and Privacy dialog Escape/focus return were also verified. Changed-file lint, frontend typecheck, and four focused changed-surface frontend test files (17 tests) pass. User visual approval is now recorded; the broad unit suite and production build remain intentionally deferred, and all work remains unstaged.

A later preview refinement made the spoken timing unmistakable by mounting each newly revealed subtitle word with a short fade-and-rise treatment while keeping the underlying question/answer timing word-by-word. It also removes the redundant lower participant label/instruction block, centers the illustration in a shorter stage, and reduces each collected-note card to its sequence number, captured field, value, and quiet completion dot. Visible “Interview note,” “Added from your answer,” “Waiting,” and “Listening for answer” filler labels are intentionally absent.

The CV intake refinement makes **Change starting option** a coral primary action, groups the PDF limits and privacy guidance as a quiet inset footer inside the upload surface, and fixes the dropzone height ownership so neither line can overlap the next action. Extraction now shows a scanning document, activity dots, and a phase-aware progress track for **Reading PDF**, **Extracting text**, and **Preparing interview context**; a 900 ms minimum feedback window keeps the state perceptible even for the fast synthetic sample without adding time beyond slower real extraction.

The browser-tab favicon now uses the same approved Deep Ink, Warm Coral, and Pale Coral code-native paper-plane mark as the visible ScreenPilot wordmark instead of the browser's generic site icon.

The hero's reserved wide-screen visual area is now a semantic four-card feature cascade rather than an empty placeholder or external image. **Voice interviews**, **Adaptive follow-ups**, **Clear interview notes**, and **Human decisions** slide in once along a top-left-to-bottom-right diagonal with custom inline SVG icons, readable plain-language descriptions, and a green human-ownership finish. Each roughly 1.1-second entrance is staggered slowly enough to follow in reading order; the cards remain still after entering, and hovering an exposed card raises it above the rest of the stack. The cascade is vertically compressed for clearer overlap, while its descriptions remain visible, and the complete hero starts closer beneath the navbar. Reduced motion keeps the same reading order through a shorter, shallow no-scale slide rather than the full diagonal travel. At 768 px the same ordered list becomes a complete 2 × 2 grid, and at phone widths it becomes one column without a separate mobile implementation. The revised desktop spacing keeps every description readable instead of allowing the overlap to cover copy. The design reference and focused landing assertion now match the implementation. Manual browser inspection passed at 1440 × 900, 1024 × 768, 768 × 1024, and 390 × 844 with no horizontal overflow at the measured desktop/laptop/tablet anchors and no console warnings or errors. The focused landing test passes, changed-file ESLint passes, frontend type generation and TypeScript checking pass through the repository-pinned pnpm 11.24.0 (with the host's pre-existing Node 22 versus required Node 24 warning), Prettier reports all touched app/reference files formatted, and `git diff --check` passes. No dependency, provider call, raster asset, staging, or commit was added.

The final motion refinement was replayed in the reduced-motion preview at 220 ms, 820 ms, 1,420 ms, and 2,020 ms: exactly one additional card was entering at each checkpoint, with all later cards held at the start position. The settled 1440 × 900 and 1024 × 768 views confirm the tighter navbar-to-hero gap and increased connected overlap. The first three descriptions were shortened so they remain readable inside that overlap. Hovering the exposed first card raises it from layer 1 to layer 10 above cards 2–4 and visually clears it above the stack; the measured 1024 px document width remains below the viewport width.

The **Scroll to see the journey** anchor now occupies a dedicated normal-flow row beneath the interview frame instead of floating over the collected-note cards. Browser measurements retain a positive frame-to-cue gap of 64 px at 1440 × 900 and about 46 px at 1024 × 768, with no horizontal overflow at either viewport.

The market-evidence board now promotes the **73%** hiring-change expectation from nested copy into its own fully sourced card. **37%** and **73%** occupy two stacked left-track cards while **20%** remains wide above the **63%** and **26%** pair; both sides measure the same total height including the 16 px row gap (712.625 px at 1440 × 900 and about 700.97 px at 1280 × 800). All five cards have zero clipped-content overflow, and the 1024 × 768 layout reflows them into two equal columns without horizontal overflow. The focused landing test passes (2 tests), changed-file ESLint and Prettier checks pass, and `git diff --check` passes.

The market-reference links now use one deliberate underline on the source label only, with the outbound arrow separated by an 8 px gap and left undecorated. Browser inspection confirms the continuous label rule, clean arrow, and retained 44 px target. Changed-file ESLint, Prettier, and `git diff --check` pass.

The two compact left-track market cards now resolve their real content collision: their column-gap declaration used the undefined `--sp-space-7` token, so the browser discarded the gap and allowed the large percentage glyphs to intrude into the copy column. They now use the defined spacing scale and a slightly tighter compact-card numeral while retaining the larger numerals elsewhere. Browser measurements show no box overlap or clipping, with about 29 px clearance at 1440 px, 32 px at 1280 px, and 27.5 px at the tight 1100 px desktop width; the 1024 px two-column reflow also remains clear and has no horizontal page overflow. The implementation and HTML design reference match, Prettier passes, and `git diff --check` passes.

At user direction, all five decorative percentage progress bars were removed from the market-evidence cards. The percentage is now the sole metric graphic, with the existing title, explanation, sample/geography, and source citation retained. The unused product/reference meter markup and CSS were removed, and the source of truth now explicitly prevents those bars from being restored. Browser inspection confirms zero meter elements, clipped cards, or horizontal overflow at 1440 × 900 and 1024 × 768. Changed-file ESLint and Prettier checks pass, and `git diff --check` passes.

The taller **73%** outlook card now uses its available space for a concise product-relevant continuation: the sourced survey sentence remains intact, followed by a clearly separate explanation that changing hiring workflows creates room to automate repetitive screening while keeping judgment with hiring teams. No second statistic or unsupported claim was added. The revised card remains unclipped with no horizontal page overflow at 1440, 1100, and 1024 px widths; the focused landing-render test, changed-file ESLint, Prettier, and `git diff --check` pass.

The **20%** time-saved card now expresses “about one day” as a short second sentence instead of using an em dash. The implementation and design reference use the same more natural phrasing.

The wide-board **37%**, **73%**, and **20%** numerals now remove the obsolete 40 px metric top margin left behind by the deleted progress bars. Their centers move from about 20 px below the adjacent copy centers to effectively exact alignment, while the 1024 px stacked-card reflow retains its normal 40 px heading-to-metric spacing. Browser inspection confirms no clipping or horizontal overflow, and the HTML design reference carries the same desktop-only correction.

Final validation found that the Strict Mode landing test was locating **Start without a CV** while bootstrap still rendered it disabled, so the synthetic click was correctly ignored; no bootstrap/session race was present in `useDemoBootstrap` or the reducer. The test now waits for the control to become enabled and verifies exactly two bootstrap requests: the initial request plus one restart after the landing-only **Clear session** action. The `/demo` safeguards footer now says that a candidate may name any role or stay undecided and that the role is demo-only for the current tab session. Bootstrap failure and `/demo` privacy copy consistently use **Clear & exit**, while the landing resume card intentionally retains **Clear session**. Superseded landing context, privacy slab, footer, trust-grid, first-generation interview-preview, and related orphaned keyframe/responsive/reduced-motion CSS have been removed after confirming they have no remaining JSX usage. The four focused changed-surface frontend test files pass all 17 tests.

The corrected safeguards footer and privacy copy were then inspected in the running `/demo` route at 320 × 844, 768 × 1024, 1024 × 768, 1180 × 800, 1440 × 900, and 1920 × 1080. No viewport showed horizontal page overflow, a clipped footer, or an out-of-bounds control. The tablet portrait and all laptop/desktop anchors fit without document scrolling; the 320 px phone uses the intended natural page scroll. The privacy dialog visibly names **Clear & exit**, and the browser console reports no warnings or errors.

User-recorded motion feedback on 2026-09-14 prompted a focused preview correction. Question and answer highlights now wait until both lines are complete, draw together with a one-second two-pass marker sweep, and finish before the note card is created. Pilot activity on the laptop was changed from a second scaling equalizer to a softly pulsing ScreenPilot lid mark with staggered expanding voice rings. The ambiguous pale participant hand/arm shape and cartoon facial features were removed, and the skin now uses a clear warm tone. A second laptop-reference pass corrected the viewing geometry: the broad uninterrupted outside lid is centered over the candidate's lower torso, the deck is layered behind it, and only a thin hinge/base silhouette remains visible, so the device reads as a candidate-facing laptop rather than a front-facing screen. The focused sequence test verifies the new `question → answer → highlight → note` order and simultaneous highlight state. The focused landing tests, frontend typecheck, and frontend lint pass; the static participant/laptop composition was re-inspected in the running local page. Full multi-viewport motion replay remains part of SP-025 manual release QA.

The header's **How it works** action and hero's **See it step by step** CTA now share one brisk 0.9-second cubic ease-in/ease-out scroll to the existing `#how-it-works` target. The progressive enhancement preserves both real anchors, ignores modified clicks, cancels on wheel/touch/pointer/keyboard input or unmount, updates the fragment only after arrival, and falls back to the native anchor only when the target is missing. Each animation frame requests an explicitly instant position so the document's native smooth-scrolling rule cannot compound the custom easing. The direct-click journey remains active when reduced motion is reported; focused tests exercise both controls and verify the midpoint, exact destination, delayed fragment update, instant frame positioning, and reduced-motion execution. Header **Start demo** now routes directly to `/demo`, while the hero's primary action retains the landing-page chooser path.

Follow-up runtime diagnosis found that the user's browser reported `prefers-reduced-motion: reduce`: the original CTA branch therefore handed navigation back to a browser that jumped immediately, while the global reduced-motion duration rule collapsed the marker sweep to 1 ms. The CTA now preserves its explicit user-triggered journey in that environment. The synchronized evidence highlight uses interoperable animated background sizing instead of a registered custom property and receives the same one-second paint-only duration in reduced-motion mode; other passive spatial effects remain reduced.

The market-evidence cards now reset the desktop-only centered metric alignment when the asymmetric board reflows below 68 rem. Every percentage is left-aligned with its supporting copy in both the two-column tablet and one-column phone compositions, and the HTML design reference carries the same responsive rule; the asymmetric wide-screen board remains unchanged.

The `/demo` stage-heading pattern no longer reserves a narrow title column beside a detached explanatory sentence. Choose, CV preparation, CV plan, connection, and shared fallback headings use the full workspace width and remain on one line at desktop widths when the copy fits; tablet and phone layouts may wrap naturally without overflow. The redundant Choose-stage sentence was removed. Live checks confirmed one-line rendering at 1280 px for Choose and plan headings, one-line rendering at 768 px for Choose and CV intake headings, natural two-line wrapping at 390 px, and no horizontal overflow at any checked width. The four focused stage test files pass all 22 tests; frontend lint, frontend typecheck, and `git diff --check` pass.

The later user-directed shell simplification removes the `/demo` safeguards footer entirely, including its obsolete component and responsive CSS. The shared Privacy dialog trigger now lives in the header immediately before **Clear & exit** and remains available across every demo stage; the stage surfaces and preflight retain contextual privacy, human-decision, and synthetic-role disclosures. This decision supersedes the earlier footer placement recorded in the historical implementation notes above. The focused `/demo` tests pass all 5 tests, frontend lint and typecheck pass, and `git diff --check` passes. Live checks at 1280 × 720 and 320 × 844 confirm there is no footer or horizontal overflow, the header actions remain in the requested order, the dialog opens with focus on **Close**, and Escape returns focus to **Privacy details**.

The complete `/demo` stage audit now enforces one visual hierarchy across transient, error, and stable states: a short uppercase pretitle immediately precedes one page-level title. Bootstrap, conversation preparation, and preflight received the missing page headings; the preflight card title is correctly demoted to a secondary heading, while Choose, CV, plan, connection, and live interview retain their existing pairs. Six focused component files pass all 40 tests, frontend lint and typecheck pass, and `git diff --check` passes. Live desktop and 390 px preflight checks show exactly one page-level title, the expected pretitle, and no horizontal overflow.

The follow-up design-system pass replaces the remaining handwritten heading variants with one shared `DemoStageHeading` component and centralizes `/demo` page, panel, card, body, metadata, stage-gap, card-gap, and card-padding values. The workspace task is now top-aligned beneath progress, removing the content-dependent blank band that made short stages appear to use different spacing. The undefined preflight accent reference was replaced by the semantic accent token, and the landing's existing 28 px spacing reference now has a defined scale token. Focused component coverage passes all 46 tests; frontend lint and typecheck pass. Live checks at 1280 × 800, 768 × 1024, and 390 × 844 confirm the shared 32/22/15 px desktop hierarchy, 28 px compact page title, consistent 8 px pretitle gap, tokenized 16–20.48 px stage rhythm, natural phone wrapping, and no horizontal overflow. No microphone action or provider-backed voice start was used.
