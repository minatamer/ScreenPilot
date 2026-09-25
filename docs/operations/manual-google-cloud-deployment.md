# Manual ScreenPilot deployment to Google Cloud Run

Status: Required SP-026 operator runbook  
Last reviewed: 2026-09-25  
Scope: Owner-run deployment from the audited local checkout

## Architecture

ScreenPilot initially uses only these Google Cloud deployment resources:

```text
browser
  -> screenpilot-frontend.run.app
       -> Next.js pages/assets
       -> relative /v1/** server proxy
            -> screenpilot-backend.run.app
                 -> OpenAI / ElevenLabs / Turnstile

local Docker build
  -> Artifact Registry
       -> two Cloud Run services

Google Secret Manager
  -> backend runtime only
```

The existing GitHub Actions workflow remains quality-only. Deployment does not
use GitHub credentials, a deployment workflow, Workload Identity Federation, or
a service-account JSON key.

## What Codex can do and what requires the owner

`gcloud` is not a separate hosted deployment agent. It runs on the owner's PC
with the Google identity that the owner authorizes. Codex can execute ordinary
PowerShell, Docker, and `gcloud` commands after the CLI is installed, but it must
not choose immutable account identifiers, accept payment terms, handle secret
values, or make a charge-enabling change without the owner's explicit approval.

| Action | Can Codex perform it? | Required owner involvement |
| --- | --- | --- |
| Download and launch the signed Google Cloud CLI installer | **Yes, after permission to install software.** | Approve the download/elevation prompt and complete any visible installer UI. |
| Initialize `gcloud` and start login | **Yes.** | Complete Google browser sign-in, MFA, account selection, and consent. Codex never receives the password or MFA code. |
| Create the Google Cloud project | **Yes, with `gcloud projects create`.** | Approve the exact globally unique project ID first; project IDs are immutable. The account must have Project Creator permission. |
| Create or fund a Cloud Billing account / add or change the card | **No.** | Owner-only Google Payments/Cloud Console action, including terms, identity, tax, and payment details. |
| List billing accounts and link the approved account to the approved project | **Yes, with `gcloud billing accounts list` and `gcloud billing projects link`.** | Explicitly approve the selected account and link because it enables chargeable services. Do not place the billing-account ID in the repository. |
| Create the USD 10 alert-only project budget | **Yes, with `gcloud billing budgets create` when permissions allow.** | Approve the amount, currency equivalent, thresholds, scope, and recipients. |
| Create the USD 5 Cloud Run spend cap | **Not through the currently documented `gcloud billing budgets create` command.** | Owner configures the Preview spend-cap budget in **Cloud Console → Billing → Budgets & alerts**. Codex can guide the screen-by-screen process and record only the content-free result. |
| Enable APIs; create Artifact Registry, runtime service accounts, IAM bindings, and empty Secret Manager resources | **Yes, through `gcloud`.** | Approve the planned project, region, resource names, and least-privilege roles. |
| Add secret values | **No.** | Owner enters values directly in Secret Manager. Codex never reads `.env.local`, receives secret text, or puts a secret in a command/log. |
| Build and push the images | **Yes, with local Docker plus the Artifact Registry credential helper.** | Docker Desktop must be running; owner approves networked build/push activity. |
| Create/update both Cloud Run services and their revisions | **Yes, with `gcloud run deploy`.** | Approve the first deployment and any later change that can create usage charges. |
| Read service state, URLs, health, revision configuration, logs, billing-budget metadata, and IAM bindings | **Yes.** | No secret or candidate content may be printed or copied into documentation. |
| Roll back traffic to a known revision | **Yes, after owner approval.** | Confirm the exact target revision pair before changing traffic. |
| Buy or map a domain, add deployment CI, or add a load balancer | **Not part of the initial deployment.** | Make a separate later decision after the `run.app` deployment passes. |

The technical deployment therefore remains two application services. Artifact
Registry, Secret Manager, IAM service accounts, and budgets are supporting
controls rather than additional running applications.

## 0. Install Google Cloud CLI on Windows

First check whether the CLI is already available:

```powershell
Get-Command gcloud -ErrorAction SilentlyContinue
gcloud --version
```

If the first command returns nothing, use Google's signed Windows installer.
Codex may run these commands after the owner approves downloading and launching
software outside the repository:

```powershell
$screenPilotGcloudInstaller = Join-Path $env:TEMP "GoogleCloudSDKInstaller.exe"
Invoke-WebRequest "https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe" -OutFile $screenPilotGcloudInstaller
Start-Process -FilePath $screenPilotGcloudInstaller -Wait
```

In the installer:

1. Confirm the publisher is **Google LLC**.
2. Keep **Install Bundled Python** enabled unless the owner has a specific
   supported-Python reason not to.
3. Keep **Add gcloud CLI to PATH** and **Run `gcloud init`** enabled.
4. Approve a Windows elevation prompt only when it names the signed Google
   installer.
5. Close and reopen PowerShell after installation so the updated `PATH` is
   visible.

Verify the installation in the new shell:

```powershell
gcloud --version
gcloud info
```

Do not install App Engine components, emulators, `kubectl`, or other optional
components for ScreenPilot. Cloud Run, Artifact Registry, Secret Manager,
Resource Manager, IAM, Service Usage, and Billing commands use the base CLI.

## Why manual deployment is sufficient

Cloud Run accepts an image from Artifact Registry through `gcloud run deploy`.
For this low-frequency portfolio demo, the owner can authenticate `gcloud` with
their own account, build both containers locally, push SHA-tagged images, and
deploy them directly. Revisions are immutable, so the deployed image digest and
Git-SHA label still provide a reproducible rollback trail without CI/CD.

Automation can be reconsidered only if deployment frequency or collaboration
makes the manual process error-prone. It is not required for the first release.

## Safety rules

- Start from the exact clean SP-025A-approved checkout. Do not deploy an
  uncommitted or materially changed candidate.
- Configure the budgets in `google-cloud-cost-controls.md` before the first image
  push or service deployment.
- Never read or copy `.env.local` into an image, shell command, log, or document.
- Enter secret values through Google Secret Manager's console. Deployment
  commands reference secret resource names, never secret values.
- Use the owner's short-lived `gcloud auth login` session. Never create or
  download a service-account key.
- Keep `PAID_DEMO_ENABLED=false` through image deployment and unpaid smoke tests.
- Use one region for Artifact Registry and both services.
- Tag release images with the full audited Git SHA; do not deploy `latest`.

## Local prerequisites

- Docker Desktop is running.
- Google Cloud CLI is installed and current enough for Cloud Run.
- Node 24.20.0 and pnpm 11.24.0 are available for the deterministic preflight.
- The owner has access to the dedicated ScreenPilot Google Cloud project and
  linked billing account.
- The owner has only the IAM roles required to enable APIs, write to the selected
  Artifact Registry repository, deploy Cloud Run services, attach runtime
  identities, and manage the five secrets.

## 1. Verify the audited checkout

From the repository root:

```powershell
git status --short
git rev-parse HEAD
corepack pnpm verify:quick
```

`git status --short` must be empty. Compare the full SHA with the SP-025A audit
ledger before continuing. The verification command must remain fake and
paid-disabled under the repository's test-runner guarantees.

## 2. Authenticate, create/select the project, and link billing

Use task-specific PowerShell variables; do not reuse common system variables:

```powershell
$screenPilotProject = "<owner-selected-project-id>"
$screenPilotRegion = "europe-west1"
$screenPilotRepository = "screenpilot"
$screenPilotSha = (git rev-parse HEAD).Trim()
$screenPilotRegistry = "$screenPilotRegion-docker.pkg.dev"

gcloud init
gcloud auth list
```

`gcloud init` opens Google sign-in. The owner completes account selection, MFA,
and consent. Stop if the active account is not the intended owner account.

If the dedicated project does not exist, Codex can create it after the owner
approves the exact ID. The project ID is globally unique and immutable:

```powershell
gcloud projects describe $screenPilotProject
gcloud projects create $screenPilotProject --name="ScreenPilot Demo" --set-as-default
```

Run `projects create` only when `projects describe` confirms the approved ID is
absent. If the project already exists and is owned by the intended account,
select it instead:

```powershell
gcloud config set project $screenPilotProject
gcloud config set run/region $screenPilotRegion
```

The owner must first create or activate the Cloud Billing account and its
payment method in Google Cloud Console. After the owner approves the exact
account to use, Codex can list accessible open accounts and link the project:

```powershell
$screenPilotBillingAccount = "<owner-approved-billing-account-id>"

gcloud billing accounts list --filter="open=true"
gcloud billing projects link $screenPilotProject --billing-account=$screenPilotBillingAccount
gcloud billing projects describe $screenPilotProject
```

Linking billing enables chargeable services. Never infer the billing account,
move an existing project between accounts, or run the link command without the
owner's explicit approval. Keep the real billing-account ID out of source files,
screenshots, and public documentation.

Verify the active account and project before creating or changing resources:

```powershell
gcloud auth list
gcloud config list account,project,run/region
gcloud billing projects describe $screenPilotProject
```

Do not continue if the displayed account, project, or region is unexpected.

## 3. Enable APIs and create Artifact Registry

Enable only the services required by this deployment:

```powershell
gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com iam.googleapis.com billingbudgets.googleapis.com
```

Create one regional Docker repository if it does not already exist:

```powershell
gcloud artifacts repositories create $screenPilotRepository --repository-format=docker --location=$screenPilotRegion --description="ScreenPilot release images"
```

Configure Docker's Google credential helper for that regional hostname:

```powershell
gcloud auth configure-docker $screenPilotRegistry
```

The credential helper uses the active short-lived Google login. Do not use a
JSON key as a Docker password.

Before the first image build/push, complete the spend-cap and alert-budget steps
in `google-cloud-cost-controls.md`. Codex can create the alert-only budget with
`gcloud`; the owner completes the current Preview spend-cap form in Cloud
Console.

## 4. Create runtime identities and secrets

Create dedicated runtime service accounts:

- `screenpilot-backend-runtime`: may access only the five required Secret
  Manager secrets;
- `screenpilot-frontend-runtime`: receives no provider-secret role.

Codex can create both identities and the empty secret resources through
`gcloud`:

```powershell
$screenPilotBackendIdentity = "screenpilot-backend-runtime@$screenPilotProject.iam.gserviceaccount.com"
$screenPilotFrontendIdentity = "screenpilot-frontend-runtime@$screenPilotProject.iam.gserviceaccount.com"
$screenPilotSecretNames = @(
  "OPENAI_API_KEY",
  "ELEVENLABS_API_KEY",
  "TURNSTILE_SECRET_KEY",
  "INTERVIEW_GRANT_SIGNING_SECRET",
  "ANONYMOUS_COOKIE_SECRET"
)

gcloud iam service-accounts create screenpilot-backend-runtime --display-name="ScreenPilot backend runtime"
gcloud iam service-accounts create screenpilot-frontend-runtime --display-name="ScreenPilot frontend runtime"

foreach ($screenPilotSecretName in $screenPilotSecretNames) {
  gcloud secrets create $screenPilotSecretName --replication-policy=automatic
  gcloud secrets add-iam-policy-binding $screenPilotSecretName --member="serviceAccount:$screenPilotBackendIdentity" --role="roles/secretmanager.secretAccessor"
}
```

Before running creation commands, use the corresponding `describe` or `list`
command to avoid treating an already-created resource as a new one. Never solve
a name collision by creating duplicate secret resources or runtime identities.

In **Google Cloud Console → Security → Secret Manager**, create exactly one
enabled version of each existing resource by entering the values yourself:

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `TURNSTILE_SECRET_KEY`
- `INTERVIEW_GRANT_SIGNING_SECRET`
- `ANONYMOUS_COOKIE_SECRET`

Grant the backend runtime identity Secret Accessor on each individual secret,
not across unrelated project secrets. Never grant either runtime identity Owner,
Editor, Artifact Registry Writer, or deployment privileges.

The frontend receives no Secret Manager binding.

Do not copy the whole local `.env.local` file into Secret Manager or Cloud Run.
Use the committed `.env.example` as the schema and split production settings by
their actual sensitivity and runtime owner:

| Destination | Configuration |
| --- | --- |
| Backend Secret Manager bindings | `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `TURNSTILE_SECRET_KEY`, `INTERVIEW_GRANT_SIGNING_SECRET`, and `ANONYMOUS_COOKIE_SECRET` |
| Backend ordinary Cloud Run variables | `APP_ENV=production`, `PROVIDER_MODE=live`, `PAID_DEMO_ENABLED=false`, `LIVE_INTERVIEW_ENABLED=true`, `ALLOWED_ORIGINS=<frontend HTTPS origin>`, `ELEVENLABS_AGENT_ID=<owner-selected agent>`, `ELEVENLABS_VOICE_ID=<owner-selected voice>`, `TURNSTILE_SITE_KEY=<public widget key>`, and `TURNSTILE_ALLOWED_HOSTNAMES=<bare frontend hostname>` |
| Backend explicit guardrail variables | `HTTP_HEADERS_TIMEOUT_MS=10000`, `HTTP_REQUEST_TIMEOUT_MS=30000`, `HTTP_JSON_BODY_MAX_BYTES=65536`, `PROVIDER_REQUEST_TIMEOUT_MS=30000`, `INTERVIEW_GRANT_TTL_SECONDS=900`, `ANONYMOUS_COOKIE_TTL_SECONDS=7200`, `CAPACITY_GLOBAL_CONCURRENT_REQUESTS=4`, `CAPACITY_CV_ANALYZE_CONCURRENT_REQUESTS=2`, `CAPACITY_VOICE_TOKEN_CONCURRENT_REQUESTS=1`, `CAPACITY_SUMMARY_CONCURRENT_REQUESTS=2`, `RATE_LIMIT_WINDOW_SECONDS=60`, `RATE_LIMIT_MAX_ENTRIES=10000`, `RATE_LIMIT_BOOTSTRAP_REQUESTS=120`, `RATE_LIMIT_PREPARE_REQUESTS=30`, `RATE_LIMIT_CV_ANALYZE_REQUESTS=10`, `RATE_LIMIT_VOICE_TOKEN_REQUESTS=3`, and `RATE_LIMIT_SUMMARY_REQUESTS=10` |
| Cloud Run platform | `PORT`; Cloud Run injects this value, so the operator does not set it |
| Frontend ordinary Cloud Run variable | `BACKEND_ORIGIN=<backend HTTPS origin>`, added only after the backend service exists |

The parser currently supplies the documented timeout, TTL, capacity, and rate
limit defaults when those variables are omitted. SP-026 still records them
explicitly on the backend revision so the deployed cost and abuse ceilings are
visible in Cloud Run configuration rather than relying on implicit defaults.

## 5. Build the frontend image and deploy its bootstrap revision

The frontend stable Cloud Run hostname is needed for backend CORS and the
production Turnstile widget. Build the exact-SHA frontend image once from the
audited checkout, push it, and deploy it without `BACKEND_ORIGIN` for the
setup-only bootstrap revision. The same immutable image is configured at runtime
for the final revision; the bootstrap revision itself is not the release
candidate.

```powershell
$screenPilotFrontendImage = "$screenPilotRegistry/$screenPilotProject/$screenPilotRepository/screenpilot-frontend:$screenPilotSha"

docker build --file apps/frontend/Dockerfile --tag $screenPilotFrontendImage .
docker push $screenPilotFrontendImage
gcloud run deploy screenpilot-frontend --image $screenPilotFrontendImage --service-account "screenpilot-frontend-runtime@$screenPilotProject.iam.gserviceaccount.com" --min 0 --max 1 --concurrency 80 --allow-unauthenticated
```

Read and privately record the stable frontend service URL:

```powershell
$screenPilotFrontendOrigin = (gcloud run services describe screenpilot-frontend --format="value(status.url)").Trim()
$screenPilotFrontendOrigin
```

Do not run a paid flow against the bootstrap revision.

## 6. Create the production Turnstile widget

In Cloudflare Turnstile, create the free production widget and restrict it to the
hostname from `$screenPilotFrontendOrigin`. Record only the public site key in
ordinary Cloud Run configuration. Replace the corresponding Secret Manager
version only through the console if the secret value was not already final.

Keep pre-clearance off and use the three application actions already defined by
SP-022. Do not enable Cloudflare proxying, DNS, WAF, or Bot Fight Mode.

## 7. Build and deploy the backend

Build and push the exact-SHA backend image:

```powershell
$screenPilotBackendImage = "$screenPilotRegistry/$screenPilotProject/$screenPilotRepository/screenpilot-backend:$screenPilotSha"

docker build --file apps/backend/Dockerfile --tag $screenPilotBackendImage .
docker push $screenPilotBackendImage
```

Deploy `screenpilot-backend` with:

- the exact image above and full Git-SHA revision label;
- `screenpilot-backend-runtime` as its runtime identity;
- request-based billing, minimum `0`, maximum `1`, concurrency `4`;
- `APP_ENV=production`, `PROVIDER_MODE=live`, and
  `PAID_DEMO_ENABLED=false`;
- `ALLOWED_ORIGINS` set to `$screenPilotFrontendOrigin`;
- Turnstile hostname set to the frontend hostname;
- non-secret agent, voice, site-key, timeout, and capacity values matching the
  committed `.env.example`; and
- the five environment-to-Secret-Manager mappings listed above.

Use Cloud Run's **Variables & secrets** form for the first fully configured
revision so secret values never enter the command line. Do not paste a secret
into an ordinary environment-variable field.

After deployment, record the stable backend URL privately:

```powershell
$screenPilotBackendOrigin = (gcloud run services describe screenpilot-backend --format="value(status.url)").Trim()
```

Run only direct unpaid health checks at this point.

## 8. Configure and deploy the final frontend revision

Configure the already-pushed exact-SHA frontend image with the backend Cloud Run
origin as its server-only runtime proxy destination. `BACKEND_ORIGIN` is not a
secret, must not be a Docker build argument, and must not be exposed as a
`NEXT_PUBLIC_*` variable.

```powershell
gcloud run deploy screenpilot-frontend --image $screenPilotFrontendImage --service-account "screenpilot-frontend-runtime@$screenPilotProject.iam.gserviceaccount.com" --set-env-vars "BACKEND_ORIGIN=$screenPilotBackendOrigin" --min 0 --max 1 --concurrency 80 --allow-unauthenticated
```

SP-026 must make the Dockerfile/runtime contract explicit and test that the
final Next.js server forwards `/v1/**` to this origin while browser JavaScript
still uses only relative URLs.

## 9. Unpaid deployment verification

Before enabling paid operations:

1. Verify backend `/health/live` and `/health/ready` directly.
2. Verify the same API health/bootstrap behavior through
   `$screenPilotFrontendOrigin/v1/...`.
3. Refresh every frontend route and confirm there is no Cloud Run 404.
4. Inspect network requests: browser application requests must use the frontend
   origin and relative `/v1` paths; the backend URL must not appear in UI,
   metadata, or copied output.
5. Confirm the anonymous safety cookie is Secure, first-party, and scoped as
   expected on the frontend origin.
6. Confirm CSP, CORS/origin, Turnstile public config, no-store behavior, and
   security headers.
7. Confirm `?diagnostics=timings` exposes no production diagnostics controls on
   either service hostname.
8. Inspect both image histories and Cloud Run revision configuration for secrets
   or ignored local files.

Only after every unpaid check passes may the owner temporarily enable the paid
demo for the exact two production flows.

## 10. Subsequent manual deployment

For later approved releases, the stable service URLs remain unchanged:

1. verify the new audited clean Git SHA;
2. build and push new backend and frontend images tagged with that SHA;
3. deploy backend, verify readiness, then deploy frontend;
4. run unpaid smoke checks;
5. manually run paid acceptance only when a ticket explicitly requires it; and
6. retain the previous known-good revisions/images for rollback.

Do not overwrite a Git-SHA tag with different bytes. Use a new audited SHA.

## Rollback

List revisions and move traffic back to the previously recorded known-good
revision through Cloud Run's **Revisions** tab or the current documented
`gcloud run services update-traffic` command. Roll back backend and frontend as
a recorded pair when their boundary changed together. Re-run unpaid health and
routing checks after rollback.

Never delete the image needed by the active or designated rollback revision.

## Optional custom domain after acceptance

SP-026 initially releases the frontend `run.app` URL. If the owner later buys a
domain, map only the frontend service. Its internal `/v1` proxy continues to
reach the backend, so no path-routing product or second API hostname is needed.

Google currently documents direct Cloud Run domain mapping as Preview, limited
to selected regions, and not recommended for production because of latency and
feature limitations. It is acceptable only as an explicit portfolio-demo
simplicity tradeoff. If production-grade domain routing later becomes a goal,
make a new architecture decision rather than silently adding a paid load
balancer or another hosting layer.

After mapping a domain, update backend allowed origins, Turnstile allowed
hostnames, canonical metadata, and cookie checks before using it publicly.

## Official references

- [Install and initialize Google Cloud CLI on Windows](https://docs.cloud.google.com/sdk/docs/downloads-interactive#windows)
- [`gcloud projects create`](https://docs.cloud.google.com/sdk/gcloud/reference/projects/create)
- [`gcloud billing projects link`](https://docs.cloud.google.com/sdk/gcloud/reference/billing/projects/link)
- [`gcloud billing budgets create`](https://docs.cloud.google.com/sdk/gcloud/reference/billing/budgets/create)
- [Deploy container images to Cloud Run](https://docs.cloud.google.com/run/docs/deploying)
- [Authenticate Docker to Artifact Registry](https://docs.cloud.google.com/artifact-registry/docs/docker/authentication)
- [Push images to Artifact Registry](https://docs.cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling)
- [Configure Cloud Run secrets](https://docs.cloud.google.com/run/docs/configuring/services/secrets)
- [Allow public Cloud Run access](https://docs.cloud.google.com/run/docs/authenticating/public)
- [Cloud Run custom-domain options and limitations](https://docs.cloud.google.com/run/docs/mapping-custom-domains)
