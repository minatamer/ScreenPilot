import {
  apiErrorSchema,
  type ApiError,
} from "@screenpilot/contracts/api/error-envelope";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { z } from "zod";

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
    return createMappedError(requestId, {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      status: 503,
    });
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
  request.log.error(
    { code: mapped.body.error.code, requestId: mapped.body.error.requestId },
    "request_failed",
  );
  response.status(mapped.status).json(mapped.body);
};
