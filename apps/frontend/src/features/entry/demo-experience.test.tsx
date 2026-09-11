import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DemoSessionProvider } from "@/features/session/demo-session-provider";
import { SESSION_STORAGE_KEY } from "@/features/session/session-storage";
import { createConversationFirstPlanFixture } from "@/test/conversation-first-plan.fixture";

import { DemoExperience } from "./demo-experience";

const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

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

describe("DemoExperience conversation-first path", () => {
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

    fireEvent.click(
      await screen.findByRole("button", { name: "Start without a CV" }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Your open conversation is ready.",
      }),
    ).toBeVisible();
    expect(screen.getByText("Conversation-first")).toBeVisible();
    expect(screen.getByText(/Candidate-only evidence/)).toBeVisible();

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
    await waitFor(() => {
      expect(preparationSignal).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Back to choices" }));
    expect(
      await screen.findByRole("heading", {
        name: "How should this conversation begin?",
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

    fireEvent.click(screen.getByRole("button", { name: "Retry preparation" }));
    expect(
      await screen.findByRole("heading", {
        name: "Your open conversation is ready.",
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
      name: "Your open conversation is ready.",
    });

    fireEvent.click(screen.getByRole("button", { name: "Back to choices" }));
    expect(
      await screen.findByRole("button", { name: "Use a CV" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Start without a CV" }),
    ).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Start without a CV" }));
    await screen.findByRole("heading", {
      name: "Your open conversation is ready.",
    });
    fireEvent.click(screen.getByRole("button", { name: "Clear session" }));
    expect(router.replace).toHaveBeenCalledWith("/");
  });
});
