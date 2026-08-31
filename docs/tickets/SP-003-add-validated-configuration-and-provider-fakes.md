# SP-003 — Add validated configuration and provider fakes

Status: Required  
Milestone: Milestone 0 — repository and visual foundations  
Last synchronized: 2026-08-31  
Depends on: SP-001  
Suggested commit: `feat(config): validate stateless provider configuration`  
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Establish typed server/public configuration and deterministic provider seams so local development and tests fail safely without paid calls or leaked secrets.

## Standalone implementation context

- Browser-visible configuration and backend-only secrets must be represented by different schemas and modules.
- Locked AI/voice choices are OpenAI GPT-5.4 mini with reasoning `none`, ElevenLabs ElevenAgents, Scribe v2 Realtime, and Flash v2.5.
- Turnstile Free uses a public site key and server-only Siteverify secret. Expected actions are `cv_analyze`, `voice_token`, and `interview_summary`.
- Turnstile is $0 and independent of domain registrar, DNS provider, and Cloudflare proxying.
- Provider adapters must be replaceable by deterministic fakes so default development/CI never contacts paid services.
- Backend environment parsing belongs in `apps/backend/src/config`; feature/use-case modules receive typed configuration and adapters from composition instead of reading global environment state.
- Browser-visible values come from the validated public bootstrap contract. The frontend may have server-runtime settings for local `/v1` proxying, but provider secrets and environment-specific API base URLs never enter feature code or the browser bundle.

## Manual credential gate

- Commit `apps/frontend/.env.example` with only `BACKEND_ORIGIN=http://127.0.0.1:3001`.
- Commit `apps/backend/.env.example` with safe fake/local defaults and exactly blank user-owned fields: `OPENAI_API_KEY=`, `ELEVENLABS_API_KEY=`, `ELEVENLABS_AGENT_ID=`, `ELEVENLABS_VOICE_ID=`, `TURNSTILE_SITE_KEY=`, `TURNSTILE_SECRET_KEY=`, `TURNSTILE_ALLOWED_HOSTNAMES=`, `INTERVIEW_GRANT_SIGNING_SECRET=`, and `ANONYMOUS_COOKIE_SECRET=`. Do not use sample-looking secret values or `your-key-here` placeholders.
- The user may copy the examples to ignored `apps/*/.env.local` files and fill them manually later. Do not read keys from the machine, a browser session, a dashboard, or another repository.
- `PROVIDER_MODE=fake` plus `PAID_DEMO_ENABLED=false` is the safe local default. In fake/test mode blank provider groups are valid and network access is impossible; live/production requires the complete relevant group and fails closed without printing values.
- Acquisition and production-storage instructions are centralized in the parent plan's [credential guide](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup). OpenAI comes from its API dashboard, ElevenLabs from **Developers → API Keys** plus the agent dashboard, Turnstile from **Turnstile → Add widget**, and signing/cookie secrets are generated locally as two different values.
- Before any real value is entered, run `git check-ignore -v -- apps/backend/.env.local apps/frontend/.env.local` and confirm both paths are ignored. Code/fake tests may finish while fields are blank; every live check remains explicitly blocked until the user supplies credentials and authorizes paid testing.

## Scope boundaries

- Do not implement actual CV, voice, summary, or Siteverify route behavior here.
- Never expose OpenAI, ElevenLabs, signing, cookie, or Turnstile secret values through frontend bundles or bootstrap output.
- Do not silently fall back to live providers when a fake is missing.
- Do not add multiple competing environment libraries or let feature code read `process.env` directly.
- Do not add one ambiguous root `.env.example`, duplicate a public value in several environment namespaces, or make module import trigger validation/network activity before the application composition boundary asks for it.

## Implementation checklist

- [ ] Create one validated backend configuration boundary under `apps/backend/src/config` and the explicitly browser-safe `packages/contracts/src/api/public-runtime-config.ts` subpath export.
- [ ] Add OpenAI, ElevenLabs, Turnstile site-key/secret/hostname/actions, origins, size/time/rate limits, and paid-demo feature flags.
- [ ] Lock provider model, agent, STT, TTS, and voice identifiers in typed configuration.
- [ ] Define the filename-level `use-cases/ports` interfaces independent of Express and provider SDK payloads, then inject fake/live implementations through the backend composition root.
- [ ] Add deterministic fake OpenAI, ElevenLabs, and Turnstile Siteverify adapters.
- [ ] Remove the temporary contracts `src/index.ts`; expose only declared browser-safe contract subpaths and keep internal package files private.
- [ ] Support Cloudflare's published non-production Turnstile test keys without permitting a production bypass.
- [ ] Add the two application-scoped `.env.example` files with the exact blank credential fields and fake defaults from the manual gate; never add a usable or plausible credential.
- [ ] Keep browser HTTP calls relative to `/v1`; configure the local frontend rewrite/proxy at its server boundary rather than exposing a public API-base variable to features.
- [ ] Fail startup/readiness clearly for missing or invalid required configuration while allowing an explicitly fake local/test mode.
- [ ] Test secret/public separation and invalid enum, URL, numeric-bound, hostname, and action values.

## Acceptance criteria

- [ ] Frontend code can import only an allow-listed public configuration shape.
- [ ] Feature and use-case modules can be tested with explicit config/adapter inputs without mutating `process.env` or relying on module-cache resets.
- [ ] Backend startup fails with a safe field-level configuration error and never prints secret values.
- [ ] Fake mode is explicit, deterministic, and cannot accidentally call a live provider.
- [ ] Production mode rejects test/bypass configuration.
- [ ] No candidate content or runtime token is represented as static configuration.

## Focused verification

- [ ] Run configuration unit tests for valid local, test, and production examples.
- [ ] Run missing/invalid-secret and malformed-limit cases.
- [ ] Build the frontend and search its output for server-only variable names and sample secret values.
- [ ] Search source for direct `process.env`/environment-reader usage outside approved configuration and framework-config boundaries.
- [ ] Exercise each fake adapter once and confirm stable, content-safe fixtures.
- [ ] Verify both `.env.local` paths are ignored, both blank `.env.example` files remain trackable, and no secret-like value appears in the staged diff or frontend build.

## Commit boundary

Keep SP-003 reviewable as one logical change represented by `feat(config): validate stateless provider configuration`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Locked product decisions](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#1-locked-product-decisions)
- [REST API specification](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#12-rest-api-specification)
- [Provider division, costs, and data settings](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#13-elevenlabs--openai-research-and-cost-plan)
- [Filename-level scaffold and target repository](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#filename-level-filesystem-blueprint)
- [Credential acquisition, blank templates, and ignore rules](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)
- [Security and abuse controls](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#16-security-privacy-and-public-demo-controls)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
