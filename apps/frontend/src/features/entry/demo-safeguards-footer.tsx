import { PrivacyDialog } from "@/features/privacy/privacy-dialog";

export function DemoSafeguardsFooter() {
  return (
    <footer aria-label="Demo safeguards" className="sp-demo-safeguards-footer">
      <div className="sp-demo-safeguards-footer__intro">
        <span aria-hidden="true" className="sp-demo-safeguards-footer__pulse" />
        <div>
          <p>Private browser demo</p>
          <span>Try the interview without creating a candidate profile.</span>
        </div>
      </div>
      <ul>
        <li>
          <strong>Session only</strong>
          <span>Clear it when you are done</span>
        </li>
        <li>
          <strong>Notes, not scores</strong>
          <span>Your hiring team decides</span>
        </li>
        <li>
          <strong>Demo-only role</strong>
          <span>
            Name any role or stay undecided. That role lasts only for this tab
            session.
          </span>
        </li>
      </ul>
      <PrivacyDialog
        clearActionLabel="Clear & exit"
        triggerClassName="sp-demo-safeguards-footer__privacy"
        triggerLabel="Privacy details"
      />
    </footer>
  );
}
