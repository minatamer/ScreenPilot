import { describe, expect, it, vi } from "vitest";

import { FAKE_TURNSTILE_PASS_TOKEN } from "../providers/turnstile/fake-turnstile-verifier.js";
import {
  createInterviewGrantService,
  hashInterviewGrantValue,
} from "../security/interview-grant.js";
import { createVoiceToken } from "./create-voice-token.js";
import type { ChallengeVerifier } from "./ports/challenge-verifier.js";
import type { VoiceTokenProvider } from "./ports/voice-token-provider.js";

const FIXED_NOW = new Date("2026-09-12T09:00:00.000Z");
const SESSION_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_SESSION_ID = "00000000-0000-4000-8000-000000000099";
const REQUEST_ID = "request-014";
const SIGNING_SECRET = "unit-test-grant-secret-0000000000000";

function grantFor(entryMode: "conversation_first" | "cv_assisted") {
  const service = createInterviewGrantService({
    clock: () => FIXED_NOW,
    secret: SIGNING_SECRET,
  });
  const sharedBinding = {
    anonymousSessionId: SESSION_ID,
    grantId: "00000000-0000-4000-8000-000000000014",
    planHash: hashInterviewGrantValue({ entryMode }),
    planVersion: "test-plan-v1",
    ttlSeconds: 900,
  };
  const token =
    entryMode === "cv_assisted"
      ? service.issue({
          ...sharedBinding,
          cvAnalysisHash: hashInterviewGrantValue({ facts: ["fact-1"] }),
          entryMode,
        }).token
      : service.issue({ ...sharedBinding, entryMode }).token;
  return { service, token };
}

function providers(options: { challengeSuccess?: boolean } = {}) {
  const verifyChallenge = vi.fn<ChallengeVerifier["verifyChallenge"]>(() =>
    Promise.resolve({
      action: options.challengeSuccess === false ? null : "voice_token",
      errorCodes:
        options.challengeSuccess === false ? ["timeout-or-duplicate"] : [],
      hostname:
        options.challengeSuccess === false ? null : "test.screenpilot.invalid",
      success: options.challengeSuccess !== false,
    }),
  );
  const createProviderToken = vi.fn<VoiceTokenProvider["createVoiceToken"]>(
    () =>
      Promise.resolve({
        conversationId: "conversation-014",
        conversationToken: "short-lived-conversation-token",
      }),
  );
  return {
    provider: { createVoiceToken: createProviderToken },
    createProviderToken,
    verifier: { verifyChallenge },
    verifyChallenge,
  };
}

function request(interviewGrant: string) {
  return {
    interviewGrant,
    turnstileToken: FAKE_TURNSTILE_PASS_TOKEN,
  };
}

describe("createVoiceToken", () => {
  it.each(["conversation_first", "cv_assisted"] as const)(
    "accepts a signed %s grant and returns only the SDK authorization fields",
    async (entryMode) => {
      const grant = grantFor(entryMode);
      const providerSet = providers();
      const order: string[] = [];
      const issueVoiceToken = createVoiceToken({
        admission: () => {
          order.push("admission");
          return "allowed";
        },
        enabled: true,
        grantService: grant.service,
        provider: {
          createVoiceToken: async (input, signal) => {
            order.push("elevenlabs");
            return providerSet.createProviderToken(input, signal);
          },
        },
        verifier: {
          verifyChallenge: async (input, signal) => {
            order.push("turnstile");
            return providerSet.verifyChallenge(input, signal);
          },
        },
      });

      const response = await issueVoiceToken(
        request(grant.token),
        SESSION_ID,
        REQUEST_ID,
      );

      expect(response).toEqual({
        conversationId: "conversation-014",
        conversationToken: "short-lived-conversation-token",
      });
      expect(order).toEqual(["admission", "turnstile", "elevenlabs"]);
      expect(providerSet.verifyChallenge).toHaveBeenCalledWith(
        {
          expectedAction: "voice_token",
          token: FAKE_TURNSTILE_PASS_TOKEN,
        },
        undefined,
      );
      expect(providerSet.createProviderToken).toHaveBeenCalledWith(
        { requestId: REQUEST_ID },
        undefined,
      );
    },
  );

  it("rejects an invalid or session-mismatched grant before every external operation", async () => {
    const grant = grantFor("conversation_first");
    const providerSet = providers();
    const admission = vi.fn(() => "allowed" as const);
    const issueVoiceToken = createVoiceToken({
      admission,
      enabled: true,
      grantService: grant.service,
      provider: providerSet.provider,
      verifier: providerSet.verifier,
    });

    for (const [token, sessionId] of [
      [`${grant.token.slice(0, -1)}x`, SESSION_ID],
      [grant.token, OTHER_SESSION_ID],
    ] as const) {
      await expect(
        issueVoiceToken(request(token), sessionId, REQUEST_ID),
      ).rejects.toMatchObject({ code: "INTERVIEW_GRANT_INVALID" });
    }
    expect(admission).not.toHaveBeenCalled();
    expect(providerSet.verifyChallenge).not.toHaveBeenCalled();
    expect(providerSet.createProviderToken).not.toHaveBeenCalled();
  });

  it.each([
    ["disabled", false, "allowed", "VOICE_DISABLED"],
    ["rate limited", true, "rate_limited", "RATE_LIMITED"],
    ["at capacity", true, "capacity_reached", "CAPACITY_REACHED"],
  ] as const)(
    "blocks %s voice issuance before Turnstile and ElevenLabs",
    async (_label, enabled, admissionDecision, code) => {
      const grant = grantFor("conversation_first");
      const providerSet = providers();
      const issueVoiceToken = createVoiceToken({
        admission: () => admissionDecision,
        enabled,
        grantService: grant.service,
        provider: providerSet.provider,
        verifier: providerSet.verifier,
      });

      await expect(
        issueVoiceToken(request(grant.token), SESSION_ID, REQUEST_ID),
      ).rejects.toMatchObject({ code });
      expect(providerSet.verifyChallenge).not.toHaveBeenCalled();
      expect(providerSet.createProviderToken).not.toHaveBeenCalled();
    },
  );

  it("rejects a failed challenge before ElevenLabs", async () => {
    const grant = grantFor("conversation_first");
    const providerSet = providers({ challengeSuccess: false });
    const issueVoiceToken = createVoiceToken({
      admission: () => "allowed",
      enabled: true,
      grantService: grant.service,
      provider: providerSet.provider,
      verifier: providerSet.verifier,
    });

    await expect(
      issueVoiceToken(request(grant.token), SESSION_ID, REQUEST_ID),
    ).rejects.toMatchObject({
      code: "TURNSTILE_REJECTED",
      retryable: true,
    });
    expect(providerSet.verifyChallenge).toHaveBeenCalledOnce();
    expect(providerSet.createProviderToken).not.toHaveBeenCalled();
  });

  it("maps provider details to a content-safe retryable error", async () => {
    const grant = grantFor("conversation_first");
    const providerSet = providers();
    providerSet.createProviderToken.mockRejectedValueOnce(
      new Error("private provider failure"),
    );
    const issueVoiceToken = createVoiceToken({
      admission: () => "allowed",
      enabled: true,
      grantService: grant.service,
      provider: providerSet.provider,
      verifier: providerSet.verifier,
    });

    const failure = await issueVoiceToken(
      request(grant.token),
      SESSION_ID,
      REQUEST_ID,
    ).catch((error: unknown) => error);
    expect(failure).toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      retryable: true,
    });
    expect(String(failure)).not.toContain("private provider failure");
  });
});
