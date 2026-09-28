import { describe, expect, it } from "vitest";

import { normalizeRequestSourceAddress } from "./request-source.js";

describe("request-source address normalization", () => {
  it.each([
    ["203.0.113.9", "203.0.113.9"],
    [" 203.0.113.9 ", "203.0.113.9"],
    ["2001:0DB8:0:0:0:0:0:1", "2001:db8::1"],
    ["::1", "::1"],
    ["::ffff:127.0.0.1", "::ffff:7f00:1"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeRequestSourceAddress(input)).toBe(expected);
  });

  it.each([
    "",
    "01.2.3.4",
    "256.2.3.4",
    "203.0.113",
    "203.0.113.1:443",
    "[2001:db8::1]",
    "2001:db8::1%eth0",
    "not-an-address",
  ])("rejects %s", (input) => {
    expect(normalizeRequestSourceAddress(input)).toBeNull();
  });
});
