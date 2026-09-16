import { describe, expect, it, vi } from "vitest";

import {
  ElevenLabsHttpClient,
  ElevenLabsRequestError,
} from "./elevenlabs-client.js";

const AGENT_ID = "screenpilot-test-agent";
const API_KEY = "not-a-real-elevenlabs-key";
const TOKEN_URL = "https://elevenlabs.invalid/v1/conversation/token";

function createClient(
  fetchImplementation: typeof fetch,
  timeoutMs = 100,
  clockMilliseconds: () => number = Date.now,
) {
  return new ElevenLabsHttpClient({
    agentId: AGENT_ID,
    apiKey: API_KEY,
    clockMilliseconds,
    fetchImplementation,
    timeoutMs,
    tokenUrl: TOKEN_URL,
  });
}

function jsonResponse(
  body: unknown,
  status = 200,
  headers?: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", ...headers },
    status,
  });
}

describe("ElevenLabsHttpClient", () => {
  it("requests one private token with only the configured agent and backend key", async () => {
    const providerFetch = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        conversation_id: "conversation-014",
        token: "short-lived-conversation-token",
      }),
    );
    const result = await createClient(providerFetch).createConversationToken({
      agentId: AGENT_ID,
    });

    expect(result).toEqual({
      conversationId: "conversation-014",
      conversationToken: "short-lived-conversation-token",
    });
    expect(providerFetch).toHaveBeenCalledOnce();
    const [requestUrl, options] = providerFetch.mock.calls[0] ?? [];
    if (!(requestUrl instanceof URL)) {
      throw new TypeError("Expected the provider request to use a URL.");
    }
    const parsedUrl = requestUrl;
    expect(`${parsedUrl.origin}${parsedUrl.pathname}`).toBe(TOKEN_URL);
    expect(parsedUrl.searchParams.get("agent_id")).toBe(AGENT_ID);
    expect(parsedUrl.href).not.toContain(API_KEY);
    expect(options).toMatchObject({ method: "GET" });
    expect(new Headers(options?.headers).get("xi-api-key")).toBe(API_KEY);
  });

  it("rejects a browser-selected agent before making a request", async () => {
    const providerFetch = vi.fn<typeof fetch>();

    await expect(
      createClient(providerFetch).createConversationToken({
        agentId: "browser-selected-agent",
      }),
    ).rejects.toThrow("not configured");
    expect(providerFetch).not.toHaveBeenCalled();
  });

  it.each([
    [
      "provider rejection",
      jsonResponse({ private: "failure" }, 401),
      "http_non_success",
      401,
    ],
    [
      "empty response body",
      new Response(null, { status: 200 }),
      "response_body_empty",
      undefined,
    ],
    [
      "invalid response body",
      new Response(new Uint8Array([0xc3, 0x28]), { status: 200 }),
      "response_body_invalid",
      undefined,
    ],
    [
      "invalid JSON",
      new Response("not-json", { status: 200 }),
      "response_json_invalid",
      undefined,
    ],
    [
      "invalid shape",
      jsonResponse({ token: "missing-conversation-identifier" }),
      "response_schema_mismatch",
      undefined,
    ],
    [
      "declared oversized response",
      jsonResponse(
        { conversation_id: "conversation-014", token: "token" },
        200,
        { "content-length": "20000" },
      ),
      "response_body_oversized",
      undefined,
    ],
  ] as const)(
    "maps %s to a safe retryable error",
    async (_label, response, category, httpStatus) => {
      const providerFetch = vi.fn<typeof fetch>().mockResolvedValue(response);
      const clockMilliseconds = vi
        .fn<() => number>()
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(114);

      const failure = await createClient(providerFetch, 100, clockMilliseconds)
        .createConversationToken({ agentId: AGENT_ID })
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ElevenLabsRequestError);
      expect(failure).toMatchObject({
        category,
        code: "PROVIDER_UNAVAILABLE",
        durationMs: 14,
        ...(httpStatus === undefined ? {} : { httpStatus }),
        retryable: true,
      });
      expect(String(failure)).not.toContain("private");
    },
  );

  it("categorizes fetch failure and timeout without exposing their causes", async () => {
    const fetchFailure = vi.fn<typeof fetch>();
    fetchFailure.mockRejectedValue(new TypeError("private fetch detail"));
    const failure = await createClient(fetchFailure)
      .createConversationToken({ agentId: AGENT_ID })
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ElevenLabsRequestError);
    expect(failure).toMatchObject({ category: "fetch_failure" });
    expect(String(failure)).not.toContain("private fetch detail");

    const timedOutFetch = vi.fn<typeof fetch>();
    timedOutFetch.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => {
              reject(new Error("private timeout detail"));
            },
            { once: true },
          );
        }),
    );
    const timeoutFailure = await createClient(timedOutFetch, 5)
      .createConversationToken({ agentId: AGENT_ID })
      .catch((error: unknown) => error);
    expect(timeoutFailure).toBeInstanceOf(ElevenLabsRequestError);
    expect(timeoutFailure).toMatchObject({ category: "request_timeout" });
    expect(String(timeoutFailure)).not.toContain("private timeout detail");
  });

  it("preserves caller cancellation instead of converting it to a provider error", async () => {
    const providerFetch = vi.fn<typeof fetch>();
    const abortController = new AbortController();
    abortController.abort();

    await expect(
      createClient(providerFetch).createConversationToken({
        agentId: AGENT_ID,
        signal: abortController.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(providerFetch).not.toHaveBeenCalled();
  });
});
