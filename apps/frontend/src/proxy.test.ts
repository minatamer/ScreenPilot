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
    expect(config.matcher[0]?.source).toContain("v1");
    expect(config.matcher[0]?.source).toContain("worklets");
  });
});
