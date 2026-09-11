import { describe, expect, it, vi } from "vitest";

import { createConversationFirstPlanFixture } from "@/test/conversation-first-plan.fixture";

import {
  fetchDemoBootstrap,
  prepareConversationFirst,
  ScreenPilotApiError,
} from "./screenpilot-api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function requestJsonBody(
  options: RequestInit | undefined,
): Record<string, unknown> {
  if (typeof options?.body !== "string") {
    throw new TypeError("Expected a JSON request body.");
  }
  return JSON.parse(options.body) as Record<string, unknown>;
}

describe("ScreenPilot browser API", () => {
  it("validates bootstrap and uses the shared relative endpoint", async () => {
    const browserFetch = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
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
      }),
    );
    const controller = new AbortController();

    const response = await fetchDemoBootstrap(controller.signal, browserFetch);

    expect(response.demoContext.employerFactsAvailable).toBe(false);
    expect(browserFetch).toHaveBeenCalledWith(
      "/v1/demo/bootstrap",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      }),
    );
  });

  it("sends only the conversation-first contract and validates its response", async () => {
    const responseBody = {
      plan: createConversationFirstPlanFixture(),
      interviewGrant: "signed-conversation-first-grant",
      expiresAt: "2026-09-11T12:15:00.000Z",
    };
    const browserFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(responseBody));
    const controller = new AbortController();

    await expect(
      prepareConversationFirst(
        "00000000-0000-4000-8000-000000000011",
        controller.signal,
        browserFetch,
      ),
    ).resolves.toEqual(responseBody);
    const options = browserFetch.mock.calls[0]?.[1];
    expect(browserFetch.mock.calls[0]?.[0]).toBe("/v1/interview/prepare");
    expect(requestJsonBody(options)).toEqual({
      clientRequestId: "00000000-0000-4000-8000-000000000011",
      entryMode: "conversation_first",
    });
    expect(options?.method).toBe("POST");
  });

  it("surfaces a validated typed error without trusting an arbitrary body", async () => {
    const browserFetch = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "PREPARATION_FAILED",
            message: "Preparation is temporarily unavailable.",
            retryable: true,
            requestId: "request-17",
          },
        },
        503,
      ),
    );

    const failure = await prepareConversationFirst(
      "00000000-0000-4000-8000-000000000012",
      new AbortController().signal,
      browserFetch,
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ScreenPilotApiError);
    expect(failure).toMatchObject({
      code: "PREPARATION_FAILED",
      message: "Preparation is temporarily unavailable.",
      requestId: "request-17",
      retryable: true,
    });
  });
});
