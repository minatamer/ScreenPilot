# SP-006 — Define browser-session contracts and reducer

Status: Required  
Milestone: Milestone 1 — interview preparation paths  
Last synchronized: 2026-08-31  
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

- [ ] Define cross-boundary entry mode, normalized CV, screening plan, interview grant, transcript turn, insight card, topic progress, voice metadata, and summary schemas in `packages/contracts`.
- [ ] Add only the explicit contract subpath exports named in the filename blueprint; do not restore a catch-all root `src/index.ts`.
- [ ] Define frontend-only demo stages, reducer state/events, runtime-only state, and the versioned persistence envelope under `apps/frontend/src/features/session`.
- [ ] Implement branch-specific preparation transitions and a single shared preflight/interview/review sequence.
- [ ] Make `entryMode` immutable after preflight starts and reject invalid cross-mode transitions.
- [ ] Add a versioned `sessionStorage` adapter with two-hour expiry, parse/size validation, migration-or-clear behavior, namespaced keys, and an explicit allow-list projection from runtime state.
- [ ] Make storage access injectable and hydration-safe; importing or server-rendering the feature cannot touch `window` or `sessionStorage`.
- [ ] Exclude all forbidden binary, raw-text, secret, audio, and provider-token fields from serializable schemas.
- [ ] Implement Clear session, start-over, corrupt-state recovery, and refresh-during-call interruption behavior.
- [ ] Keep preferred-name and role-preference corrections evidence-linked rather than hardcoded.
- [ ] Unit-test both branches, convergence, invalid transitions, restore, expiry, clearing, mode-specific retry, corrupt/oversized state, and refresh during a live call.

## Acceptance criteria

- [ ] Both modes can reach the same preflight state without duplicated shared-stage logic.
- [ ] Conversation-first serialized state cannot contain CV data or CV provenance.
- [ ] The persistence function accepts the approved structured projection rather than an unconstrained full runtime object.
- [ ] A malformed, expired, future-version, or oversized session clears safely with understandable state.
- [ ] Server rendering/module import works with no browser globals, and client restore does not produce a hydration mismatch.
- [ ] Refresh during an active call never auto-reconnects the microphone and preserves only usable local evidence.
- [ ] Clear session removes every ScreenPilot session key and returns to the landing state.

## Focused verification

- [ ] Run reducer and serialization unit tests.
- [ ] Inspect `sessionStorage` for each representative stage in both modes.
- [ ] Attempt to serialize forbidden fields and confirm schema/type rejection.
- [ ] Run a server-side import/render check with `window` and storage unavailable.
- [ ] Manually test hydration/restore, refresh, two-hour expiry simulation, corrupt JSON, and Clear session.

## Commit boundary

Keep SP-006 reviewable as one logical change represented by `feat(frontend): add disposable demo session state`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Browser session contract](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#45-browser-session-contract)
- [Filename-level scaffold and target repository](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#filename-level-filesystem-blueprint)
- [Browser state machines](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#6-browser-state-machines)
- [Stateless data handling definition of done](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#stateless-data-handling)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
