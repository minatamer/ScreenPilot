import { describe, expect, it } from "vitest";

import { createBrowserSecurityPolicy } from "./browser-security-policy";

const NONCE = "ZmFrZS1yZXF1ZXN0LW5vbmNl";

describe("browser security policy", () => {
  it("allows only the exact browser provider origins without unsafe inline code", () => {
    const policy = createBrowserSecurityPolicy(NONCE, false);

    expect(policy).toContain(`script-src 'self' 'nonce-${NONCE}'`);
    expect(policy).toContain("https://challenges.cloudflare.com");
    expect(policy).toContain("https://api.elevenlabs.io");
    expect(policy).toContain("wss://api.elevenlabs.io");
    expect(policy).toContain("https://livekit.rtc.elevenlabs.io");
    expect(policy).toContain("wss://livekit.rtc.elevenlabs.io");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("script-src-attr 'none'");
    expect(policy).toContain("style-src-attr 'none'");
    expect(policy).toContain("upgrade-insecure-requests");
    expect(policy).not.toContain("'unsafe-inline'");
    expect(policy).not.toMatch(/(?:^|\s)\*(?:\s|;|$)/u);
  });

  it("permits only the Next development evaluator and validates the nonce", () => {
    const policy = createBrowserSecurityPolicy(NONCE, true);

    expect(policy).toContain("'unsafe-eval'");
    expect(policy).not.toContain("upgrade-insecure-requests");
    expect(() => createBrowserSecurityPolicy("bad'; *", false)).toThrow(
      "A valid request nonce is required",
    );
  });
});
