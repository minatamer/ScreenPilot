import { EntryModeBadge } from "@/shared/ui/entry-mode-badge";
import { Button, ButtonGroup } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { StageIndicator } from "@/shared/ui/stage-indicator";

type PreflightHandoffProps = Readonly<{
  onBack: () => void;
  onClearSession: () => void;
  onStartOver: () => void;
}>;

export function PreflightHandoff({
  onBack,
  onClearSession,
  onStartOver,
}: PreflightHandoffProps) {
  return (
    <div className="sp-demo-stage sp-preflight-handoff">
      <StageIndicator
        currentIndex={2}
        stages={["Choose", "Prepare", "Preflight", "Interview", "Review"]}
      />
      <div className="sp-preflight-handoff__heading">
        <EntryModeBadge>Conversation-first</EntryModeBadge>
        <p className="sp-eyebrow">Shared preflight handoff</p>
        <h1>Your open conversation is ready.</h1>
        <p className="sp-demo-stage__lead">
          You reached the same preflight used by the CV-assisted path without a
          file, a form, or a paid preparation call.
        </p>
      </div>
      <Card className="sp-preflight-handoff__summary" tone="soft">
        <h2>What is prepared</h2>
        <ul>
          <li>
            One role-neutral HR discovery plan that starts with your name and an
            open target-position question.
          </li>
          <li>
            Candidate-only evidence: there is no CV, role suggestion, or claim
            that ScreenPilot already knows you.
          </li>
          <li>
            Any bounded role you state becomes a synthetic vacancy for this
            browser session; staying undecided is also supported.
          </li>
        </ul>
      </Card>
      <Card className="sp-preflight-handoff__next">
        <div>
          <p className="sp-eyebrow">Next ticket boundary</p>
          <h2>Voice consent and microphone checks come next.</h2>
          <p>
            No microphone, Turnstile challenge, OpenAI request, or ElevenLabs
            connection has started at this handoff.
          </p>
        </div>
      </Card>
      <ButtonGroup className="sp-preflight-handoff__actions">
        <Button onClick={onBack} variant="secondary">
          Back to choices
        </Button>
        <Button onClick={onStartOver} variant="quiet">
          Start over
        </Button>
        <Button onClick={onClearSession} variant="quiet">
          Clear session
        </Button>
      </ButtonGroup>
    </div>
  );
}
