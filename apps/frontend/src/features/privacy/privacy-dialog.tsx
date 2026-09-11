"use client";

import { useId, useRef } from "react";

import { Button } from "@/shared/ui/button";

type PrivacyDialogProps = Readonly<{
  triggerLabel?: string;
}>;

function openDialog(dialog: HTMLDialogElement | null) {
  if (!dialog || dialog.open) {
    return;
  }

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    return;
  }

  dialog.setAttribute("open", "");
}

function closeDialog(dialog: HTMLDialogElement | null) {
  if (!dialog?.open) {
    return;
  }

  if (typeof dialog.close === "function") {
    dialog.close();
    return;
  }

  dialog.removeAttribute("open");
}

export function PrivacyDialog({
  triggerLabel = "Privacy",
}: PrivacyDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <>
      <button
        aria-haspopup="dialog"
        className="sp-header-link"
        onClick={() => {
          openDialog(dialogRef.current);
        }}
        type="button"
      >
        {triggerLabel}
      </button>
      <dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className="sp-privacy-dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeDialog(dialogRef.current);
          }
        }}
        ref={dialogRef}
      >
        <div className="sp-privacy-dialog__content">
          <div className="sp-privacy-dialog__heading">
            <div>
              <p className="sp-eyebrow">Private, disposable demo</p>
              <h2 id={titleId}>Privacy and demo limits</h2>
            </div>
            <Button
              autoFocus
              onClick={() => {
                closeDialog(dialogRef.current);
              }}
              variant="quiet"
            >
              Close
            </Button>
          </div>
          <div className="sp-privacy-dialog__body" id={descriptionId}>
            <p>
              ScreenPilot has no account or candidate history. Structured demo
              data stays in this browser tab for at most two hours and is
              removed when you choose Clear session.
            </p>
            <ul>
              <li>
                A CV and its extracted text stay in memory only while preparing
                the screening; the original file is never uploaded or saved by
                ScreenPilot.
              </li>
              <li>
                Conversation-first uses your answers—not a document—as local
                transcript and insight evidence.
              </li>
              <li>
                Before voice begins, the demo separately explains AI voice,
                transcription, provider processing, microphone access, and the
                eight-minute limit.
              </li>
              <li>
                ScreenPilot does not record audio or make an automated hiring
                decision.
              </li>
            </ul>
          </div>
        </div>
      </dialog>
    </>
  );
}
