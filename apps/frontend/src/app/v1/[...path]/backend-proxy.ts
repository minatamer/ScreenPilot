import type { ApiError } from "@screenpilot/contracts/api/error-envelope";

export const MAX_PROXY_REQUEST_BODY_BYTES = 65_536;

const BODY_METHODS = new Set(["DELETE", "PATCH", "POST", "PUT"]);
const HOP_BY_HOP_HEADERS = [
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
  backendOrigin?: string;
  upstreamFetch?: BackendFetch;
}>;

class ProxyRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ProxyRequestError";
    this.code = code;
    this.status = status;
  }
}

function normalizeBackendOrigin(value: string | undefined): string {
  if (value === undefined || value === "") {
    throw new ProxyRequestError(
      "BACKEND_UNAVAILABLE",
      "The application service is not configured yet.",
      503,
    );
  }

  try {
    const backendOrigin = new URL(value);
    const hasOnlyOrigin =
      backendOrigin.pathname === "/" &&
      backendOrigin.search === "" &&
      backendOrigin.hash === "";
    const isHttp = ["http:", "https:"].includes(backendOrigin.protocol);
    const hasCredentials =
      backendOrigin.username !== "" || backendOrigin.password !== "";

    if (!hasOnlyOrigin || !isHttp || hasCredentials) {
      throw new TypeError("Invalid backend origin.");
    }

    return backendOrigin.origin;
  } catch (error: unknown) {
    if (error instanceof ProxyRequestError) {
      throw error;
    }
    throw new ProxyRequestError(
      "BACKEND_UNAVAILABLE",
      "The application service is not configured correctly.",
      503,
    );
  }
}

function createErrorResponse(error: ProxyRequestError): Response {
  const body: ApiError = {
    error: {
      code: error.code,
      message: error.message,
      requestId: crypto.randomUUID(),
      retryable: error.status >= 500,
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
  return Number(value);
}

async function readBoundedRequestBody(
  request: Request,
): Promise<ArrayBuffer | undefined> {
  if (!BODY_METHODS.has(request.method) || request.body === null) {
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

  const chunks: Uint8Array[] = [];
  const reader = request.body.getReader();
  let totalBytes = 0;

  let chunk = await reader.read();
  while (!chunk.done) {
    totalBytes += chunk.value.byteLength;
    if (totalBytes > MAX_PROXY_REQUEST_BODY_BYTES) {
      await reader.cancel("ScreenPilot proxy request body limit exceeded.");
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
  for (const chunk of chunks) {
    bodyBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function createUpstreamHeaders(
  request: Request,
  body: ArrayBuffer | undefined,
): Headers {
  const headers = new Headers(request.headers);
  headers.delete("host");
  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }
  if (body === undefined) {
    headers.delete("content-length");
  } else {
    headers.set("content-length", String(body.byteLength));
  }
  return headers;
}

function createProxyResponse(upstreamResponse: Response): Response {
  const headers = new Headers(upstreamResponse.headers);
  for (const header of HOP_BY_HOP_HEADERS) {
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
    const backendOrigin = normalizeBackendOrigin(
      options.backendOrigin ?? process.env["BACKEND_ORIGIN"],
    );
    const requestUrl = new URL(request.url);
    const upstreamUrl = new URL(
      `${requestUrl.pathname}${requestUrl.search}`,
      `${backendOrigin}/`,
    );
    const body = await readBoundedRequestBody(request);
    const upstreamResponse = await (options.upstreamFetch ?? fetch)(
      upstreamUrl,
      {
        ...(body === undefined ? {} : { body }),
        cache: "no-store",
        headers: createUpstreamHeaders(request, body),
        method: request.method,
        redirect: "manual",
        signal: request.signal,
      },
    );
    return createProxyResponse(upstreamResponse);
  } catch (error: unknown) {
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
