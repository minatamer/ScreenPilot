import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { DemoActionFooter } from "@/shared/ui/demo-action-footer";
import { DemoStageHeading } from "@/shared/ui/demo-stage-heading";

type ProviderOperationsUnavailableProps = Readonly<{
  actionLabel: string;
  description: string;
  onAction: () => void;
  title: string;
}>;

export function ProviderOperationsUnavailable({
  actionLabel,
  description,
  onAction,
  title,
}: ProviderOperationsUnavailableProps) {
  return (
    <div className="sp-demo-stage sp-demo-stage--with-footer">
      <DemoStageHeading pretitle="Safety check" step={4} title={title} />
      <Card aria-live="polite" as="section" role="status" tone="soft">
        <p>{description}</p>
      </Card>
      <DemoActionFooter>
        <Button onClick={onAction} variant="secondary">
          {actionLabel}
        </Button>
      </DemoActionFooter>
    </div>
  );
}
