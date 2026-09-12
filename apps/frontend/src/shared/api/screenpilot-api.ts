import {
  bootstrapResponseSchema,
  type BootstrapResponse,
} from "@screenpilot/contracts/api/bootstrap";
import {
  analyzeCvRequestSchema,
  analyzeCvResponseSchema,
  type AnalyzeCvRequest,
  type AnalyzeCvResponse,
} from "@screenpilot/contracts/api/cv-analysis";
import { apiErrorSchema } from "@screenpilot/contracts/api/error-envelope";
import {
  prepareInterviewRequestSchema,
  prepareInterviewResponseSchema,
  type PrepareInterviewResponse,
} from "@screenpilot/contracts/api/interview-preparation";
import {
  voiceTokenRequestSchema,
  voiceTokenResponseSchema,
  type VoiceTokenRequest,
  type VoiceTokenResponse,
} from "@screenpilot/contracts/api/voice-token";

type BrowserFetch = typeof fetch;

type ScreenPilotApiErrorInput = Readonly<{
  code: string;
  message: string;
  requestId?: string;
  retryable: boolean;
  retryAfterSeconds?: number;
}>;

export class ScreenPilotApiError extends Error {
  readonly code: string;
  readonly requestId: string | undefined;
  readonly retryable: boolean;
  readonly retryAfterSeconds: number | undefined;

  constructor(input: ScreenPilotApiErrorInput) {
    super(input.message);
    this.name = "ScreenPilotApiError";
    this.code = input.code;
    this.requestId = input.requestId;
    this.retryable = input.retryable;
    this.retryAfterSeconds = input.retryAfterSeconds;
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ScreenPilotApiError({
      code: "INVALID_RESPONSE",
      message: "ScreenPilot received an unreadable response. Try again.",
      retryable: true,
    });
  }
}

async function requireSuccessfulBody(response: Response): Promise<unknown> {
  const body = await readResponseBody(response);
  if (response.ok) {
    return body;
  }

  const parsedError = apiErrorSchema.safeParse(body);
  if (!parsedError.success) {
    throw new ScreenPilotApiError({
      code: "INVALID_RESPONSE",
      message:
        "ScreenPilot could not understand the server response. Try again.",
      retryable: true,
    });
  }

  throw new ScreenPilotApiError({
    code: parsedError.data.error.code,
    message: parsedError.data.error.message,
    requestId: parsedError.data.error.requestId,
    retryable: parsedError.data.error.retryable,
    ...(parsedError.data.error.retryAfterSeconds === undefined
      ? {}
      : { retryAfterSeconds: parsedError.data.error.retryAfterSeconds }),
  });
}

export async function fetchDemoBootstrap(
  signal: AbortSignal,
  browserFetch: BrowserFetch = fetch,
): Promise<BootstrapResponse> {
  const response = await browserFetch("/v1/demo/bootstrap", {
    cache: "no-store",
    credentials: "same-origin",
    headers: { accept: "application/json" },
    signal,
  });
  const parsed = bootstrapResponseSchema.safeParse(
    await requireSuccessfulBody(response),
  );
  if (!parsed.success) {
    throw new ScreenPilotApiError({
      code: "INVALID_BOOTSTRAP_RESPONSE",
      message: "ScreenPilot could not open a valid private demo session.",
      retryable: true,
    });
  }
  return parsed.data;
}

export async function prepareConversationFirst(
  clientRequestId: string,
  signal: AbortSignal,
  browserFetch: BrowserFetch = fetch,
): Promise<PrepareInterviewResponse> {
  const request = prepareInterviewRequestSchema.parse({
    clientRequestId,
    entryMode: "conversation_first",
  });
  const response = await browserFetch("/v1/interview/prepare", {
    body: JSON.stringify(request),
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    method: "POST",
    signal,
  });
  const parsed = prepareInterviewResponseSchema.safeParse(
    await requireSuccessfulBody(response),
  );
  if (!parsed.success) {
    throw new ScreenPilotApiError({
      code: "INVALID_PREPARATION_RESPONSE",
      message: "ScreenPilot received an incomplete interview preparation.",
      retryable: true,
    });
  }
  return parsed.data;
}

export async function analyzeCv(
  input: AnalyzeCvRequest,
  signal: AbortSignal,
  browserFetch: BrowserFetch = fetch,
  now: () => number = Date.now,
): Promise<AnalyzeCvResponse> {
  const request = analyzeCvRequestSchema.parse(input);
  const response = await browserFetch("/v1/cv/analyze", {
    body: JSON.stringify(request),
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    method: "POST",
    signal,
  });
  const parsed = analyzeCvResponseSchema.safeParse(
    await requireSuccessfulBody(response),
  );
  if (!parsed.success) {
    throw new ScreenPilotApiError({
      code: "INVALID_CV_ANALYSIS_RESPONSE",
      message: "ScreenPilot received an incomplete CV analysis. Try again.",
      retryable: true,
    });
  }
  if (Date.parse(parsed.data.expiresAt) <= now()) {
    throw new ScreenPilotApiError({
      code: "INTERVIEW_GRANT_EXPIRED",
      message:
        "The prepared interview expired before it could be opened. Try again.",
      retryable: true,
    });
  }
  return parsed.data;
}

export async function requestVoiceToken(
  input: VoiceTokenRequest,
  signal: AbortSignal,
  browserFetch: BrowserFetch = fetch,
): Promise<VoiceTokenResponse> {
  const request = voiceTokenRequestSchema.parse(input);
  const response = await browserFetch("/v1/voice/token", {
    body: JSON.stringify(request),
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    method: "POST",
    signal,
  });
  const parsed = voiceTokenResponseSchema.safeParse(
    await requireSuccessfulBody(response),
  );
  if (!parsed.success) {
    throw new ScreenPilotApiError({
      code: "INVALID_VOICE_TOKEN_RESPONSE",
      message: "ScreenPilot received an incomplete voice authorization.",
      retryable: true,
    });
  }
  return parsed.data;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
