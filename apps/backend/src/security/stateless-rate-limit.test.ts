import { describe, expect, it, vi } from "vitest";

import { createStatelessRateLimiter } from "./stateless-rate-limit.js";

describe("stateless per-instance rate limiter", () => {
  it("limits source and anonymous-session buckets independently", () => {
    const limiter = createStatelessRateLimiter({
      fingerprintSecret: "unit-test-fingerprint-secret",
      maxEntries: 10,
      windowSeconds: 60,
    });
    const request = {
      globalLimit: 20,
      limit: 2,
      route: "voice_token" as const,
    };

    expect(
      limiter.consume({
        ...request,
        anonymousSessionId: "session-a",
        source: "192.0.2.1",
      }),
    ).toEqual({ allowed: true });
    expect(
      limiter.consume({
        ...request,
        anonymousSessionId: "session-a",
        source: "192.0.2.2",
      }),
    ).toEqual({ allowed: true });
    expect(
      limiter.consume({
        ...request,
        anonymousSessionId: "session-a",
        source: "192.0.2.3",
      }),
    ).toEqual({ allowed: false, retryAfterSeconds: 60 });

    expect(
      limiter.consume({
        ...request,
        anonymousSessionId: "session-b",
        source: "192.0.2.1",
      }),
    ).toEqual({ allowed: true });
    expect(
      limiter.consume({
        ...request,
        anonymousSessionId: "session-c",
        source: "192.0.2.1",
      }),
    ).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it("keeps fixed identity and global windows with stable retry delays", () => {
    let now = 10_000;
    const limiter = createStatelessRateLimiter({
      clockMilliseconds: () => now,
      fingerprintSecret: "unit-test-fingerprint-secret",
      maxEntries: 10,
      windowSeconds: 10,
    });
    const identityLimited = {
      globalLimit: 10,
      limit: 1,
      route: "demo_bootstrap" as const,
      source: "192.0.2.10",
    };

    expect(limiter.consume(identityLimited)).toEqual({ allowed: true });
    now += 1_500;
    expect(limiter.consume(identityLimited)).toEqual({
      allowed: false,
      retryAfterSeconds: 9,
    });
    now += 8_500;
    expect(limiter.consume(identityLimited)).toEqual({ allowed: true });

    const globallyLimited = {
      globalLimit: 1,
      limit: 10,
      route: "interview_prepare" as const,
    };
    expect(
      limiter.consume({ ...globallyLimited, source: "192.0.2.20" }),
    ).toEqual({ allowed: true });
    now += 2_001;
    expect(
      limiter.consume({ ...globallyLimited, source: "192.0.2.21" }),
    ).toEqual({ allowed: false, retryAfterSeconds: 8 });
  });

  it("expires buckets in heap order without scanning active entries", () => {
    let now = 0;
    const limiter = createStatelessRateLimiter({
      clockMilliseconds: () => now,
      fingerprintSecret: "unit-test-fingerprint-secret",
      maxEntries: 3,
      windowSeconds: 10,
    });
    const request = {
      globalLimit: 20,
      limit: 1,
      route: "demo_bootstrap" as const,
    };

    expect(limiter.consume({ ...request, source: "192.0.2.1" })).toEqual({
      allowed: true,
    });
    now = 5_000;
    expect(limiter.consume({ ...request, source: "192.0.2.2" })).toEqual({
      allowed: true,
    });
    now = 10_000;
    expect(limiter.consume({ ...request, source: "192.0.2.3" })).toEqual({
      allowed: true,
    });
    expect(limiter.consume({ ...request, source: "192.0.2.2" })).toEqual({
      allowed: false,
      retryAfterSeconds: 5,
    });
    expect(limiter.consume({ ...request, source: "192.0.2.1" })).toEqual({
      allowed: true,
    });
  });

  it("fails an atomic source-and-session admission without incrementing either key", () => {
    const limiter = createStatelessRateLimiter({
      fingerprintSecret: "unit-test-fingerprint-secret",
      maxEntries: 2,
      windowSeconds: 60,
    });
    const request = {
      globalLimit: 20,
      limit: 2,
      route: "voice_token" as const,
    };

    expect(limiter.consume({ ...request, source: "192.0.2.1" })).toEqual({
      allowed: true,
    });
    expect(limiter.consume({ ...request, source: "192.0.2.2" })).toEqual({
      allowed: true,
    });
    expect(
      limiter.consume({
        ...request,
        anonymousSessionId: "session-a",
        source: "192.0.2.1",
      }),
    ).toEqual({ allowed: false, retryAfterSeconds: 60 });
    expect(limiter.consume({ ...request, source: "192.0.2.1" })).toEqual({
      allowed: true,
    });
  });

  it("never evicts active enforcement while rejecting sustained identity churn", () => {
    const limiter = createStatelessRateLimiter({
      fingerprintSecret: "unit-test-fingerprint-secret",
      maxEntries: 2,
      windowSeconds: 60,
    });
    const request = {
      globalLimit: 2_000,
      limit: 1,
      route: "demo_bootstrap" as const,
    };

    expect(limiter.consume({ ...request, source: "192.0.2.0" })).toEqual({
      allowed: true,
    });
    expect(limiter.consume({ ...request, source: "192.0.2.1" })).toEqual({
      allowed: true,
    });
    for (let index = 2; index < 2_000; index += 1) {
      expect(
        limiter.consume({ ...request, source: `192.0.2.${String(index)}` }),
      ).toEqual({ allowed: false, retryAfterSeconds: 60 });
    }
    expect(limiter.consume({ ...request, source: "192.0.2.0" })).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
  });

  it("caps aggregate route work before identity rotation can fill memory", () => {
    const limiter = createStatelessRateLimiter({
      fingerprintSecret: "unit-test-fingerprint-secret",
      maxEntries: 100,
      windowSeconds: 60,
    });
    const request = {
      globalLimit: 3,
      limit: 2,
      route: "cv_analyze" as const,
    };

    for (let index = 0; index < 3; index += 1) {
      expect(
        limiter.consume({ ...request, source: `192.0.2.${String(index)}` }),
      ).toEqual({ allowed: true });
    }
    expect(limiter.consume({ ...request, source: "192.0.2.4" })).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
  });

  it("exercises the configured 10,000-entry ceiling with bounded allocation", () => {
    const limiter = createStatelessRateLimiter({
      fingerprintSecret: "unit-test-fingerprint-secret",
      maxEntries: 10_000,
      windowSeconds: 60,
    });
    const request = {
      globalLimit: 10_001,
      limit: 1,
      route: "demo_bootstrap" as const,
    };

    for (let index = 0; index < 10_000; index += 1) {
      expect(
        limiter.consume({ ...request, source: `source-${String(index)}` }),
      ).toEqual({ allowed: true });
    }
    expect(limiter.consume({ ...request, source: "overflow-source" })).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
    expect(limiter.consume({ ...request, source: "source-0" })).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
  });

  it("emits content-free rejection diagnostics", () => {
    const onRejection = vi.fn();
    const limiter = createStatelessRateLimiter({
      fingerprintSecret: "unit-test-fingerprint-secret",
      maxEntries: 1,
      onRejection,
      windowSeconds: 60,
    });
    const request = {
      globalLimit: 10,
      limit: 1,
      route: "interview_summary" as const,
    };

    expect(
      limiter.consume({ ...request, source: "PRIVATE-SOURCE-VALUE" }),
    ).toEqual({ allowed: true });
    expect(
      limiter.consume({ ...request, source: "SECOND-PRIVATE-SOURCE" }),
    ).toEqual({ allowed: false, retryAfterSeconds: 60 });
    expect(onRejection).toHaveBeenCalledWith({
      activeIdentityBuckets: 1,
      maximumIdentityBuckets: 1,
      reason: "identity_table_saturated",
      retryAfterSeconds: 60,
      route: "interview_summary",
    });
    expect(JSON.stringify(onRejection.mock.calls)).not.toMatch(
      /PRIVATE-SOURCE-VALUE|SECOND-PRIVATE-SOURCE/u,
    );
  });
});
