import {
  apiErrorSchema,
  type ApiError,
} from "@screenpilot/contracts/api/error-envelope";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { z } from "zod";

import { ElevenLabsRequestError } from "../providers/elevenlabs/elevenlabs-client.js";
import {
  OpenAiRequestError,
  OpenAiStructuredOutputError,
} from "../providers/openai/openai-client.js";
import { OpenAiCvValidationError } from "../providers/openai/openai-cv-analyzer.js";
import { TurnstileVerificationError } from "../providers/turnstile/cloudflare-turnstile-verifier.js";
import { InterviewGrantError } from "../security/interview-grant.js";
import { UseCaseError } from "../use-cases/use-case-error.js";
import { OriginNotAllowedError } from "./middleware/allowed-origin.js";
import { getRequestId } from "./middleware/request-id.js";
import {
  AnonymousSessionRequiredError,
  RequestValidationError,
} from "./middleware/validate-request.js";

const bodyParserErrorSchema = z.object({
  type: z.string().optional(),
});

type MappedApiError = Readonly<{
  body: ApiError;
  status: number;
}>;

type ProviderDiagnostic = Readonly<{
  provider: "elevenlabs" | "openai" | "turnstile";
  providerDurationMs: number;
  providerCode?: string;
  providerFailureClass?: string;
  providerHttpStatus?: number;
  providerRetryable?: boolean;
  providerType: string;
  providerValidationPaths?: readonly string[];
  providerValidationRuleIds?: readonly string[];
}>;

function createProviderDiagnostic(error: unknown): ProviderDiagnostic | null {
  const providerError = error instanceof UseCaseError ? error.cause : error;
  if (providerError instanceof TurnstileVerificationError) {
    return {
      provider: "turnstile",
      providerDurationMs: providerError.durationMs,
      providerRetryable: providerError.retryable,
      providerType: providerError.category,
      ...(providerError.httpStatus === undefined
        ? {}
        : { providerHttpStatus: providerError.httpStatus }),
    };
  }
  if (
    providerError instanceof OpenAiRequestError ||
    providerError instanceof OpenAiStructuredOutputError ||
    providerError instanceof OpenAiCvValidationError
  ) {
    return {
      provider: "openai",
      providerDurationMs: providerError.durationMs,
      providerRetryable:
        providerError instanceof OpenAiRequestError
          ? providerError.retryable
          : false,
      providerType:
        providerError instanceof OpenAiRequestError
          ? (providerError.providerType ?? providerError.category)
          : providerError.category,
      ...(providerError instanceof OpenAiRequestError &&
      providerError.httpStatus !== undefined
        ? { providerHttpStatus: providerError.httpStatus }
        : {}),
      ...(providerError instanceof OpenAiRequestError
        ? {
            ...(providerError.providerCode === undefined
              ? {}
              : { providerCode: providerError.providerCode }),
            providerFailureClass: providerError.providerFailureClass,
          }
        : {}),
      ...(providerError instanceof OpenAiStructuredOutputError ||
      providerError instanceof OpenAiCvValidationError
        ? {
            providerValidationPaths: providerError.validationPaths,
            providerValidationRuleIds: providerError.validationRuleIds,
          }
        : {}),
    };
  }
  if (providerError instanceof ElevenLabsRequestError) {
    return {
      provider: "elevenlabs",
      providerDurationMs: providerError.durationMs,
      ...(providerError.providerCode === undefined
        ? {}
        : { providerCode: providerError.providerCode }),
      providerFailureClass: providerError.providerFailureClass,
      providerRetryable: providerError.retryable,
      providerType: providerError.providerType ?? providerError.category,
      ...(providerError.httpStatus === undefined
        ? {}
        : { providerHttpStatus: providerError.httpStatus }),
    };
  }
  return null;
}

function createMappedError(
  requestId: string,
  input: {
    code: string;
    message: string;
    retryable: boolean;
    status: number;
  },
): MappedApiError {
  return {
    body: apiErrorSchema.parse({
      error: {
        code: input.code,
        message: input.message,
        requestId,
        retryable: input.retryable,
      },
    }),
    status: input.status,
  };
}

function mapApiError(error: unknown, requestId: string): MappedApiError {
  if (error instanceof OriginNotAllowedError) {
    return createMappedError(requestId, {
      code: error.code,
      message: error.message,
      retryable: false,
      status: 403,
    });
  }
  if (error instanceof AnonymousSessionRequiredError) {
    return createMappedError(requestId, {
      code: error.code,
      message: error.message,
      retryable: false,
      status: 401,
    });
  }
  if (error instanceof RequestValidationError) {
    return createMappedError(requestId, {
      code: error.code,
      message: error.message,
      retryable: false,
      status: 400,
    });
  }
  if (error instanceof InterviewGrantError) {
    return createMappedError(requestId, {
      code: error.code,
      message: error.message,
      retryable: false,
      status: 401,
    });
  }
  if (error instanceof TurnstileVerificationError) {
    return createMappedError(requestId, {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      status: 503,
    });
  }
  if (error instanceof UseCaseError) {
    const statusByCode = {
      CAPACITY_REACHED: 503,
      INVALID_CV_TEXT: 400,
      PREPARATION_FAILED: 503,
      PROVIDER_UNAVAILABLE: 503,
      RATE_LIMITED: 429,
      SUMMARY_FAILED: 503,
      TURNSTILE_REJECTED: 403,
      VOICE_DISABLED: 503,
    } as const;
    const mapped = createMappedError(requestId, {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      status: statusByCode[error.code],
    });
    return error.retryAfterSeconds === undefined
      ? mapped
      : {
          ...mapped,
          body: apiErrorSchema.parse({
            error: {
              ...mapped.body.error,
              retryAfterSeconds: error.retryAfterSeconds,
            },
          }),
        };
  }

  const bodyParserError = bodyParserErrorSchema.safeParse(error);
  if (bodyParserError.success) {
    if (bodyParserError.data.type === "entity.too.large") {
      return createMappedError(requestId, {
        code: "PAYLOAD_TOO_LARGE",
        message: "The request body is too large.",
        retryable: false,
        status: 413,
      });
    }
    if (bodyParserError.data.type === "entity.parse.failed") {
      return createMappedError(requestId, {
        code: "INVALID_REQUEST",
        message: "The request body is invalid JSON.",
        retryable: false,
        status: 400,
      });
    }
  }

  return createMappedError(requestId, {
    code: "INTERNAL_ERROR",
    message: "The request could not be completed.",
    retryable: false,
    status: 500,
  });
}

export const notFoundHandler: RequestHandler = (_request, response) => {
  const mapped = createMappedError(getRequestId(response), {
    code: "NOT_FOUND",
    message: "The requested endpoint was not found.",
    retryable: false,
    status: 404,
  });
  response.status(mapped.status).json(mapped.body);
};

export const terminalErrorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  next,
) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  const mapped = mapApiError(error, getRequestId(response));
  if (mapped.body.error.retryAfterSeconds !== undefined) {
    response.setHeader(
      "retry-after",
      String(mapped.body.error.retryAfterSeconds),
    );
  }
  const providerDiagnostic = createProviderDiagnostic(error);
  request.log.error(
    {
      code: mapped.body.error.code,
      requestId: mapped.body.error.requestId,
      ...(providerDiagnostic ?? {}),
    },
    "request_failed",
  );
  response.status(mapped.status).json(mapped.body);
};
