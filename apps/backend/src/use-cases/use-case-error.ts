export type UseCaseErrorCode =
  | "CAPACITY_REACHED"
  | "INVALID_CV_TEXT"
  | "PREPARATION_FAILED"
  | "PROVIDER_UNAVAILABLE"
  | "RATE_LIMITED"
  | "SUMMARY_FAILED"
  | "TURNSTILE_REJECTED"
  | "VOICE_DISABLED";

export class UseCaseError extends Error {
  readonly code: UseCaseErrorCode;
  readonly retryable: boolean;
  readonly retryAfterSeconds: number | undefined;

  constructor(
    code: UseCaseErrorCode,
    message: string,
    options: Readonly<{
      cause?: unknown;
      retryable?: boolean;
      retryAfterSeconds?: number;
    }> = {},
  ) {
    super(
      message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = "UseCaseError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}
