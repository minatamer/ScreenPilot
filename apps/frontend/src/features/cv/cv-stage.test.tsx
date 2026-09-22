import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AnalyzeCvRequest,
  AnalyzeCvResponse,
} from "@screenpilot/contracts/api/cv-analysis";

import type { ExecuteTurnstileChallenge } from "@/features/abuse-protection/turnstile-client";
import type {
  DemoStage,
  SessionFailure,
} from "@/features/session/demo-session.types";
import { ScreenPilotApiError } from "@/shared/api/screenpilot-api";
import {
  createCvAnalysisResponseFixture,
  TEST_PUBLIC_RUNTIME_CONFIG,
} from "@/test/cv-analysis.fixture";

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

const extractedText = [
  "Morgan Lee",
  "Product delivery experience across discovery, research, onboarding, and launch.",
  "Collaborated with design, engineering, support, and commercial partners.",
]
  .join("\n")
  .repeat(5);

const extractedResult: ExtractedPdfText = {
  text: extractedText,
  pageCount: 2,
  characterCount: extractedText.length,
};

function syntheticPdf(name = "synthetic.pdf") {
  return new File(["%PDF-1.7 synthetic"], name, {
    type: "application/pdf",
  });
}

type CvStageHarnessProps = Readonly<{
  analyze?: (
    input: AnalyzeCvRequest,
    signal: AbortSignal,
  ) => Promise<AnalyzeCvResponse>;
  executeChallenge?: ExecuteTurnstileChallenge;
  onPrepared?: (response: AnalyzeCvResponse) => void;
}>;

function CvStageHarness({
  analyze,
  executeChallenge,
  onPrepared = vi.fn(),
}: CvStageHarnessProps = {}) {
  const [stage, setStage] =
    useState<
      Extract<DemoStage, "awaiting_cv" | "extracting_cv" | "analyzing_cv">
    >("awaiting_cv");
  const [failure, setFailure] = useState<SessionFailure>();

  return (
    <CvStage
      {...(analyze ? { analyze } : {})}
      {...(executeChallenge ? { executeChallenge } : {})}
      failure={failure}
      onChooseAnotherCv={() => {
        setFailure(undefined);
        setStage("awaiting_cv");
      }}
      onExtractionStarted={() => {
        setFailure(undefined);
        setStage("extracting_cv");
      }}
      onExtractionSucceeded={() => {
        setStage("analyzing_cv");
      }}
      onFailure={setFailure}
      onPrepared={onPrepared}
      onRetry={() => {
        setFailure(undefined);
      }}
      onReturnToChoices={vi.fn()}
      providerOperationsEnabled
      requestIdFactory={() => "00000000-0000-4000-8000-000000000012"}
      runtimeConfig={TEST_PUBLIC_RUNTIME_CONFIG}
      stage={stage}
    />
  );
}

describe("CvStage", () => {
  const mockedExtractPdfText = vi.mocked(extractPdfText);
  const mockedFetchSampleCvFile = vi.mocked(fetchSampleCvFile);

  beforeEach(() => {
    mockedExtractPdfText.mockReset();
    mockedFetchSampleCvFile.mockReset();
  });

  it("fails closed before CV extraction, Turnstile, or analysis", () => {
    const executeChallenge = vi.fn<ExecuteTurnstileChallenge>();
    const analyze = vi.fn<NonNullable<CvStageHarnessProps["analyze"]>>();
    const onReturnToChoices = vi.fn();

    render(
      <CvStage
        analyze={analyze}
        executeChallenge={executeChallenge}
        onChooseAnotherCv={vi.fn()}
        onExtractionStarted={vi.fn()}
        onExtractionSucceeded={vi.fn()}
        onFailure={vi.fn()}
        onPrepared={vi.fn()}
        onRetry={vi.fn()}
        onReturnToChoices={onReturnToChoices}
        providerOperationsEnabled={false}
        runtimeConfig={{
          ...TEST_PUBLIC_RUNTIME_CONFIG,
          providerMode: "live",
        }}
        stage="awaiting_cv"
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "CV analysis is unavailable right now.",
      }),
    ).toBeVisible();
    expect(screen.queryByLabelText("Choose PDF file")).not.toBeInTheDocument();
    expect(executeChallenge).not.toHaveBeenCalled();
    expect(analyze).not.toHaveBeenCalled();
    expect(mockedExtractPdfText).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Change starting option" }),
    );
    expect(onReturnToChoices).toHaveBeenCalledOnce();
  });

  it("offers accessible picker, privacy, limits, sample, and role-neutral recovery", () => {
    render(<CvStageHarness />);

    expect(screen.getByText("Step 2 of 5 · CV-assisted path")).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Prepare a focused screening conversation.",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Bring a synthetic CV" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Choose PDF file")).toHaveAttribute(
      "accept",
      ".pdf,application/pdf",
    );
    expect(screen.getByText(/5 MB maximum · 8 pages maximum/)).toBeVisible();
    expect(
      screen.getByText("Use synthetic data. The PDF itself is never uploaded."),
    ).toBeVisible();
    expect(screen.getByText("Role stays flexible")).toBeVisible();
    expect(screen.getByText("We’ll suggest one from your CV.")).toBeVisible();
    expect(
      screen.getByText(
        "Confirm it, change it, or stay undecided when you talk.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByText(/This is not a real application/u),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Frontend Developer")).not.toBeInTheDocument();
    expect(screen.queryByText("Backend Developer")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use sample CV" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Change starting option" }),
    ).toBeEnabled();
  });

  it("runs upload extraction, one-time challenge, and analysis in order", async () => {
    const order: string[] = [];
    const executeChallenge = vi.fn<ExecuteTurnstileChallenge>(() => {
      order.push("turnstile");
      return Promise.resolve("one-time-token");
    });
    const response = createCvAnalysisResponseFixture();
    const analyze = vi.fn<NonNullable<CvStageHarnessProps["analyze"]>>(
      (_input, signal) => {
        signal.throwIfAborted();
        order.push("analysis");
        return Promise.resolve(response);
      },
    );
    const onPrepared = vi.fn();
    mockedExtractPdfText.mockImplementation((_file, options) => {
      options?.onProgress?.("checking");
      options?.onProgress?.("preparing");
      return Promise.resolve(extractedResult);
    });
    render(
      <CvStageHarness
        analyze={analyze}
        executeChallenge={executeChallenge}
        onPrepared={onPrepared}
      />,
    );

    const file = syntheticPdf("uploaded-product-cv.pdf");
    fireEvent.change(screen.getByLabelText("Choose PDF file"), {
      target: { files: [file] },
    });

    expect(
      await screen.findByRole("heading", { name: "Reading PDF" }),
    ).toBeVisible();
    await waitFor(() => {
      expect(onPrepared).toHaveBeenCalledWith(response);
    });

    expect(mockedExtractPdfText.mock.calls[0]?.[0]).toBe(file);
    expect(mockedExtractPdfText.mock.calls[0]?.[1]?.signal).toBeInstanceOf(
      AbortSignal,
    );
    expect(order).toEqual(["turnstile", "analysis"]);
    expect(executeChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ action: "cv_analyze", siteKey: "" }),
    );
    expect(analyze).toHaveBeenCalledWith(
      {
        clientRequestId: "00000000-0000-4000-8000-000000000012",
        cvText: extractedText,
        turnstileToken: "one-time-token",
      },
      expect.any(AbortSignal),
    );
    expect(screen.queryByText(extractedText)).not.toBeInTheDocument();
  });

  it("shows a theme loading indicator while provider analysis is in flight", async () => {
    mockedExtractPdfText.mockResolvedValue(extractedResult);
    const analyze = vi.fn<NonNullable<CvStageHarnessProps["analyze"]>>(
      (_input, signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => {
              reject(new DOMException("Aborted", "AbortError"));
            },
            { once: true },
          );
        }),
    );

    render(
      <CvStageHarness
        analyze={analyze}
        executeChallenge={() => Promise.resolve("one-time-token")}
      />,
    );

    fireEvent.change(screen.getByLabelText("Choose PDF file"), {
      target: { files: [syntheticPdf()] },
    });

    const heading = await screen.findByRole("heading", {
      name: "Checking CV details",
    });
    expect(heading.closest(".sp-card")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("cv-analysis-spinner")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByText("CV analysis in progress")).toBeVisible();
  });

  it("sends the bundled sample through the identical extraction path", async () => {
    const sample = syntheticPdf("screenpilot-sample-cv.pdf");
    mockedFetchSampleCvFile.mockResolvedValue(sample);
    mockedExtractPdfText.mockResolvedValue(extractedResult);
    const onPrepared = vi.fn();
    render(
      <CvStageHarness
        analyze={() => Promise.resolve(createCvAnalysisResponseFixture())}
        executeChallenge={() => Promise.resolve("sample-token")}
        onPrepared={onPrepared}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Use sample CV" }));

    await waitFor(() => {
      expect(onPrepared).toHaveBeenCalledOnce();
    });
    expect(mockedFetchSampleCvFile.mock.calls[0]?.[0]).toBeInstanceOf(
      AbortSignal,
    );
    expect(mockedExtractPdfText.mock.calls[0]?.[0]).toBe(sample);
    expect(mockedExtractPdfText.mock.calls[0]?.[1]?.signal).toBeInstanceOf(
      AbortSignal,
    );
  });

  it("gets a fresh challenge token and request ID for a safe analysis retry", async () => {
    mockedExtractPdfText.mockResolvedValue(extractedResult);
    const executeChallenge = vi
      .fn<ExecuteTurnstileChallenge>()
      .mockResolvedValueOnce("expired-token")
      .mockResolvedValueOnce("fresh-token");
    const analyze = vi
      .fn<NonNullable<CvStageHarnessProps["analyze"]>>()
      .mockRejectedValueOnce(
        new ScreenPilotApiError({
          code: "TURNSTILE_REJECTED",
          message: "The anti-abuse check expired or was rejected.",
          retryable: false,
        }),
      )
      .mockResolvedValueOnce(createCvAnalysisResponseFixture());
    const onPrepared = vi.fn();
    render(
      <CvStageHarness
        analyze={analyze}
        executeChallenge={executeChallenge}
        onPrepared={onPrepared}
      />,
    );

    fireEvent.change(screen.getByLabelText("Choose PDF file"), {
      target: { files: [syntheticPdf()] },
    });
    expect(
      await screen.findByText("The anti-abuse check expired or was rejected."),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Retry analysis" }));
    await waitFor(() => {
      expect(onPrepared).toHaveBeenCalledOnce();
    });
    expect(executeChallenge).toHaveBeenCalledTimes(2);
    expect(analyze.mock.calls.map(([input]) => input.turnstileToken)).toEqual([
      "expired-token",
      "fresh-token",
    ]);
  });

  it("keeps non-retryable CV text errors recoverable through another PDF", async () => {
    mockedExtractPdfText.mockResolvedValue({
      text: "too short",
      pageCount: 1,
      characterCount: 9,
    });
    const executeChallenge = vi.fn<ExecuteTurnstileChallenge>();
    render(<CvStageHarness executeChallenge={executeChallenge} />);

    fireEvent.change(screen.getByLabelText("Choose PDF file"), {
      target: { files: [syntheticPdf()] },
    });
    expect(
      await screen.findByText(/needs at least 500 characters/),
    ).toBeVisible();
    expect(executeChallenge).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Retry analysis" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Use another PDF" }));
    expect(screen.getByLabelText("Choose PDF file")).toBeEnabled();
  });

  it("rejects a multi-file drop before extraction", async () => {
    render(<CvStageHarness />);

    fireEvent.drop(screen.getByTestId("cv-dropzone"), {
      dataTransfer: {
        files: [syntheticPdf("first.pdf"), syntheticPdf("second.pdf")],
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Choose one PDF",
    );
    expect(mockedExtractPdfText).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Choose PDF file")).toBeEnabled();
  });

  it("aborts in-flight analysis when the CV stage unmounts", async () => {
    mockedExtractPdfText.mockResolvedValue(extractedResult);
    let analysisSignal: AbortSignal | undefined;
    const analyze = vi.fn<NonNullable<CvStageHarnessProps["analyze"]>>(
      (_input, signal) => {
        analysisSignal = signal;
        return new Promise((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => {
              reject(new DOMException("Aborted", "AbortError"));
            },
            { once: true },
          );
        });
      },
    );
    const { unmount } = render(
      <CvStageHarness
        analyze={analyze}
        executeChallenge={() => Promise.resolve("one-time-token")}
      />,
    );

    fireEvent.change(screen.getByLabelText("Choose PDF file"), {
      target: { files: [syntheticPdf()] },
    });
    await waitFor(() => {
      expect(analysisSignal).toBeDefined();
    });

    unmount();
    expect(analysisSignal?.aborted).toBe(true);
  });

  it("maps failed sample extraction and keeps picker recovery available", async () => {
    mockedFetchSampleCvFile.mockRejectedValue(
      new CvPdfError("sample_unavailable"),
    );
    render(<CvStageHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Use sample CV" }));

    expect(
      await screen.findByText("The sample CV is unavailable"),
    ).toBeVisible();
    expect(screen.getByLabelText("Choose PDF file")).toBeEnabled();
  });

  it("does not carry sample text into a later uploaded-CV attempt", async () => {
    const sample = syntheticPdf("screenpilot-sample-cv.pdf");
    const upload = syntheticPdf("uploaded-graphic-design-cv.pdf");
    const sampleText = "Synthetic sample placeholder context. ".repeat(20);
    const uploadedText = "Uploaded visual design evidence. ".repeat(20);
    mockedFetchSampleCvFile.mockResolvedValue(sample);
    mockedExtractPdfText.mockImplementation((file) => {
      const text = file.name === sample.name ? sampleText : uploadedText;
      return Promise.resolve({
        characterCount: text.length,
        pageCount: 1,
        text,
      });
    });
    const uploadedResponse = createCvAnalysisResponseFixture({
      displayName: "Avery Chen",
      planFocus: "visual design delivery",
      suggestedRole: "Graphic Designer",
    });
    const analyze = vi
      .fn<NonNullable<CvStageHarnessProps["analyze"]>>()
      .mockRejectedValueOnce(
        new ScreenPilotApiError({
          code: "OPENAI_TIMEOUT",
          message: "Analysis took too long.",
          retryable: true,
        }),
      )
      .mockResolvedValueOnce(uploadedResponse);
    const onPrepared = vi.fn();
    render(
      <CvStageHarness
        analyze={analyze}
        executeChallenge={() => Promise.resolve("fresh-token")}
        onPrepared={onPrepared}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Use sample CV" }));
    expect(await screen.findByText("Analysis took too long.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Use another PDF" }));
    fireEvent.change(screen.getByLabelText("Choose PDF file"), {
      target: { files: [upload] },
    });

    await waitFor(() => {
      expect(onPrepared).toHaveBeenCalledWith(uploadedResponse);
    });
    expect(analyze.mock.calls.map(([input]) => input.cvText)).toEqual([
      sampleText,
      uploadedText,
    ]);
    expect(analyze.mock.calls[1]?.[0].cvText).not.toContain(
      "sample placeholder",
    );
  });
});
