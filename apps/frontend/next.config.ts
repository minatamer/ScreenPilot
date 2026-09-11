import type { NextConfig } from "next";

const normalizeBackendOrigin = (
  value: string | undefined,
): string | undefined => {
  if (value === undefined || value === "") {
    return undefined;
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
      throw new Error("Invalid backend origin.");
    }

    return backendOrigin.origin;
  } catch {
    throw new Error(
      "BACKEND_ORIGIN must be an HTTP(S) origin without credentials or a path.",
    );
  }
};

const backendOrigin = normalizeBackendOrigin(process.env["BACKEND_ORIGIN"]);

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  transpilePackages: ["@screenpilot/contracts"],
  ...(backendOrigin === undefined
    ? {}
    : {
        rewrites: () =>
          Promise.resolve([
            {
              destination: `${backendOrigin}/v1/:path*`,
              source: "/v1/:path*",
            },
          ]),
      }),
};

export default nextConfig;
