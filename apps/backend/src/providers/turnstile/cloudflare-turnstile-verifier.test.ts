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

function createVerifier(
  fetchImplementation: typeof fetch,
  timeoutMs = 100,
  clockMilliseconds: () => number = Date.now,
) {
  return new CloudflareTurnstileVerifier({
    allowedHostnames: ["demo.screenpilot.invalid"],
    clockMilliseconds,
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

  it("ignores provider response fields that the verifier does not consume", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();
    fetchImplementation.mockResolvedValue(
      response({
        action: "voice_token",
        "error-codes": [],
        hostname: "demo.screenpilot.invalid",
        metadata: {
          ephemeral_id: "unit-test-ephemeral-id",
          provider_extension: true,
        },
        provider_extension: "unit-test-extension",
        success: true,
      }),
    );

    await expect(
      createVerifier(fetchImplementation).verifyChallenge({
        expectedAction: "voice_token",
        token: TOKEN,
      }),
    ).resolves.toEqual({
      action: "voice_token",
      errorCodes: [],
      hostname: "demo.screenpilot.invalid",
      success: true,
    });
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
    [
      "HTTP failure",
      response({ success: false }, 503),
      "http_non_success",
      503,
      undefined,
    ],
    [
      "empty response body",
      new Response(null, { status: 200 }),
      "response_body_empty",
      undefined,
      undefined,
    ],
    [
      "oversized response body",
      response({ padding: "x".repeat(16_385), success: true }),
      "response_body_oversized",
      undefined,
      undefined,
    ],
    [
      "invalid response body",
      new Response(new Uint8Array([0xc3, 0x28]), { status: 200 }),
      "response_body_invalid",
      undefined,
      undefined,
    ],
    [
      "invalid JSON",
      new Response("{not-json", { status: 200 }),
      "response_json_invalid",
      undefined,
      undefined,
    ],
    [
      "response schema mismatch",
      response({ success: "not-a-boolean" }),
      "response_schema_mismatch",
      undefined,
      "success",
    ],
  ] as const)(
    "fails closed for %s with a content-safe diagnostic category",
    async (_name, result, category, httpStatus, schemaMismatchCategory) => {
      const fetchImplementation = vi.fn<typeof fetch>();
      fetchImplementation.mockResolvedValue(result);
      const clockMilliseconds = vi
        .fn<() => number>()
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(114);

      const error = await createVerifier(
        fetchImplementation,
        100,
        clockMilliseconds,
      )
        .verifyChallenge({
          expectedAction: "cv_analyze",
          token: TOKEN,
        })
        .catch((failure: unknown) => failure);
      expect(error).toBeInstanceOf(TurnstileVerificationError);
      expect(error).toMatchObject({
        category,
        durationMs: 14,
        ...(httpStatus === undefined ? {} : { httpStatus }),
        ...(schemaMismatchCategory === undefined
          ? {}
          : { schemaMismatchCategory }),
      });
      expect(String(error)).not.toContain(SECRET);
      expect(String(error)).not.toContain(TOKEN);
      expect(fetchImplementation).toHaveBeenCalledOnce();
    },
  );

  it("categorizes a fetch failure without exposing its cause", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();
    fetchImplementation.mockRejectedValue(new TypeError("synthetic failure"));

    const error = await createVerifier(fetchImplementation)
      .verifyChallenge({
        expectedAction: "cv_analyze",
        token: TOKEN,
      })
      .catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(TurnstileVerificationError);
    expect(error).toMatchObject({ category: "fetch_or_abort_failure" });
    expect(String(error)).not.toContain("synthetic failure");
    expect(String(error)).not.toContain(SECRET);
    expect(String(error)).not.toContain(TOKEN);
  });

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

    const timeoutError = await createVerifier(fetchImplementation, 5)
      .verifyChallenge({
        expectedAction: "cv_analyze",
        token: TOKEN,
      })
      .catch((failure: unknown) => failure);
    expect(timeoutError).toBeInstanceOf(TurnstileVerificationError);
    expect(timeoutError).toMatchObject({
      category: "fetch_or_abort_failure",
    });
    expect(fetchImplementation).toHaveBeenCalledOnce();
  });
});
