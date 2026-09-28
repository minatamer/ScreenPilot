import { describe, expect, it, vi } from "vitest";

import {
  MAX_PROXY_REQUEST_BODY_BYTES,
  PROXY_BODY_RECEIPT_TIMEOUT_MS,
  proxyBackendRequest,
} from "./backend-proxy";

const FRONTEND_ORIGIN = "https://screenpilot-frontend.example";
const LOCAL_BACKEND_OPTIONS = {
  backendAuthAudience: "",
  backendAuthMode: "local",
  backendOrigin: "http://127.0.0.1:3001",
  frontendAllowedOrigins: [FRONTEND_ORIGIN],
} as const;
const VALID_MUTATION_HEADERS = {
  "content-type": "application/json",
  cookie: "sp_anonymous_session=existing",
  origin: FRONTEND_ORIGIN,
} as const;

describe("proxyBackendRequest", () => {
  it("forwards the relative API path, request metadata, and bounded body", async () => {
    const identityTokenProvider = {
      getToken: vi.fn(() => Promise.resolve("must-not-be-used-locally")),
    };
    const upstreamFetch = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          headers: {
            "content-type": "application/json",
            "set-cookie":
              "sp_anonymous_session=signed; Path=/; HttpOnly; Secure; SameSite=Strict",
            "x-request-id": "request-123",
          },
          status: 201,
        }),
      ),
    );
    const request = new Request(
      `${FRONTEND_ORIGIN}/v1/cv/analyze?source=demo`,
      {
        body: JSON.stringify({ cvText: "Synthetic candidate" }),
        headers: {
          accept: "application/json",
          authorization: "Bearer visitor-token",
          connection: "keep-alive",
          forwarded: "for=192.0.2.55",
          ...VALID_MUTATION_HEADERS,
          host: "screenpilot-frontend.example",
          "x-cloud-trace-context": "visitor-trace",
          "x-forwarded-for": "192.0.2.55",
          "x-forwarded-host": "attacker.invalid",
          "x-forwarded-proto": "http",
          "x-real-ip": "192.0.2.55",
          "x-screenpilot-client-source": "192.0.2.55",
          "x-serverless-authorization": "Bearer visitor-platform-token",
        },
        method: "POST",
      },
    );

    const response = await proxyBackendRequest(request, {
      ...LOCAL_BACKEND_OPTIONS,
      identityTokenProvider,
      upstreamFetch,
    });

    expect(upstreamFetch).toHaveBeenCalledOnce();
    const [target, init] = upstreamFetch.mock.calls[0] ?? [];
    expect(target).toBeInstanceOf(URL);
    if (!(target instanceof URL)) {
      throw new TypeError("Expected the backend proxy target to be a URL.");
    }
    expect(target.href).toBe("http://127.0.0.1:3001/v1/cv/analyze?source=demo");
    expect(init?.method).toBe("POST");
    expect(init?.signal).toBe(request.signal);
    const forwardedHeaders = new Headers(init?.headers);
    expect([...forwardedHeaders.keys()]).toEqual([
      "accept",
      "content-length",
      "content-type",
      "cookie",
      "origin",
    ]);
    expect(forwardedHeaders.get("cookie")).toBe(
      "sp_anonymous_session=existing",
    );
    expect(forwardedHeaders.get("origin")).toBe(
      "https://screenpilot-frontend.example",
    );
    expect(identityTokenProvider.getToken).not.toHaveBeenCalled();
    expect(new TextDecoder().decode(init?.body as ArrayBuffer)).toBe(
      JSON.stringify({ cvText: "Synthetic candidate" }),
    );
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toBe("request-123");
    expect(response.headers.get("set-cookie")).toContain(
      "sp_anonymous_session=signed",
    );
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("adds only a canonical source and audience-bound server token in Google OIDC mode", async () => {
    const identityTokenProvider = {
      getToken: vi.fn(() => Promise.resolve("google-signed-id-token")),
    };
    const upstreamFetch = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          headers: {
            "set-cookie":
              "sp_anonymous_session=signed; Path=/; HttpOnly; Secure; SameSite=Strict",
            "x-request-id": "request-oidc",
          },
          status: 200,
        }),
      ),
    );
    const request = new Request(`${FRONTEND_ORIGIN}/v1/cv/analyze`, {
      body: "{}",
      headers: {
        accept: "application/json",
        authorization: "Bearer visitor-token",
        ...VALID_MUTATION_HEADERS,
        forwarded: "for=192.0.2.66",
        "x-cloud-trace-context": "visitor-trace",
        "x-forwarded-for": "192.0.2.66, 198.51.100.23, 203.0.113.10",
        "x-forwarded-host": "attacker.invalid",
        "x-forwarded-proto": "http",
        "x-real-ip": "192.0.2.66",
        "x-screenpilot-client-source": "192.0.2.66",
        "x-serverless-authorization": "Bearer visitor-platform-token",
      },
      method: "POST",
    });

    const response = await proxyBackendRequest(request, {
      backendAuthAudience: "https://screenpilot-backend-123.region.run.app",
      backendAuthMode: "google-cloud-oidc",
      backendOrigin: "https://screenpilot-backend-123.region.run.app",
      frontendAllowedOrigins: [FRONTEND_ORIGIN],
      identityTokenProvider,
      upstreamFetch,
    });

    expect(response.status).toBe(200);
    expect(identityTokenProvider.getToken).toHaveBeenCalledOnce();
    const forwardedHeaders = new Headers(
      upstreamFetch.mock.calls[0]?.[1]?.headers,
    );
    expect([...forwardedHeaders.keys()]).toEqual([
      "accept",
      "content-length",
      "content-type",
      "cookie",
      "origin",
      "x-screenpilot-client-source",
      "x-serverless-authorization",
    ]);
    expect(forwardedHeaders.get("x-screenpilot-client-source")).toBe(
      "198.51.100.23",
    );
    expect(forwardedHeaders.get("x-serverless-authorization")).toBe(
      "Bearer google-signed-id-token",
    );
    expect(forwardedHeaders.get("authorization")).toBeNull();
    expect(response.headers.get("set-cookie")).toContain(
      "sp_anonymous_session=signed",
    );
    expect(response.headers.get("x-request-id")).toBe("request-oidc");
  });

  it("accepts an allow-listed browser origin when Cloud Run reconstructs an internal request URL", async () => {
    const upstreamFetch = vi.fn<typeof fetch>(() =>
      Promise.resolve(Response.json({ ok: true })),
    );
    const request = new Request(
      "https://internal-frontend.run.app/v1/interview/prepare",
      {
        body: "{}",
        headers: VALID_MUTATION_HEADERS,
        method: "POST",
      },
    );

    const response = await proxyBackendRequest(request, {
      ...LOCAL_BACKEND_OPTIONS,
      upstreamFetch,
    });

    expect(response.status).toBe(200);
    expect(upstreamFetch).toHaveBeenCalledOnce();
    expect(
      new Headers(upstreamFetch.mock.calls[0]?.[1]?.headers).get("origin"),
    ).toBe(FRONTEND_ORIGIN);
  });

  it("rejects an oversized streaming body before contacting the backend", async () => {
    vi.useFakeTimers();
    try {
      const cancel = vi.fn();
      const body = new ReadableStream<Uint8Array>({
        cancel,
        start(controller) {
          controller.enqueue(new Uint8Array(MAX_PROXY_REQUEST_BODY_BYTES + 1));
        },
      });
      const upstreamFetch = vi.fn<typeof fetch>();
      const request = new Request(`${FRONTEND_ORIGIN}/v1/interview/summary`, {
        body,
        duplex: "half",
        headers: VALID_MUTATION_HEADERS,
        method: "POST",
      } as RequestInit & { duplex: "half" });
      const removeAbortListener = vi.spyOn(
        request.signal,
        "removeEventListener",
      );

      const response = await proxyBackendRequest(request, {
        ...LOCAL_BACKEND_OPTIONS,
        upstreamFetch,
      });

      expect(upstreamFetch).not.toHaveBeenCalled();
      expect(response.status).toBe(413);
      expect(response.headers.get("cache-control")).toBe("no-store");
      await expect(response.json()).resolves.toMatchObject({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          retryable: false,
        },
      });
      expect(cancel).toHaveBeenCalledOnce();
      expect(request.body?.locked).toBe(false);
      expect(removeAbortListener).toHaveBeenCalledWith(
        "abort",
        expect.any(Function),
      );
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    [
      "unknown route",
      `${FRONTEND_ORIGIN}/v1/not-real`,
      "POST",
      VALID_MUTATION_HEADERS,
      404,
      "NOT_FOUND",
    ],
    [
      "unsupported method",
      `${FRONTEND_ORIGIN}/v1/cv/analyze`,
      "PUT",
      VALID_MUTATION_HEADERS,
      405,
      "METHOD_NOT_ALLOWED",
    ],
    [
      "wrong content type",
      `${FRONTEND_ORIGIN}/v1/cv/analyze`,
      "POST",
      { ...VALID_MUTATION_HEADERS, "content-type": "text/plain" },
      415,
      "UNSUPPORTED_MEDIA_TYPE",
    ],
    [
      "missing origin",
      `${FRONTEND_ORIGIN}/v1/cv/analyze`,
      "POST",
      {
        "content-type": "application/json",
        cookie: VALID_MUTATION_HEADERS.cookie,
      },
      403,
      "ORIGIN_NOT_ALLOWED",
    ],
    [
      "cross-site origin",
      `${FRONTEND_ORIGIN}/v1/cv/analyze`,
      "POST",
      { ...VALID_MUTATION_HEADERS, origin: "https://attacker.invalid" },
      403,
      "ORIGIN_NOT_ALLOWED",
    ],
    [
      "missing session cookie",
      `${FRONTEND_ORIGIN}/v1/cv/analyze`,
      "POST",
      {
        "content-type": "application/json",
        origin: VALID_MUTATION_HEADERS.origin,
      },
      401,
      "ANONYMOUS_SESSION_REQUIRED",
    ],
    [
      "invalid declared length",
      `${FRONTEND_ORIGIN}/v1/cv/analyze`,
      "POST",
      { ...VALID_MUTATION_HEADERS, "content-length": "invalid" },
      400,
      "INVALID_REQUEST",
    ],
    [
      "oversized declared length",
      `${FRONTEND_ORIGIN}/v1/cv/analyze`,
      "POST",
      {
        ...VALID_MUTATION_HEADERS,
        "content-length": String(MAX_PROXY_REQUEST_BODY_BYTES + 1),
      },
      413,
      "PAYLOAD_TOO_LARGE",
    ],
  ] as const)(
    "rejects %s before reading or forwarding a body",
    async (_name, url, method, headers, status, code) => {
      const upstreamFetch = vi.fn<typeof fetch>();
      const response = await proxyBackendRequest(
        new Request(url, { body: "{}", headers, method }),
        {
          ...LOCAL_BACKEND_OPTIONS,
          upstreamFetch,
        },
      );

      expect(response.status).toBe(status);
      await expect(response.json()).resolves.toMatchObject({
        error: { code, retryable: false },
      });
      expect(upstreamFetch).not.toHaveBeenCalled();
    },
  );

  it("accepts a throttled schema-valid chunked body below the receipt deadline", async () => {
    const requestBody = JSON.stringify({
      clientRequestId: "00000000-0000-4000-8000-000000000010",
      cvText: "Synthetic candidate experience. ".repeat(1_200).slice(0, 40_000),
      turnstileToken: "fake-turnstile-token",
    });
    const bytes = new TextEncoder().encode(requestBody);
    let offset = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        await new Promise((resolve) => setTimeout(resolve, 2));
        const nextOffset = Math.min(offset + 8_192, bytes.byteLength);
        controller.enqueue(bytes.slice(offset, nextOffset));
        offset = nextOffset;
        if (offset === bytes.byteLength) {
          controller.close();
        }
      },
    });
    const upstreamFetch = vi.fn<typeof fetch>(() =>
      Promise.resolve(Response.json({ ok: true })),
    );
    const request = new Request(`${FRONTEND_ORIGIN}/v1/cv/analyze`, {
      body,
      duplex: "half",
      headers: VALID_MUTATION_HEADERS,
      method: "POST",
    } as RequestInit & { duplex: "half" });

    const response = await proxyBackendRequest(request, {
      ...LOCAL_BACKEND_OPTIONS,
      bodyReceiptTimeoutMs: 100,
      upstreamFetch,
    });

    expect(response.status).toBe(200);
    expect(upstreamFetch).toHaveBeenCalledOnce();
    const forwardedBody = upstreamFetch.mock.calls[0]?.[1]?.body;
    expect((forwardedBody as ArrayBuffer).byteLength).toBe(bytes.byteLength);
    expect(
      new Headers(upstreamFetch.mock.calls[0]?.[1]?.headers).get(
        "content-length",
      ),
    ).toBe(String(bytes.byteLength));
    expect(request.body?.locked).toBe(false);
  });

  it("cancels a stalled body at the whole-receipt deadline and clears its timer", async () => {
    vi.useFakeTimers();
    try {
      const cancel = vi.fn();
      const body = new ReadableStream<Uint8Array>({ cancel });
      const upstreamFetch = vi.fn<typeof fetch>();
      const request = new Request(`${FRONTEND_ORIGIN}/v1/interview/summary`, {
        body,
        duplex: "half",
        headers: VALID_MUTATION_HEADERS,
        method: "POST",
      } as RequestInit & { duplex: "half" });
      const removeAbortListener = vi.spyOn(
        request.signal,
        "removeEventListener",
      );
      const responsePromise = proxyBackendRequest(request, {
        ...LOCAL_BACKEND_OPTIONS,
        bodyReceiptTimeoutMs: 25,
        upstreamFetch,
      });

      await vi.advanceTimersByTimeAsync(25);
      const response = await responsePromise;

      expect(response.status).toBe(408);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "REQUEST_TIMEOUT", retryable: true },
      });
      expect(cancel).toHaveBeenCalledOnce();
      expect(upstreamFetch).not.toHaveBeenCalled();
      expect(request.body?.locked).toBe(false);
      expect(removeAbortListener).toHaveBeenCalledWith(
        "abort",
        expect.any(Function),
      );
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancels body receipt immediately when the caller disconnects", async () => {
    vi.useFakeTimers();
    try {
      const abortController = new AbortController();
      const cancel = vi.fn();
      const body = new ReadableStream<Uint8Array>({ cancel });
      const upstreamFetch = vi.fn<typeof fetch>();
      const request = new Request(`${FRONTEND_ORIGIN}/v1/voice/token`, {
        body,
        duplex: "half",
        headers: VALID_MUTATION_HEADERS,
        method: "POST",
        signal: abortController.signal,
      } as RequestInit & { duplex: "half" });
      const removeAbortListener = vi.spyOn(
        request.signal,
        "removeEventListener",
      );
      const responsePromise = proxyBackendRequest(request, {
        ...LOCAL_BACKEND_OPTIONS,
        bodyReceiptTimeoutMs: PROXY_BODY_RECEIPT_TIMEOUT_MS,
        upstreamFetch,
      });

      abortController.abort();

      await expect(responsePromise).rejects.toMatchObject({
        name: "AbortError",
      });
      expect(cancel).toHaveBeenCalledOnce();
      expect(upstreamFetch).not.toHaveBeenCalled();
      expect(request.body?.locked).toBe(false);
      expect(removeAbortListener).toHaveBeenCalledWith(
        "abort",
        expect.any(Function),
      );
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("fails closed without exposing an invalid backend origin", async () => {
    const upstreamFetch = vi.fn<typeof fetch>();
    const request = new Request(
      "https://screenpilot-frontend.example/v1/demo/bootstrap",
    );

    const response = await proxyBackendRequest(request, {
      backendAuthAudience: "",
      backendAuthMode: "local",
      backendOrigin: "https://user:password@backend.example/private",
      frontendAllowedOrigins: [FRONTEND_ORIGIN],
      upstreamFetch,
    });

    expect(upstreamFetch).not.toHaveBeenCalled();
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).not.toContain("backend.example");
    expect(body).not.toContain("password");
  });

  it("returns a content-free retryable error when the backend is unavailable", async () => {
    const upstreamFetch = vi.fn<typeof fetch>(() =>
      Promise.reject(new Error("socket failure at secret-backend.example")),
    );
    const request = new Request(
      "https://screenpilot-frontend.example/v1/demo/bootstrap",
    );

    const response = await proxyBackendRequest(request, {
      ...LOCAL_BACKEND_OPTIONS,
      upstreamFetch,
    });

    expect(response.status).toBe(502);
    const body = await response.text();
    expect(body).toContain("BACKEND_UNAVAILABLE");
    expect(body).not.toContain("secret-backend.example");
    expect(body).not.toContain("screenpilot-backend.example");
  });
});
