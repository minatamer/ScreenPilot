# SP-026 — Deploy frontend and backend

Status: Required release boundary  
Milestone: Milestone 5 — deploy  
Last synchronized: 2026-09-25<br>
Depends on: SP-022, SP-023, SP-025A<br>
Suggested commit: `SP-026: publish the stateless ScreenPilot demo`<br>
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Deploy the exact SP-025A-audited candidate from the owner's laptop as two
independently versioned Cloud Run services. Build SHA-tagged frontend/backend
images locally, push them to Artifact Registry, connect backend runtime secrets
through Secret Manager, and deploy both services manually with Google Cloud
CLI.

The first concrete checkpoint is **deployed**: the frontend `run.app` URL loads,
the backend is healthy, and relative frontend `/v1/**` requests reach the
backend. Only after that checkpoint does the owner test the deployed website and
close release acceptance. GitHub deployment automation, a purchased domain, and
any production-grade load-balancing layer are later decisions and cannot block
this ticket's initial deployment.

The frontend Cloud Run service is the only visitor-facing origin. Its Next.js
server forwards relative `/v1/**` requests to the backend Cloud Run service by
using the server-only `BACKEND_ORIGIN`; the backend URL never enters browser API
configuration. This preserves same-origin browser calls and first-party cookie
behavior without an additional hosting or load-balancing product.

Production is live-only: `APP_ENV=production` requires `PROVIDER_MODE=live`.
The paid-demo switch chooses between both real provider flows being available
and both entry flows being closed; it never exposes deterministic fake behavior
to a deployed visitor. With `PAID_DEMO_ENABLED=false`, the landing page and
`/demo` mode chooser must visibly disable both CV-assisted and conversation-first
buttons before navigation or `POST /v1/interview/prepare`.

## Standalone implementation context

- SP-026 does **not** add deployment jobs to GitHub Actions. The existing
  `.github/workflows/ci.yml` remains an unpaid `quality` workflow only.
- The owner authenticates the local Google Cloud CLI with their user account.
  Do not create a service-account JSON key, Workload Identity Federation pool,
  GitHub deployment environment, or GitHub deployment secret.
- Add separate deterministic multi-stage images for `screenpilot-frontend` and
  `screenpilot-backend`, tag each final image with the exact Git SHA, and store
  only deployment images in Artifact Registry.
- Deploy both services with request-based billing in one latency-tested region.
  The planning default remains `europe-west1` until measurement selects another
  region.
- The frontend service is public. The backend remains separately addressable for
  health/rollback diagnostics and is reachable by the frontend server; paid
  endpoints remain protected by Turnstile, application limits, and the paid-demo
  switch.
- Browser code continues to call only relative `/v1` paths. The frontend server
  owns the production proxy to `BACKEND_ORIGIN`. ElevenLabs WebRTC remains a
  direct browser/provider connection.
- The first public release uses the stable frontend `run.app` HTTPS URL. A
  purchased custom domain is deliberately deferred until the deployed demo has
  passed. It is not required to close SP-026.
- A later custom-domain step may map only the frontend service through Cloud Run
  domain mapping when the selected region supports it. Google labels direct
  Cloud Run domain mapping Preview/limited availability and does not recommend
  it for production; accepting that limitation is a portfolio-demo simplicity
  tradeoff, not a production architecture claim.
- No paid external load balancer, CDN/proxy, third hosting product, Terraform,
  Kubernetes, or deployment controller is introduced.
- SP-026 is the release boundary. SP-027 portfolio packaging and SP-028 extended
  automation are optional.
- SP-025 deliberately performs no additional paid local flow. After the exact
  SP-025A-audited deployment is reachable, SP-026 owns exactly two controlled
  paid production flows unless a concrete defect narrowly requires a documented
  rerun.
- The production pair is (1) CV-assisted using an owner-selected wholly
  synthetic text PDF or explicitly licensed public-template text PDF with no
  real person's data, materially different from the bundled sample, and (2)
  conversation-first. Do not use a random real person's Internet CV or add a
  third bundled-sample flow.
- SP-025A is the final pre-deployment code/ticket audit. Its ledger and complete
  deterministic gate must identify the exact candidate entering this ticket.
  Do not deploy a materially changed candidate without re-running the affected
  SP-025A audit and verification.
- At low traffic, the two scale-to-zero services, five active secret versions,
  and small image repository may remain inside Google Cloud free quotas. Billing
  must still be enabled, and Artifact Registry storage is a standing cost rather
  than a per-flow AI charge.
- SP-022 defines the initial Cloud Run ceilings: backend minimum instances `0`,
  maximum instances `1`, concurrency `4`; frontend minimum instances `0`,
  maximum instances `1`, concurrency `80`. Any change requires a documented
  budget review rather than relying on free-tier credits.
- Before the first image push or service deployment, follow
  `docs/operations/google-cloud-cost-controls.md`: create a native monthly
  **USD 5 Cloud Run spend-cap budget** when the Preview feature is available,
  plus a monthly **USD 10 project-wide alert-only budget**. The alert budget uses
  actual thresholds at 25%, 50%, 75%, 90%, and 100% plus forecast thresholds at
  50% and 100%. Record the exact eligibility blocker when the native cap is
  unavailable; never describe the alert-only budget as a hard cap.
- Google Cloud budgets do not cover OpenAI or ElevenLabs. Retain their separate
  limits, Turnstile, backend admission controls, and the paid-demo kill switch.

## Locked sequence and checkpoints

SP-026 proceeds in this order:

1. **Prepare the deployable candidate.** Add and verify the two container
   definitions, the frontend server-only `/v1` proxy, and the safe build context.
2. **Apply the cost guardrails.** Link billing, configure the Cloud Run spend
   cap when available, configure the project alerts, and retain minimum `0` plus
   maximum `1` instance settings. These are safety prerequisites, not a third
   application service.
3. **Create the minimal Google Cloud foundation.** Enable Cloud Run, Artifact
   Registry, and Secret Manager; create one image repository, two runtime
   service accounts, and the five backend-only secrets.
4. **Deploy exactly two application services.** Deploy a paid-disabled frontend
   bootstrap revision from the exact-SHA frontend image to obtain its stable
   hostname, configure Turnstile for that hostname, deploy the backend, then
   configure and redeploy the same frontend image with the backend origin. The
   bootstrap revision is an earlier revision of the same frontend service, not
   a third service or image.
5. **Declare the technical deployment checkpoint.** Both health endpoints pass,
   the frontend loads at its managed HTTPS `run.app` URL, and frontend-origin
   `/v1` calls reach the backend without exposing the backend URL to browser
   code. At this point the application is deployed.
6. **Test on the deployed website.** Run unpaid routing/security checks first,
   then the exact two owner-controlled paid flows. Fix and redeploy only concrete
   defects, then close release acceptance and restore the paid-demo switch.

Do not interleave a GitHub deployment workflow, domain purchase, custom-domain
routing, or load balancer with steps 1–6. Those decisions come after the
`run.app` deployment has proven the application works.

## Later decisions that do not block deployment

| Item | Status for this demo | Revisit only when |
| --- | --- | --- |
| GitHub deployment CI | **Deferred; unnecessary now.** Keep GitHub Actions quality-only and deploy from the owner's laptop. | Manual releases become frequent, error-prone, or are performed by more than one person. |
| Purchased domain | **Optional later.** The frontend `run.app` URL is already a deployed HTTPS website. | The deployed application has passed and the owner wants a portfolio-friendly hostname. |
| Direct Cloud Run custom-domain mapping | **Optional later.** Map only the frontend and retain its `/v1` proxy. | The owner accepts Google's Preview/latency limitations for this low-traffic portfolio demo. |
| Global external Application Load Balancer | **Unnecessary for the expected 1–3 visitors per week.** | Production-grade domain routing, advanced TLS policy, Cloud CDN/Armor, or path routing outside the frontend becomes a real requirement. |
| Additional hosting layer or CDN/proxy | **Unnecessary.** The frontend Cloud Run service is the public origin. | Measured traffic, latency, or caching requirements justify it. |
| Infrastructure as code | **Deferred.** Manual `gcloud` plus the runbook is sufficient. | The infrastructure grows, must be recreated regularly, or has multiple operators/environments. |
| Custom billing-shutdown automation | **Unnecessary now.** Use the native Cloud Run spend cap when available, project alerts, service ceilings, and provider caps. | The native controls prove insufficient and a separately reviewed operational design is approved. |
| Database, queue, object storage, or worker | **Out of scope, not a follow-up assumption.** ScreenPilot remains stateless. | A future product requirement explicitly changes the privacy and architecture decision. |
| Portfolio screenshots/video/README package | **Optional SP-027 work.** | The deployed demo is stable and the material will improve client presentation. |

## Google Cloud CLI execution boundary

The detailed Windows installation commands and owner/agent responsibility table
are in `docs/operations/manual-google-cloud-deployment.md`. The locked boundary
is:

- **Codex can perform after approval:** download and launch Google's signed
  Windows CLI installer; run `gcloud init`; create the owner-approved project;
  list and link the owner-approved billing account; create the USD 10 alert-only
  project budget; enable APIs; create Artifact Registry, runtime service
  accounts, IAM bindings, and empty Secret Manager resources; build/push images;
  deploy both Cloud Run services; inspect health/config/logs; and execute an
  approved rollback.
- **Owner must perform:** browser sign-in/MFA/consent; choose the immutable
  project ID and billing account; create/activate the Cloud Billing account,
  accept terms, and manage payment/tax details; enter every secret value directly
  into Secret Manager; configure the current Preview USD 5 Cloud Run spend cap
  in Cloud Console; and approve every charge-enabling link/deployment.
- **Codex must not do silently:** install software, select a billing account,
  link billing, create a project, deploy chargeable resources, lift a spend cap,
  paste/read a secret, or change production traffic without the approval
  required by the runbook.

The current `gcloud billing budgets create` surface can create the alert-only
budget but does not expose the Preview spend-cap-enforcement choice. Do not
misrepresent the CLI-created USD 10 alert budget as a hard cap.

## Manual production credential and identifier gate

- Production deployment begins with blank user-owned values. Do not invent,
  scrape, print, or auto-fill them.
- Google Secret Manager receives `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`,
  `TURNSTILE_SECRET_KEY`, `INTERVIEW_GRANT_SIGNING_SECRET`, and
  `ANONYMOUS_COOKIE_SECRET`; only the backend runtime identity may access them.
- Ordinary Cloud Run configuration receives the non-secret
  `ELEVENLABS_AGENT_ID`, `ELEVENLABS_VOICE_ID`, `TURNSTILE_SITE_KEY`,
  `TURNSTILE_ALLOWED_HOSTNAMES`, `ALLOWED_ORIGINS`, and frontend
  `BACKEND_ORIGIN` values.
- Owner-supplied deployment identifiers are `GCP_PROJECT_ID`, `GCP_REGION`, and
  `ARTIFACT_REGISTRY_REPOSITORY`. They remain local/operator values and are not
  added to GitHub deployment configuration.
- Follow Google's Cloud Run Secret Manager guide to expose runtime secrets. Do
  not create `GOOGLE_APPLICATION_CREDENTIALS`, a service-account JSON key, a
  personal GitHub token, or a registrar credential.
- Create the production Turnstile widget manually after the frontend `run.app`
  hostname is known. Restrict it to that hostname initially; add a purchased
  custom hostname later only if the owner completes the optional domain step.
- Add `.env*`, nested `.env*`, downloaded cloud credentials, and private
  deployment-value files to `.dockerignore`; inspect both image histories and
  verify no secret or candidate content entered a build layer.
- Container configuration may be prepared without values. If any production
  secret, identifier, billing control, or dashboard access is missing, stop
  before the affected deployment/live check and report the exact blocker.
- Before either controlled production flow, verify OpenAI input/output sharing
  is **Disabled** for the ScreenPilot project. Record only the project name,
  disabled state, and date.

## Scope boundaries

- Do not add deployment jobs to `.github/workflows/ci.yml`, a second deployment
  workflow, GitLab CI, Workload Identity Federation, or GitHub deployment
  secrets in this ticket.
- Do not add another hosting/routing layer, a paid external load balancer,
  Cloudflare HTTP proxy, Terraform, Kubernetes, service mesh, multi-region
  failover, database, object storage, queue, or worker.
- Do not purchase a domain from a script or expose registrar/provider secrets to
  image builds.
- Do not use long-lived Google service-account keys. Manual deployment uses the
  owner's short-lived Google Cloud CLI authentication; runtime access uses
  attached service identities.
- Do not add a Pub/Sub billing listener, billing-disable function, or custom
  cost-control service. Native Cloud Run spend-cap enforcement is the only
  automated Google Cloud billing action in scope.
- Do not automate real paid provider flows or add a production Turnstile bypass
  to smoke tests.
- Do not scrape, download, or use a random real person's CV.
- Do not repeat the bundled sample in a third paid flow merely to increase the
  run count. A rerun is allowed only for a named defect that invalidated the
  original result, and the reason plus incurred usage must be recorded.
- Do not expose the backend service URL, candidate content, secrets, or raw
  secret-bearing commands in visitor UI, metadata, images, logs, or public
  documentation.
- Do not waive an unresolved SP-025A blocker or candidate-identity mismatch.

## Implementation checklist

### Phase 1 — prepare the two deployable images

- [x] Confirm the current Git/worktree candidate exactly matches the SP-025A
  audit ledger and final-gate evidence before authentication, build/push, or
  deployment.
- [x] Keep `.github/workflows/ci.yml` quality-only; record that deployment is an
  owner-run manual operation from the audited local checkout.
- [x] Add deterministic multi-stage frontend/backend container definitions,
  non-root minimal runtimes, and a safe `.dockerignore`.
- [x] Add and test the frontend-owned production `/v1/**` proxy to the validated
  server-only `BACKEND_ORIGIN`; preserve request cancellation, bounded bodies,
  response/status headers, `Set-Cookie`, and no-store behavior without logging
  candidate content.
- [x] Keep deterministic fake mode local/test-only and make the production
  paid-demo kill switch disable both entry-mode controls before either flow can
  navigate or issue a preparation/provider request.

### Phase 2 — create the minimum Google Cloud foundation

- [x] Check for Google Cloud CLI on the owner's Windows PC. If it is absent,
  obtain approval, install the signed Google installer with bundled Python/PATH
  support, open a fresh shell, verify `gcloud --version`, and let the owner
  complete browser sign-in/MFA through `gcloud init`.
- [x] After the owner approves the immutable project ID and exact billing
  account, use `gcloud` to create/select the dedicated project, link billing,
  verify the active account/project/billing state, and stop on any mismatch.
- [x] Enable only the required APIs, create/select the Artifact Registry
  repository, and configure the regional Docker credential helper.
- [ ] Configure and verify the USD 5 monthly Cloud Run spend cap when available,
  the USD 10 whole-project alert budget with the required thresholds, and all
  fallback controls before the first image push or service deployment.
- [x] Create a least-privilege backend runtime service account with access only
  to the five required Secret Manager secrets; give the frontend runtime no
  provider-secret access.

### Phase 3 — deploy exactly two Cloud Run services

- [x] Build and push exactly one exact-SHA frontend image and one exact-SHA
  backend image locally; never use a mutable `latest` release tag.
- [x] Deploy the frontend bootstrap revision only as needed to learn its stable
  `run.app` hostname, then create/restrict Turnstile, deploy the configured
  backend, set runtime-only `BACKEND_ORIGIN` on the same frontend image, and
  deploy final frontend/backend revisions that both identify the audited Git
  SHA.
- [x] Configure health checks, graceful startup, origins, headers, runtime
  secrets, request-based billing, min/max instances, concurrency, paid-demo
  switch, and revision labels.
- [x] Keep Cloud Run minimum instances at zero and retain max-instance/provider
  caps independently of free quotas or expired trial credit.

### Phase 4 — record the deployed checkpoint

- [x] Run direct backend liveness/readiness checks plus unpaid frontend-origin
  routing, refresh, `/v1`, cookie, public Turnstile configuration, security
  header, and canonical-metadata smokes through the frontend `run.app` URL.
- [x] Verify `?diagnostics=timings` exposes no diagnostics drawer, raw timing
  view, **Copy JSON**, or **Reset** controls on either deployed service URL.
- [x] Record that the application is technically deployed only when the final
  frontend and backend revisions identify the audited SHA, the frontend
  `run.app` URL loads, and same-origin `/v1` requests reach the backend. Domain
  purchase and deployment CI are not part of this checkpoint.

### Phase 5 — test the deployed website and close release acceptance

Post-checkpoint defect correction required before paid testing:

- [ ] Commit and re-audit the entry-mode kill-switch correction, then build,
  push, and deploy new exact-SHA frontend and backend images without changing
  the secrets, provider identifiers, or two-service architecture.
- [ ] Repeat the unpaid frontend smokes and verify a production
  `paid_disabled` bootstrap renders both landing and `/demo` choices disabled,
  issues no conversation-preparation request, and exposes no fake flow.

- [ ] Manually run exactly two controlled production flows after every unpaid
  smoke passes: one owner-selected synthetic/licensed materially different
  CV-assisted flow and one conversation-first flow.
- [ ] In both production flows verify Turnstile hostname/action, the current
  ElevenLabs revision and five client tools plus sole `end_call` system tool,
  captions/insights, corrected question flow, automatic ending, completed
  workspace, one summary/review, Clear-session cleanup, and no reconnect or
  duplicate paid operation.
- [ ] Review provider dashboards after the bounded pair; append connected
  duration, direct OpenAI usage, ElevenLabs minute/live-LLM cost, allowances,
  retention/audio state, and infrastructure overage to
  `docs/operations/full-flow-cost-baseline.md`, then restore the paid-demo kill
  switch and provider safety controls.
- [ ] Confirm no database, object storage, queue, worker, hosting layer, or
  candidate artifact deployment exists.
- [ ] Document manual Cloud Run revision rollback and prove final revisions and
  images identify the Git SHA.
- [ ] Reconcile Cloud Run, Secret Manager, Artifact Registry, Logging, and
  network usage against current free quotas; retain the required rollback image,
  prune older images, and destroy superseded secret versions only after the safe
  rollback/rotation window because disabled versions remain billable as active.

## Acceptance criteria

### Technical deployment checkpoint

- [ ] The deployed source exactly matches the candidate closed by SP-025A; any
  material post-audit change was re-audited before deployment.
- [x] The owner can reproduce the deployment from the documented local checkout
  without GitHub deployment automation or a long-lived cloud key.
- [x] Exact-SHA frontend/backend images produce independently restartable Cloud
  Run revisions, and rollback targets remain identifiable.
- [x] The frontend `run.app` HTTPS URL serves application routes and same-origin
  `/v1` calls; browser code receives no backend base URL.
- [ ] First-party safety cookies, refresh routing, CSP/CORS/origin, Turnstile
  hostname/actions, and the frontend proxy work through the public frontend
  origin.
- [x] No backend `run.app` URL appears in visitor UI, metadata, copied summaries,
  or portfolio links.
- [x] Local timing diagnostics remain unavailable on all deployed hostnames.
- [ ] With the production kill switch off, both landing and `/demo` entry
  choices are visibly disabled and neither path starts preparation, Turnstile,
  microphone, provider SDK, or WebRTC work.
- [x] Secrets are absent from images, build arguments, local deployment logs,
  and browser responses; only the backend runtime receives the five secrets.
- [x] The USD 5 Cloud Run spend-cap budget is configured when eligible or its
  exact Preview blocker is recorded; the USD 10 project alert budget and every
  fallback ceiling are configured without representing alerts as enforcement.
- [x] Domain registration is optional after the deployment passes. No domain,
  hosting, CDN, proxy, or paid load-balancer purchase is required to close this
  ticket.

### Release acceptance after deployed testing

- [ ] Exactly one CV-assisted and one conversation-first controlled production
  flow pass on the deployed audited SHA unless a named defect required a narrow
  documented rerun.
- [ ] Production Turnstile, sharing-off, provider revision/tools and caps,
  automatic ending, summary/review, cleanup, dashboard usage/cost, and restored
  kill switches are evidenced before public release.
- [ ] The preliminary cost baseline is finalized with both production records,
  measured-versus-estimated variance, allowances, and infrastructure overage
  without candidate, account, or secret content.

## Focused verification

- [x] Validate both container builds locally and inspect their histories/layers
  for secrets and candidate content.
- [x] Review the local deployer's effective IAM roles and both runtime service
  identities; confirm no user-managed service-account key exists.
- [x] Review both Google Cloud budget scopes, amounts, statuses, thresholds, and
  recipients without intentionally creating spend.
- [x] Run direct backend `/health/live` and `/health/ready`, then unpaid routing
  and security smokes through the frontend origin.
- [x] Exercise frontend refresh and every relative `/v1` route; verify proxy
  status/body/header/cookie behavior and backend-origin non-disclosure.
- [x] Confirm deployed hostnames cannot expose the local timing diagnostics UI.
- [ ] Manually complete the exact two-flow production set with controlled usage
  and inspect Turnstile/provider/Cloud Run results.
- [ ] Exercise/document one rollback and confirm Git SHA labels.
- [ ] Audit deployed logs, Artifact Registry, Secret Manager bindings, and cloud
  resources for forbidden persistence or secret exposure.
- [ ] Review OpenAI, ElevenLabs, and Cloud Billing after the controlled pair;
  finalize the cost baseline and restore paid/live kill switches.

## Commit boundary

Keep SP-026 reviewable as one logical change represented by
`SP-026: publish the stateless ScreenPilot demo`. Do not absorb optional domain
attachment or portfolio packaging. Do not create a commit unless the user asks
or the active workflow already authorizes it.

## Phase 1 implementation evidence — 2026-09-25

- The Git-visible application source at starting `HEAD` `8125057`
  (`SP-025A: audit release candidate`) matched the audited SP-025A commit before
  Phase 1 implementation. The existing worktree changes were deployment
  planning/documentation only; no application source was already modified.
- `.github/workflows/ci.yml` remains quality-only. No deployment workflow,
  GitHub secret, service-account key, workload-identity binding, image push, or
  Google Cloud mutation was added or performed.
- Local preflight images were built as `screenpilot-backend:sp026-preflight`
  (image ID
  `sha256:f345a5afd82d76ade80498e5669ac0d77e3498987307c302c24f5c70227ab8dc`,
  82,858,370 bytes) and `screenpilot-frontend:sp026-preflight` (image ID
  `sha256:48d9e2d52a298c4acbe919add7370fc25a6e5d7a55e8887f28470e97ebeba243`,
  98,086,329 bytes). Both run as the unprivileged `node` user.
- Image filesystem inspection found zero `.env*` files. Image configuration and
  history inspection found no OpenAI, ElevenLabs, Turnstile, cookie/signing, or
  Google service-account credential material.
- A clean 352-file Git-visible snapshot contained zero local environment files,
  built contracts, backend, and the frontend production standalone server, and
  emitted `/v1/[...path]`. The built browser assets contained zero backend-origin
  references.
- The production proxy's four focused tests passed. Frontend route type
  generation and TypeScript checks, changed-file lint, contracts/backend builds,
  frontend Webpack production build, tracked-secret scan, inline-style scan, and
  `git diff --check` passed.
- An isolated two-container smoke passed backend readiness, frontend page load,
  proxied bootstrap GET, and proxied interview-preparation POST, including
  same-origin routing, cookies, request IDs, and no-store behavior. It used fake
  providers with paid demo disabled and made no provider calls.
- The focused post-SP-025A re-audit found no deployment-code blocker. It
  rechecked the new proxy boundary, standalone build, non-root runtime images,
  bounded request/cancellation behavior, same-origin cookies, secret exclusion,
  browser-bundle origin exclusion, and the targeted regression/build evidence.
- Google Cloud SDK `586.0.0` is installed. The owner's existing credential is
  active, while the project remains deliberately unset; no project, billing
  link, API, registry, identity, secret, image push, or Cloud Run resource was
  created.
- These are deliberately local `sp026-preflight` images, not immutable release
  artifacts. They were superseded by the committed exact-SHA images recorded in
  Phase 2; no Phase 1 image was pushed or deployed.

## Phase 2 implementation evidence — 2026-09-25

- The owner committed the reviewed deployment preparation as exact Git SHA
  `606638735bf2d6bfc1d9171738669e8fec111ac9`. Clean-checkout frontend and backend
  images tagged with that full SHA passed an isolated two-container readiness,
  page, and same-origin proxy smoke.
- The owner-selected dedicated project and open billing account were verified
  before the explicitly approved billing link. The active account, project,
  billing-enabled state, and `europe-west1` region were rechecked without
  recording private account identifiers in the repository.
- The monthly USD 10 project-wide alerts-only budget was verified at actual
  thresholds 25%, 50%, 75%, 90%, and 100% plus forecast thresholds 50% and
  100%. The Preview spend-cap choice was unavailable in the current console;
  the sanitized blocker and the Cloud Run-only USD 5 alerts fallback are
  recorded in the cost-control runbook without claiming hard-cap enforcement.
- Only the Cloud Run, Artifact Registry, Secret Manager, IAM, and Billing
  Budgets APIs required by this phase are enabled intentionally. The regional
  `screenpilot` Docker repository exists and contains zero images; the regional
  Docker credential helper is configured.
- Separate backend and frontend runtime service accounts exist with zero
  user-managed keys and no project-wide runtime roles. The five required Secret
  Manager resources exist with zero versions. Each secret grants accessor only
  to the backend runtime identity; the frontend identity has no secret access.
- No image was pushed and no Cloud Run service, secret value/version, provider
  call, candidate artifact, database, storage bucket, queue, worker, load
  balancer, domain, or deployment automation was created.

## Phase 3 implementation evidence — 2026-09-25

- The exact-SHA frontend image for commit
  `606638735bf2d6bfc1d9171738669e8fec111ac9` was pushed to the regional
  `screenpilot` repository. Artifact Registry reported manifest-list digest
  `sha256:cd5be81a765f9f9d77d4028c3c79cf0166040094d72f01d2d9c5c2af4e6d1d9f`.
- The already-verified exact-SHA backend image for the same commit was tagged
  for the regional repository and pushed without rebuilding or creating a
  mutable tag. Artifact Registry resolves the Git-SHA tag to digest
  `sha256:32a5049fc7d09c15b0217dbeb00ea88dcd389aaf82b41ebffb37b2d1ef8f1247`.
- Backend revision `screenpilot-backend-sp026-606638735bf2` is serving 100% of
  backend traffic. Cloud Run resolved the exact OCI index above to its verified
  Linux/amd64 child digest
  `sha256:0b7fb910703c5780c57d3dc963ac937d015e706b627114badc877def016c81a7`.
  The revision carries the full audited Git-SHA label, uses the dedicated
  backend runtime identity, one CPU, 512 MiB memory, request-throttled CPU,
  minimum zero, maximum one instance, and concurrency four.
- The backend has explicit startup/liveness checks on `/health/live` and a
  readiness check on `/health/ready`; both public unpaid checks returned `200`.
  Its five Secret Manager bindings are pinned to version `1`, all committed
  timeout/capacity/rate guardrails are explicit, and
  `PAID_DEMO_ENABLED=false`. Verification inspected resource metadata and
  secret references only, never secret payloads.
- The paid-disabled frontend bootstrap revision
  `screenpilot-frontend-bootstrap-606638735bf2` is serving 100% of the frontend
  service traffic at its managed HTTPS origin. It uses the frontend runtime
  identity, one CPU, 512 MiB memory, request-throttled CPU, minimum zero,
  maximum one instance, concurrency 80, and no provider-secret binding.
- Unpaid public checks returned `200` for `/` and `/demo`. The server-owned
  `/v1/demo/bootstrap` route returned the expected content-free `503` while no
  backend origin is configured. Required security headers were present; the
  rendered HTML exposed no backend reference, and the production diagnostics
  query exposed none of the forbidden controls.
- The owner confirmed that the existing dedicated production Turnstile widget
  is now restricted to the stable frontend `run.app` hostname. Each of the five
  Secret Manager resources has exactly one enabled version; verification read
  only version numbers and states, never secret payloads. The backend is now
  deployed and healthy; the final frontend wiring and traffic evidence follows
  in the technical deployment checkpoint.

## Phase 4 technical deployment checkpoint evidence — 2026-09-25

- Final frontend revision `screenpilot-frontend-sp026-606638735bf2` is serving
  100% of frontend traffic from the already-pushed exact-SHA image. Cloud Run
  resolved that image to its verified Linux/amd64 child digest
  `sha256:1f1ccdc6e76b1db4c668fb2cd2c3075ef4a031ef3f329d2977527aaa97d384d0`.
  The revision has the full audited Git-SHA label, uses the frontend runtime
  identity, one CPU, 512 MiB memory, request-throttled CPU, minimum zero,
  maximum one instance, and concurrency 80.
- The frontend has exactly one runtime variable: server-only `BACKEND_ORIGIN`,
  matching the backend service's canonical managed origin. It has no Secret
  Manager binding. The backend origin and hostname were absent from rendered
  page, bootstrap, preparation, and paid-disabled error responses.
- Direct backend `/health/live` and `/health/ready` returned `200`. The frontend
  landing and demo routes returned `200` across repeated refresh requests, and
  same-origin bootstrap and deterministic conversation preparation returned
  `200` through the frontend proxy.
- Every remaining relative API route was exercised with bounded synthetic
  input while the paid-demo switch remained off. CV analysis and summary
  returned the expected `503/CAPACITY_REACHED`; voice-token issuance returned
  `503/VOICE_DISABLED`. The kill switch rejected all three before Turnstile or
  provider invocation.
- The frontend proxy preserved no-store behavior, request IDs, and the
  `Secure`, `HttpOnly`, `SameSite=Lax` first-party anonymous cookie. Required
  CSP, HSTS, MIME-sniffing, and referrer-policy headers were present. Both
  deployed hostnames exposed none of the local timing diagnostics controls.
- The paid-disabled bootstrap correctly reported live provider configuration
  with effective mode `paid_disabled`, paid operations false, and a blank
  public Turnstile site key. The production site key and allowed frontend
  hostname are configured backend-side; actual Turnstile action verification
  remains part of the two owner-controlled paid flows in Phase 5.
- This is the technical **deployed** checkpoint. The custom domain, deployment
  CI, load balancer, and optional portfolio packaging remain outside it. SP-026
  is not release-complete until the exact two paid production flows and their
  provider/cost review pass.

## Post-checkpoint kill-switch correction — 2026-09-25

- The owner identified a release-blocking UI inconsistency in the deployed
  paid-disabled revision: the CV choice was disabled, but **Start without a
  CV** still appeared actionable and could enter deterministic conversation
  preparation before the later voice boundary closed. The deployed backend
  remained fail-closed for paid operations, so this was not a provider-call or
  spend bypass, but it did not satisfy the intended all-or-nothing public demo
  switch.
- The local correction makes a freshly validated production
  `paid_disabled` bootstrap visibly disable both entry controls on `/` and
  `/demo`, blocks both selection handlers, and prevents
  `POST /v1/interview/prepare`. The backend independently rejects that endpoint
  while paid-disabled, so a stale client cannot bypass the UI boundary.
  Deterministic fake mode remains available only to local development and
  tests; production continues to require live mode.
- The focused frontend run passed all 41 frontend test files and 300 tests,
  including landing and demo regressions that assert both controls are disabled
  and bootstrap is the only request in the paid-disabled mode chooser.
- All 26 backend test files and 338 tests passed, including a production-live
  regression proving paid-disabled conversation preparation returns `503`
  before grant issuance or provider work. An isolated Git-tracked snapshot on
  Node 24.19.0/pnpm 11.24.0 also passed all 6 contracts files / 50 tests, the
  backend and frontend suites above, every package lint/typecheck, and all three
  production builds without a local environment file in the snapshot.
- Revision `screenpilot-frontend-sp026-606638735bf2` remains safely
  paid-disabled but is superseded as the final release candidate. The corrected
  frontend and backend must be committed, affected SP-025A checks re-run, built
  under their new exact SHA, redeployed, and re-smoked before Phase 5 paid flows
  begin.

## Precision references

- [Final release-candidate audit](SP-025A-audit-release-candidate-code-and-ticket-completion.md)
- [Manual Google Cloud deployment runbook](../operations/manual-google-cloud-deployment.md)
- [Google Cloud cost-control runbook](../operations/google-cloud-cost-controls.md)
- [Repository stack and service names](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#11-frontendbackend-architecture)
- [Security and abuse controls](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#16-security-privacy-and-public-demo-controls)
- [Credential acquisition and Secret Manager guide](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)
- [Full-flow cost analysis](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#13-elevenlabs--openai-research-and-cost-plan)
- [Release definition of done](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#quality-and-portfolio)

## Completion handoff

Report the exact audited candidate deployed, local operator and runtime identity
model, files changed, image/revision SHA evidence, commands and checks performed,
and every unchecked item with its blocker. Keep the backend URL out of
visitor-facing surfaces. If deployment preparation materially changes audited
product code/configuration, re-run the affected SP-025A audit before continuing.
