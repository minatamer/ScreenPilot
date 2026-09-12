import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FAKE_TURNSTILE_TOKEN } from "@/features/abuse-protection/turnstile-client";
import {
  extractPdfText,
  type ExtractedPdfText,
} from "@/features/cv/extract-pdf-text";
import { DemoSessionProvider } from "@/features/session/demo-session-provider";
import { SESSION_STORAGE_KEY } from "@/features/session/session-storage";
import { createConversationFirstPlanFixture } from "@/test/conversation-first-plan.fixture";
import { createCvAnalysisResponseFixture } from "@/test/cv-analysis.fixture";

import { DemoExperience } from "./demo-experience";

const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/features/cv/extract-pdf-text", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/cv/extract-pdf-text")>();
  return { ...actual, extractPdfText: vi.fn() };
});

const uploadedCvText = [
  "Morgan Lee",
  "Led product discovery and delivery for a subscription onboarding product.",
  "Worked with design, engineering, support, and commercial partners.",
]
  .join("\n")
  .repeat(5);

const uploadedCvExtraction: ExtractedPdfText = {
  text: uploadedCvText,
  pageCount: 2,
  characterCount: uploadedCvText.length,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function requestUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === "string") {
    return input;
  }
  return input instanceof URL ? input.href : input.url;
}

function requestJsonBody(
  options: RequestInit | undefined,
): Record<string, unknown> {
  if (typeof options?.body !== "string") {
    throw new TypeError("Expected a JSON request body.");
  }
  return JSON.parse(options.body) as Record<string, unknown>;
}

function bootstrapResponse() {
  return {
    abuseProtection: {
      appearance: "interaction-only",
      provider: "cloudflare_turnstile",
      siteKey: "",
    },
    limits: {
      callSeconds: 480,
      cvCharacters: 40_000,
      pdfBytes: 5_242_880,
      pdfPages: 8,
    },
    paidVoiceEnabled: false,
    privacyNoticeVersion: "2026-09-11",
    demoContext: {
      kind: "role_agnostic_first_stage_hr_screen",
      roleAvailability: "candidate_selected_synthetic_session_vacancy",
      employerFactsAvailable: false,
    },
  } as const;
}

function preparedResponse() {
  return {
    plan: createConversationFirstPlanFixture(),
    interviewGrant: "signed-conversation-first-grant",
    expiresAt: new Date(Date.now() + 15 * 60 * 1_000).toISOString(),
  };
}

describe("DemoExperience preparation paths", () => {
  beforeEach(() => {
    vi.mocked(extractPdfText).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("uses only bootstrap and deterministic preparation before shared preflight", async () => {
    const browserFetch = vi.fn<typeof fetch>((input) => {
      const url = requestUrl(input);
      if (url === "/v1/demo/bootstrap") {
        return Promise.resolve(jsonResponse(bootstrapResponse()));
      }
      if (url === "/v1/interview/prepare") {
        return Promise.resolve(jsonResponse(preparedResponse()));
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    vi.stubGlobal("fetch", browserFetch);

    render(
      <DemoSessionProvider>
        <DemoExperience />
      </DemoSessionProvider>,
    );

    const progress = screen.getByRole("group", { name: "Demo progress" });
    expect(progress.closest(".sp-demo-progress-panel")).not.toBeNull();
    expect(screen.getByText("Choose").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );
    const safeguardsFooter = screen.getByLabelText("Demo safeguards");
    expect(safeguardsFooter.tagName).toBe("FOOTER");
    expect(within(safeguardsFooter).getByText("Demo-only role")).toBeVisible();
    expect(
      within(safeguardsFooter).getByText(
        /Name any role or stay undecided.*only for this tab session/iu,
      ),
    ).toBeVisible();
    expect(
      within(safeguardsFooter).getByRole("button", {
        name: "Privacy details",
      }),
    ).toBeEnabled();
    const header = document.querySelector(".sp-site-header");
    expect(header).not.toBeNull();
    expect(
      within(header as HTMLElement).queryByRole("group", {
        name: "Demo progress",
      }),
    ).not.toBeInTheDocument();
    expect(
      within(header as HTMLElement).queryByRole("button", {
        name: /privacy/iu,
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear & exit" })).toBeEnabled();
    expect(
      screen.getByRole("link", { name: "ScreenPilot home" }),
    ).toHaveAttribute("href", "/");

    fireEvent.click(
      await screen.findByRole("button", { name: "Start without a CV" }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Your first interview is prepared.",
      }),
    ).toBeVisible();
    expect(screen.getByText("Conversation-first")).toBeVisible();
    expect(
      screen.getByText(/Notes grounded only in what you say/),
    ).toBeVisible();
    expect(screen.getByText("Preflight").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );

    expect(browserFetch).toHaveBeenCalledTimes(2);
    expect(browserFetch.mock.calls.map(([input]) => requestUrl(input))).toEqual(
      ["/v1/demo/bootstrap", "/v1/interview/prepare"],
    );
    const preparationOptions = browserFetch.mock.calls[1]?.[1];
    expect(preparationOptions?.method).toBe("POST");
    expect(preparationOptions?.credentials).toBe("same-origin");
    const requestBody = requestJsonBody(preparationOptions);
    expect(requestBody["entryMode"]).toBe("conversation_first");
    expect(requestBody["clientRequestId"]).toEqual(
      expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
      ),
    );

    await waitFor(() => {
      expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toContain(
        "signed-conversation-first-grant",
      );
    });
    const storedSession = JSON.parse(
      window.sessionStorage.getItem(SESSION_STORAGE_KEY) ?? "null",
    ) as Record<string, unknown>;
    expect(storedSession["entryMode"]).toBe("conversation_first");
    expect(storedSession["stage"]).toBe("preflight");
    expect(storedSession).not.toHaveProperty("cv");
    expect(storedSession).not.toHaveProperty("preferredName");
    expect(storedSession).not.toHaveProperty("rolePreference");
    expect(storedSession["screeningPlan"]).toMatchObject({
      entryMode: "conversation_first",
      branch: "discovery",
      roleClarification: { suggestedRole: null, cvFactIds: [] },
    });
  });

  it("shows a truthful slow transition and aborts when Back is used", async () => {
    let preparationSignal: AbortSignal | undefined;
    const browserFetch = vi.fn<typeof fetch>((input, options) => {
      if (input === "/v1/demo/bootstrap") {
        return Promise.resolve(jsonResponse(bootstrapResponse()));
      }
      preparationSignal = options?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        preparationSignal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    vi.stubGlobal("fetch", browserFetch);

    render(
      <DemoSessionProvider>
        <DemoExperience />
      </DemoSessionProvider>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Start without a CV" }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Preparing an open conversation",
      }),
    ).toBeVisible();
    expect(screen.getByText("Prepare").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(
      screen.getByRole("button", { name: "Privacy details" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Clear & exit" })).toBeEnabled();
    await waitFor(() => {
      expect(preparationSignal).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Change starting option" }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Bring a CV, or start with a conversation.",
      }),
    ).toBeVisible();
    expect(preparationSignal?.aborted).toBe(true);
  });

  it("retries in conversation-first with a new request ID after a typed failure", async () => {
    let preparationCount = 0;
    const requestIds: string[] = [];
    const browserFetch = vi.fn<typeof fetch>((input, options) => {
      if (requestUrl(input) === "/v1/demo/bootstrap") {
        return Promise.resolve(jsonResponse(bootstrapResponse()));
      }
      const body = requestJsonBody(options);
      const clientRequestId = body["clientRequestId"];
      if (typeof clientRequestId !== "string") {
        throw new TypeError("Expected a client request ID.");
      }
      requestIds.push(clientRequestId);
      preparationCount += 1;
      if (preparationCount === 1) {
        return Promise.resolve(
          jsonResponse(
            {
              error: {
                code: "PREPARATION_FAILED",
                message: "The interview could not be prepared. Try again.",
                retryable: true,
                requestId: "request-failed-1",
              },
            },
            503,
          ),
        );
      }
      return Promise.resolve(jsonResponse(preparedResponse()));
    });
    vi.stubGlobal("fetch", browserFetch);

    render(
      <DemoSessionProvider>
        <DemoExperience />
      </DemoSessionProvider>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Start without a CV" }),
    );
    expect(
      await screen.findByText(
        "The interview could not be prepared. Try again.",
      ),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(
      await screen.findByRole("heading", {
        name: "Your first interview is prepared.",
      }),
    ).toBeVisible();
    expect(requestIds).toHaveLength(2);
    expect(requestIds[0]).not.toBe(requestIds[1]);
    expect(
      screen.queryByRole("heading", { name: "Bring a synthetic CV" }),
    ).not.toBeInTheDocument();
  });

  it("returns from preflight to equal choices and clears to the landing route", async () => {
    const browserFetch = vi.fn<typeof fetch>((input) =>
      Promise.resolve(
        requestUrl(input) === "/v1/demo/bootstrap"
          ? jsonResponse(bootstrapResponse())
          : jsonResponse(preparedResponse()),
      ),
    );
    vi.stubGlobal("fetch", browserFetch);

    render(
      <DemoSessionProvider>
        <DemoExperience />
      </DemoSessionProvider>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Start without a CV" }),
    );
    await screen.findByRole("heading", {
      name: "Your first interview is prepared.",
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Change starting option" }),
    );
    expect(
      await screen.findByRole("button", { name: "Use a CV" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Start without a CV" }),
    ).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Start without a CV" }));
    await screen.findByRole("heading", {
      name: "Your first interview is prepared.",
    });

    fireEvent.click(screen.getByRole("button", { name: "Privacy details" }));
    expect(
      screen.getByRole("dialog", { name: "What happens to your information" }),
    ).toHaveAttribute("open");
    expect(
      screen.getByText(/removed when you choose Clear & exit/iu),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    fireEvent.click(screen.getByRole("button", { name: "Clear & exit" }));
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  it("converges an uploaded CV through protected analysis and plan preview on shared preflight", async () => {
    const analysisResponse = createCvAnalysisResponseFixture();
    vi.mocked(extractPdfText).mockResolvedValue(uploadedCvExtraction);
    const browserFetch = vi.fn<typeof fetch>((input) => {
      const url = requestUrl(input);
      if (url === "/v1/demo/bootstrap") {
        return Promise.resolve(jsonResponse(bootstrapResponse()));
      }
      if (url === "/v1/cv/analyze") {
        return Promise.resolve(jsonResponse(analysisResponse));
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    vi.stubGlobal("fetch", browserFetch);

    render(
      <DemoSessionProvider>
        <DemoExperience />
      </DemoSessionProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Use a CV" }));
    fireEvent.change(screen.getByLabelText("Choose PDF file"), {
      target: {
        files: [
          new File(["%PDF-1.7 synthetic"], "uploaded-product-cv.pdf", {
            type: "application/pdf",
          }),
        ],
      },
    });

    expect(
      await screen.findByRole("heading", { name: "What the CV says" }),
    ).toBeVisible();
    expect(
      screen.getByText("Suggested from CV — confirm during the call"),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Product Manager" }),
    ).toBeVisible();
    expect(screen.getByText("Prepare").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );

    const analyzeOptions = browserFetch.mock.calls.find(
      ([input]) => requestUrl(input) === "/v1/cv/analyze",
    )?.[1];
    const analyzeRequest = requestJsonBody(analyzeOptions);
    expect(typeof analyzeRequest["clientRequestId"]).toBe("string");
    expect(analyzeRequest["clientRequestId"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
    );
    expect(analyzeRequest).toEqual({
      clientRequestId: analyzeRequest["clientRequestId"],
      cvText: uploadedCvText,
      turnstileToken: FAKE_TURNSTILE_TOKEN,
    });

    await waitFor(() => {
      expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toContain(
        analysisResponse.interviewGrant,
      );
    });
    const storedJson = window.sessionStorage.getItem(SESSION_STORAGE_KEY) ?? "";
    const storedSession = JSON.parse(storedJson) as Record<string, unknown>;
    expect(storedJson).not.toContain(uploadedCvText);
    expect(storedJson).not.toContain(FAKE_TURNSTILE_TOKEN);
    expect(storedJson).not.toContain("uploaded-product-cv.pdf");
    expect(storedJson).not.toContain("screenpilot-sample-cv.pdf");
    expect(storedSession).toMatchObject({
      stage: "plan_ready",
      entryMode: "cv_assisted",
      cv: analysisResponse.cv,
      screeningPlan: analysisResponse.plan,
      interviewGrant: analysisResponse.interviewGrant,
      interviewGrantExpiresAt: analysisResponse.expiresAt,
      cvAnalysisUsage: analysisResponse.usage,
    });
    expect(storedSession).not.toHaveProperty("rolePreference");

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      await screen.findByRole("heading", {
        name: "Your first interview is prepared.",
      }),
    ).toBeVisible();
    expect(screen.getByText("CV-assisted")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Back to interview plan" }),
    ).toBeEnabled();
    expect(screen.getByText("Preflight").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Back to interview plan" }),
    );
    expect(
      await screen.findByRole("heading", { name: "What the CV says" }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(
      await screen.findByRole("heading", {
        name: "Bring a CV, or start with a conversation.",
      }),
    ).toBeVisible();
    await waitFor(() => {
      const restartedJson =
        window.sessionStorage.getItem(SESSION_STORAGE_KEY) ?? "";
      expect(restartedJson).not.toContain(analysisResponse.interviewGrant);
      expect(restartedJson).not.toContain(
        analysisResponse.cv.facts[0]?.evidenceExcerpt,
      );
    });
  });
});
