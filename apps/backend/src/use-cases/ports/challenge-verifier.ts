import type { TurnstileAction } from "../../config/provider-mode.js";

export type ChallengeVerificationInput = Readonly<{
  expectedAction: TurnstileAction;
  token: string;
}>;

export type ChallengeVerificationResult = Readonly<{
  action: TurnstileAction;
  errorCodes: readonly string[];
  hostname: string | null;
  success: boolean;
}>;

export interface ChallengeVerifier {
  verifyChallenge(
    input: ChallengeVerificationInput,
    signal?: AbortSignal,
  ): Promise<ChallengeVerificationResult>;
}
