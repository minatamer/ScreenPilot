import { UNRESOLVED_REQUEST_SOURCE } from "@screenpilot/contracts/security/request-source";
import { describe, expect, it } from "vitest";

import { resolveGoogleAppendedClientSource } from "./trusted-client-source";

describe("Google-appended client source resolution", () => {
  it.each([
    ["198.51.100.7, 203.0.113.20", "198.51.100.7"],
    ["caller-prefix, 198.51.100.8, 203.0.113.20", "198.51.100.8"],
    [
      "192.0.2.99, 2001:0DB8:0:0:0:0:0:1, 2607:f8b0:4005:801::200e",
      "2001:db8::1",
    ],
    ["not-an-ip prefix, 198.51.100.9, 203.0.113.20", "198.51.100.9"],
  ])("selects only the verified suffix from %s", (chain, expected) => {
    expect(resolveGoogleAppendedClientSource(chain)).toBe(expected);
  });

  it.each([
    null,
    "",
    "198.51.100.7",
    "198.51.100.7, malformed",
    "malformed, 203.0.113.20",
    "198.51.100.7, ",
    ", 203.0.113.20",
  ])("uses the safety identity for %s", (chain) => {
    expect(resolveGoogleAppendedClientSource(chain)).toBe(
      UNRESOLVED_REQUEST_SOURCE,
    );
  });
});
