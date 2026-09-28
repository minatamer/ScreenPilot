import { describe, expect, it, vi } from "vitest";

import {
  createGoogleCloudIdentityTokenProvider,
  GoogleCloudIdentityTokenError,
} from "./google-cloud-identity-token";

const AUDIENCE = "https://screenpilot-backend-123.region.run.app";
const NOW_MILLISECONDS = Date.parse("2026-09-28T12:00:00.000Z");

function identityToken(input: { audience?: string; expirySeconds?: number }) {
  const payload = btoa(
    JSON.stringify({
      aud: input.audience ?? AUDIENCE,
      exp: input.expirySeconds ?? Math.floor(NOW_MILLISECONDS / 1_000) + 3_600,
    }),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
  return `header.${payload}.signature`;
}

describe("Google Cloud identity-token provider", () => {
  it("requests, validates, and caches an audience-bound metadata token", async () => {
    const token = identityToken({});
    const metadataFetch = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(token)),
    );
    const provider = createGoogleCloudIdentityTokenProvider({
      audience: AUDIENCE,
      clockMilliseconds: () => NOW_MILLISECONDS,
      metadataFetch,
    });

    await expect(
      Promise.all([provider.getToken(), provider.getToken()]),
    ).resolves.toEqual([token, token]);
    await expect(provider.getToken()).resolves.toBe(token);

    expect(metadataFetch).toHaveBeenCalledOnce();
    const [target, init] = metadataFetch.mock.calls[0] ?? [];
    expect(target).toBeInstanceOf(URL);
    if (!(target instanceof URL)) {
      throw new TypeError("Expected a metadata identity URL.");
    }
    expect(target.href).toBe(
      `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(AUDIENCE)}`,
    );
    expect(new Headers(init?.headers)).toEqual(
      new Headers({ "metadata-flavor": "Google" }),
    );
    expect(init).toMatchObject({
      cache: "no-store",
      method: "GET",
      redirect: "error",
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects a token whose audience does not match the backend origin", async () => {
    const metadataFetch = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(identityToken({ audience: "https://other.run.app" })),
      ),
    );
    const provider = createGoogleCloudIdentityTokenProvider({
      audience: AUDIENCE,
      clockMilliseconds: () => NOW_MILLISECONDS,
      metadataFetch,
    });

    await expect(provider.getToken()).rejects.toBeInstanceOf(
      GoogleCloudIdentityTokenError,
    );
  });

  it("aborts a stalled metadata request and clears its timer", async () => {
    vi.useFakeTimers();
    try {
      const metadataFetch = vi.fn<typeof fetch>(
        (_target, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => {
                reject(new DOMException("Aborted", "AbortError"));
              },
              { once: true },
            );
          }),
      );
      const provider = createGoogleCloudIdentityTokenProvider({
        audience: AUDIENCE,
        clockMilliseconds: () => NOW_MILLISECONDS,
        metadataFetch,
        timeoutMilliseconds: 25,
      });
      const tokenPromise = provider.getToken();
      const rejection = expect(tokenPromise).rejects.toBeInstanceOf(
        GoogleCloudIdentityTokenError,
      );

      await vi.advanceTimersByTimeAsync(25);

      await rejection;
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
