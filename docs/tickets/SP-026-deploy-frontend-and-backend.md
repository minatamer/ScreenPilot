# SP-026 — Deploy frontend and backend

Status: Required release boundary  
Milestone: Milestone 5 — deploy  
Last synchronized: 2026-08-31  
Depends on: SP-022, SP-023, SP-025  
Suggested commit: `chore(deploy): publish stateless ScreenPilot demo`  
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Extend the one GitHub Actions pipeline to build and deploy independently versioned frontend/backend Cloud Run services behind one low-cost Firebase Hosting custom HTTPS domain with keyless identity, secrets, abuse controls, smoke checks, and rollback.

## Standalone implementation context

- The single workflow remains `.github/workflows/ci.yml`: `quality → build-images → deploy-backend → deploy-frontend → publish-domain-routing → production-smoke`.
- Pull requests stop after unpaid quality. Only the exact green `main` commit may authenticate and deploy through job-level conditions and `needs`.
- GitHub uses OIDC to Google Cloud Workload Identity Federation with a dedicated least-privilege service account; no service-account JSON key is created or stored.
- Build separate immutable `screenpilot-frontend` and `screenpilot-backend` images tagged with the Git SHA and store only those images in Artifact Registry.
- Deploy both to Cloud Run in one latency-tested region. The documented Firebase example uses `europe-west1`; update both rewrite entries together if measurement selects another region.
- Firebase Hosting is the same-origin routing/managed-HTTPS layer: `/v1/**` rewrites to backend first; catch-all `**` rewrites to frontend; HTTP rewrites must finish within 60 seconds. ElevenLabs WebRTC remains direct.
- Use relative production `/v1` browser calls and one first-party content-free safety cookie. Direct `run.app` URLs are health/rollback targets, never visitor-facing links.
- Domain order: existing portfolio subdomain for $0 incremental cost; otherwise a distinct non-premium name with renewal ≤$15/year before tax. Never pursue active unrelated `screenpilot.com` or an aftermarket purchase.
- Compare Cloudflare Registrar and Porkbun; buy manually. Enable registrar 2FA, auto-renew plus reminder, domain lock, WHOIS privacy, and DNSSEC after Firebase stability.
- If Cloudflare manages DNS, Firebase records remain DNS-only permanently. Do not enable the proxy, Bot Fight Mode, paid WAF, or a second CDN.
- Create one free production Turnstile widget restricted to canonical apex/`www`; public site key is browser-safe, secret stays in Google Secret Manager.
- SP-026 is the release boundary. SP-027 portfolio packaging and SP-028 extended automation are optional.
- At low traffic, the two scale-to-zero services, Hosting traffic, five active secret versions, and small image repository may remain inside provider free quotas. Billing must still be enabled where required, and Artifact Registry storage/domain renewal are standing costs rather than per-flow AI charges.

## Manual production credential and identifier gate

- Production deployment begins with blank user-owned values. Do not invent, scrape, or auto-fill them. Secret Manager receives `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `TURNSTILE_SECRET_KEY`, `INTERVIEW_GRANT_SIGNING_SECRET`, and `ANONYMOUS_COOKIE_SECRET`; only the backend runtime may access them.
- Normal Cloud Run/GitHub environment configuration receives the non-secret `ELEVENLABS_AGENT_ID`, `ELEVENLABS_VOICE_ID`, `TURNSTILE_SITE_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES`, `PUBLIC_WEB_DOMAIN`, and allowed origin values.
- The protected GitHub `production` environment keeps these non-secret deployment identifiers blank until the user creates/selects the resources: `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_DEPLOY_SERVICE_ACCOUNT`, `ARTIFACT_REGISTRY_REPOSITORY`, `FIREBASE_PROJECT_ID`, `FIREBASE_SITE_ID`, and `PUBLIC_WEB_DOMAIN`.
- Follow Google's [Workload Identity Federation deployment guide](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines) to connect GitHub OIDC and the [Cloud Run Secret Manager guide](https://docs.cloud.google.com/run/docs/configuring/services/secrets) to expose runtime secrets. Use the same keyless identity for Firebase Hosting. Do not create `GOOGLE_APPLICATION_CREDENTIALS`, a service-account JSON key, `FIREBASE_TOKEN`, or a personal GitHub token.
- Create the production Turnstile widget manually through **Cloudflare dashboard → Turnstile → Add widget** after the canonical domain is known. No Cloudflare API token, registrar credential, or Cloudflare proxy is required. Domain purchase and Firebase DNS values also remain manual.
- Add `.env*`, nested `.env*`, and downloaded cloud-credential exclusions to `.dockerignore`, inspect both image histories, and verify no build argument/environment layer contains a secret.
- Pipeline/container/routing configuration may be completed and validated without values. If any production secret/identifier or dashboard access is missing, stop before authentication/deploy, leave the affected deployment/live checks unchecked, and report the exact manual blocker.

## Scope boundaries

- Do not add GitLab CI, a second GitHub workflow, Terraform, Kubernetes, service mesh, custom release controller, multi-region failover, paid external load balancer, direct Preview Cloud Run domain mapping, or database/storage deployment.
- Do not purchase a domain from CI or expose registrar/provider secrets to image builds.
- Do not use long-lived Google service-account keys.
- Do not automate real paid provider flows or add a production Turnstile bypass to smoke tests.
- Do not expose direct service URLs, candidate content, secrets, or raw build arguments in UI/metadata/images/logs.

## Implementation checklist

- [ ] Extend the existing workflow with ordered `needs` dependencies and branch conditions while preserving the SP-002 quality job.
- [ ] Configure minimal GitHub permissions and repository/branch-restricted OIDC → Workload Identity Federation.
- [ ] Create a least-privilege deployment service account and protected GitHub `production` environment variables.
- [ ] Add deterministic multi-stage frontend/backend container definitions, non-root minimal runtimes, and safe `.dockerignore`.
- [ ] Build/tag/push separate Git-SHA images to Artifact Registry and deploy matching Cloud Run revisions.
- [ ] Configure health checks, graceful startup, origins, headers, runtime secrets, max instances/concurrency, paid-demo switch, and revision labels.
- [ ] Keep Cloud Run minimum instances at zero, review free-tier region/usage, configure billing alerts, and retain max-instance/provider caps independently of any free or trial credit.
- [ ] Add `firebase.json` with ordered backend `/v1/**` then frontend `**` Cloud Run rewrites using `pinTag: true`; commit non-secret `.firebaserc` alias.
- [ ] Publish Firebase routing with the same keyless identity after both service revisions succeed.
- [ ] Choose/buy the domain manually under the renewal guardrail; configure apex as canonical and `www` redirect.
- [ ] Copy Firebase's exact ownership/A/AAAA/CNAME/TXT records; keep Cloudflare-managed records DNS-only, wait for managed HTTPS, then enable DNSSEC.
- [ ] Configure backend canonical origin/cookie settings and Turnstile public site key, secret, allowed hostname, and three actions.
- [ ] Store OpenAI, ElevenLabs, Turnstile, signing, and cookie secrets in Google Secret Manager/Cloud Run—not GitHub build jobs or images.
- [ ] Run direct liveness/readiness checks plus unpaid custom-domain routing, refresh, `/v1`, apex/`www`, certificate, cookie, public Turnstile config, and canonical metadata smokes.
- [ ] Manually run sample-CV, uploaded-CV, and conversation-first production flows; do not automate a paid provider smoke.
- [ ] Confirm no database, object storage, queue, worker, or candidate artifact deployment exists.
- [ ] Document Cloud Run revision rollback and prove revisions/images identify the Git SHA.
- [ ] Record private operational ownership: registrar, renewal price/date, Firebase site ID, canonical domain, Turnstile widget owner, region, and recovery owner.
- [ ] Reconcile deployed Cloud Run, Firebase Hosting, Secret Manager, and Artifact Registry usage against current free quotas; prune stale images and disable superseded secret versions without deleting the rollback revision currently required by operations.

## Acceptance criteria

- [ ] A green `main` commit deploys the exact same SHA to both independently restartable services; pull requests cannot authenticate/deploy.
- [ ] The canonical HTTPS domain serves frontend routes and same-origin `/v1` backend routes; `www` redirects without a loop.
- [ ] Managed certificate, first-party safety cookie, refresh routing, CSP/CORS/origin, and Turnstile hostname/actions work.
- [ ] No direct `run.app` URL appears in visitor UI, metadata, copied summaries, or portfolio links.
- [ ] Cloudflare DNS remains DNS-only and no paid proxy/WAF/load balancer has been added.
- [ ] Secrets are absent from GitHub/build layers and only runtime services receive the minimum values.
- [ ] Rollback to a known Cloud Run revision is documented/testable.
- [ ] Domain registration is the only planned predictable annual purchase; Turnstile and managed SSL are recorded as $0.
- [ ] Any infrastructure charge or trial credit is recorded separately from the measured per-flow provider cost; no expired promotion is presented as recurring economics.

## Focused verification

- [ ] Validate workflow and container builds locally where practical, then inspect image history/layers for secrets/content.
- [ ] Review WIF trust conditions and effective service-account roles.
- [ ] Run direct `/health/live` and `/health/ready`, then all unpaid public-domain routing/security smokes.
- [ ] Check apex/`www`, TLS certificate, DNS-only records, DNSSEC after stability, canonical tags, refresh, relative `/v1`, and cookie attributes.
- [ ] Manually complete the three production paths with controlled provider usage and inspect Turnstile/provider/Cloud Run results.
- [ ] Exercise/document one rollback and confirm Git SHA labels.
- [ ] Audit deployed logs, Artifact Registry, Secret Manager bindings, and cloud resources for forbidden persistence or secret exposure.
- [ ] Review Cloud Billing after the controlled production flows and compare it with `docs/operations/full-flow-cost-baseline.md`.

## Commit boundary

Keep SP-026 reviewable as one logical change represented by `chore(deploy): publish stateless ScreenPilot demo`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [Unified GitHub Actions pipeline](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#unified-github-actions--google-cloud-pipeline)
- [Complete custom-domain and HTTPS guide](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#cheapest-custom-domain-and-https-guide)
- [Repository stack and service names](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#11-frontendbackend-architecture)
- [Security and abuse controls](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#16-security-privacy-and-public-demo-controls)
- [Credential acquisition, Secret Manager, WIF, and ignore guide](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#credentials-blank-values-and-manual-setup)
- [Full-flow cost and infrastructure free-tier analysis](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#13-elevenlabs--openai-research-and-cost-plan)
- [Release definition of done](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#quality-and-portfolio)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
