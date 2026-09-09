import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CvStage } from "./cv-stage";
import {
  extractPdfText,
  fetchSampleCvFile,
  type ExtractedPdfText,
} from "./extract-pdf-text";
import { CvPdfError } from "./pdf-validation";

vi.mock("./extract-pdf-text", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./extract-pdf-text")>();
  return {
    ...actual,
    extractPdfText: vi.fn(),
    fetchSampleCvFile: vi.fn(),
  };
});

const extractedResult: ExtractedPdfText = {
  text: "Synthetic extracted CV text that is long enough for analysis.",
  pageCount: 1,
  characterCount: 62,
};

const confirmedVacancyTitles = [
  "Frontend Developer",
  "Backend Developer",
] as const;

function syntheticPdf(name = "synthetic.pdf") {
  return new File(["%PDF-1.7 synthetic"], name, {
    type: "application/pdf",
  });
}

describe("CvStage", () => {
  const mockedExtractPdfText = vi.mocked(extractPdfText);
  const mockedFetchSampleCvFile = vi.mocked(fetchSampleCvFile);

  beforeEach(() => {
    mockedExtractPdfText.mockReset();
    mockedFetchSampleCvFile.mockReset();
  });

  it("offers accessible picker, drop, privacy, limits, sample, and back actions", () => {
    render(
      <CvStage
        confirmedVacancyTitles={confirmedVacancyTitles}
        onReturnToChoices={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Bring a synthetic CV" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Choose PDF file")).toHaveAttribute(
      "accept",
      ".pdf,application/pdf",
    );
    expect(screen.getByText(/5 MB maximum · 8 pages maximum/)).toBeVisible();
    expect(screen.getByText(/never uploaded/)).toBeVisible();
    expect(screen.getByText("Frontend Developer")).toBeVisible();
    expect(screen.getByText("Backend Developer")).toBeVisible();
    expect(screen.getByRole("button", { name: "Use sample CV" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Back to entry choices" }),
    ).toBeEnabled();
  });

  it("runs a selected file through extraction and releases retained text on reset", async () => {
    const onTextCleared = vi.fn<() => void>();
    const onTextReady =
      vi.fn<(result: ExtractedPdfText, releaseText: () => void) => void>();
    mockedExtractPdfText.mockImplementation((_file, options) => {
      if (!options) {
        throw new Error("Expected extraction options.");
      }
      options.onProgress?.("checking");
      options.onProgress?.("preparing");
      return Promise.resolve(extractedResult);
    });
    render(
      <CvStage
        confirmedVacancyTitles={confirmedVacancyTitles}
        onReturnToChoices={vi.fn()}
        onTextCleared={onTextCleared}
        onTextReady={onTextReady}
      />,
    );

    const file = syntheticPdf();
    fireEvent.change(screen.getByLabelText("Choose PDF file"), {
      target: { files: [file] },
    });

    expect(
      await screen.findByRole("heading", {
        name: "Your PDF passed the local checks.",
      }),
    ).toBeVisible();
    const selectedExtractionCall = mockedExtractPdfText.mock.calls[0];
    expect(selectedExtractionCall?.[0]).toBe(file);
    expect(selectedExtractionCall?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(onTextReady).toHaveBeenCalledOnce();
    expect(onTextReady.mock.calls[0]?.[0]).toBe(extractedResult);
    expect(onTextReady.mock.calls[0]?.[1]).toBeTypeOf("function");
    expect(screen.queryByText(extractedResult.text)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Use another PDF" }));
    expect(onTextCleared).toHaveBeenCalledOnce();
    expect(
      screen.queryByText("Your PDF passed the local checks."),
    ).not.toBeInTheDocument();
  });

  it("fetches the public sample and sends it through the same extraction service", async () => {
    const sample = syntheticPdf("screenpilot-sample-cv.pdf");
    mockedFetchSampleCvFile.mockResolvedValue(sample);
    mockedExtractPdfText.mockResolvedValue(extractedResult);
    render(
      <CvStage
        confirmedVacancyTitles={confirmedVacancyTitles}
        onReturnToChoices={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Use sample CV" }));

    expect(
      await screen.findByText("Your PDF passed the local checks."),
    ).toBeVisible();
    const sampleFetchCall = mockedFetchSampleCvFile.mock.calls[0];
    const sampleExtractionCall = mockedExtractPdfText.mock.calls[0];
    expect(sampleFetchCall?.[0]).toBeInstanceOf(AbortSignal);
    expect(sampleExtractionCall?.[0]).toBe(sample);
    expect(sampleExtractionCall?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects a multi-file drop before extraction and keeps all recovery paths", async () => {
    render(
      <CvStage
        confirmedVacancyTitles={confirmedVacancyTitles}
        onReturnToChoices={vi.fn()}
      />,
    );

    fireEvent.drop(screen.getByTestId("cv-dropzone"), {
      dataTransfer: {
        files: [syntheticPdf("first.pdf"), syntheticPdf("second.pdf")],
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Choose one PDF",
    );
    expect(mockedExtractPdfText).not.toHaveBeenCalled();
    for (const sampleButton of screen.getAllByRole("button", {
      name: "Use sample CV",
    })) {
      expect(sampleButton).toBeEnabled();
    }
    expect(
      screen.getByRole("button", { name: "Return to choices" }),
    ).toBeEnabled();
    expect(screen.getByLabelText("Choose PDF file")).toBeEnabled();
  });

  it("aborts active PDF work when the stage unmounts", async () => {
    let extractionSignal: AbortSignal | undefined;
    mockedExtractPdfText.mockImplementation((_file, options) => {
      if (!options) {
        throw new Error("Expected extraction options.");
      }
      return new Promise((_resolve, reject) => {
        extractionSignal = options.signal;
        options.signal?.addEventListener(
          "abort",
          () => {
            reject(new CvPdfError("aborted"));
          },
          { once: true },
        );
      });
    });
    const { unmount } = render(
      <CvStage
        confirmedVacancyTitles={confirmedVacancyTitles}
        onReturnToChoices={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Choose PDF file"), {
      target: { files: [syntheticPdf()] },
    });
    await waitFor(() => {
      expect(extractionSignal).toBeDefined();
    });

    unmount();
    expect(extractionSignal?.aborted).toBe(true);
  });

  it("clears text published to its parent when the stage unmounts", async () => {
    const onTextCleared = vi.fn<() => void>();
    mockedExtractPdfText.mockResolvedValue(extractedResult);
    const { unmount } = render(
      <CvStage
        confirmedVacancyTitles={confirmedVacancyTitles}
        onReturnToChoices={vi.fn()}
        onTextCleared={onTextCleared}
        onTextReady={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Choose PDF file"), {
      target: { files: [syntheticPdf()] },
    });
    expect(
      await screen.findByText("Your PDF passed the local checks."),
    ).toBeVisible();

    unmount();
    expect(onTextCleared).toHaveBeenCalledOnce();
  });
});
