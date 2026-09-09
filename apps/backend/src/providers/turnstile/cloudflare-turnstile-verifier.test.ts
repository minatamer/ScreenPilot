import { describe, expect, it, vi } from "vitest";

import {
  CloudflareTurnstileVerifier,
  TurnstileVerificationError,
} from "./cloudflare-turnstile-verifier.js";

const SECRET = "unit-test-turnstile-secret-not-real";
const TOKEN = "unit-test-turnstile-token-not-real";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function createVerifier(fetchImplementation: typeof fetch, timeoutMs = 100) {
  return new CloudflareTurnstileVerifier({
    allowedHostnames: ["demo.screenpilot.invalid"],
    fetchImplementation,
    secretKey: SECRET,
    timeoutMs,
    verificationUrl:
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  });
}

describe("CloudflareTurnstileVerifier", () => {
  it("posts only verification fields and validates hostname and action", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();
    fetchImplementation.mockResolvedValue(
      response({
        action: "voice_token",
        challenge_ts: "2026-09-09T12:00:00.000Z",
        "error-codes": [],
        hostname: "demo.screenpilot.invalid",
        success: true,
      }),
    );
    const verifier = createVerifier(fetchImplementation);

    await expect(
      verifier.verifyChallenge({
        expectedAction: "voice_token",
        token: TOKEN,
      }),
    ).resolves.toEqual({
      action: "voice_token",
      errorCodes: [],
      hostname: "demo.screenpilot.invalid",
      success: true,
    });

    const request = fetchImplementation.mock.calls[0];
    expect(request?.[0]).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    expect(request?.[1]?.method).toBe("POST");
    const body = request?.[1]?.body;
    if (!(body instanceof URLSearchParams)) {
      throw new TypeError("Expected a form-encoded Siteverify request.");
    }
    expect(body.toString()).toContain(`response=${TOKEN}`);
    expect(body.toString()).toContain(`secret=${SECRET}`);
    expect(body.toString()).not.toMatch(/candidate|transcript|cvText/i);
  });

  it.each([
    [
      "action",
      { action: "cv_analyze", hostname: "demo.screenpilot.invalid" },
      "action-mismatch",
    ],
    [
      "hostname",
      { action: "voice_token", hostname: "other.invalid" },
      "hostname-mismatch",
    ],
  ])(
    "rejects a successful response with the wrong %s",
    async (_name, fields, code) => {
      const fetchImplementation = vi.fn<typeof fetch>();
      fetchImplementation.mockResolvedValue(
        response({ ...fields, "error-codes": [], success: true }),
      );

      await expect(
        createVerifier(fetchImplementation).verifyChallenge({
          expectedAction: "voice_token",
          token: TOKEN,
        }),
      ).resolves.toMatchObject({ errorCodes: [code], success: false });
    },
  );

  it("preserves bounded Cloudflare rejection codes", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();
    fetchImplementation.mockResolvedValue(
      response({
        "error-codes": ["timeout-or-duplicate"],
        success: false,
      }),
    );

    await expect(
      createVerifier(fetchImplementation).verifyChallenge({
        expectedAction: "cv_analyze",
        token: TOKEN,
      }),
    ).resolves.toEqual({
      action: null,
      errorCodes: ["timeout-or-duplicate"],
      hostname: null,
      success: false,
    });
  });

  it.each([
    ["HTTP failure", response({ success: false }, 503)],
    ["invalid response", response({ success: true, unexpected: true })],
    [
      "oversized response",
      response({ padding: "x".repeat(16_385), success: true }),
    ],
  ])(
    "fails closed for %s without exposing the secret",
    async (_name, result) => {
      const fetchImplementation = vi.fn<typeof fetch>();
      fetchImplementation.mockResolvedValue(result);

      const verification = createVerifier(fetchImplementation).verifyChallenge({
        expectedAction: "cv_analyze",
        token: TOKEN,
      });
      await expect(verification).rejects.toBeInstanceOf(
        TurnstileVerificationError,
      );
      await expect(verification).rejects.not.toThrow(SECRET);
      expect(fetchImplementation).toHaveBeenCalledOnce();
    },
  );

  it("bounds tokens before the network and aborts a timed-out request", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();
    fetchImplementation.mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => {
            reject(new Error("Siteverify request aborted."));
          },
          { once: true },
        );
      });
    });
    const verifier = createVerifier(fetchImplementation, 5);

    await expect(
      verifier.verifyChallenge({
        expectedAction: "cv_analyze",
        token: "x".repeat(2_049),
      }),
    ).resolves.toMatchObject({
      errorCodes: ["invalid-input-response"],
      success: false,
    });
    expect(fetchImplementation).not.toHaveBeenCalled();

    await expect(
      verifier.verifyChallenge({
        expectedAction: "cv_analyze",
        token: TOKEN,
      }),
    ).rejects.toBeInstanceOf(TurnstileVerificationError);
    expect(fetchImplementation).toHaveBeenCalledOnce();
  });
});
