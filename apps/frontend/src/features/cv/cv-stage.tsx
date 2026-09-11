"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button, ButtonGroup } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ErrorPanel } from "@/shared/ui/error-panel";
import { Stack } from "@/shared/ui/layout";

import { CvDropzone } from "./cv-dropzone";
import {
  CV_EXTRACTION_PROGRESS,
  extractPdfText,
  fetchSampleCvFile,
  type CvExtractionPhase,
  type ExtractedPdfText,
} from "./extract-pdf-text";
import {
  asCvPdfError,
  CV_PDF_ERROR_COPY,
  CvPdfError,
  type PdfInput,
  selectSinglePdf,
} from "./pdf-validation";

type CvStageState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "extracting"; phase: CvExtractionPhase }>
  | Readonly<{ status: "ready"; result: ExtractedPdfText }>
  | Readonly<{ status: "error"; error: CvPdfError }>;

type CvStageProps = Readonly<{
  onReturnToChoices: () => void;
  onTextCleared?: () => void;
  onTextReady?: (result: ExtractedPdfText, releaseText: () => void) => void;
}>;

const MINIMUM_EXTRACTION_FEEDBACK_MS = 900;

function waitForExtractionFeedback(
  startedAt: number,
  signal: AbortSignal,
): Promise<void> {
  const remainingMs = Math.max(
    0,
    MINIMUM_EXTRACTION_FEEDBACK_MS - (Date.now() - startedAt),
  );
  if (remainingMs === 0 || signal.aborted) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timeoutId);
      signal.removeEventListener("abort", finish);
      resolve();
    };

    const timeoutId = setTimeout(finish, remainingMs);
    signal.addEventListener("abort", finish, { once: true });
  });
}

export function CvStage({
  onReturnToChoices,
  onTextCleared,
  onTextReady,
}: CvStageProps) {
  const [state, setState] = useState<CvStageState>({ status: "idle" });
  const extractionControllerRef = useRef<AbortController | null>(null);
  const hasPublishedTextRef = useRef(false);
  const onTextClearedRef = useRef(onTextCleared);

  useEffect(() => {
    onTextClearedRef.current = onTextCleared;
  }, [onTextCleared]);

  const clearPublishedText = useCallback(() => {
    if (!hasPublishedTextRef.current) {
      return;
    }
    hasPublishedTextRef.current = false;
    onTextClearedRef.current?.();
  }, []);

  const releaseText = useCallback(() => {
    extractionControllerRef.current?.abort();
    extractionControllerRef.current = null;
    setState({ status: "idle" });
    clearPublishedText();
  }, [clearPublishedText]);

  useEffect(
    () => () => {
      extractionControllerRef.current?.abort();
      extractionControllerRef.current = null;
      clearPublishedText();
    },
    [clearPublishedText],
  );

  const runExtraction = useCallback(
    async (loadFile: (signal: AbortSignal) => Promise<PdfInput>) => {
      extractionControllerRef.current?.abort();
      clearPublishedText();
      const controller = new AbortController();
      extractionControllerRef.current = controller;
      setState({ status: "extracting", phase: "reading" });
      const progressStartedAt = Date.now();

      try {
        let activeFile: PdfInput | null = await loadFile(controller.signal);
        const result = await extractPdfText(activeFile, {
          signal: controller.signal,
          onProgress: (phase) => {
            if (!controller.signal.aborted) {
              setState({ status: "extracting", phase });
            }
          },
        });
        activeFile = null;
        await waitForExtractionFeedback(progressStartedAt, controller.signal);
        if (controller.signal.aborted) {
          return;
        }
        setState({ status: "ready", result });
        hasPublishedTextRef.current = onTextReady !== undefined;
        onTextReady?.(result, releaseText);
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({ status: "error", error: asCvPdfError(error) });
        }
      } finally {
        if (extractionControllerRef.current === controller) {
          extractionControllerRef.current = null;
        }
      }
    },
    [clearPublishedText, onTextReady, releaseText],
  );

  const handleFilesSelected = (files: readonly File[]) => {
    try {
      const file = selectSinglePdf(files);
      void runExtraction(() => Promise.resolve(file));
    } catch (error) {
      setState({ status: "error", error: asCvPdfError(error) });
    }
  };

  const handleSampleRequested = () => {
    void runExtraction((signal) => fetchSampleCvFile(signal));
  };

  const handleReturnToChoices = () => {
    releaseText();
    onReturnToChoices();
  };

  const isExtracting = state.status === "extracting";

  return (
    <Stack className="sp-cv-stage" gap="medium">
      <div className="sp-cv-stage__heading">
        <p className="sp-cv-stage__eyebrow">CV-assisted path</p>
        <h1>Prepare a focused screening conversation.</h1>
      </div>

      <div className="sp-cv-stage__body">
        <CvDropzone
          disabled={isExtracting}
          onFilesSelected={handleFilesSelected}
          onSampleRequested={handleSampleRequested}
        />

        <Card
          aria-label="Synthetic screening context"
          className="sp-cv-context"
          tone="soft"
        >
          <div>
            <p className="sp-cv-ready__status">Role stays flexible</p>
            <h2>Confirm it when you talk.</h2>
            <p>
              Use any role, or stay undecided. This is not a real application.
            </p>
          </div>
        </Card>
      </div>

      {state.status === "extracting" ? (
        <Card
          aria-live="polite"
          className="sp-cv-progress"
          data-phase={state.phase}
          tone="soft"
        >
          <div
            aria-hidden="true"
            className="sp-cv-progress__visual"
            data-testid="cv-extraction-animation"
          >
            <div className="sp-cv-progress__document">
              <span />
              <span />
              <span />
              <i />
            </div>
            <div className="sp-cv-progress__activity">
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="sp-cv-progress__copy">
            <span>Processing in this tab</span>
            <h2>{CV_EXTRACTION_PROGRESS[state.phase]}</h2>
            <p>The document remains in this tab while its text is checked.</p>
            <span aria-hidden="true" className="sp-cv-progress__track">
              <i />
            </span>
          </div>
        </Card>
      ) : null}

      {state.status === "error" ? (
        <ErrorPanel
          actions={
            <ButtonGroup>
              <Button onClick={handleSampleRequested} variant="secondary">
                Use sample CV
              </Button>
            </ButtonGroup>
          }
          title={CV_PDF_ERROR_COPY[state.error.code].title}
        >
          <p>{CV_PDF_ERROR_COPY[state.error.code].message}</p>
        </ErrorPanel>
      ) : null}

      {state.status === "ready" ? (
        <Card aria-live="polite" className="sp-cv-ready" tone="soft">
          <div>
            <p className="sp-cv-ready__status">CV text ready</p>
            <h2>Your PDF is ready for interview planning.</h2>
            <p>
              {state.result.pageCount}{" "}
              {state.result.pageCount === 1 ? "page" : "pages"}
              {" · "}
              {state.result.characterCount.toLocaleString()} extracted
              characters
            </p>
            <span>Focused interview topics are the next step.</span>
          </div>
          <ButtonGroup>
            <Button onClick={releaseText} variant="secondary">
              Use another PDF
            </Button>
          </ButtonGroup>
        </Card>
      ) : null}

      <ButtonGroup className="sp-cv-stage__footer-actions">
        <Button
          disabled={isExtracting}
          onClick={handleReturnToChoices}
          variant="primary"
        >
          Change starting option
        </Button>
      </ButtonGroup>
    </Stack>
  );
}
