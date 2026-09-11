"use client";

import { useId, useRef } from "react";

import { Button } from "@/shared/ui/button";

type PrivacyDialogProps = Readonly<{
  clearActionLabel?: "Clear session" | "Clear & exit";
  triggerClassName?: string;
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
  clearActionLabel = "Clear session",
  triggerClassName = "sp-header-link",
  triggerLabel = "Privacy",
}: PrivacyDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <>
      <button
        aria-haspopup="dialog"
        className={triggerClassName}
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
              <p className="sp-eyebrow">Your privacy</p>
              <h2 id={titleId}>What happens to your information</h2>
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
              ScreenPilot does not create an account or candidate profile. Demo
              notes stay in this browser tab for at most two hours and are
              removed when you choose {clearActionLabel}.
            </p>
            <ul>
              <li>
                A CV and its extracted text stay in memory only while preparing
                the screening; the original file is never uploaded or saved by
                ScreenPilot.
              </li>
              <li>
                If you start without a CV, Pilot learns only from the answers
                you give during the conversation.
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
