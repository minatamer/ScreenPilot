import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { DemoActionFooter } from "@/shared/ui/demo-action-footer";
import { DemoStageHeading } from "@/shared/ui/demo-stage-heading";

type InterviewCompletePlaceholderProps = Readonly<{
  onReturnHome: () => void;
}>;

export function InterviewCompletePlaceholder({
  onReturnHome,
}: InterviewCompletePlaceholderProps) {
  return (
    <div className="sp-demo-stage sp-demo-stage--with-footer sp-interview-complete">
      <DemoStageHeading
        pretitle="Interview complete"
        title="That’s the end of this demo interview."
      />
      <Card as="section" className="sp-interview-complete__card" tone="soft">
        <span aria-hidden="true" className="sp-interview-complete__mark">
          ✓
        </span>
        <div>
          <h2>Thanks for trying ScreenPilot.</h2>
          <p>
            The full review screen is not connected yet. This temporary session
            has been cleared safely.
          </p>
        </div>
      </Card>
      <DemoActionFooter note="No score or automated hiring decision was created.">
        <Button onClick={onReturnHome}>Return home</Button>
      </DemoActionFooter>
    </div>
  );
}
