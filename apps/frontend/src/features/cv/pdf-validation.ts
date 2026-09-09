export const CV_PDF_LIMITS = Object.freeze({
  maximumBytes: 5 * 1024 * 1024,
  maximumPages: 8,
  maximumExtractedCharacters: 40_000,
});

export type CvPdfErrorCode =
  | "aborted"
  | "browser_only"
  | "empty"
  | "file_count"
  | "image_only"
  | "invalid_signature"
  | "malformed"
  | "oversized"
  | "protected"
  | "sample_unavailable"
  | "too_long"
  | "too_many_pages"
  | "wrong_type";

export const CV_PDF_ERROR_COPY: Readonly<
  Record<CvPdfErrorCode, Readonly<{ title: string; message: string }>>
> = {
  aborted: {
    title: "PDF reading stopped",
    message: "Choose the file again when you are ready.",
  },
  browser_only: {
    title: "PDF reading is unavailable here",
    message: "Open this step in a supported browser and try again.",
  },
  empty: {
    title: "No useful text was found",
    message:
      "Choose another text-based PDF, use the sample CV, or return to the entry choices.",
  },
  file_count: {
    title: "Choose one PDF",
    message:
      "This demo reads one CV at a time. Choose a single PDF or use the sample CV.",
  },
  image_only: {
    title: "This PDF looks scanned",
    message:
      "OCR is not part of this demo. Choose a text-based PDF, use the sample CV, or return to the entry choices.",
  },
  invalid_signature: {
    title: "That file is not a valid PDF",
    message:
      "The file does not contain a PDF header. Choose another PDF or use the sample CV.",
  },
  malformed: {
    title: "This PDF could not be read",
    message:
      "The document may be damaged or incomplete. Choose another PDF or use the sample CV.",
  },
  oversized: {
    title: "That PDF is larger than 5 MB",
    message:
      "Choose a smaller text-based PDF, use the sample CV, or return to the entry choices.",
  },
  protected: {
    title: "Password-protected PDFs are not supported",
    message:
      "Remove the password from a synthetic copy, choose another PDF, or use the sample CV.",
  },
  sample_unavailable: {
    title: "The sample CV is unavailable",
    message: "Try the sample again or choose your own synthetic text PDF.",
  },
  too_long: {
    title: "This CV contains too much text",
    message:
      "The extracted text must be 40,000 characters or fewer. Choose a shorter PDF or use the sample CV.",
  },
  too_many_pages: {
    title: "This CV has more than 8 pages",
    message:
      "Choose a shorter text-based PDF, use the sample CV, or return to the entry choices.",
  },
  wrong_type: {
    title: "Choose a PDF file",
    message:
      "This demo accepts text-based PDFs only. Choose another file or use the sample CV.",
  },
};

export class CvPdfError extends Error {
  readonly code: CvPdfErrorCode;

  constructor(code: CvPdfErrorCode, cause?: unknown) {
    super(CV_PDF_ERROR_COPY[code].message, { cause });
    this.name = "CvPdfError";
    this.code = code;
  }
}

export type PdfInput = Pick<File, "arrayBuffer" | "name" | "size" | "type">;

const PDF_HEADER = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new CvPdfError("aborted", signal.reason);
  }
}

function hasPdfHeader(bytes: Uint8Array): boolean {
  return PDF_HEADER.every(
    (expectedByte, index) => bytes[index] === expectedByte,
  );
}

export function selectSinglePdf(files: ArrayLike<File>): File {
  if (files.length !== 1 || files[0] === undefined) {
    throw new CvPdfError("file_count");
  }
  return files[0];
}

export async function readValidatedPdfBytes(
  file: PdfInput,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  throwIfAborted(signal);

  const mimeType = file.type.split(";", 1)[0]?.trim().toLowerCase();
  if (mimeType !== "" && mimeType !== "application/pdf") {
    throw new CvPdfError("wrong_type");
  }
  if (file.size > CV_PDF_LIMITS.maximumBytes) {
    throw new CvPdfError("oversized");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  throwIfAborted(signal);

  if (bytes.byteLength > CV_PDF_LIMITS.maximumBytes) {
    throw new CvPdfError("oversized");
  }
  if (!hasPdfHeader(bytes)) {
    throw new CvPdfError("invalid_signature");
  }
  return bytes;
}

export function asCvPdfError(error: unknown): CvPdfError {
  return error instanceof CvPdfError
    ? error
    : new CvPdfError("malformed", error);
}
