import type { RequestHandler, Response } from "express";

const REQUEST_ID_HEADER = "x-request-id";

export function createRequestIdMiddleware(
  idGenerator: () => string,
): RequestHandler {
  return (_request, response, next) => {
    const requestId = idGenerator();
    response.locals["requestId"] = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  };
}

export function getRequestId(response: Response): string {
  const requestId: unknown = response.locals["requestId"];
  return typeof requestId === "string" ? requestId : "request-id-unavailable";
}
