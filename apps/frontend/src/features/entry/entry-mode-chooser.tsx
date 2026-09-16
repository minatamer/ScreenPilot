import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";

import { Button } from "@/shared/ui/button";
import { EntryModeBadge } from "@/shared/ui/entry-mode-badge";
import { EntryModeCard } from "@/shared/ui/entry-mode-card";

type EntryModeChooserProps = Readonly<{
  cvAssistedEnabled?: boolean;
  disabled?: boolean;
  onSelect: (entryMode: EntryMode) => void;
}>;

function DocumentIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M7 3.75h6.5L18 8.3v11.95H7V3.75Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M13.5 3.75V8.3H18M9.5 12h6M9.5 15.5h4.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ConversationIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M4.5 6.25h15v9.5h-8l-4.75 3v-3H4.5v-9.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M8 10h8M8 13h5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function EntryModeChooser({
  cvAssistedEnabled = true,
  disabled = false,
  onSelect,
}: EntryModeChooserProps) {
  return (
    <div className="sp-entry-choice-grid">
      <EntryModeCard
        actions={
          <Button
            disabled={disabled || !cvAssistedEnabled}
            onClick={() => {
              onSelect("cv_assisted");
            }}
          >
            {cvAssistedEnabled ? "Use a CV" : "CV analysis unavailable"}
          </Button>
        }
        badge={
          <EntryModeBadge>
            {cvAssistedEnabled
              ? "More tailored questions"
              : "Paused for this safety check"}
          </EntryModeBadge>
        }
        description={
          cvAssistedEnabled
            ? "Bring a CV for more focused follow-up questions. It stays in this tab."
            : "CV selection and analysis stay disabled while external actions are paused."
        }
        icon={<DocumentIcon />}
        title="Use a CV"
      />
      <EntryModeCard
        actions={
          <Button
            disabled={disabled}
            onClick={() => {
              onSelect("conversation_first");
            }}
          >
            Start without a CV
          </Button>
        }
        badge={<EntryModeBadge>Jump straight in</EntryModeBadge>}
        description="Skip the document. Pilot starts broadly and learns from your answers."
        icon={<ConversationIcon />}
        title="Start without a CV"
      />
    </div>
  );
}
