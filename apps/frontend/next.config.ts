import { resolve } from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  outputFileTracingRoot: resolve(import.meta.dirname, "../.."),
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@screenpilot/contracts"],
};

export default nextConfig;
