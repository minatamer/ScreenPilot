import { describe, expect, it } from "vitest";

import {
  FrontendOriginConfigurationError,
  parseFrontendAllowedOrigins,
} from "./frontend-origin-policy";

describe("parseFrontendAllowedOrigins", () => {
  it("normalizes a bounded explicit origin allowlist", () => {
    expect(
      parseFrontendAllowedOrigins(
        "http://localhost:3000,https://tryscreenpilot.com",
      ),
    ).toEqual(["http://localhost:3000", "https://tryscreenpilot.com"]);
  });

  it.each([
    undefined,
    "",
    "https://user:password@example.com",
    "https://example.com/path",
    "ftp://example.com",
    "https://example.com,https://example.com",
  ])("fails closed for an invalid policy: %s", (value) => {
    expect(() => parseFrontendAllowedOrigins(value)).toThrow(
      FrontendOriginConfigurationError,
    );
  });
});
