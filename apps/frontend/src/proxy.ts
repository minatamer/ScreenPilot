import { NextResponse, type NextRequest } from "next/server";

import { createBrowserSecurityPolicy } from "./security/browser-security-policy";

const PERMISSIONS_POLICY =
  "camera=(), geolocation=(), microphone=(self), browsing-topics=()";
const SAMPLE_CV_PATH = "/fixtures/screenpilot-sample-cv.pdf";

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

function requestHostname(request: NextRequest): string {
  const requestAuthority = request.headers.get("host");
  if (!requestAuthority) {
    return "";
  }

  try {
    return new URL(`http://${requestAuthority}`).hostname;
  } catch {
    return "";
  }
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === SAMPLE_CV_PATH) {
    if (
      (request.method !== "GET" && request.method !== "HEAD") ||
      !isLoopbackHostname(requestHostname(request))
    ) {
      return new NextResponse(null, {
        headers: {
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        },
        status: 404,
      });
    }

    const sampleResponse = NextResponse.next();
    sampleResponse.headers.set("cache-control", "no-store");
    sampleResponse.headers.set("x-content-type-options", "nosniff");
    return sampleResponse;
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = createBrowserSecurityPolicy(
    nonce,
    process.env.NODE_ENV === "development",
  );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("content-security-policy", contentSecurityPolicy);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("cache-control", "no-store");
  response.headers.set("content-security-policy", contentSecurityPolicy);
  response.headers.set("cross-origin-opener-policy", "same-origin");
  response.headers.set("permissions-policy", PERMISSIONS_POLICY);
  response.headers.set("referrer-policy", "no-referrer");
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-dns-prefetch-control", "off");
  response.headers.set("x-frame-options", "DENY");
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "strict-transport-security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  return response;
}

export const config = {
  matcher: [
    "/fixtures/screenpilot-sample-cv.pdf",
    {
      source:
        "/((?!v1|_next/static|_next/image|favicon.ico|icon.svg|fixtures|worklets).*)",
    },
  ],
};
