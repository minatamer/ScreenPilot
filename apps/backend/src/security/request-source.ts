import type { Request } from "express";

import {
  normalizeRequestSourceAddress,
  SCREENPILOT_CLIENT_SOURCE_HEADER,
  UNRESOLVED_REQUEST_SOURCE,
} from "@screenpilot/contracts/security/request-source";

import type { AppEnvironment } from "../config/provider-mode.js";

export type RequestSourceResolver = (request: Request) => string;

const LOCAL_LOOPBACK_ADDRESSES = new Set(["127.0.0.1", "::1", "::ffff:7f00:1"]);

function productionRequestSource(request: Request): string {
  const header = request.headers[SCREENPILOT_CLIENT_SOURCE_HEADER];
  if (header === UNRESOLVED_REQUEST_SOURCE) {
    return UNRESOLVED_REQUEST_SOURCE;
  }
  if (typeof header !== "string") {
    return UNRESOLVED_REQUEST_SOURCE;
  }
  return normalizeRequestSourceAddress(header) ?? UNRESOLVED_REQUEST_SOURCE;
}

function localRequestSource(request: Request): string {
  const remoteAddress = request.socket.remoteAddress;
  if (remoteAddress === undefined) {
    return UNRESOLVED_REQUEST_SOURCE;
  }
  const normalized = normalizeRequestSourceAddress(remoteAddress);
  return normalized !== null && LOCAL_LOOPBACK_ADDRESSES.has(normalized)
    ? "loopback"
    : UNRESOLVED_REQUEST_SOURCE;
}

export function createRequestSourceResolver(
  appEnvironment: AppEnvironment,
): RequestSourceResolver {
  return appEnvironment === "production"
    ? productionRequestSource
    : localRequestSource;
}
