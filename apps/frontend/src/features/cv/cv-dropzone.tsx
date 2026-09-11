"use client";

import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

import { Button, ButtonGroup } from "@/shared/ui/button";

type CvDropzoneProps = Readonly<{
  disabled?: boolean;
  onFilesSelected: (files: readonly File[]) => void;
  onSampleRequested: () => void;
}>;

export function CvDropzone({
  disabled = false,
  onFilesSelected,
  onSampleRequested,
}: CvDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const requirementId = `${inputId}-requirements`;
  const privacyId = `${inputId}-privacy`;

  const submitFiles = (files: readonly File[]) => {
    setDragActive(false);
    onFilesSelected(files);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    submitFiles(Array.from(event.currentTarget.files ?? []));
    event.currentTarget.value = "";
  };

  const handleDragEvent = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) {
      setDragActive(event.type !== "dragleave");
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) {
      submitFiles(Array.from(event.dataTransfer.files));
    }
  };

  return (
    <section
      aria-labelledby={`${inputId}-title`}
      className="sp-cv-dropzone-shell"
    >
      <div
        className="sp-cv-dropzone"
        data-drag-active={dragActive || undefined}
        data-testid="cv-dropzone"
        onDragEnter={handleDragEvent}
        onDragLeave={handleDragEvent}
        onDragOver={handleDragEvent}
        onDrop={handleDrop}
      >
        <span aria-hidden="true" className="sp-cv-dropzone__icon">
          PDF
        </span>
        <div className="sp-cv-dropzone__copy">
          <h2 id={`${inputId}-title`}>Bring a synthetic CV</h2>
          <p>Drop one text-based PDF here or choose it from this device.</p>
        </div>
        <input
          accept=".pdf,application/pdf"
          aria-describedby={`${requirementId} ${privacyId}`}
          aria-label="Choose PDF file"
          className="sp-visually-hidden"
          disabled={disabled}
          id={inputId}
          onChange={handleInputChange}
          ref={inputRef}
          type="file"
        />
        <ButtonGroup className="sp-cv-dropzone__actions">
          <Button
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            variant="secondary"
          >
            Choose PDF
          </Button>
          <Button
            disabled={disabled}
            onClick={onSampleRequested}
            variant="quiet"
          >
            Use sample CV
          </Button>
        </ButtonGroup>
        <div className="sp-cv-dropzone__notes">
          <p id={requirementId}>PDF only · 5 MB maximum · 8 pages maximum</p>
          <p id={privacyId}>
            Use synthetic information. The PDF stays in this tab and is never
            uploaded.
          </p>
        </div>
      </div>
    </section>
  );
}
