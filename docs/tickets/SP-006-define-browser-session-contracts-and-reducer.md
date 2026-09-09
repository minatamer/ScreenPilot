# SP-006 — Define browser-session contracts and reducer

Status: Required  
Implementation state: Completed and revised locally on 2026-09-09; awaiting commit authorization

Milestone: Milestone 1 — interview preparation paths  
Last synchronized: 2026-09-09<br>
Depends on: SP-001, SP-003  
Suggested commit: `feat(frontend): add disposable demo session state`  
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Create the typed, versioned, current-tab state model and reducer that safely owns both preparation branches and their shared interview/review lifecycle.

## Standalone implementation context

- ScreenPilot has no user account or backend session record. The current browser tab is the only application state owner.
- The workflow branches into `cv_assisted` and `conversation_first`, then converges at shared preflight and stays shared through review.
- `packages/contracts` owns only shapes that cross HTTP, client-tool, or structured-provider boundaries. Frontend workflow stages, reducer events, the persistence envelope, and browser lifecycle/runtime models belong in `apps/frontend/src/features/session`.
- Model persisted and ephemeral state separately. Persist only validated structured employer/vacancy context, optional normalized CV, plan, signed interview grant, voice status metadata, final transcript turns, insights, topic progress, and optional summary.
- Use `sessionStorage` only, with schema versioning and a maximum two-hour lifetime.
- The PDF, raw extracted CV text, Turnstile token, ElevenLabs/OpenAI token, API key, microphone audio, and raw debug payload are memory-only or forbidden.
- Conversation-first must never acquire `cv` state or a `CV`/`CV + Candidate` evidence source.
- Next.js server rendering and initial module evaluation must not read browser globals. Restore happens behind an explicit client boundary and cannot auto-reconnect a call.

## Scope boundaries

- Do not implement screens, PDF parsing, provider calls, voice SDK callbacks, or summary generation.
- Do not use `localStorage`, IndexedDB, cookies for candidate content, or server persistence.
- Do not make browser state trusted when it returns to the backend.
- Do not duplicate reducers for the two entry modes.
- Do not serialize the entire reducer/runtime object and delete forbidden fields afterward; persistence is constructed from an allow-listed schema projection.
- Do not put `File`, media tracks, SDK clients/subscriptions, abort controllers, timers, or raw provider events into the serializable reducer state.

## Implementation checklist

- [x] Define cross-boundary entry mode, normalized CV, screening plan, interview grant, transcript turn, insight card, topic progress, voice metadata, and summary schemas in `packages/contracts`.
- [x] Add only the explicit contract subpath exports named in the filename blueprint; do not restore a catch-all root `src/index.ts`.
- [x] Define frontend-only demo stages, reducer state/events, runtime-only state, and the versioned persistence envelope under `apps/frontend/src/features/session`.
- [x] Implement branch-specific preparation transitions and a single shared preflight/interview/review sequence.
- [x] Make `entryMode` immutable after preflight starts and reject invalid cross-mode transitions.
- [x] Add a versioned `sessionStorage` adapter with two-hour expiry, parse/size validation, migration-or-clear behavior, namespaced keys, and an explicit allow-list projection from runtime state.
- [x] Make storage access injectable and hydration-safe; importing or server-rendering the feature cannot touch `window` or `sessionStorage`.
- [x] Exclude all forbidden binary, raw-text, secret, audio, and provider-token fields from serializable schemas.
- [x] Implement Clear session, start-over, corrupt-state recovery, and refresh-during-call interruption behavior.
- [x] Keep preferred-name and role-preference corrections evidence-linked rather than hardcoded.
- [x] Unit-test both branches, convergence, invalid transitions, restore, expiry, clearing, mode-specific retry, corrupt/oversized state, and refresh during a live call.

## Acceptance criteria

- [x] Both modes can reach the same preflight state without duplicated shared-stage logic.
- [x] Conversation-first serialized state cannot contain CV data or CV provenance.
- [x] The persistence function accepts the approved structured projection rather than an unconstrained full runtime object.
- [x] A malformed, expired, future-version, or oversized session clears safely with understandable state.
- [x] Server rendering/module import works with no browser globals, and client restore does not produce a hydration mismatch.
- [x] Refresh during an active call never auto-reconnects the microphone and preserves only usable local evidence.
- [x] Clear session removes every ScreenPilot session key and returns to the landing state.

## Focused verification

- [x] Run reducer and serialization unit tests.
- [x] Inspect `sessionStorage` for representative preparation, active-call, interrupted, review, and cleared states across both modes.
- [x] Attempt to serialize forbidden fields and confirm schema/type rejection.
- [x] Run a server-side import/render check with `window` and storage unavailable.
- [x] Exercise hydration/restore, Strict Mode replay, interrupted CV processing, live-call interruption, post-call summary recovery, cross-mode restore rejection, two-hour open-tab expiry, corrupt JSON, future timestamps, and Clear session through browser-like and in-memory test harnesses.

## Implemented result

- `packages/contracts` now exposes only explicit browser-safe API and interview subpaths for bootstrap, CV analysis, deterministic preparation, private voice authorization, summary, employer/vacancy context, plans, transcripts, insights, topic progress, and summaries.
- One frontend reducer owns both preparation branches. CV-assisted reaches plan preview before preflight; conversation-first skips CV state and converges directly on the same preflight, interview, interruption, summary, review, and clear sequence.
- Candidate-confirmed preferred names, role preferences, and insight cards must reference real final candidate turns. CV-derived cards require IDs that exist in the normalized CV, and conversation-first rejects every CV-bearing state or provenance path before invalid evidence can enter reducer state.
- The persisted v1 envelope is built field-by-field from an allow-list, capped at 512 KiB, limited to two hours, restricted to final transcript evidence, and validated again on save and restore. It requires exactly one Frontend and one Backend vacancy plus a coherent entry-mode, stage, plan, grant, and CV combination. Runtime `File`, raw CV text, challenge tokens, voice tokens, audio, provider objects, failures, and debug payloads are outside that envelope.
- Storage access is injectable and delayed until a client effect. Server rendering does not read browser globals; React Strict Mode cannot hydrate twice; and an open tab expires on time. Refresh during extraction/analysis returns to CV selection, live voice interruption preserves usable local evidence without reconnecting, and interrupted post-call summarization stays an honest retryable summary failure.
- Clear session removes every namespaced ScreenPilot key while leaving unrelated tab data untouched. Corrupt, oversized, expired, future-dated, and unsupported-version payloads clear safely with an explicit restore notice.

## Verification evidence

- Passed contracts and frontend TypeScript checks and focused ESLint with zero warnings using the repository-pinned Node runtime.
- Passed 42 focused Vitest cases across 8 contract/frontend files, covering both reducer branches, convergence, cross-mode and impossible-stage restore rejection, candidate/CV evidence integrity, duplicate-catalogue rejection, retry, serialization allow-listing, size/version/time validation, CV-processing recovery, active-call interruption, summary recovery, server rendering, client hydration, Strict Mode, open-tab expiry, and namespaced clearing.
- Passed the contracts package build and frontend Next.js production build after the contract export and dependency changes.
- Searched the changed state/persistence boundary for forbidden persistence fields, browser-global access outside the client adapter/provider, catch-all contract exports, stale TODO/debug output, and local/server persistence alternatives; no violations remain.

## Deliberate implementation notes

- The frontend declares Zod directly because its frontend-only persisted-session envelope performs runtime validation; it does not reach through the contracts package for an undeclared transitive dependency.
- No screen or provider integration is part of SP-006, so the manual state matrix is exercised through deterministic reducer, in-memory storage, server-render, and jsdom lifecycle harnesses. Visual/device QA begins when later tickets render these states.
- No live OpenAI, ElevenLabs, or Cloudflare credentials or paid calls are needed for this ticket.

## Commit boundary

Keep SP-006 reviewable as one logical change represented by `feat(frontend): add disposable demo session state`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Browser session contract](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#45-browser-session-contract)
- [Filename-level scaffold and target repository](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#filename-level-filesystem-blueprint)
- [Browser state machines](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#6-browser-state-machines)
- [Stateless data handling definition of done](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#stateless-data-handling)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
