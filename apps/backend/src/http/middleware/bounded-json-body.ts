import express, { type RequestHandler } from "express";

import type { RequestBodyCapacityGate } from "../../security/request-body-capacity.js";
import { UseCaseError } from "../../use-cases/use-case-error.js";

export class JsonRequestBoundaryError extends Error {
  readonly code:
    "INVALID_REQUEST" | "PAYLOAD_TOO_LARGE" | "UNSUPPORTED_MEDIA_TYPE";
  readonly status: 400 | 413 | 415;

  constructor(
    code: "INVALID_REQUEST" | "PAYLOAD_TOO_LARGE" | "UNSUPPORTED_MEDIA_TYPE",
    message: string,
    status: 400 | 413 | 415,
  ) {
    super(message);
    this.name = "JsonRequestBoundaryError";
    this.code = code;
    this.status = status;
  }
}

function declaredBodyLength(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!/^\d+$/u.test(value)) {
    throw new JsonRequestBoundaryError(
      "INVALID_REQUEST",
      "The request body length is invalid.",
      400,
    );
  }
  const length = Number(value);
  if (!Number.isSafeInteger(length)) {
    throw new JsonRequestBoundaryError(
      "INVALID_REQUEST",
      "The request body length is invalid.",
      400,
    );
  }
  return length;
}

export function requireBoundedJsonRequest(input: {
  maximumBytes: number;
}): RequestHandler {
  return (request, _response, next) => {
    if (request.is("application/json") !== "application/json") {
      next(
        new JsonRequestBoundaryError(
          "UNSUPPORTED_MEDIA_TYPE",
          "This endpoint accepts JSON requests only.",
          415,
        ),
      );
      return;
    }

    try {
      const length = declaredBodyLength(request.headers["content-length"]);
      if (length !== undefined && length > input.maximumBytes) {
        next(
          new JsonRequestBoundaryError(
            "PAYLOAD_TOO_LARGE",
            "The request body is too large.",
            413,
          ),
        );
        return;
      }
    } catch (error: unknown) {
      next(error);
      return;
    }
    next();
  };
}

export function createBoundedJsonBodyParser(input: {
  capacityGate: RequestBodyCapacityGate;
  label: string;
  maximumBytes: number;
  parseJson?: RequestHandler;
}): RequestHandler {
  const parseJson =
    input.parseJson ??
    express.json({
      limit: input.maximumBytes,
      strict: true,
      type: "application/json",
    });

  return (request, response, next) => {
    const lease = input.capacityGate.acquire();
    if (lease === null) {
      next(
        new UseCaseError(
          "CAPACITY_REACHED",
          `${input.label} is temporarily at capacity. Try again later.`,
          { retryable: true },
        ),
      );
      return;
    }

    let released = false;
    const release = () => {
      if (released) {
        return;
      }
      released = true;
      request.off("aborted", release);
      response.off("close", release);
      lease.release();
    };
    const complete: Parameters<RequestHandler>[2] = (error?: unknown) => {
      release();
      next(error);
    };

    request.once("aborted", release);
    response.once("close", release);
    try {
      parseJson(request, response, complete);
    } catch (error: unknown) {
      complete(error);
    }
  };
}
