import type { SessionFailure } from "@/features/session/demo-session.types";
import { Button, ButtonGroup } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ErrorPanel } from "@/shared/ui/error-panel";

type BootstrapStatusProps = Readonly<{
  failure?: SessionFailure | undefined;
  onExit?: (() => void) | undefined;
  onRetry: () => void;
}>;

export function BootstrapStatus({
  failure,
  onExit,
  onRetry,
}: BootstrapStatusProps) {
  if (failure) {
    return (
      <ErrorPanel
        actions={
          <ButtonGroup>
            {failure.retryable ? (
              <Button onClick={onRetry}>Retry</Button>
            ) : null}
            {onExit ? (
              <Button onClick={onExit} variant="quiet">
                Clear &amp; exit
              </Button>
            ) : null}
          </ButtonGroup>
        }
        title="The demo could not start"
      >
        <p>{failure.message}</p>
        <p>Nothing was saved.</p>
      </ErrorPanel>
    );
  }

  return (
    <Card aria-live="polite" className="sp-bootstrap-status" tone="soft">
      <span aria-hidden="true" className="sp-progress-spinner" />
      <div>
        <h2>Getting your demo ready</h2>
        <p>This should only take a moment.</p>
      </div>
    </Card>
  );
}
