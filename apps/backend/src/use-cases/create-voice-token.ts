import {
  voiceTokenResponseSchema,
  type VoiceTokenRequest,
  type VoiceTokenResponse,
} from "@screenpilot/contracts/api/voice-token";

import { TURNSTILE_ACTIONS } from "../config/provider-mode.js";
import type { InterviewGrantService } from "../security/interview-grant.js";
import type { ChallengeVerifier } from "./ports/challenge-verifier.js";
import type { VoiceTokenProvider } from "./ports/voice-token-provider.js";
import { UseCaseError } from "./use-case-error.js";

export type VoiceTokenAdmissionDecision =
  "allowed" | "capacity_reached" | "rate_limited";

export type VoiceTokenAdmission = (
  anonymousSessionId: string,
) => VoiceTokenAdmissionDecision;

export function createVoiceToken(input: {
  admission: VoiceTokenAdmission;
  enabled: boolean;
  grantService: InterviewGrantService;
  provider: VoiceTokenProvider;
  verifier: ChallengeVerifier;
}) {
  return async function issueVoiceToken(
    request: VoiceTokenRequest,
    anonymousSessionId: string,
    requestId: string,
    signal?: AbortSignal,
  ): Promise<VoiceTokenResponse> {
    input.grantService.verifyForAnonymousSession(
      request.interviewGrant,
      anonymousSessionId,
    );

    if (!input.enabled) {
      throw new UseCaseError(
        "VOICE_DISABLED",
        "Voice interviews are currently disabled.",
      );
    }
    const admission = input.admission(anonymousSessionId);
    if (admission === "rate_limited") {
      throw new UseCaseError(
        "RATE_LIMITED",
        "Too many voice-start attempts. Wait briefly and try again.",
        { retryable: true, retryAfterSeconds: 60 },
      );
    }
    if (admission === "capacity_reached") {
      throw new UseCaseError(
        "CAPACITY_REACHED",
        "Voice interviews are temporarily at capacity. Try again later.",
        { retryable: true },
      );
    }

    const challenge = await input.verifier.verifyChallenge(
      {
        expectedAction: TURNSTILE_ACTIONS.voiceToken,
        token: request.turnstileToken,
      },
      signal,
    );
    if (!challenge.success) {
      throw new UseCaseError(
        "TURNSTILE_REJECTED",
        "The anti-abuse check expired or was rejected. Try it again.",
        { retryable: true },
      );
    }

    try {
      const providerResult = await input.provider.createVoiceToken(
        { requestId },
        signal,
      );
      return voiceTokenResponseSchema.parse({
        conversationId: providerResult.conversationId,
        conversationToken: providerResult.conversationToken,
      });
    } catch (error: unknown) {
      signal?.throwIfAborted();
      throw new UseCaseError(
        "PROVIDER_UNAVAILABLE",
        "The secure voice connection is temporarily unavailable. Try again.",
        { cause: error, retryable: true },
      );
    }
  };
}

export type CreateVoiceToken = ReturnType<typeof createVoiceToken>;
