type ScreenPilotMarkProps = Readonly<{
  href?: string;
}>;

function MarkArtwork() {
  return (
    <>
      <svg aria-hidden="true" className="sp-mark__artwork" viewBox="0 0 32 32">
        <rect fill="var(--sp-color-ink-950)" height="32" rx="9" width="32" />
        <path
          d="M7 9.5 25 5l-5.2 20-4.4-7.2L7 9.5Z"
          fill="var(--sp-color-coral-500)"
        />
        <path
          d="m11 11 8.5-2.2-5.8 6.3L11 11Z"
          fill="var(--sp-color-coral-100)"
        />
      </svg>
      <span aria-hidden="true" className="sp-mark__wordmark">
        ScreenPilot
      </span>
    </>
  );
}

export function ScreenPilotMark({ href }: ScreenPilotMarkProps) {
  if (href !== undefined) {
    return (
      <a aria-label="ScreenPilot home" className="sp-mark" href={href}>
        <MarkArtwork />
      </a>
    );
  }

  return (
    <span aria-label="ScreenPilot" className="sp-mark" role="img">
      <MarkArtwork />
    </span>
  );
}
