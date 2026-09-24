import type { RequestHandler } from "express";
import helmet from "helmet";

export function createSecurityHeadersMiddleware(): RequestHandler {
  const helmetMiddleware = helmet({
    contentSecurityPolicy: {
      directives: {
        baseUri: ["'none'"],
        defaultSrc: ["'none'"],
        formAction: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    referrerPolicy: { policy: "no-referrer" },
  });

  return (request, response, next) => {
    response.setHeader(
      "permissions-policy",
      "camera=(), geolocation=(), microphone=(), browsing-topics=()",
    );
    helmetMiddleware(request, response, next);
  };
}
