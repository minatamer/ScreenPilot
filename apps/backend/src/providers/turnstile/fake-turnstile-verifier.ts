import type {
  ChallengeVerificationInput,
  ChallengeVerificationResult,
  ChallengeVerifier,
} from "../../use-cases/ports/challenge-verifier.js";

export const FAKE_TURNSTILE_PASS_TOKEN = "screenpilot-fake-turnstile-pass";

export class FakeTurnstileVerifier implements ChallengeVerifier {
  verifyChallenge(
    input: ChallengeVerificationInput,
    signal?: AbortSignal,
  ): Promise<ChallengeVerificationResult> {
    signal?.throwIfAborted();

    const success = input.token === FAKE_TURNSTILE_PASS_TOKEN;
    return Promise.resolve({
      action: input.expectedAction,
      errorCodes: success ? [] : ["invalid-input-response"],
      hostname: success ? "test.screenpilot.invalid" : null,
      success,
    });
  }
}
