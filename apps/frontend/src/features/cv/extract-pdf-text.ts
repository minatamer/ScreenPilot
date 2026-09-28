import type { PDFDocumentProxy } from "pdfjs-dist";

import {
  CV_PDF_LIMITS,
  CvPdfError,
  type PdfInput,
  readValidatedPdfBytes,
} from "./pdf-validation";

export const CV_EXTRACTION_PROGRESS = {
  reading: "Reading PDF",
  checking: "Extracting text",
  preparing: "Preparing interview context",
} as const;

export type CvExtractionPhase = keyof typeof CV_EXTRACTION_PROGRESS;

export type ExtractedPdfText = Readonly<{
  text: string;
  pageCount: number;
  characterCount: number;
}>;

type PdfLoadingTask = Readonly<{
  document: Promise<PDFDocumentProxy>;
  setPasswordHandler: (
    handler: (
      updatePassword: (password: string) => void,
      reason: number,
    ) => void,
  ) => void;
  destroy: () => Promise<void>;
}>;

export type PdfJsEngine = Readonly<{
  loadDocument: (data: Uint8Array) => PdfLoadingTask;
  imageOperationIds: ReadonlySet<number>;
}>;

type PdfJsModule = typeof import("pdfjs-dist");

type ExtractPdfTextOptions = Readonly<{
  signal?: AbortSignal;
  onProgress?: (phase: CvExtractionPhase) => void;
}>;

const RAW_TEXT_SAFETY_MULTIPLIER = 2;
const MINIMUM_USEFUL_CHARACTERS = 20;

let browserPdfJsPromise: Promise<PdfJsModule> | undefined;

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new CvPdfError("aborted", signal.reason);
  }
}

function createImageOperationIds(pdfJs: Pick<PdfJsModule, "OPS">) {
  return new Set([
    pdfJs.OPS.paintImageMaskXObject,
    pdfJs.OPS.paintImageMaskXObjectGroup,
    pdfJs.OPS.paintImageMaskXObjectRepeat,
    pdfJs.OPS.paintImageXObject,
    pdfJs.OPS.paintImageXObjectRepeat,
    pdfJs.OPS.paintInlineImageXObject,
    pdfJs.OPS.paintInlineImageXObjectGroup,
    pdfJs.OPS.paintSolidColorImageMask,
  ]);
}

export function createPdfJsEngine(
  pdfJs: Pick<PdfJsModule, "getDocument" | "OPS">,
): PdfJsEngine {
  return {
    imageOperationIds: createImageOperationIds(pdfJs),
    loadDocument(data) {
      const loadingTask = pdfJs.getDocument({
        data,
        stopAtErrors: true,
        useSystemFonts: true,
        useWorkerFetch: false,
      });
      return {
        document: loadingTask.promise,
        destroy: () => loadingTask.destroy(),
        setPasswordHandler(handler) {
          loadingTask.onPassword = handler;
        },
      };
    },
  };
}

async function loadBrowserPdfJs(): Promise<PdfJsModule> {
  if (typeof window === "undefined") {
    throw new CvPdfError("browser_only");
  }

  browserPdfJsPromise ??= import("pdfjs-dist/webpack.mjs").catch(
    (error: unknown) => {
      browserPdfJsPromise = undefined;
      throw error;
    },
  );
  return browserPdfJsPromise;
}

export function normalizeExtractedPdfText(value: string): string {
  const normalizedLineEndings = value.replace(/\r\n?/g, "\n");
  const withoutControlCharacters = Array.from(
    normalizedLineEndings,
    (character) => {
      const characterCode = character.charCodeAt(0);
      const isAllowedWhitespace = characterCode === 9 || characterCode === 10;
      const isControlCharacter =
        characterCode < 32 || (characterCode >= 127 && characterCode <= 159);
      return isAllowedWhitespace || !isControlCharacter ? character : "";
    },
  ).join("");

  return withoutControlCharacters
    .normalize("NFC")
    .replace(/\u00a0/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function assertTextLength(text: string): void {
  if (text.length > CV_PDF_LIMITS.maximumExtractedCharacters) {
    throw new CvPdfError("too_long");
  }
}

function isUsefulText(text: string): boolean {
  return (
    (text.match(/[\p{Letter}\p{Number}]/gu)?.length ?? 0) >=
    MINIMUM_USEFUL_CHARACTERS
  );
}

export function validateExtractedPdfText(
  value: string,
  containsImages: boolean,
): string {
  const text = normalizeExtractedPdfText(value);
  assertTextLength(text);
  if (!isUsefulText(text)) {
    throw new CvPdfError(containsImages ? "image_only" : "empty");
  }
  return text;
}

async function extractOrderedText(
  document: PDFDocumentProxy,
  signal?: AbortSignal,
): Promise<string> {
  const pageTexts: string[] = [];
  let rawCharacterCount = 0;

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    throwIfAborted(signal);
    const page = await document.getPage(pageNumber);
    throwIfAborted(signal);
    const textContent = await page.getTextContent({
      disableNormalization: false,
      includeMarkedContent: false,
    });
    throwIfAborted(signal);
    const pageChunks: string[] = [];

    for (const textPart of textContent.items) {
      if (!("str" in textPart)) {
        continue;
      }
      rawCharacterCount += textPart.str.length;
      if (
        rawCharacterCount >
        CV_PDF_LIMITS.maximumExtractedCharacters * RAW_TEXT_SAFETY_MULTIPLIER
      ) {
        throw new CvPdfError("too_long");
      }
      pageChunks.push(textPart.str, textPart.hasEOL ? "\n" : " ");
    }

    pageTexts.push(normalizeExtractedPdfText(pageChunks.join("")));
    assertTextLength(normalizeExtractedPdfText(pageTexts.join("\n\n")));
  }

  return normalizeExtractedPdfText(pageTexts.join("\n\n"));
}

async function documentContainsImages(
  document: PDFDocumentProxy,
  imageOperationIds: ReadonlySet<number>,
  signal?: AbortSignal,
): Promise<boolean> {
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    throwIfAborted(signal);
    const page = await document.getPage(pageNumber);
    throwIfAborted(signal);
    const operatorList = await page.getOperatorList();
    throwIfAborted(signal);
    if (
      operatorList.fnArray.some((operation) => imageOperationIds.has(operation))
    ) {
      return true;
    }
  }
  return false;
}

function mapPdfJsFailure(error: unknown, signal?: AbortSignal): CvPdfError {
  if (error instanceof CvPdfError) {
    return error;
  }
  if (signal?.aborted) {
    return new CvPdfError("aborted", signal.reason);
  }
  if (error instanceof Error && error.name === "PasswordException") {
    return new CvPdfError("protected", error);
  }
  return new CvPdfError("malformed", error);
}

export async function extractPdfTextWithEngine(
  file: PdfInput,
  pdfJsEngine: PdfJsEngine,
  options: ExtractPdfTextOptions = {},
): Promise<ExtractedPdfText> {
  options.onProgress?.("reading");
  const bytes = await readValidatedPdfBytes(file, options.signal);
  const loadingTask = pdfJsEngine.loadDocument(bytes);
  let destroyPromise: Promise<void> | undefined;
  const destroyLoadingTask = () => {
    destroyPromise ??= loadingTask.destroy();
    return destroyPromise;
  };
  let rejectProtectedDocument: ((error: CvPdfError) => void) | undefined;
  let rejectAbortedDocument: ((error: CvPdfError) => void) | undefined;
  const protectedDocument = new Promise<never>((_resolve, reject) => {
    rejectProtectedDocument = reject;
  });
  const abortedDocument = new Promise<never>((_resolve, reject) => {
    rejectAbortedDocument = reject;
  });
  const abortListener = () => {
    rejectAbortedDocument?.(new CvPdfError("aborted", options.signal?.reason));
    void destroyLoadingTask();
  };

  loadingTask.setPasswordHandler(() => {
    rejectProtectedDocument?.(new CvPdfError("protected"));
  });
  options.signal?.addEventListener("abort", abortListener, { once: true });

  try {
    const document = await Promise.race([
      loadingTask.document,
      protectedDocument,
      abortedDocument,
    ]);
    throwIfAborted(options.signal);
    if (document.numPages > CV_PDF_LIMITS.maximumPages) {
      throw new CvPdfError("too_many_pages");
    }

    options.onProgress?.("checking");
    const extractedText = await extractOrderedText(document, options.signal);
    throwIfAborted(options.signal);
    const containsImages = isUsefulText(extractedText)
      ? false
      : await documentContainsImages(
          document,
          pdfJsEngine.imageOperationIds,
          options.signal,
        );
    const text = validateExtractedPdfText(extractedText, containsImages);

    options.onProgress?.("preparing");
    return {
      text,
      pageCount: document.numPages,
      characterCount: text.length,
    };
  } catch (error) {
    throw mapPdfJsFailure(error, options.signal);
  } finally {
    options.signal?.removeEventListener("abort", abortListener);
    await destroyLoadingTask();
  }
}

export async function extractPdfText(
  file: PdfInput,
  options: ExtractPdfTextOptions = {},
): Promise<ExtractedPdfText> {
  const pdfJs = await loadBrowserPdfJs();
  return extractPdfTextWithEngine(file, createPdfJsEngine(pdfJs), options);
}
