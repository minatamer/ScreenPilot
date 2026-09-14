import type {
  NormalizedCv,
  NormalizedCvFact,
} from "@screenpilot/contracts/interview/normalized-cv";
import type { ScreeningPlan } from "@screenpilot/contracts/interview/screening-plan";

import { Badge } from "@/shared/ui/badge";
import { Button, ButtonGroup } from "@/shared/ui/button";
import { DemoStageHeading } from "@/shared/ui/demo-stage-heading";

type CvPlanPreviewProps = Readonly<{
  cv: NormalizedCv;
  onContinue: () => void;
  onStartOver: () => void;
  plan: ScreeningPlan;
}>;

const FACT_CATEGORY_LABELS: Readonly<
  Record<NormalizedCvFact["category"], string>
> = {
  education: "Education",
  experience: "Experience",
  language: "Language",
  location: "Location",
  project: "Project",
  skill: "Skill or direction",
};

export function CvPlanPreview({
  cv,
  onContinue,
  onStartOver,
  plan,
}: CvPlanPreviewProps) {
  const factAnchors = new Map(
    cv.facts.map((fact, index) => [fact.id, `cv-fact-${String(index + 1)}`]),
  );
  const fixedTopicKeys: ReadonlySet<string> = new Set(plan.fixedTopics);

  return (
    <div className="sp-demo-stage sp-plan-preview">
      <DemoStageHeading
        pretitle="CV-assisted plan"
        title="The first interview has a grounded starting point."
      />

      {plan.roleClarification.suggestedRole ? (
        <section
          aria-label="Unconfirmed role suggestion"
          className="sp-plan-preview__role"
        >
          <div>
            <p>Suggested from CV — confirm during the call</p>
            <h2>{plan.roleClarification.suggestedRole}</h2>
            <span>{plan.roleClarification.reason}</span>
          </div>
          <EvidenceLinks
            factAnchors={factAnchors}
            factIds={plan.roleClarification.cvFactIds}
          />
        </section>
      ) : (
        <section aria-label="Role direction" className="sp-plan-preview__role">
          <div>
            <p>No role assumed from the CV</p>
            <h2>The candidate can name any role—or stay undecided.</h2>
            <span>{plan.roleClarification.reason}</span>
          </div>
        </section>
      )}

      <div className="sp-plan-preview__columns">
        <section aria-labelledby="cv-facts-title" className="sp-plan-column">
          <div className="sp-plan-column__heading">
            <p className="sp-eyebrow">Evidence</p>
            <h2 id="cv-facts-title">What the CV says</h2>
          </div>
          {cv.facts.length > 0 ? (
            <div className="sp-cv-fact-list">
              {cv.facts.map((fact) => (
                <article
                  className="sp-cv-fact-card"
                  id={factAnchors.get(fact.id)}
                  key={fact.id}
                  tabIndex={-1}
                >
                  <Badge tone="neutral">
                    {FACT_CATEGORY_LABELS[fact.category]}
                  </Badge>
                  <h3>{fact.statement}</h3>
                  <blockquote>{fact.evidenceExcerpt}</blockquote>
                </article>
              ))}
            </div>
          ) : (
            <p className="sp-plan-column__empty">
              No reliable CV facts were returned. The conversation will begin
              broadly and let the candidate supply the context.
            </p>
          )}
        </section>

        <section aria-labelledby="plan-topics-title" className="sp-plan-column">
          <div className="sp-plan-column__heading">
            <p className="sp-eyebrow">Interview plan</p>
            <h2 id="plan-topics-title">What ScreenPilot will explore</h2>
          </div>
          <div className="sp-plan-topic-list">
            {plan.topics.map((topic) => (
              <article className="sp-plan-topic-card" key={topic.key}>
                <div className="sp-plan-topic-card__title">
                  <h3>{topic.title}</h3>
                  {fixedTopicKeys.has(topic.key) ? (
                    <Badge tone="coral">Standard screen</Badge>
                  ) : null}
                </div>
                <p>{topic.intent}</p>
                <span className="sp-plan-topic-card__reason">
                  {topic.reason}
                </span>
                {topic.cvFactIds.length > 0 ? (
                  <EvidenceLinks
                    factAnchors={factAnchors}
                    factIds={topic.cvFactIds}
                  />
                ) : (
                  <span className="sp-plan-topic-card__standard">
                    Standard screening topic · no CV claim attached
                  </span>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="sp-plan-preview__actions">
        <p>
          Structured response checked · no raw PDF or extracted text retained
        </p>
        <ButtonGroup>
          <Button onClick={onContinue}>Continue</Button>
          <Button onClick={onStartOver} variant="quiet">
            Start over
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
}

function EvidenceLinks({
  factAnchors,
  factIds,
}: Readonly<{
  factAnchors: ReadonlyMap<string, string>;
  factIds: readonly string[];
}>) {
  return (
    <div aria-label="Supporting CV evidence" className="sp-evidence-links">
      {factIds.map((factId, index) => {
        const anchor = factAnchors.get(factId);
        return anchor ? (
          <a href={`#${anchor}`} key={factId}>
            CV evidence {index + 1}
          </a>
        ) : null;
      })}
    </div>
  );
}
