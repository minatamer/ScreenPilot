import { EventEmitter } from "node:events";

import type { Request, RequestHandler, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { createRequestBodyCapacityGate } from "../../security/request-body-capacity.js";
import { UseCaseError } from "../../use-cases/use-case-error.js";
import {
  createBoundedJsonBodyParser,
  JsonRequestBoundaryError,
  requireBoundedJsonRequest,
} from "./bounded-json-body.js";

function runBoundary(headers: Readonly<Record<string, string | undefined>>) {
  const request = {
    headers,
    is: vi.fn((type: string) =>
      headers["content-type"]?.startsWith(type) ? type : false,
    ),
  } as unknown as Request;
  const next = vi.fn();

  requireBoundedJsonRequest({ maximumBytes: 65_536 })(
    request,
    {} as Response,
    next,
  );
  return next;
}

describe("bounded JSON request boundary", () => {
  it("allows JSON with either a valid length or chunked receipt", () => {
    const declared = runBoundary({
      "content-length": "65536",
      "content-type": "application/json; charset=utf-8",
    });
    const chunked = runBoundary({ "content-type": "application/json" });

    expect(declared).toHaveBeenCalledWith();
    expect(chunked).toHaveBeenCalledWith();
  });

  it.each([
    ["unsupported content type", { "content-type": "text/plain" }, 415],
    [
      "invalid declared length",
      { "content-length": "not-a-number", "content-type": "application/json" },
      400,
    ],
    [
      "unsafe declared length",
      {
        "content-length": "999999999999999999999",
        "content-type": "application/json",
      },
      400,
    ],
    [
      "oversized declared length",
      { "content-length": "65537", "content-type": "application/json" },
      413,
    ],
  ])("rejects %s before parsing", (_name, headers, status) => {
    const next = runBoundary(headers);
    const error: unknown = next.mock.calls[0]?.[0];

    expect(error).toBeInstanceOf(JsonRequestBoundaryError);
    expect(error).toMatchObject({ status });
  });

  it("releases a stalled receipt lease on request abort and response close", () => {
    const capacityGate = createRequestBodyCapacityGate({ maximum: 1 });
    const stalledParser = vi.fn<RequestHandler>();
    const middleware = createBoundedJsonBodyParser({
      capacityGate,
      label: "Test request receipt",
      maximumBytes: 65_536,
      parseJson: stalledParser,
    });
    const firstRequest = new EventEmitter() as Request & EventEmitter;
    const firstResponse = new EventEmitter() as Response & EventEmitter;
    middleware(firstRequest, firstResponse, vi.fn());

    const saturatedNext = vi.fn();
    middleware(
      new EventEmitter() as Request & EventEmitter,
      new EventEmitter() as Response & EventEmitter,
      saturatedNext,
    );
    expect(saturatedNext.mock.calls[0]?.[0]).toBeInstanceOf(UseCaseError);

    firstRequest.emit("aborted");
    const afterAbortRequest = new EventEmitter() as Request & EventEmitter;
    const afterAbortResponse = new EventEmitter() as Response & EventEmitter;
    middleware(afterAbortRequest, afterAbortResponse, vi.fn());
    expect(stalledParser).toHaveBeenCalledTimes(2);

    afterAbortResponse.emit("close");
    middleware(
      new EventEmitter() as Request & EventEmitter,
      new EventEmitter() as Response & EventEmitter,
      vi.fn(),
    );
    expect(stalledParser).toHaveBeenCalledTimes(3);
  });
});
