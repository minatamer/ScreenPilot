type MicrophoneIconProps = Readonly<{
  muted?: boolean | undefined;
}>;

export function MicrophoneIcon({ muted = false }: MicrophoneIconProps) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <rect
        height="10"
        rx="3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        width="7"
        x="8.5"
        y="3"
      />
      <path
        d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      {muted ? (
        <path
          d="m4 4 16 16"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.2"
        />
      ) : null}
    </svg>
  );
}
