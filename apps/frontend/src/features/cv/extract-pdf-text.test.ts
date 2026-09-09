/* eslint-disable import-x/no-nodejs-modules -- tests read committed synthetic fixtures only */
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  createPdfJsEngine,
  extractPdfTextWithEngine,
  fetchSampleCvFile,
  normalizeExtractedPdfText,
  type PdfJsEngine,
  SAMPLE_CV_URL,
  validateExtractedPdfText,
} from "./extract-pdf-text";
import {
  CV_PDF_LIMITS,
  type CvPdfErrorCode,
  type PdfInput,
  readValidatedPdfBytes,
  selectSinglePdf,
} from "./pdf-validation";

const samplePdfPath = resolve(
  process.cwd(),
  "public/fixtures/screenpilot-sample-cv.pdf",
);
const sampleExpectedTextPath = resolve(
  process.cwd(),
  "../../tests/fixtures/cv/screenpilot-sample-cv.expected.txt",
);
const pdfFixturePath = (filename: string) =>
  resolve(process.cwd(), "../../tests/fixtures/pdf", filename);

async function fixtureInput(
  fixturePath: string,
  type = "application/pdf",
): Promise<PdfInput> {
  const fixtureBytes = Uint8Array.from(await readFile(fixturePath));
  return {
    name: basename(fixturePath),
    size: fixtureBytes.byteLength,
    type,
    arrayBuffer: () => Promise.resolve(fixtureBytes.slice().buffer),
  };
}

function expectPdfError(
  promise: Promise<unknown>,
  code: CvPdfErrorCode,
): Promise<void> {
  return expect(promise).rejects.toMatchObject({ code });
}

function comparableText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

describe("browser-only PDF extraction", () => {
  let pdfJsEngine: PdfJsEngine;

  beforeAll(async () => {
    const pdfJs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfJsEngine = createPdfJsEngine(pdfJs);
  });

  it("extracts the public sample in page order through PDF.js", async () => {
    const phases: string[] = [];
    const sampleInput = await fixtureInput(samplePdfPath);
    const expectedText = await readFile(sampleExpectedTextPath, "utf8");

    const result = await extractPdfTextWithEngine(sampleInput, pdfJsEngine, {
      onProgress: (phase) => phases.push(phase),
    });

    expect(result.pageCount).toBe(1);
    expect(result.characterCount).toBe(result.text.length);
    expect(result.characterCount).toBeLessThanOrEqual(
      CV_PDF_LIMITS.maximumExtractedCharacters,
    );
    for (const expectedLine of expectedText.split(/\r?\n/)) {
      if (expectedLine.trim() !== "") {
        expect(comparableText(result.text)).toContain(
          comparableText(normalizeExtractedPdfText(expectedLine)),
        );
      }
    }
    expect(phases).toEqual(["reading", "checking", "preparing"]);
  });

  it("normalizes line endings, spacing, and control characters deterministically", () => {
    expect(
      normalizeExtractedPdfText(
        "  First\u0000\t line\r\n\r\n\r\n Second\u00a0line  ",
      ),
    ).toBe("First line\n\nSecond line");
  });

  it("fetches the public sample with a content-free GET request", async () => {
    const fetchSample = vi.fn<typeof fetch>();
    fetchSample.mockResolvedValue(
      new Response("%PDF-1.7 synthetic sample", {
        headers: { "Content-Type": "application/pdf" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchSample);

    const sampleFile = await fetchSampleCvFile();

    const fetchCall = fetchSample.mock.calls[0];
    expect(fetchCall?.[0]).toBe(SAMPLE_CV_URL);
    expect(fetchCall?.[1]?.method).toBe("GET");
    expect(fetchCall?.[1]).not.toHaveProperty("body");
    expect(sampleFile.name).toBe("screenpilot-sample-cv.pdf");
    expect(sampleFile.type).toBe("application/pdf");
  });

  it("rejects multiple files, wrong MIME hints, invalid headers, and oversized data before parsing", async () => {
    expect(() => selectSinglePdf([])).toThrow(
      expect.objectContaining({ code: "file_count" }),
    );
    expect(() =>
      selectSinglePdf([
        new File(["first"], "first.pdf", { type: "application/pdf" }),
        new File(["second"], "second.pdf", { type: "application/pdf" }),
      ]),
    ).toThrow(expect.objectContaining({ code: "file_count" }));

    const unread = vi.fn<() => Promise<ArrayBuffer>>();
    await expectPdfError(
      readValidatedPdfBytes({
        arrayBuffer: unread,
        name: "not-a-pdf.txt",
        size: 20,
        type: "text/plain",
      }),
      "wrong_type",
    );
    await expectPdfError(
      readValidatedPdfBytes({
        arrayBuffer: unread,
        name: "large.pdf",
        size: CV_PDF_LIMITS.maximumBytes + 1,
        type: "application/pdf",
      }),
      "oversized",
    );
    expect(unread).not.toHaveBeenCalled();

    const invalidHeader = new TextEncoder().encode("plain text");
    await expectPdfError(
      readValidatedPdfBytes({
        arrayBuffer: () => Promise.resolve(invalidHeader.buffer),
        name: "invalid.pdf",
        size: invalidHeader.byteLength,
        type: "",
      }),
      "invalid_signature",
    );
  });

  it.each([
    ["empty.pdf", "empty"],
    ["image-only.pdf", "image_only"],
    ["password-protected.pdf", "protected"],
    ["too-many-pages.pdf", "too_many_pages"],
  ] as const)("rejects %s with %s recovery", async (filename, code) => {
    const fixture = await fixtureInput(pdfFixturePath(filename));
    await expectPdfError(extractPdfTextWithEngine(fixture, pdfJsEngine), code);
  });

  it("maps a malformed PDF and an aborted read to stable local errors", async () => {
    const malformedBytes = new TextEncoder().encode("%PDF-1.7\nnot a document");
    const malformed: PdfInput = {
      arrayBuffer: () => Promise.resolve(malformedBytes.buffer),
      name: "malformed.pdf",
      size: malformedBytes.byteLength,
      type: "application/pdf",
    };
    await expectPdfError(
      extractPdfTextWithEngine(malformed, pdfJsEngine),
      "malformed",
    );

    const controller = new AbortController();
    controller.abort();
    await expectPdfError(
      extractPdfTextWithEngine(await fixtureInput(samplePdfPath), pdfJsEngine, {
        signal: controller.signal,
      }),
      "aborted",
    );
  });

  it("destroys active PDF.js work when cancellation happens after loading", async () => {
    const destroy = vi.fn<() => void>();
    const abortableEngine: PdfJsEngine = {
      ...pdfJsEngine,
      loadDocument(data) {
        const loadingTask = pdfJsEngine.loadDocument(data);
        return {
          ...loadingTask,
          destroy: () => {
            destroy();
            return loadingTask.destroy();
          },
        };
      },
    };
    const controller = new AbortController();

    await expectPdfError(
      extractPdfTextWithEngine(
        await fixtureInput(samplePdfPath),
        abortableEngine,
        {
          signal: controller.signal,
          onProgress(phase) {
            if (phase === "checking") {
              controller.abort();
            }
          },
        },
      ),
      "aborted",
    );
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("rejects normalized text beyond the analysis ceiling", () => {
    expect(() =>
      validateExtractedPdfText(
        "A".repeat(CV_PDF_LIMITS.maximumExtractedCharacters + 1),
        false,
      ),
    ).toThrow(expect.objectContaining({ code: "too_long" }));
  });
});
