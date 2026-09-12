import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";

import { EntryModeBadge } from "@/shared/ui/entry-mode-badge";
import { Button, ButtonGroup } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

type PreflightHandoffProps = Readonly<{
  entryMode: EntryMode;
  onBack: () => void;
}>;

export function PreflightHandoff({ entryMode, onBack }: PreflightHandoffProps) {
  const cvAssisted = entryMode === "cv_assisted";

  return (
    <div className="sp-demo-stage sp-preflight-handoff">
      <div className="sp-preflight-handoff__heading">
        <EntryModeBadge>
          {cvAssisted ? "CV-assisted" : "Conversation-first"}
        </EntryModeBadge>
        <p className="sp-eyebrow">Ready for voice setup</p>
        <h1>Your first interview is prepared.</h1>
        <p className="sp-demo-stage__lead">
          {cvAssisted
            ? "Pilot will use the grounded CV plan as a starting point, then ask the candidate to confirm or correct every detail."
            : "Pilot will begin broadly and build the conversation from what you say. No CV was needed."}
        </p>
      </div>
      <div className="sp-preflight-handoff__body">
        <Card className="sp-preflight-handoff__summary" tone="soft">
          <p className="sp-eyebrow">What Pilot will use</p>
          <h2>
            {cvAssisted
              ? "CV context plus the candidate's answers"
              : "Your answers in this conversation"}
          </h2>
          <ul>
            <li>A role-neutral first-round HR conversation.</li>
            <li>
              {cvAssisted
                ? "CV facts stay provisional until the candidate confirms them."
                : "Notes grounded only in what you say."}
            </li>
            <li>Your chosen role—or an undecided starting point.</li>
          </ul>
        </Card>
        <Card className="sp-preflight-handoff__next">
          <div>
            <p className="sp-eyebrow">Up next</p>
            <h2>Check consent and your microphone.</h2>
            <p>
              Nothing is listening yet. Voice access begins only after you
              review the disclosure and choose to continue.
            </p>
          </div>
        </Card>
      </div>
      <ButtonGroup className="sp-preflight-handoff__actions">
        <Button onClick={onBack} variant="secondary">
          {cvAssisted ? "Back to interview plan" : "Change starting option"}
        </Button>
      </ButtonGroup>
    </div>
  );
}
