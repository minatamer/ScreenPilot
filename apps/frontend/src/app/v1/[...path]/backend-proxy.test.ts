import { describe, expect, it, vi } from "vitest";

import {
  MAX_PROXY_REQUEST_BODY_BYTES,
  proxyBackendRequest,
} from "./backend-proxy";

describe("proxyBackendRequest", () => {
  it("forwards the relative API path, request metadata, and bounded body", async () => {
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
      "https://screenpilot-frontend.example/v1/cv/analyze?source=demo",
      {
        body: JSON.stringify({ cvText: "Synthetic candidate" }),
        headers: {
          accept: "application/json",
          connection: "keep-alive",
          "content-type": "application/json",
          cookie: "sp_anonymous_session=existing",
          host: "screenpilot-frontend.example",
          origin: "https://screenpilot-frontend.example",
        },
        method: "POST",
      },
    );

    const response = await proxyBackendRequest(request, {
      backendOrigin: "https://screenpilot-backend.example",
      upstreamFetch,
    });

    expect(upstreamFetch).toHaveBeenCalledOnce();
    const [target, init] = upstreamFetch.mock.calls[0] ?? [];
    expect(target).toBeInstanceOf(URL);
    if (!(target instanceof URL)) {
      throw new TypeError("Expected the backend proxy target to be a URL.");
    }
    expect(target.href).toBe(
      "https://screenpilot-backend.example/v1/cv/analyze?source=demo",
    );
    expect(init?.method).toBe("POST");
    expect(init?.signal).toBe(request.signal);
    const forwardedHeaders = new Headers(init?.headers);
    expect(forwardedHeaders.get("host")).toBeNull();
    expect(forwardedHeaders.get("connection")).toBeNull();
    expect(forwardedHeaders.get("cookie")).toBe(
      "sp_anonymous_session=existing",
    );
    expect(forwardedHeaders.get("origin")).toBe(
      "https://screenpilot-frontend.example",
    );
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

  it("rejects an oversized streaming body before contacting the backend", async () => {
    const upstreamFetch = vi.fn<typeof fetch>();
    const request = new Request(
      "https://screenpilot-frontend.example/v1/interview/summary",
      {
        body: "x".repeat(MAX_PROXY_REQUEST_BODY_BYTES + 1),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    const response = await proxyBackendRequest(request, {
      backendOrigin: "https://screenpilot-backend.example",
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
  });

  it("fails closed without exposing an invalid backend origin", async () => {
    const upstreamFetch = vi.fn<typeof fetch>();
    const request = new Request(
      "https://screenpilot-frontend.example/v1/demo/bootstrap",
    );

    const response = await proxyBackendRequest(request, {
      backendOrigin: "https://user:password@backend.example/private",
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
      backendOrigin: "https://screenpilot-backend.example",
      upstreamFetch,
    });

    expect(response.status).toBe(502);
    const body = await response.text();
    expect(body).toContain("BACKEND_UNAVAILABLE");
    expect(body).not.toContain("secret-backend.example");
    expect(body).not.toContain("screenpilot-backend.example");
  });
});
