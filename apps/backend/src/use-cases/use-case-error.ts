export type UseCaseErrorCode = "PREPARATION_FAILED";

export class UseCaseError extends Error {
  readonly code: UseCaseErrorCode;
  readonly retryable: boolean;

  constructor(
    code: UseCaseErrorCode,
    message: string,
    options: Readonly<{ cause?: unknown; retryable?: boolean }> = {},
  ) {
    super(
      message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = "UseCaseError";
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}
