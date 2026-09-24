"use client";

import { useId, useRef } from "react";

import { Button } from "@/shared/ui/button";

import { PRIVACY_NOTICE_COPY } from "./privacy-copy";
import { PrivacyNotice } from "./privacy-notice";

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
              <p className="sp-eyebrow">{PRIVACY_NOTICE_COPY.eyebrow}</p>
              <h2 id={titleId}>{PRIVACY_NOTICE_COPY.title}</h2>
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
          <PrivacyNotice
            clearActionLabel={clearActionLabel}
            id={descriptionId}
            variant="details"
          />
        </div>
      </dialog>
    </>
  );
}
