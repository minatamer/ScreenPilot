# ScreenPilot Google Cloud cost controls

Status: Required SP-026 production runbook  
Last reviewed: 2026-09-25  
Scope: The dedicated ScreenPilot Google Cloud project only

## Purpose

Configure two complementary Google Cloud budgets before the first production
deployment:

| Control | Locked value | Scope | Effect |
| --- | --- | --- | --- |
| Cloud Run spend-cap budget | **USD 5/month** | ScreenPilot project + Cloud Run service | Pauses new Cloud Run usage after the cap is enforced; current Preview behavior can lag and bill a small overage. |
| Project alert-only budget | **USD 10/month** | ScreenPilot project + all services | Sends actual and forecast notifications; it never stops usage or charges. |

These amounts are planning limits, not claims that ScreenPilot normally costs
USD 5 or USD 10. The two scale-to-zero services should remain inside the Cloud
Run free tier at low portfolio traffic. The limits exist to contain a fault,
unexpected traffic, or configuration mistake after the free trial has ended.

## Expected Google Cloud bill for this demo

The realistic target is **USD 0/month at low portfolio traffic**, with a small
Artifact Registry storage charge possible. This is not a guarantee because free
usage is aggregated across projects on the billing account and Google Cloud
pricing, traffic, image size, logging, and region can change.

| Resource | Current planning allowance/rate | Expected ScreenPilot effect |
| --- | --- | --- |
| Two Cloud Run services | Request-based free tier: 180,000 vCPU-seconds, 360,000 GiB-seconds, and 2 million requests per billing account/month. Tier-1 usage beyond the free tier starts at USD 0.000024/vCPU-second, USD 0.0000025/GiB-second, and USD 0.40/million requests. | Minimum instances `0` means there is no always-on instance charge. Low demo traffic should normally stay at USD 0. |
| Artifact Registry | First 0.5 GiB-month free; additional storage is approximately USD 0.10/GiB-month. | This is the most likely small standing charge. For example, 1.0 GiB total stored uses 0.5 GiB billable, approximately USD 0.05/month before tax. |
| Secret Manager | Six active versions and 10,000 access operations free per billing account/month. | The five required secrets fit at USD 0 when one active version of each is retained. Enabled and disabled versions both count as active. |
| Logging and network | Usage-dependent; not covered by the Cloud Run service cap. | Keep logs bounded and content-free. Review the bill after deployment rather than promising zero. |
| Optional domain | Outside Google Cloud runtime billing and deferred until after acceptance. | USD 0 when using the managed frontend `run.app` URL; if purchased later, keep renewal at or below USD 15/year before tax. |

OpenAI and ElevenLabs charges are separate from this Google Cloud estimate and
their account-level caps remain mandatory.

If the billing account uses another currency, enter the current billing-currency
equivalent rounded down so that the control is no weaker than the USD limit.
Record the chosen amount and conversion date in the private deployment record;
do not put payment details, billing-account IDs, or screenshots in the
repository.

## Important limits

- The native Cloud Run spend cap is a Preview feature for eligible first-party
  Google Cloud billing accounts. It is required when the console offers it. If
  it is unavailable, record the exact eligibility/UI blocker and retain every
  fallback control below; do not claim that the USD 10 alert budget is a hard
  cap.
- Spend-cap enforcement is not instantaneous. In-flight requests complete and
  reporting latency can create a billable overage.
- The Cloud Run cap covers Cloud Run usage in the selected project. It does not
  cap Artifact Registry, Secret Manager, Cloud Logging, network transfer,
  OpenAI, ElevenLabs, domain renewal, tax, or card-conversion charges.
- A normal Google Cloud budget sends notifications only. Google explicitly
  warns that an alert-only budget does not cap usage or spending.
- Do not add a Pub/Sub billing listener, Cloud Run function, or automatic
  project-billing shutdown in SP-026. That additional automation and its failure
  modes require a separate future operations decision; no current ticket owns
  production monitoring or billing automation.
- Do not deliberately incur charges to test either budget. Verify configuration
  in the console and review real billing after the two authorized production
  flows.

## Current SP-026 budget-control result — 2026-09-25

- The current billing account did not expose the Preview **Spend cap
  enforcement** choice. The visible workflow was the standard alerts-only flow,
  so the native USD 5 Cloud Run hard cap is recorded as
  `Unavailable — Preview/eligibility`; it must not be represented as configured.
- A monthly USD 5 **alerts-only** fallback is configured for Cloud Run with
  actual-spend notifications at 50%, 80%, and 100%. The console offered only
  `All projects (1)`, so this budget currently has billing-account project scope
  while the account has exactly one linked project. Revisit or replace it before
  linking a second project to the billing account.
- A separate monthly USD 10 alerts-only budget is scoped to the dedicated
  ScreenPilot project across all services. Its actual thresholds are 25%, 50%,
  75%, 90%, and 100%; forecast thresholds are 50% and 100%.
- Neither alerts-only budget stops usage or charges. The Cloud Run instance
  ceilings, paid-demo kill switch, provider limits, image-retention policy, and
  post-deployment billing review remain the enforceable fallback set.

## Prerequisites

Before configuring either budget:

1. Create or select the Google Cloud project dedicated to ScreenPilot.
2. Link the owner's billing account and confirm that the expired trial is not
   represented as recurring credit.
3. Confirm the owner has the Cloud Billing permissions required to create
   project budgets and, where available, configure spend-cap enforcement.
4. Keep `PAID_DEMO_ENABLED=false`. Budget configuration never authorizes a live
   OpenAI or ElevenLabs request.

## Create the USD 5 Cloud Run spend cap

Google Cloud Console labels can change while this feature is in Preview. Use
the current [spend-cap budget guide](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps)
as the authority if a label differs.

The currently documented `gcloud billing budgets create` command creates
alert-only budgets and does not expose the Preview spend-cap-enforcement choice.
The owner therefore completes this one control in Cloud Console. Codex can guide
the navigation and verify the non-sensitive scope/status with the owner, but it
must not handle payment details or claim that a CLI-created alert budget is a
spend cap.

1. Open **Google Cloud Console → Billing → Budgets & alerts** for the billing
   account linked to ScreenPilot.
2. Select **Create budget**.
3. Under **Define**, choose **Spend cap enforcement** and name the budget
   `ScreenPilot Cloud Run USD 5 spend cap`.
4. Under **Scope**, select:
   - time range: **Monthly**;
   - project: the dedicated ScreenPilot project only;
   - service: **Cloud Run** only.
5. Under **Amount**, select **Specified amount** and enter **USD 5**, or the
   rounded-down billing-currency equivalent described above.
6. Review the automatically configured 50%, 80%, and 100% notifications. The
   Preview spend-cap budget does not allow custom notification thresholds or
   recipients.
7. Select **Finish** and confirm its status is **Configured**.

If **Spend cap enforcement** or **Cloud Run** is unavailable, stop this branch
of setup. Do not substitute an alert-only budget with a misleading name. Record
`Unavailable — Preview/eligibility` in the private deployment checklist and
continue with the project-wide alert budget and fallback controls.

## Create the USD 10 project alert budget

Follow Google's current
[budget and alert guide](https://docs.cloud.google.com/billing/docs/how-to/budgets)
if the console wording differs.

Codex can create this alert-only budget with `gcloud` after the owner approves
the billing account, project, amount/currency, thresholds, and recipients. Use
the task-specific values established by the manual deployment runbook:

```powershell
$screenPilotAlertBudgetAmount = "<10USD-or-rounded-down-billing-currency-equivalent>"

gcloud billing budgets create `
  --billing-account=$screenPilotBillingAccount `
  --display-name="ScreenPilot project USD 10 alerts" `
  --budget-amount=$screenPilotAlertBudgetAmount `
  --calendar-period=month `
  --filter-projects="projects/$screenPilotProject" `
  --threshold-rule=percent=0.25 `
  --threshold-rule=percent=0.50 `
  --threshold-rule=percent=0.75 `
  --threshold-rule=percent=0.90 `
  --threshold-rule=percent=1.00 `
  --threshold-rule=percent=0.50,basis=forecasted-spend `
  --threshold-rule=percent=1.00,basis=forecasted-spend
```

Do not use `--disable-default-iam-recipients`. After creation, list and inspect
the result without writing the real billing-account ID to the repository:

```powershell
gcloud billing budgets list --billing-account=$screenPilotBillingAccount
```

The Cloud Console steps below remain the review/fallback path:

1. Return to **Billing → Budgets & alerts** and select **Create budget**.
2. Under **Define**, choose **Alerts only** and name it
   `ScreenPilot project USD 10 alerts`.
3. Scope it to the dedicated ScreenPilot project, **all services**, and the
   monthly calendar period. Do not include unrelated projects on the same
   billing account.
4. Choose **Specified amount** and enter **USD 10**, or the rounded-down
   billing-currency equivalent.
5. Configure actual-spend thresholds at **25%, 50%, 75%, 90%, and 100%**.
6. Configure forecasted-spend thresholds at **50% and 100%**. If the current
   console prevents a duplicate percentage, retain every actual threshold and
   at least the 100% forecast threshold.
7. Enable email notifications for billing administrators/users and project
   owners. A private owner-controlled Cloud Monitoring email channel may also be
   linked; never commit its address or configuration identifiers.
8. Do not connect Pub/Sub in SP-026. Select **Finish**.

## Required fallback controls

Budgets supplement, but never replace, the application and resource ceilings:

| Surface | Required control |
| --- | --- |
| Backend Cloud Run | Request-based billing, minimum instances `0`, maximum instances `1`, concurrency `4` |
| Frontend Cloud Run | Request-based billing, minimum instances `0`, maximum instances `1`, concurrency `80` |
| Paid application paths | `PAID_DEMO_ENABLED=false` by default; Turnstile and server-side route/in-flight limits remain mandatory when temporarily enabled |
| OpenAI | Dedicated ScreenPilot project, smallest practical funded balance/budget, alerts, and the available hard limit; no automatic recharge unless the owner explicitly approves it |
| ElevenLabs | Restricted API key, account/agent quota and concurrency controls, and current-plan usage alerts |
| Artifact Registry | Keep the deployed SHA and one required rollback SHA; prune older unneeded images after verifying revision ownership |
| Secret Manager | Keep one active version of each of the five secrets. A disabled version is still billable as active; destroy superseded versions only after the safe rotation/rollback window |

Provider limits are separate accounts. A Google Cloud cap cannot stop OpenAI or
ElevenLabs spending, and an OpenAI or ElevenLabs limit cannot stop Google Cloud
charges.

## Verify without creating spend

Before the first image push or service deployment, record these content-free
facts in the private deployment checklist:

- Cloud Run spend-cap budget name, USD/billing-currency amount, project/service
  scope, status, and verification date—or the exact Preview/eligibility blocker;
- project alert budget name, amount, all-services scope, actual/forecast
  thresholds, recipients reviewed, and verification date;
- Cloud Run request-based billing, minimum/maximum instances, and concurrency
  values for both services;
- current paid-demo kill-switch state;
- OpenAI and ElevenLabs cap/quota review date; and
- Artifact Registry and Secret Manager retention state.

Do not record billing-account IDs, payment details, secret values, candidate
content, or screenshots containing private account information.

After deployment and after the exact two controlled production flows, open
Cloud Billing reports filtered to the ScreenPilot project and reconcile Cloud
Run, Artifact Registry, Secret Manager, Logging, and network
charges in `docs/operations/full-flow-cost-baseline.md`. Restore the paid-demo
kill switch regardless of whether the recorded infrastructure cost is zero.

## If the Cloud Run spend cap triggers

1. Leave the cap enforced and set or confirm `PAID_DEMO_ENABLED=false`.
2. Do not immediately lift the cap merely to restore the portfolio URL.
3. Review Cloud Billing by SKU, Cloud Run request and billable-instance metrics,
   logs, recent deployments, and provider dashboards without
   exposing candidate or account data.
4. Identify whether traffic, a minimum-instance/configuration regression, a
   retry loop, or deployment activity caused the spend.
5. Correct and verify the cause before the owner explicitly authorizes lifting
   the cap.

Google documents that lifting an enforced cap can take up to an hour to restore
service. If a cap is enforced and then lifted in the same month, it does not
automatically trigger again for the rest of that month unless its target amount
is increased. Treat lifting it as a high-risk owner action and rely on the
paid-demo kill switch and service ceilings until the next monthly reset.

## Official references

- [Cloud Run pricing and free tier](https://cloud.google.com/run/pricing)
- [Cloud Billing spend-cap budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps)
- [Cloud Billing alert-only budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets)
- [`gcloud billing budgets create`](https://docs.cloud.google.com/sdk/gcloud/reference/billing/budgets/create)
- [Artifact Registry pricing](https://cloud.google.com/artifact-registry/pricing)
- [Secret Manager pricing](https://cloud.google.com/secret-manager/pricing)
