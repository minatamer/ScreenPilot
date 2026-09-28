import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { config, proxy } from "./proxy";

describe("frontend proxy security headers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("adds a per-request strict policy and non-cacheable browser headers", () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = proxy(new NextRequest("https://screenpilot.example/demo"));
    const policy = response.headers.get("content-security-policy");

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(policy).toMatch(/'nonce-[A-Za-z0-9+/=_-]+'/u);
    expect(policy).toContain("style-src-attr 'none'");
    expect(policy).not.toContain("'unsafe-inline'");
    expect(response.headers.get("permissions-policy")).toBe(
      "camera=(), geolocation=(), microphone=(self), browsing-topics=()",
    );
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("strict-transport-security")).toContain(
      "max-age=63072000",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });

  it("leaves generated worklets and proxied API routes outside the page matcher", () => {
    const pageMatcher = config.matcher[1];
    expect(typeof pageMatcher).toBe("object");
    if (typeof pageMatcher === "object") {
      expect(pageMatcher.source).toContain("v1");
      expect(pageMatcher.source).toContain("worklets");
    }
  });

  it("serves the sample CV only through an exact loopback request", () => {
    const localResponse = proxy(
      new NextRequest(
        "http://127.0.0.1:3000/fixtures/screenpilot-sample-cv.pdf",
        { headers: { host: "127.0.0.1:3000" } },
      ),
    );
    const customHostResponse = proxy(
      new NextRequest(
        "http://127.0.0.1:3000/fixtures/screenpilot-sample-cv.pdf",
        { headers: { host: "screenpilot.example" } },
      ),
    );
    const methodResponse = proxy(
      new NextRequest(
        "http://localhost:3000/fixtures/screenpilot-sample-cv.pdf",
        { headers: { host: "localhost:3000" }, method: "POST" },
      ),
    );

    expect(config.matcher[0]).toBe("/fixtures/screenpilot-sample-cv.pdf");
    expect(localResponse.status).toBe(200);
    expect(localResponse.headers.get("cache-control")).toBe("no-store");
    expect(customHostResponse.status).toBe(404);
    expect(methodResponse.status).toBe(404);
  });
});
