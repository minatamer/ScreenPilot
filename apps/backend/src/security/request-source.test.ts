import type { Request } from "express";
import { describe, expect, it } from "vitest";

import { createRequestSourceResolver } from "./request-source.js";

function requestWithSource(input: {
  clientSource?: string | string[];
  remoteAddress?: string;
}): Request {
  return {
    headers: {
      ...(input.clientSource === undefined
        ? {}
        : { "x-screenpilot-client-source": input.clientSource }),
    },
    socket: { remoteAddress: input.remoteAddress },
  } as unknown as Request;
}

describe("request source boundary", () => {
  const productionSource = createRequestSourceResolver("production");
  const localSource = createRequestSourceResolver("local");

  it.each([
    ["198.51.100.8", "198.51.100.8"],
    ["2001:0DB8:0:0:0:0:0:1", "2001:db8::1"],
    ["unresolved", "unresolved"],
  ])("trusts canonical production signal %s as %s", (header, expected) => {
    expect(
      productionSource(
        requestWithSource({
          clientSource: header,
          remoteAddress: "10.0.0.2",
        }),
      ),
    ).toBe(expected);
  });

  it.each([
    undefined,
    "",
    "caller, 198.51.100.8",
    "not-an-address",
    ["198.51.100.8", "198.51.100.9"],
  ])("fails malformed production signal %s to unresolved", (clientSource) => {
    expect(
      productionSource(
        requestWithSource({
          ...(clientSource === undefined ? {} : { clientSource }),
          remoteAddress: "198.51.100.100",
        }),
      ),
    ).toBe("unresolved");
  });

  it.each(["127.0.0.1", "::1", "::ffff:127.0.0.1"])(
    "uses the explicit local loopback adapter for %s",
    (remoteAddress) => {
      expect(
        localSource(
          requestWithSource({
            clientSource: "198.51.100.8",
            remoteAddress,
          }),
        ),
      ).toBe("loopback");
    },
  );

  it("ignores a supplied trusted-source header outside production", () => {
    expect(
      localSource(
        requestWithSource({
          clientSource: "198.51.100.8",
          remoteAddress: "198.51.100.100",
        }),
      ),
    ).toBe("unresolved");
  });
});
