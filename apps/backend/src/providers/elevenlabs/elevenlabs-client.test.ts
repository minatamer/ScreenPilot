import { describe, expect, it, vi } from "vitest";

import {
  ElevenLabsHttpClient,
  ElevenLabsRequestError,
} from "./elevenlabs-client.js";

const AGENT_ID = "screenpilot-test-agent";
const API_KEY = "not-a-real-elevenlabs-key";
const TOKEN_URL = "https://elevenlabs.invalid/v1/conversation/token";

function createClient(fetchImplementation: typeof fetch, timeoutMs = 100) {
  return new ElevenLabsHttpClient({
    agentId: AGENT_ID,
    apiKey: API_KEY,
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
    ["provider rejection", jsonResponse({ private: "failure" }, 401)],
    ["invalid JSON", new Response("not-json", { status: 200 })],
    [
      "invalid shape",
      jsonResponse({ token: "missing-conversation-identifier" }),
    ],
    [
      "declared oversized response",
      jsonResponse(
        { conversation_id: "conversation-014", token: "token" },
        200,
        { "content-length": "20000" },
      ),
    ],
  ])("maps %s to a safe retryable error", async (_label, response) => {
    const providerFetch = vi.fn<typeof fetch>().mockResolvedValue(response);

    const failure = await createClient(providerFetch)
      .createConversationToken({ agentId: AGENT_ID })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ElevenLabsRequestError);
    expect(failure).toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      retryable: true,
    });
    expect(String(failure)).not.toContain("private");
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
