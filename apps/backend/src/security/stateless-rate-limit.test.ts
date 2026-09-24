import { describe, expect, it } from "vitest";

import { createStatelessRateLimiter } from "./stateless-rate-limit.js";

describe("stateless per-instance rate limiter", () => {
  it("limits source and anonymous-session buckets independently", () => {
    const limiter = createStatelessRateLimiter({
      fingerprintSecret: "unit-test-fingerprint-secret",
      maxEntries: 10,
      windowSeconds: 60,
    });

    expect(
      limiter.consume({
        anonymousSessionId: "session-a",
        limit: 2,
        route: "voice_token",
        source: "192.0.2.1",
      }),
    ).toEqual({ allowed: true });
    expect(
      limiter.consume({
        anonymousSessionId: "session-a",
        limit: 2,
        route: "voice_token",
        source: "192.0.2.2",
      }),
    ).toEqual({ allowed: true });
    expect(
      limiter.consume({
        anonymousSessionId: "session-a",
        limit: 2,
        route: "voice_token",
        source: "192.0.2.3",
      }),
    ).toEqual({ allowed: false, retryAfterSeconds: 60 });

    expect(
      limiter.consume({
        anonymousSessionId: "session-b",
        limit: 2,
        route: "voice_token",
        source: "192.0.2.1",
      }),
    ).toEqual({ allowed: true });
    expect(
      limiter.consume({
        anonymousSessionId: "session-c",
        limit: 2,
        route: "voice_token",
        source: "192.0.2.1",
      }),
    ).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it("keeps a fixed window on hits and reports a bounded retry delay", () => {
    let now = 10_000;
    const limiter = createStatelessRateLimiter({
      clockMilliseconds: () => now,
      fingerprintSecret: "unit-test-fingerprint-secret",
      maxEntries: 10,
      windowSeconds: 10,
    });
    const request = {
      limit: 1,
      route: "demo_bootstrap" as const,
      source: "192.0.2.10",
    };

    expect(limiter.consume(request)).toEqual({ allowed: true });
    now += 1_500;
    expect(limiter.consume(request)).toEqual({
      allowed: false,
      retryAfterSeconds: 9,
    });
    now += 8_500;
    expect(limiter.consume(request)).toEqual({ allowed: true });
  });

  it("expires buckets in deadline order without scanning newer entries", () => {
    let now = 0;
    const limiter = createStatelessRateLimiter({
      clockMilliseconds: () => now,
      fingerprintSecret: "unit-test-fingerprint-secret",
      maxEntries: 3,
      windowSeconds: 10,
    });

    expect(
      limiter.consume({
        limit: 1,
        route: "demo_bootstrap",
        source: "192.0.2.1",
      }),
    ).toEqual({ allowed: true });
    now = 5_000;
    expect(
      limiter.consume({
        limit: 1,
        route: "demo_bootstrap",
        source: "192.0.2.2",
      }),
    ).toEqual({ allowed: true });
    now = 10_000;
    expect(
      limiter.consume({
        limit: 1,
        route: "demo_bootstrap",
        source: "192.0.2.3",
      }),
    ).toEqual({ allowed: true });
    expect(
      limiter.consume({
        limit: 1,
        route: "demo_bootstrap",
        source: "192.0.2.2",
      }),
    ).toEqual({ allowed: false, retryAfterSeconds: 5 });
    expect(
      limiter.consume({
        limit: 1,
        route: "demo_bootstrap",
        source: "192.0.2.1",
      }),
    ).toEqual({ allowed: true });
  });

  it("does not let expired metadata remove a recreated bucket", () => {
    let now = 0;
    const limiter = createStatelessRateLimiter({
      clockMilliseconds: () => now,
      fingerprintSecret: "unit-test-fingerprint-secret",
      maxEntries: 1,
      windowSeconds: 10,
    });
    const request = {
      limit: 1,
      route: "demo_bootstrap" as const,
      source: "192.0.2.10",
    };

    expect(limiter.consume(request)).toEqual({ allowed: true });
    now = 10_000;
    expect(limiter.consume(request)).toEqual({ allowed: true });
    now = 15_000;
    expect(limiter.consume(request)).toEqual({
      allowed: false,
      retryAfterSeconds: 5,
    });
  });

  it("protects current source and session keys while making capacity", () => {
    let now = 0;
    const limiter = createStatelessRateLimiter({
      clockMilliseconds: () => now,
      fingerprintSecret: "unit-test-fingerprint-secret",
      maxEntries: 2,
      windowSeconds: 60,
    });

    expect(
      limiter.consume({
        limit: 2,
        route: "voice_token",
        source: "192.0.2.1",
      }),
    ).toEqual({ allowed: true });
    now = 1_000;
    expect(
      limiter.consume({
        limit: 2,
        route: "voice_token",
        source: "192.0.2.2",
      }),
    ).toEqual({ allowed: true });
    now = 2_000;
    expect(
      limiter.consume({
        anonymousSessionId: "session-a",
        limit: 2,
        route: "voice_token",
        source: "192.0.2.1",
      }),
    ).toEqual({ allowed: true });
    expect(
      limiter.consume({
        limit: 2,
        route: "voice_token",
        source: "192.0.2.1",
      }),
    ).toEqual({ allowed: false, retryAfterSeconds: 58 });
  });

  it("bounds memory by evicting the soonest expiring unrelated bucket", () => {
    let now = 0;
    const limiter = createStatelessRateLimiter({
      clockMilliseconds: () => now,
      fingerprintSecret: "unit-test-fingerprint-secret",
      maxEntries: 2,
      windowSeconds: 60,
    });

    expect(
      limiter.consume({
        limit: 1,
        route: "demo_bootstrap",
        source: "192.0.2.1",
      }),
    ).toEqual({ allowed: true });
    now += 1;
    expect(
      limiter.consume({
        limit: 1,
        route: "demo_bootstrap",
        source: "192.0.2.2",
      }),
    ).toEqual({ allowed: true });
    now += 1;
    expect(
      limiter.consume({
        limit: 1,
        route: "demo_bootstrap",
        source: "192.0.2.3",
      }),
    ).toEqual({ allowed: true });

    expect(
      limiter.consume({
        limit: 1,
        route: "demo_bootstrap",
        source: "192.0.2.1",
      }),
    ).toEqual({ allowed: true });
    expect(
      limiter.consume({
        limit: 1,
        route: "demo_bootstrap",
        source: "192.0.2.3",
      }),
    ).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it("remains bounded under sustained source churn", () => {
    const limiter = createStatelessRateLimiter({
      fingerprintSecret: "unit-test-fingerprint-secret",
      maxEntries: 2,
      windowSeconds: 60,
    });

    for (let index = 0; index < 2_000; index += 1) {
      expect(
        limiter.consume({
          limit: 1,
          route: "demo_bootstrap",
          source: `192.0.2.${String(index)}`,
        }),
      ).toEqual({ allowed: true });
    }
    expect(
      limiter.consume({
        limit: 1,
        route: "demo_bootstrap",
        source: "192.0.2.1999",
      }),
    ).toEqual({ allowed: false, retryAfterSeconds: 60 });
    expect(
      limiter.consume({
        limit: 1,
        route: "demo_bootstrap",
        source: "192.0.2.0",
      }),
    ).toEqual({ allowed: true });
  });
});
