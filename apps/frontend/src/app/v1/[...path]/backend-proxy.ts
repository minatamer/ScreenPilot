import type { ApiError } from "@screenpilot/contracts/api/error-envelope";
import { SCREENPILOT_CLIENT_SOURCE_HEADER } from "@screenpilot/contracts/security/request-source";

import {
  BackendConnectionConfigurationError,
  resolveBackendConnection,
  type BackendConnection,
} from "./backend-connection";
import {
  createGoogleCloudIdentityTokenProvider,
  type GoogleCloudIdentityTokenProvider,
} from "./google-cloud-identity-token";
import {
  FrontendOriginConfigurationError,
  parseFrontendAllowedOrigins,
} from "./frontend-origin-policy";
import { resolveGoogleAppendedClientSource } from "./trusted-client-source";

export const MAX_PROXY_REQUEST_BODY_BYTES = 65_536;
export const PROXY_BODY_RECEIPT_TIMEOUT_MS = 10_000;

const ANONYMOUS_SESSION_COOKIE_NAME = "sp_anonymous_session";
const PROXY_ROUTES = new Map<string, "GET" | "POST">([
  ["/v1/demo/bootstrap", "GET"],
  ["/v1/cv/analyze", "POST"],
  ["/v1/interview/prepare", "POST"],
  ["/v1/interview/summary", "POST"],
  ["/v1/voice/token", "POST"],
]);
const REQUEST_HEADER_ALLOW_LIST = [
  "accept",
  "content-type",
  "cookie",
  "origin",
] as const;
const RESPONSE_HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
] as const;

type BackendFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type ProxyOptions = Readonly<{
  backendAuthAudience?: string;
  backendAuthMode?: string;
  backendOrigin?: string;
  bodyReceiptTimeoutMs?: number;
  frontendAllowedOrigins?: readonly string[];
  identityTokenProvider?: Pick<GoogleCloudIdentityTokenProvider, "getToken">;
  upstreamFetch?: BackendFetch;
}>;

let defaultIdentityTokenProvider:
  | Readonly<{
      audience: string;
      provider: GoogleCloudIdentityTokenProvider;
    }>
  | undefined;

class ProxyRequestError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status: number;

  constructor(
    code: string,
    message: string,
    status: number,
    retryable = status >= 500,
  ) {
    super(message);
    this.name = "ProxyRequestError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

function createErrorResponse(error: ProxyRequestError): Response {
  const body: ApiError = {
    error: {
      code: error.code,
      message: error.message,
      requestId: crypto.randomUUID(),
      retryable: error.retryable,
    },
  };

  return Response.json(body, {
    headers: { "cache-control": "no-store" },
    status: error.status,
  });
}

function declaredBodyLength(request: Request): number | undefined {
  const value = request.headers.get("content-length");
  if (value === null) {
    return undefined;
  }
  if (!/^\d+$/u.test(value)) {
    throw new ProxyRequestError(
      "INVALID_REQUEST",
      "The request body length is invalid.",
      400,
    );
  }
  const length = Number(value);
  if (!Number.isSafeInteger(length)) {
    throw new ProxyRequestError(
      "INVALID_REQUEST",
      "The request body length is invalid.",
      400,
    );
  }
  return length;
}

function hasAnonymousSessionCookie(request: Request): boolean {
  const cookies = request.headers.get("cookie");
  if (cookies === null) {
    return false;
  }
  return cookies.split(";").some((cookie) => {
    const [name, ...value] = cookie.trim().split("=");
    return name === ANONYMOUS_SESSION_COOKIE_NAME && value.join("=") !== "";
  });
}

function requireSupportedRequest(
  request: Request,
  frontendAllowedOrigins: readonly string[],
): void {
  const url = new URL(request.url);
  const supportedMethod = PROXY_ROUTES.get(url.pathname);
  if (supportedMethod === undefined) {
    throw new ProxyRequestError(
      "NOT_FOUND",
      "The requested endpoint was not found.",
      404,
    );
  }
  if (request.method === "OPTIONS") {
    return;
  }
  if (request.method !== supportedMethod) {
    throw new ProxyRequestError(
      "METHOD_NOT_ALLOWED",
      "This request method is not supported.",
      405,
    );
  }
  if (supportedMethod === "GET") {
    return;
  }

  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    throw new ProxyRequestError(
      "UNSUPPORTED_MEDIA_TYPE",
      "This endpoint accepts JSON requests only.",
      415,
    );
  }
  const origin = request.headers.get("origin");
  if (origin === null || !frontendAllowedOrigins.includes(origin)) {
    throw new ProxyRequestError(
      "ORIGIN_NOT_ALLOWED",
      "This request origin is not allowed.",
      403,
    );
  }
  if (!hasAnonymousSessionCookie(request)) {
    throw new ProxyRequestError(
      "ANONYMOUS_SESSION_REQUIRED",
      "Start a fresh demo session and try again.",
      401,
    );
  }
}

function positiveTimeoutMilliseconds(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(
      "The proxy body-receipt timeout must be a positive safe integer.",
    );
  }
  return value;
}

async function readBoundedRequestBody(
  request: Request,
  timeoutMilliseconds: number,
): Promise<ArrayBuffer | undefined> {
  if (request.method !== "POST") {
    return undefined;
  }

  const declaredLength = declaredBodyLength(request);
  if (
    declaredLength !== undefined &&
    declaredLength > MAX_PROXY_REQUEST_BODY_BYTES
  ) {
    throw new ProxyRequestError(
      "PAYLOAD_TOO_LARGE",
      "The request body is too large.",
      413,
    );
  }
  if (request.body === null) {
    return undefined;
  }

  const chunks: Uint8Array[] = [];
  const reader = request.body.getReader();
  let totalBytes = 0;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let rejectReceipt: ((reason: unknown) => void) | undefined;
  let readerReleased = false;
  let cancellation: Promise<void> | undefined;

  const releaseReader = () => {
    if (readerReleased) {
      return;
    }
    reader.releaseLock();
    readerReleased = true;
  };
  const cancelReader = (reason: string) => {
    if (cancellation !== undefined) {
      return;
    }
    // Cancellation is cleanup for an error path whose public response is already
    // selected. Either cancellation outcome releases the lock; only an unexpected
    // release failure may replace that response through the receipt failure race.
    cancellation = reader
      .cancel(reason)
      .then(releaseReader, releaseReader)
      .catch((error: unknown) => {
        rejectReceipt?.(error);
      });
  };
  const abortReceipt = () => {
    cancelReader("ScreenPilot proxy request was disconnected.");
    rejectReceipt?.(new DOMException("The request was aborted.", "AbortError"));
  };
  const receiptFailure = new Promise<never>((_resolve, reject) => {
    rejectReceipt = reject;
    request.signal.addEventListener("abort", abortReceipt, { once: true });
    timeout = setTimeout(() => {
      cancelReader("ScreenPilot proxy request body receipt timed out.");
      reject(
        new ProxyRequestError(
          "REQUEST_TIMEOUT",
          "The request body was not received in time.",
          408,
          true,
        ),
      );
    }, timeoutMilliseconds);
  });

  const readBody = async (): Promise<ArrayBuffer> => {
    try {
      let chunk = await reader.read();
      while (!chunk.done) {
        totalBytes += chunk.value.byteLength;
        if (totalBytes > MAX_PROXY_REQUEST_BODY_BYTES) {
          cancelReader("ScreenPilot proxy request body limit exceeded.");
          throw new ProxyRequestError(
            "PAYLOAD_TOO_LARGE",
            "The request body is too large.",
            413,
          );
        }
        chunks.push(chunk.value);
        chunk = await reader.read();
      }

      const body = new ArrayBuffer(totalBytes);
      const bodyBytes = new Uint8Array(body);
      let offset = 0;
      for (const bodyChunk of chunks) {
        bodyBytes.set(bodyChunk, offset);
        offset += bodyChunk.byteLength;
      }
      return body;
    } finally {
      if (cancellation === undefined) {
        releaseReader();
      }
    }
  };

  if (request.signal.aborted) {
    abortReceipt();
  }
  try {
    return await Promise.race([readBody(), receiptFailure]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
    request.signal.removeEventListener("abort", abortReceipt);
    rejectReceipt = undefined;
  }
}

function createUpstreamHeaders(
  request: Request,
  body: ArrayBuffer | undefined,
  connection: BackendConnection,
  identityToken: string | undefined,
): Headers {
  const headers = new Headers();
  for (const header of REQUEST_HEADER_ALLOW_LIST) {
    const value = request.headers.get(header);
    if (value !== null) {
      headers.set(header, value);
    }
  }
  if (body !== undefined) {
    headers.set("content-length", String(body.byteLength));
  }
  if (connection.authMode === "google-cloud-oidc") {
    if (identityToken === undefined) {
      throw new TypeError("The private backend identity token is missing.");
    }
    headers.set(
      SCREENPILOT_CLIENT_SOURCE_HEADER,
      resolveGoogleAppendedClientSource(request.headers.get("x-forwarded-for")),
    );
    headers.set("x-serverless-authorization", `Bearer ${identityToken}`);
  }
  return headers;
}

function createProxyResponse(upstreamResponse: Response): Response {
  const headers = new Headers(upstreamResponse.headers);
  for (const header of RESPONSE_HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }
  headers.delete("content-length");
  headers.set("cache-control", "no-store");

  return new Response(upstreamResponse.body, {
    headers,
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function proxyBackendRequest(
  request: Request,
  options: ProxyOptions = {},
): Promise<Response> {
  try {
    const frontendAllowedOrigins =
      options.frontendAllowedOrigins ??
      parseFrontendAllowedOrigins(process.env["FRONTEND_ALLOWED_ORIGINS"]);
    requireSupportedRequest(request, frontendAllowedOrigins);
    const connection = resolveBackendConnection({
      authAudience:
        options.backendAuthAudience ?? process.env["BACKEND_AUTH_AUDIENCE"],
      authMode: options.backendAuthMode ?? process.env["BACKEND_AUTH_MODE"],
      backendOrigin: options.backendOrigin ?? process.env["BACKEND_ORIGIN"],
    });
    const requestUrl = new URL(request.url);
    const upstreamUrl = new URL(
      `${requestUrl.pathname}${requestUrl.search}`,
      `${connection.origin}/`,
    );
    const body = await readBoundedRequestBody(
      request,
      positiveTimeoutMilliseconds(
        options.bodyReceiptTimeoutMs ?? PROXY_BODY_RECEIPT_TIMEOUT_MS,
      ),
    );
    let identityToken: string | undefined;
    if (connection.authMode === "google-cloud-oidc") {
      let identityTokenProvider = options.identityTokenProvider;
      if (identityTokenProvider === undefined) {
        if (defaultIdentityTokenProvider?.audience !== connection.audience) {
          defaultIdentityTokenProvider = Object.freeze({
            audience: connection.audience,
            provider: createGoogleCloudIdentityTokenProvider({
              audience: connection.audience,
            }),
          });
        }
        identityTokenProvider = defaultIdentityTokenProvider.provider;
      }
      identityToken = await identityTokenProvider.getToken();
    }
    const upstreamResponse = await (options.upstreamFetch ?? fetch)(
      upstreamUrl,
      {
        ...(body === undefined ? {} : { body }),
        cache: "no-store",
        headers: createUpstreamHeaders(
          request,
          body,
          connection,
          identityToken,
        ),
        method: request.method,
        redirect: "manual",
        signal: request.signal,
      },
    );
    return createProxyResponse(upstreamResponse);
  } catch (error: unknown) {
    if (
      error instanceof BackendConnectionConfigurationError ||
      error instanceof FrontendOriginConfigurationError
    ) {
      return createErrorResponse(
        new ProxyRequestError("BACKEND_UNAVAILABLE", error.message, 503, true),
      );
    }
    if (error instanceof ProxyRequestError) {
      return createErrorResponse(error);
    }
    if (request.signal.aborted || isAbortError(error)) {
      throw error;
    }
    return createErrorResponse(
      new ProxyRequestError(
        "BACKEND_UNAVAILABLE",
        "The application service is temporarily unavailable.",
        502,
      ),
    );
  }
}
