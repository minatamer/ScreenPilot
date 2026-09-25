import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FAKE_TURNSTILE_TOKEN } from "@/features/abuse-protection/turnstile-client";
import {
  extractPdfText,
  type ExtractedPdfText,
} from "@/features/cv/extract-pdf-text";
import {
  DemoSessionContext,
  DemoSessionProvider,
} from "@/features/session/demo-session-provider";
import { createInitialDemoSessionState } from "@/features/session/demo-session.reducer";
import { SESSION_STORAGE_KEY } from "@/features/session/session-storage";
import { createConversationFirstPlanFixture } from "@/test/conversation-first-plan.fixture";
import { createCvAnalysisResponseFixture } from "@/test/cv-analysis.fixture";

import { DemoExperience } from "./demo-experience";
import { useDemoBootstrap } from "./use-demo-bootstrap";

const controlledBrowserBoundaries = vi.hoisted(() => ({
  elevenLabsBridge: vi.fn(() => null),
  openMicrophone: vi.fn(),
  stopMicrophone: vi.fn(),
  turnstile: vi.fn(),
}));

vi.mock(
  "@/features/abuse-protection/turnstile-client",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/features/abuse-protection/turnstile-client")
      >();
    return {
      ...actual,
      executeManagedTurnstileChallenge: controlledBrowserBoundaries.turnstile,
    };
  },
);

vi.mock("@/features/preflight/microphone-readiness", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/features/preflight/microphone-readiness")
    >();
  return {
    ...actual,
    openBrowserMicrophoneMonitor: controlledBrowserBoundaries.openMicrophone,
  };
});

vi.mock("@/features/interview/elevenlabs-voice-session", () => ({
  ElevenLabsVoiceSession: controlledBrowserBoundaries.elevenLabsBridge,
}));

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

function deferred<Value>() {
  let resolvePromise: ((value: Value | PromiseLike<Value>) => void) | undefined;
  let rejectPromise: ((reason?: unknown) => void) | undefined;
  const promise = new Promise<Value>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    reject(reason?: unknown) {
      if (!rejectPromise) {
        throw new Error("Deferred promise is not initialized.");
      }
      rejectPromise(reason);
    },
    resolve(value: Value) {
      if (!resolvePromise) {
        throw new Error("Deferred promise is not initialized.");
      }
      resolvePromise(value);
    },
  };
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
    effectiveMode: "deterministic_fake",
    paidOperationsEnabled: false,
    privacyNoticeVersion: "2026-09-11",
    providerMode: "fake",
    demoContext: {
      kind: "role_agnostic_first_stage_hr_screen",
      roleAvailability: "candidate_selected_synthetic_session_vacancy",
      employerFactsAvailable: false,
    },
  } as const;
}

function paidDisabledLiveBootstrapResponse() {
  return {
    ...bootstrapResponse(),
    effectiveMode: "paid_disabled",
    providerMode: "live",
  } as const;
}

function paidEnabledLiveBootstrapResponse() {
  return {
    ...paidDisabledLiveBootstrapResponse(),
    abuseProtection: {
      ...paidDisabledLiveBootstrapResponse().abuseProtection,
      siteKey: "stale-public-site-key",
    },
    effectiveMode: "standard_live",
    paidOperationsEnabled: true,
  } as const;
}

function summaryRehearsalBootstrapResponse() {
  return {
    ...paidEnabledLiveBootstrapResponse(),
    effectiveMode: "summary_rehearsal",
  } as const;
}

function preparedResponse() {
  return {
    plan: createConversationFirstPlanFixture(),
    interviewGrant: "signed-conversation-first-grant",
    expiresAt: new Date(Date.now() + 15 * 60 * 1_000).toISOString(),
  };
}

function summaryResponse() {
  const limitation = "These AI-organized notes require human review.";
  return {
    summary: {
      overview: "Key conversation points, organized for review.",
      confirmedFacts: [],
      clarifications: [],
      topicsCovered: [],
      topicsNotCovered: [],
      communicationNotes: [],
      candidateQuestions: [],
      humanFollowups: [],
      limitations: [limitation],
    },
    usage: {
      cachedInputTokens: 0,
      inputTokens: 120,
      outputTokens: 40,
      estimatedCostUsd: 0.001,
    },
    limitations: [limitation],
  } as const;
}

function storeRestoredPreflightSession(): void {
  const staleBootstrap = paidEnabledLiveBootstrapResponse();
  const { demoContext, ...runtimeConfig } = staleBootstrap;
  const preparation = preparedResponse();
  const now = Date.now();
  window.sessionStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 3,
      stage: "preflight",
      entryMode: "conversation_first",
      createdAt: new Date(now - 1_000).toISOString(),
      expiresAt: new Date(now + 60 * 60 * 1_000).toISOString(),
      runtimeConfig,
      demoContext,
      screeningPlan: preparation.plan,
      interviewGrant: preparation.interviewGrant,
      interviewGrantExpiresAt: preparation.expiresAt,
      transcript: [],
      insights: [],
      topicProgress: [],
    }),
  );
}

function storeRestoredCompletedSession(
  staleBootstrap = paidEnabledLiveBootstrapResponse(),
): void {
  const { demoContext, ...runtimeConfig } = staleBootstrap;
  const preparation = preparedResponse();
  const now = Date.now();
  window.sessionStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 3,
      stage: "interview_complete",
      entryMode: "conversation_first",
      createdAt: new Date(now - 5 * 60 * 1_000).toISOString(),
      expiresAt: new Date(now + 60 * 60 * 1_000).toISOString(),
      runtimeConfig,
      demoContext,
      screeningPlan: preparation.plan,
      interviewGrant: preparation.interviewGrant,
      interviewGrantExpiresAt: preparation.expiresAt,
      voice: {
        conversationId: "restored-completed-conversation",
        status: "ended",
        startedAt: new Date(now - 2 * 60 * 1_000).toISOString(),
        endedAt: new Date(now - 1_000).toISOString(),
        endReason: "Interview completed by the interviewer.",
      },
      interviewCompletion: {
        reason: "agent_completed",
        elapsedSeconds: 119,
      },
      transcript: [
        {
          id: "restored-candidate-turn",
          sequence: 0,
          speaker: "candidate",
          status: "final",
          text: "I am looking for a collaborative product team.",
          occurredAt: new Date(now - 60_000).toISOString(),
        },
      ],
      insights: [],
      topicProgress: [],
    }),
  );
}

function RestoredBootstrapStatus() {
  const { runtimeConfigStatus } = useDemoBootstrap();

  return (
    <output aria-label="Runtime config status">{runtimeConfigStatus}</output>
  );
}

describe("DemoExperience preparation paths", () => {
  beforeEach(() => {
    vi.mocked(extractPdfText).mockReset();
    controlledBrowserBoundaries.elevenLabsBridge.mockClear();
    controlledBrowserBoundaries.stopMicrophone.mockReset();
    controlledBrowserBoundaries.openMicrophone.mockReset();
    controlledBrowserBoundaries.openMicrophone.mockResolvedValue({
      deviceLabel: "Synthetic test microphone",
      stop: controlledBrowserBoundaries.stopMicrophone,
    });
    controlledBrowserBoundaries.turnstile.mockReset();
    controlledBrowserBoundaries.turnstile.mockResolvedValue(
      FAKE_TURNSTILE_TOKEN,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("labels summary rehearsal, enables CV entry, and keeps conversation preparation deterministic", async () => {
    const browserFetch = vi.fn<typeof fetch>((input) => {
      const url = requestUrl(input);
      if (url === "/v1/demo/bootstrap") {
        return Promise.resolve(
          jsonResponse(summaryRehearsalBootstrapResponse()),
        );
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

    const rehearsalStatus = await screen.findByRole("status", {
      name: "Summary rehearsal status",
    });
    expect(rehearsalStatus).toHaveTextContent(
      "CV analysis and interview voice are simulated",
    );
    expect(rehearsalStatus).toHaveTextContent(
      "one live, metered summary request",
    );
    expect(screen.getByRole("button", { name: "Use a CV" })).toBeEnabled();
    expect(
      screen.getByText(
        "Use the CV-assisted flow with simulated analysis and interview voice.",
      ),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Start without a CV" }));
    expect(
      await screen.findByRole("heading", { name: "How the interview works" }),
    ).toBeVisible();
    expect(
      screen.getByRole("status", { name: "Summary rehearsal status" }),
    ).toBeVisible();
    expect(browserFetch.mock.calls.map(([input]) => requestUrl(input))).toEqual(
      ["/v1/demo/bootstrap", "/v1/interview/prepare"],
    );
  });

  it("runs the CV-assisted summary rehearsal through simulated analysis and voice while preparing one summary in the completed workspace", async () => {
    window.history.replaceState({}, "", "/demo?diagnostics=timings");
    const analysisResponse = createCvAnalysisResponseFixture();
    vi.mocked(extractPdfText).mockResolvedValue(uploadedCvExtraction);
    const requestedUrls: string[] = [];
    let summaryRequest: Record<string, unknown> | undefined;
    const pendingSummaryResponse = deferred<Response>();
    const browserFetch = vi.fn<typeof fetch>((input, options) => {
      const url = requestUrl(input);
      requestedUrls.push(url);
      if (url === "/v1/demo/bootstrap") {
        return Promise.resolve(
          jsonResponse(summaryRehearsalBootstrapResponse()),
        );
      }
      if (url === "/v1/cv/analyze") {
        return Promise.resolve(jsonResponse(analysisResponse));
      }
      if (url === "/v1/voice/token") {
        return Promise.resolve(
          jsonResponse({
            conversationId: "fake-summary-rehearsal-conversation",
            conversationToken: "fake-summary-rehearsal-token",
          }),
        );
      }
      if (url === "/v1/interview/summary") {
        summaryRequest = requestJsonBody(options);
        return pendingSummaryResponse.promise;
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    vi.stubGlobal("fetch", browserFetch);

    const rendered = render(
      <StrictMode>
        <DemoSessionProvider>
          <DemoExperience />
        </DemoSessionProvider>
      </StrictMode>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Use a CV" }));
    fireEvent.change(screen.getByLabelText("Choose PDF file"), {
      target: {
        files: [
          new File(["%PDF-1.7 synthetic"], "summary-rehearsal-cv.pdf", {
            type: "application/pdf",
          }),
        ],
      },
    });
    expect(
      await screen.findByRole("heading", { name: "What the CV says" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      await screen.findByRole("heading", { name: "How the interview works" }),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /I understand how AI voice, my microphone, transcription, and notes will be used/u,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Check microphone" }));
    expect(await screen.findByText("Microphone ready")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Start interview" }));

    expect(
      await screen.findByRole("heading", {
        name: "Pilot is interviewing",
      }),
    ).toBeVisible();
    expect(controlledBrowserBoundaries.elevenLabsBridge).not.toHaveBeenCalled();

    expect(
      await screen.findByRole(
        "heading",
        { name: "Interview complete" },
        { timeout: 12_000 },
      ),
    ).toBeVisible();
    await waitFor(() => {
      expect(
        requestedUrls.filter((url) => url === "/v1/interview/summary"),
      ).toHaveLength(1);
    });
    expect(
      screen.queryByText("Checking this request before it continues."),
    ).not.toBeInTheDocument();
    const waitingButton = screen.getByRole("button", {
      name: "Preparing summary. View summary will be available when ready.",
    });
    expect(waitingButton).toBeDisabled();
    expect(waitingButton).toHaveTextContent("View summary");
    expect(
      waitingButton.querySelector(".sp-button__spinner"),
    ).toBeInTheDocument();
    expect(
      JSON.parse(
        screen.getByLabelText<HTMLTextAreaElement>("Raw timing JSON").value,
      ),
    ).toMatchObject({ source: "fake" });

    await act(async () => {
      pendingSummaryResponse.resolve(jsonResponse(summaryResponse()));
      await pendingSummaryResponse.promise;
    });
    const viewSummary = await screen.findByRole("button", {
      name: "View summary",
    });
    expect(viewSummary).toBeEnabled();
    fireEvent.click(viewSummary);
    expect(
      await screen.findByRole("heading", {
        name: "Your conversation, organized as connected evidence.",
      }),
    ).toBeVisible();
    await waitFor(() => {
      expect(
        requestedUrls.filter((url) => url === "/v1/interview/summary"),
      ).toHaveLength(1);
    });
    expect(controlledBrowserBoundaries.turnstile).toHaveBeenCalledTimes(3);
    expect(controlledBrowserBoundaries.elevenLabsBridge).not.toHaveBeenCalled();

    expect(summaryRequest).toMatchObject({
      entryMode: "cv_assisted",
      interviewGrant: analysisResponse.interviewGrant,
      plan: { entryMode: "cv_assisted" },
      turnstileToken: FAKE_TURNSTILE_TOKEN,
    });
    expect(summaryRequest).not.toHaveProperty("cv");
    const transcript = summaryRequest?.["transcript"] as
      Record<string, unknown>[] | undefined;
    expect(transcript).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          speaker: "candidate",
          status: "final",
          text: "No, I do not have any other questions.",
        }),
      ]),
    );
    expect(
      transcript?.filter((turn) => turn["speaker"] === "candidate"),
    ).toHaveLength(7);
    const unsupportedQuestionTurn = transcript?.find(
      (turn) =>
        turn["speaker"] === "candidate" &&
        typeof turn["text"] === "string" &&
        turn["text"].includes(
          "What onboarding and work-arrangement details can a recruiter share?",
        ),
    );
    expect(unsupportedQuestionTurn).toBeDefined();

    const insights = summaryRequest?.["insights"] as
      Record<string, unknown>[] | undefined;
    expect(
      insights?.some(
        (insight) =>
          insight["source"] === "CV" || insight["source"] === "CV + Candidate",
      ),
    ).toBe(true);
    expect(insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "candidate_question",
          evidenceTurnIds: [unsupportedQuestionTurn?.["id"]],
          source: "Candidate",
          value:
            "What onboarding and work-arrangement details can a recruiter share?",
        }),
        expect.objectContaining({
          category: "follow_up_needed",
          evidenceTurnIds: [unsupportedQuestionTurn?.["id"]],
          source: "Candidate",
          value:
            "A human recruiter must confirm the unsupported onboarding and work-arrangement details.",
        }),
      ]),
    );
    const topicProgress = summaryRequest?.["topicProgress"] as
      Record<string, unknown>[] | undefined;
    expect(topicProgress).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          evidenceTurnIds: [unsupportedQuestionTurn?.["id"]],
          status: "covered",
          topicKey: "candidate_questions",
        }),
        expect.objectContaining({
          evidenceTurnIds: [unsupportedQuestionTurn?.["id"]],
          status: "needs_clarification",
          topicKey: "clarifications_and_followups",
        }),
        expect.objectContaining({
          status: "covered",
          topicKey: "motivation_and_next_role",
        }),
      ]),
    );
    const plan = summaryRequest?.["plan"] as
      | {
          roleClarification?: { cvFactIds?: unknown[] };
          topics?: { cvFactIds?: unknown[] }[];
        }
      | undefined;
    expect(plan?.roleClarification?.cvFactIds).toEqual(["role-direction-1"]);
    expect(
      plan?.topics?.some((topic) => topic.cvFactIds?.includes("experience-1")),
    ).toBe(true);

    rendered.rerender(
      <StrictMode>
        <DemoSessionProvider>
          <DemoExperience />
        </DemoSessionProvider>
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Organized notes" }));
    fireEvent.click(screen.getByRole("tab", { name: "Evidence map" }));
    await waitFor(() => {
      expect(
        requestedUrls.filter((url) => url === "/v1/interview/summary"),
      ).toHaveLength(1);
    });
    expect(controlledBrowserBoundaries.elevenLabsBridge).not.toHaveBeenCalled();
  }, 20_000);

  it("keeps both live paid-disabled entry modes unavailable", async () => {
    const browserFetch = vi.fn<typeof fetch>((input) => {
      const url = requestUrl(input);
      if (url === "/v1/demo/bootstrap") {
        return Promise.resolve(
          jsonResponse(paidDisabledLiveBootstrapResponse()),
        );
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    vi.stubGlobal("fetch", browserFetch);

    render(
      <DemoSessionProvider>
        <DemoExperience />
      </DemoSessionProvider>,
    );

    expect(
      await screen.findByRole("button", { name: "CV analysis unavailable" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Voice interview unavailable" }),
    ).toBeDisabled();
    expect(screen.getAllByText("Paused for this safety check")).toHaveLength(2);
    expect(screen.queryByLabelText("Choose PDF file")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Check microphone" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start interview" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Loading the private voice client.")).toBeNull();
    expect(
      document.querySelector('script[src*="challenges.cloudflare.com"]'),
    ).toBeNull();
    expect(browserFetch.mock.calls.map(([input]) => requestUrl(input))).toEqual(
      ["/v1/demo/bootstrap"],
    );
  });

  it("replaces a Strict Mode-aborted restore refresh and ignores its stale response", async () => {
    const staleBootstrap = paidEnabledLiveBootstrapResponse();
    const { demoContext, ...runtimeConfig } = staleBootstrap;
    const preparation = preparedResponse();
    const dispatch = vi.fn();
    const staleResponse = deferred<Response>();
    const freshResponse = deferred<Response>();
    const requestSignals: AbortSignal[] = [];
    const browserFetch = vi.fn<typeof fetch>((input, options) => {
      const url = requestUrl(input);
      if (url !== "/v1/demo/bootstrap") {
        return Promise.reject(new Error(`Unexpected request: ${url}`));
      }
      if (!(options?.signal instanceof AbortSignal)) {
        return Promise.reject(new Error("Expected a bootstrap abort signal."));
      }
      requestSignals.push(options.signal);
      return requestSignals.length === 1
        ? staleResponse.promise
        : freshResponse.promise;
    });
    vi.stubGlobal("fetch", browserFetch);

    render(
      <StrictMode>
        <DemoSessionContext.Provider
          value={{
            state: {
              ...createInitialDemoSessionState(),
              hydrationStatus: "ready",
              stage: "preflight",
              entryMode: "conversation_first",
              createdAt: new Date(Date.now() - 1_000).toISOString(),
              expiresAt: new Date(Date.now() + 60 * 60 * 1_000).toISOString(),
              runtimeConfig,
              demoContext,
              screeningPlan: preparation.plan,
              interviewGrant: preparation.interviewGrant,
              interviewGrantExpiresAt: preparation.expiresAt,
            },
            dispatch,
            completeInterview: vi.fn(),
            clearSession: vi.fn(() => true),
            startOver: vi.fn(),
            storageStatus: "idle",
          }}
        >
          <RestoredBootstrapStatus />
        </DemoSessionContext.Provider>
      </StrictMode>,
    );

    await waitFor(() => {
      expect(browserFetch).toHaveBeenCalledTimes(2);
    });
    expect(requestSignals[0]?.aborted).toBe(true);
    expect(requestSignals[1]?.aborted).toBe(false);
    expect(screen.getByLabelText("Runtime config status")).toHaveTextContent(
      "pending",
    );

    await act(async () => {
      staleResponse.resolve(jsonResponse(paidEnabledLiveBootstrapResponse()));
      await Promise.resolve();
    });
    expect(dispatch).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Runtime config status")).toHaveTextContent(
      "pending",
    );

    await act(async () => {
      freshResponse.resolve(jsonResponse(bootstrapResponse()));
      await Promise.resolve();
    });
    expect(
      await screen.findByLabelText("Runtime config status"),
    ).toHaveTextContent("ready");
    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch).toHaveBeenCalledWith({
      type: "RUNTIME_CONFIG_REFRESHED",
      demoContext: bootstrapResponse().demoContext,
      runtimeConfig: {
        abuseProtection: bootstrapResponse().abuseProtection,
        effectiveMode: "deterministic_fake",
        limits: bootstrapResponse().limits,
        paidOperationsEnabled: false,
        privacyNoticeVersion: bootstrapResponse().privacyNoticeVersion,
        providerMode: "fake",
      },
    });
  });

  it("keeps one restore refresh authoritative across a stage transition", async () => {
    storeRestoredPreflightSession();
    const currentResponse = deferred<Response>();
    let requestSignal: AbortSignal | undefined;
    const browserFetch = vi.fn<typeof fetch>((input, options) => {
      const url = requestUrl(input);
      if (url !== "/v1/demo/bootstrap") {
        return Promise.reject(new Error(`Unexpected request: ${url}`));
      }
      requestSignal = options?.signal ?? undefined;
      return currentResponse.promise;
    });
    vi.stubGlobal("fetch", browserFetch);

    render(
      <DemoSessionProvider>
        <DemoExperience />
      </DemoSessionProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Voice interview is unavailable right now.",
      }),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Change starting option" }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Bring a CV, or start with a conversation.",
      }),
    ).toBeVisible();
    expect(requestSignal?.aborted).toBe(false);
    expect(browserFetch).toHaveBeenCalledOnce();

    await act(async () => {
      currentResponse.resolve(jsonResponse(bootstrapResponse()));
      await Promise.resolve();
    });
    expect(
      await screen.findByRole("button", { name: "Use a CV" }),
    ).toBeEnabled();
    expect(browserFetch).toHaveBeenCalledOnce();
  });

  it("keeps a failed restore refresh closed until an explicit paid-disabled retry succeeds", async () => {
    storeRestoredPreflightSession();
    const retryResponse = deferred<Response>();
    let bootstrapRequestCount = 0;
    const browserFetch = vi.fn<typeof fetch>((input) => {
      const url = requestUrl(input);
      if (url !== "/v1/demo/bootstrap") {
        return Promise.reject(new Error(`Unexpected request: ${url}`));
      }
      bootstrapRequestCount += 1;
      return bootstrapRequestCount === 1
        ? Promise.reject(new TypeError("Synthetic bootstrap outage."))
        : retryResponse.promise;
    });
    vi.stubGlobal("fetch", browserFetch);

    render(
      <DemoSessionProvider>
        <DemoExperience />
      </DemoSessionProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "The safety check could not refresh",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Voice interview is unavailable right now.",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Check microphone" }),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('script[src*="challenges.cloudflare.com"]'),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Retry safety check" }));
    await waitFor(() => {
      expect(browserFetch).toHaveBeenCalledTimes(2);
    });
    expect(
      screen.queryByRole("heading", {
        name: "The safety check could not refresh",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Check microphone" }),
    ).not.toBeInTheDocument();

    await act(async () => {
      retryResponse.resolve(jsonResponse(paidDisabledLiveBootstrapResponse()));
      await Promise.resolve();
    });
    expect(
      screen.getByRole("heading", {
        name: "Voice interview is unavailable right now.",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Check microphone" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Loading the private voice client.")).toBeNull();
    expect(
      document.querySelector('script[src*="challenges.cloudflare.com"]'),
    ).toBeNull();
    expect(browserFetch.mock.calls.map(([input]) => requestUrl(input))).toEqual(
      ["/v1/demo/bootstrap", "/v1/demo/bootstrap"],
    );
  });

  it("keeps a restored completed session summary-idle while runtime refresh is pending", async () => {
    storeRestoredCompletedSession();
    const refreshResponse = deferred<Response>();
    const requestedUrls: string[] = [];
    const browserFetch = vi.fn<typeof fetch>((input) => {
      const url = requestUrl(input);
      requestedUrls.push(url);
      if (url === "/v1/demo/bootstrap") {
        return refreshResponse.promise;
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    vi.stubGlobal("fetch", browserFetch);

    const rendered = render(
      <DemoSessionProvider>
        <DemoExperience />
      </DemoSessionProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Interview complete" }),
    ).toBeVisible();
    await waitFor(() => {
      expect(browserFetch).toHaveBeenCalledOnce();
    });
    expect(requestedUrls).toEqual(["/v1/demo/bootstrap"]);
    expect(controlledBrowserBoundaries.turnstile).not.toHaveBeenCalled();

    rendered.unmount();
  });

  it("starts one restored summary rehearsal in the completed workspace and enables View summary when ready", async () => {
    storeRestoredCompletedSession();
    const requestedUrls: string[] = [];
    const pendingSummaryResponse = deferred<Response>();
    const browserFetch = vi.fn<typeof fetch>((input) => {
      const url = requestUrl(input);
      requestedUrls.push(url);
      if (url === "/v1/demo/bootstrap") {
        return Promise.resolve(
          jsonResponse(summaryRehearsalBootstrapResponse()),
        );
      }
      if (url === "/v1/interview/summary") {
        return pendingSummaryResponse.promise;
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    vi.stubGlobal("fetch", browserFetch);

    const rendered = render(
      <DemoSessionProvider>
        <DemoExperience />
      </DemoSessionProvider>,
    );

    expect(
      await screen.findByRole("status", {
        name: "Summary rehearsal status",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Interview complete" }),
    ).toBeVisible();
    await waitFor(() => {
      expect(
        requestedUrls.filter((url) => url === "/v1/interview/summary"),
      ).toHaveLength(1);
    });
    expect(controlledBrowserBoundaries.turnstile).toHaveBeenCalledOnce();
    expect(
      screen.queryByText("Checking this request before it continues."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Preparing summary. View summary will be available when ready.",
      }),
    ).toBeDisabled();

    await act(async () => {
      pendingSummaryResponse.resolve(jsonResponse(summaryResponse()));
      await pendingSummaryResponse.promise;
    });
    const viewSummary = await screen.findByRole("button", {
      name: "View summary",
    });
    expect(viewSummary).toBeEnabled();
    fireEvent.click(viewSummary);
    expect(
      await screen.findByRole("heading", {
        name: "Your conversation, organized as connected evidence.",
      }),
    ).toBeVisible();
    await waitFor(() => {
      expect(
        requestedUrls.filter((url) => url === "/v1/interview/summary"),
      ).toHaveLength(1);
    });
    expect(controlledBrowserBoundaries.turnstile).toHaveBeenCalledOnce();

    rendered.rerender(
      <DemoSessionProvider>
        <DemoExperience />
      </DemoSessionProvider>,
    );
    await waitFor(() => {
      expect(
        requestedUrls.filter((url) => url === "/v1/interview/summary"),
      ).toHaveLength(1);
    });
  });

  it.each([
    ["deterministic fake", bootstrapResponse()],
    ["standard live", paidEnabledLiveBootstrapResponse()],
  ] as const)(
    "starts one restored %s background summary only after runtime refresh is ready",
    async (_modeLabel, currentBootstrap) => {
      storeRestoredCompletedSession();
      const refreshResponse = deferred<Response>();
      const requestedUrls: string[] = [];
      const browserFetch = vi.fn<typeof fetch>((input) => {
        const url = requestUrl(input);
        requestedUrls.push(url);
        if (url === "/v1/demo/bootstrap") {
          return refreshResponse.promise;
        }
        if (url === "/v1/interview/summary") {
          return Promise.resolve(jsonResponse(summaryResponse()));
        }
        return Promise.reject(new Error(`Unexpected request: ${url}`));
      });
      vi.stubGlobal("fetch", browserFetch);

      render(
        <DemoSessionProvider>
          <DemoExperience />
        </DemoSessionProvider>,
      );

      expect(
        await screen.findByRole("heading", { name: "Interview complete" }),
      ).toBeVisible();
      await waitFor(() => {
        expect(browserFetch).toHaveBeenCalledOnce();
      });
      expect(controlledBrowserBoundaries.turnstile).not.toHaveBeenCalled();

      await act(async () => {
        refreshResponse.resolve(jsonResponse(currentBootstrap));
        await Promise.resolve();
      });
      await waitFor(() => {
        expect(
          requestedUrls.filter((url) => url === "/v1/interview/summary"),
        ).toHaveLength(1);
      });
      expect(controlledBrowserBoundaries.turnstile).toHaveBeenCalledOnce();

      fireEvent.click(screen.getByRole("button", { name: "View summary" }));
      expect(
        await screen.findByRole("heading", {
          name: "Your conversation, organized as connected evidence.",
        }),
      ).toBeVisible();
      expect(
        requestedUrls.filter((url) => url === "/v1/interview/summary"),
      ).toHaveLength(1);
    },
  );

  it("keeps a restored paid-disabled completion fully closed after refresh", async () => {
    storeRestoredCompletedSession();
    const requestedUrls: string[] = [];
    const browserFetch = vi.fn<typeof fetch>((input) => {
      const url = requestUrl(input);
      requestedUrls.push(url);
      if (url === "/v1/demo/bootstrap") {
        return Promise.resolve(
          jsonResponse(paidDisabledLiveBootstrapResponse()),
        );
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    vi.stubGlobal("fetch", browserFetch);

    render(
      <DemoSessionProvider>
        <DemoExperience />
      </DemoSessionProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Interview complete" }),
    ).toBeVisible();
    await waitFor(() => {
      expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toContain(
        '"effectiveMode":"paid_disabled"',
      );
    });
    expect(controlledBrowserBoundaries.turnstile).not.toHaveBeenCalled();
    expect(requestedUrls).toEqual(["/v1/demo/bootstrap"]);

    fireEvent.click(screen.getByRole("button", { name: "View summary" }));
    expect(
      await screen.findByRole("heading", {
        name: "Your conversation, organized as connected evidence.",
      }),
    ).toBeVisible();
    expect(controlledBrowserBoundaries.turnstile).not.toHaveBeenCalled();
    expect(requestedUrls).toEqual(["/v1/demo/bootstrap"]);
  });

  it("keeps a failed completed-session refresh closed until an eligible retry succeeds", async () => {
    storeRestoredCompletedSession();
    const retryResponse = deferred<Response>();
    const requestedUrls: string[] = [];
    let bootstrapRequestCount = 0;
    const browserFetch = vi.fn<typeof fetch>((input) => {
      const url = requestUrl(input);
      requestedUrls.push(url);
      if (url === "/v1/demo/bootstrap") {
        bootstrapRequestCount += 1;
        return bootstrapRequestCount === 1
          ? Promise.reject(new TypeError("Synthetic bootstrap outage."))
          : retryResponse.promise;
      }
      if (url === "/v1/interview/summary") {
        return Promise.resolve(jsonResponse(summaryResponse()));
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    vi.stubGlobal("fetch", browserFetch);

    render(
      <DemoSessionProvider>
        <DemoExperience />
      </DemoSessionProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "The safety check could not refresh",
      }),
    ).toBeVisible();
    expect(controlledBrowserBoundaries.turnstile).not.toHaveBeenCalled();
    expect(requestedUrls).toEqual(["/v1/demo/bootstrap"]);

    fireEvent.click(screen.getByRole("button", { name: "Retry safety check" }));
    await waitFor(() => {
      expect(browserFetch).toHaveBeenCalledTimes(2);
    });
    expect(controlledBrowserBoundaries.turnstile).not.toHaveBeenCalled();

    await act(async () => {
      retryResponse.resolve(jsonResponse(bootstrapResponse()));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(
        requestedUrls.filter((url) => url === "/v1/interview/summary"),
      ).toHaveLength(1);
    });
    expect(controlledBrowserBoundaries.turnstile).toHaveBeenCalledOnce();
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

    expect(
      await screen.findByText("Step 1 of 5 · Choose how to start"),
    ).toBeVisible();
    expect(
      screen.queryByRole("group", { name: "Demo progress" }),
    ).not.toBeInTheDocument();
    expect(document.querySelector(".sp-demo-progress-panel")).toBeNull();
    expect(screen.queryByLabelText("Demo safeguards")).not.toBeInTheDocument();
    const header = document.querySelector(".sp-site-header");
    expect(header).not.toBeNull();
    expect(
      within(header as HTMLElement).queryByRole("group", {
        name: "Demo progress",
      }),
    ).not.toBeInTheDocument();
    expect(
      within(header as HTMLElement)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Privacy details", "Clear & exit"]);
    expect(
      within(header as HTMLElement).getByRole("button", {
        name: "Privacy details",
      }),
    ).toBeEnabled();
    expect(
      within(header as HTMLElement).getByRole("button", {
        name: "Clear & exit",
      }),
    ).toBeEnabled();
    expect(
      screen.getByRole("link", { name: "ScreenPilot home" }),
    ).toHaveAttribute("href", "/");

    fireEvent.click(
      await screen.findByRole("button", { name: "Start without a CV" }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "How the interview works",
      }),
    ).toBeVisible();
    expect(screen.getByText("Step 3 of 5 · Before you begin")).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Get ready for your interview.",
      }),
    ).toBeVisible();
    expect(screen.getByText("Conversation-first")).toBeVisible();
    expect(
      screen.getByText(/Pilot uses your answers for follow-up questions/),
    ).toBeVisible();
    expect(screen.getByText("Step 3 of 5 · Before you begin")).toBeVisible();

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
        name: "Preparing an open conversation.",
      }),
    ).toBeVisible();
    expect(
      screen.getByText("Step 2 of 5 · Conversation-first path"),
    ).toBeVisible();
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
    expect(
      screen.queryByText(
        "A CV helps Pilot ask more focused questions. You can also skip it.",
      ),
    ).not.toBeInTheDocument();
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
        name: "How the interview works",
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
      name: "How the interview works",
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
      name: "How the interview works",
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
    expect(screen.getByText("Step 2 of 5 · CV-assisted plan")).toBeVisible();

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
        name: "How the interview works",
      }),
    ).toBeVisible();
    expect(screen.getByText("CV-assisted")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Back to interview plan" }),
    ).toBeEnabled();
    expect(screen.getByText("Step 3 of 5 · Before you begin")).toBeVisible();

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
