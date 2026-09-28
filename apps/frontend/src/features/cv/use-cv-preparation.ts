"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AnalyzeCvResponse } from "@screenpilot/contracts/api/cv-analysis";

import type { ManagedTurnstileFailure } from "@/features/abuse-protection/managed-turnstile-gate";
import type {
  DemoStage,
  SessionFailure,
} from "@/features/session/demo-session.types";
import {
  analyzeCv,
  isAbortError,
  ScreenPilotApiError,
} from "@/shared/api/screenpilot-api";

import {
  extractPdfText,
  type CvExtractionPhase,
  type ExtractedPdfText,
} from "./extract-pdf-text";
import {
  asCvPdfError,
  CV_PDF_ERROR_COPY,
  type CvPdfError,
  type PdfInput,
  selectSinglePdf,
} from "./pdf-validation";

export type CvWorkflowStage = Extract<
  DemoStage,
  "awaiting_cv" | "extracting_cv" | "analyzing_cv"
>;

type CvDocumentMetadata = Readonly<{
  name: string;
  size: number;
}>;

type ExtractedCv = Readonly<{
  document: CvDocumentMetadata;
  result: ExtractedPdfText;
}>;

type CvPreparationState =
  | Readonly<{ status: "idle" }>
  | Readonly<{
      status: "extracting";
      phase: CvExtractionPhase;
      document?: CvDocumentMetadata;
    }>
  | Readonly<{ status: "awaiting_challenge"; extractedCv: ExtractedCv }>
  | Readonly<{
      status: "analyzing";
      phase: "checking" | "planning";
      extractedCv: ExtractedCv;
    }>
  | Readonly<{ status: "analysis_error"; extractedCv: ExtractedCv }>
  | Readonly<{ status: "pdf_error"; error: CvPdfError }>
  | Readonly<{ status: "complete" }>;

export type CvAnalyzer = typeof analyzeCv;

type UseCvPreparationOptions = Readonly<{
  analyze?: CvAnalyzer;
  failure?: SessionFailure | undefined;
  onChooseAnotherCv: () => void;
  onExtractionStarted: () => void;
  onExtractionSucceeded: () => void;
  onFailure: (failure: SessionFailure) => void;
  onPrepared: (response: AnalyzeCvResponse) => void;
  onRetry: () => void;
  onReturnToChoices: () => void;
  requestIdFactory?: () => string;
  stage: CvWorkflowStage;
}>;

const MINIMUM_EXTRACTION_FEEDBACK_MS = 900;
const MINIMUM_ANALYSIS_CHARACTERS = 500;
const ANALYSIS_PLANNING_LABEL_DELAY_MS = 900;

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
      window.clearTimeout(timeoutId);
      signal.removeEventListener("abort", finish);
      resolve();
    };

    const timeoutId = window.setTimeout(finish, remainingMs);
    signal.addEventListener("abort", finish, { once: true });
  });
}

function createClientRequestId(): string {
  return globalThis.crypto.randomUUID();
}

function documentMetadata(file: PdfInput): CvDocumentMetadata {
  return { name: file.name, size: file.size };
}

function extractionFailure(error: CvPdfError): SessionFailure {
  return {
    stage: "extracting_cv",
    code: `PDF_${error.code.toUpperCase()}`,
    message: CV_PDF_ERROR_COPY[error.code].message,
    retryable: error.code !== "browser_only",
  };
}

function analysisFailure(error: unknown): SessionFailure {
  if (error instanceof ScreenPilotApiError) {
    const missingSession = error.code === "ANONYMOUS_SESSION_REQUIRED";
    return {
      stage: "analyzing_cv",
      code: error.code,
      message: missingSession
        ? "Your private demo session is missing. Change the starting option and try again."
        : error.message,
      retryable:
        !missingSession &&
        (error.retryable || error.code.startsWith("TURNSTILE_")),
    };
  }
  return {
    stage: "analyzing_cv",
    code: "CV_ANALYSIS_UNREACHABLE",
    message:
      "ScreenPilot could not reach CV analysis. Check the connection and try again.",
    retryable: true,
  };
}

function challengeFailure(failure: ManagedTurnstileFailure): SessionFailure {
  return {
    stage: "analyzing_cv",
    code: failure.code,
    message: failure.message,
    retryable: failure.retryable,
  };
}

export function useCvPreparation({
  analyze = analyzeCv,
  failure,
  onChooseAnotherCv,
  onExtractionStarted,
  onExtractionSucceeded,
  onFailure,
  onPrepared,
  onRetry,
  onReturnToChoices,
  requestIdFactory = createClientRequestId,
  stage,
}: UseCvPreparationOptions) {
  const [state, setState] = useState<CvPreparationState>({ status: "idle" });
  const extractionControllerRef = useRef<AbortController | null>(null);
  const analysisControllerRef = useRef<AbortController | null>(null);

  const clearLocalCv = useCallback(() => {
    extractionControllerRef.current?.abort();
    extractionControllerRef.current = null;
    analysisControllerRef.current?.abort();
    analysisControllerRef.current = null;
    setState({ status: "idle" });
  }, []);

  useEffect(
    () => () => {
      extractionControllerRef.current?.abort();
      analysisControllerRef.current?.abort();
    },
    [],
  );

  const prepareReducerForExtraction = useCallback(() => {
    if (stage === "extracting_cv" && failure) {
      if (failure.retryable) {
        onRetry();
      } else {
        onChooseAnotherCv();
      }
    } else if (stage === "analyzing_cv") {
      onChooseAnotherCv();
    }
    onExtractionStarted();
  }, [failure, onChooseAnotherCv, onExtractionStarted, onRetry, stage]);

  const runExtraction = useCallback(
    async (loadFile: (signal: AbortSignal) => Promise<PdfInput>) => {
      extractionControllerRef.current?.abort();
      analysisControllerRef.current?.abort();
      prepareReducerForExtraction();
      const controller = new AbortController();
      extractionControllerRef.current = controller;
      setState({ status: "extracting", phase: "reading" });
      const progressStartedAt = Date.now();

      try {
        let activeFile: PdfInput | null = await loadFile(controller.signal);
        const document = documentMetadata(activeFile);
        setState({ status: "extracting", phase: "reading", document });
        const result = await extractPdfText(activeFile, {
          signal: controller.signal,
          onProgress: (phase) => {
            if (!controller.signal.aborted) {
              setState({ status: "extracting", phase, document });
            }
          },
        });
        activeFile = null;
        await waitForExtractionFeedback(progressStartedAt, controller.signal);
        if (controller.signal.aborted) {
          return;
        }

        const extractedCv = { document, result };
        setState({ status: "awaiting_challenge", extractedCv });
        onExtractionSucceeded();
        if (result.text.length < MINIMUM_ANALYSIS_CHARACTERS) {
          const tooShortFailure: SessionFailure = {
            stage: "analyzing_cv",
            code: "INVALID_CV_TEXT",
            message:
              "The extracted CV needs at least 500 characters before it can be analyzed. Choose a more complete text-based PDF.",
            retryable: false,
          };
          setState({ status: "analysis_error", extractedCv });
          onFailure(tooShortFailure);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          const pdfError = asCvPdfError(error);
          setState({ status: "pdf_error", error: pdfError });
          onFailure(extractionFailure(pdfError));
        }
      } finally {
        if (extractionControllerRef.current === controller) {
          extractionControllerRef.current = null;
        }
      }
    },
    [onExtractionSucceeded, onFailure, prepareReducerForExtraction],
  );

  const runAnalysis = useCallback(
    async (extractedCv: ExtractedCv, turnstileToken: string) => {
      analysisControllerRef.current?.abort();
      const controller = new AbortController();
      analysisControllerRef.current = controller;
      setState({ status: "analyzing", phase: "checking", extractedCv });
      const planningLabelTimer = window.setTimeout(() => {
        if (!controller.signal.aborted) {
          setState({ status: "analyzing", phase: "planning", extractedCv });
        }
      }, ANALYSIS_PLANNING_LABEL_DELAY_MS);

      try {
        const response = await analyze(
          {
            clientRequestId: requestIdFactory(),
            cvText: extractedCv.result.text,
            turnstileToken,
          },
          controller.signal,
        );
        if (controller.signal.aborted) {
          return;
        }
        setState({ status: "complete" });
        onPrepared(response);
      } catch (error) {
        if (!controller.signal.aborted && !isAbortError(error)) {
          setState({ status: "analysis_error", extractedCv });
          onFailure(analysisFailure(error));
        }
      } finally {
        window.clearTimeout(planningLabelTimer);
        if (analysisControllerRef.current === controller) {
          analysisControllerRef.current = null;
        }
      }
    },
    [analyze, onFailure, onPrepared, requestIdFactory],
  );

  const handleChallengeVerified = useCallback(
    (turnstileToken: string) => {
      if (state.status === "awaiting_challenge") {
        void runAnalysis(state.extractedCv, turnstileToken);
      }
    },
    [runAnalysis, state],
  );

  const handleChallengeFailure = useCallback(
    (turnstileFailure: ManagedTurnstileFailure) => {
      if (state.status !== "awaiting_challenge") {
        return;
      }
      setState({ status: "analysis_error", extractedCv: state.extractedCv });
      onFailure(challengeFailure(turnstileFailure));
    },
    [onFailure, state],
  );

  const handleFilesSelected = useCallback(
    (files: readonly File[]) => {
      try {
        const file = selectSinglePdf(files);
        void runExtraction(() => Promise.resolve(file));
      } catch (error) {
        setState({ status: "pdf_error", error: asCvPdfError(error) });
      }
    },
    [runExtraction],
  );

  const handleRetryAnalysis = useCallback(() => {
    if (state.status !== "analysis_error") {
      return;
    }
    onRetry();
    setState({ status: "awaiting_challenge", extractedCv: state.extractedCv });
  }, [onRetry, state]);

  const handleChooseAnotherCv = useCallback(() => {
    if (stage === "extracting_cv" || stage === "analyzing_cv") {
      onChooseAnotherCv();
    }
    clearLocalCv();
  }, [clearLocalCv, onChooseAnotherCv, stage]);

  const handleReturnToChoices = useCallback(() => {
    clearLocalCv();
    onReturnToChoices();
  }, [clearLocalCv, onReturnToChoices]);

  const showIntake = state.status === "idle" || state.status === "pdf_error";
  const extractedCv =
    state.status === "awaiting_challenge" ||
    state.status === "analyzing" ||
    state.status === "analysis_error"
      ? state.extractedCv
      : null;

  return {
    extractedCv,
    handleChallengeFailure,
    handleChallengeVerified,
    handleChooseAnotherCv,
    handleFilesSelected,
    handleRetryAnalysis,
    handleReturnToChoices,
    showIntake,
    state,
  };
}
