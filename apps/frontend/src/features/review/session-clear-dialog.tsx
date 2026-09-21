"use client";

import { useId, useRef, useState } from "react";

import { Button } from "@/shared/ui/button";

type SessionClearDialogProps = Readonly<{
  onClear: () => boolean;
  triggerClassName?: string | undefined;
  triggerLabel?: string | undefined;
}>;

function openDialog(dialog: HTMLDialogElement | null): void {
  if (!dialog || dialog.open) {
    return;
  }
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function closeDialog(dialog: HTMLDialogElement | null): void {
  if (!dialog?.open) {
    return;
  }
  if (typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
}

export function SessionClearDialog({
  onClear,
  triggerClassName,
  triggerLabel = "Clear & exit",
}: SessionClearDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [clearFailed, setClearFailed] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <>
      {triggerClassName ? (
        <button
          aria-haspopup="dialog"
          className={triggerClassName}
          onClick={() => {
            setClearFailed(false);
            openDialog(dialogRef.current);
          }}
          type="button"
        >
          {triggerLabel}
        </button>
      ) : (
        <Button
          aria-haspopup="dialog"
          onClick={() => {
            setClearFailed(false);
            openDialog(dialogRef.current);
          }}
          variant="danger"
        >
          {triggerLabel}
        </Button>
      )}
      <dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className="sp-session-clear-dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeDialog(dialogRef.current);
          }
        }}
        ref={dialogRef}
      >
        <div className="sp-session-clear-dialog__content">
          <p className="sp-eyebrow">Private session</p>
          <h2 id={titleId}>Clear this interview and exit?</h2>
          <p id={descriptionId}>
            This removes the CV details, transcript, insight cards, and summary
            held by ScreenPilot in this browser tab. It cannot be undone.
          </p>
          {clearFailed ? (
            <p className="sp-session-clear-dialog__error" role="alert">
              ScreenPilot could not remove this session from the browser. Keep
              this tab open and retry, or close the tab to end access to its
              session data.
            </p>
          ) : null}
          <div className="sp-session-clear-dialog__actions">
            <Button
              autoFocus
              onClick={() => {
                closeDialog(dialogRef.current);
              }}
              variant="secondary"
            >
              Keep review
            </Button>
            <Button
              onClick={() => {
                if (!onClear()) {
                  setClearFailed(true);
                }
              }}
              variant="danger"
            >
              Clear session
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
