import { PRIVACY_NOTICE_COPY } from "./privacy-copy";

type PrivacyNoticeProps =
  | Readonly<{
      clearActionLabel: "Clear session" | "Clear & exit";
      id?: string | undefined;
      variant: "details";
    }>
  | Readonly<{
      roleDisclosure: string;
      variant: "preflight";
    }>;

function PrivacyShieldIcon() {
  return (
    <span className="sp-preflight-fact__icon">
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path
          d="M12 3.5 19 6v5.5c0 4.4-2.7 7.4-7 9-4.3-1.6-7-4.6-7-9V6l7-2.5Z"
          stroke="currentColor"
          strokeLinejoin="round"
        />
        <path
          d="m9 12 2 2 4-4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function PrivacyNotice(props: PrivacyNoticeProps) {
  if (props.variant === "preflight") {
    return (
      <div className="sp-preflight-privacy-summary">
        <PrivacyShieldIcon />
        <div>
          <p>{PRIVACY_NOTICE_COPY.preflight.processing}</p>
          <p>
            {PRIVACY_NOTICE_COPY.preflight.syntheticData} {props.roleDisclosure}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="sp-privacy-dialog__body" id={props.id}>
      <p>
        {PRIVACY_NOTICE_COPY.details.sessionBeforeAction}{" "}
        {props.clearActionLabel}
        {PRIVACY_NOTICE_COPY.details.sessionAfterAction}
      </p>
      <ul>
        <li>{PRIVACY_NOTICE_COPY.details.cv}</li>
        <li>{PRIVACY_NOTICE_COPY.details.conversationFirst}</li>
        <li>{PRIVACY_NOTICE_COPY.details.voice}</li>
        <li>{PRIVACY_NOTICE_COPY.details.review}</li>
      </ul>
    </div>
  );
}
