import type { SessionFailure } from "@/features/session/demo-session.types";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ErrorPanel } from "@/shared/ui/error-panel";

type BootstrapStatusProps = Readonly<{
  failure?: SessionFailure | undefined;
  onRetry: () => void;
}>;

export function BootstrapStatus({ failure, onRetry }: BootstrapStatusProps) {
  if (failure) {
    return (
      <ErrorPanel
        actions={
          failure.retryable ? (
            <Button onClick={onRetry} variant="secondary">
              Retry session setup
            </Button>
          ) : undefined
        }
        title="The private demo session could not open"
      >
        <p>{failure.message}</p>
        <p>
          ScreenPilot remains a stateless demo: no candidate profile or hidden
          application record was created.
        </p>
      </ErrorPanel>
    );
  }

  return (
    <Card aria-live="polite" className="sp-bootstrap-status" tone="soft">
      <span aria-hidden="true" className="sp-progress-spinner" />
      <div>
        <h2>Opening a private browser session</h2>
        <p>Nothing about a candidate is being sent or stored.</p>
      </div>
    </Card>
  );
}
