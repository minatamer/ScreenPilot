import { describe, expect, it } from "vitest";

import { createRequestBodyCapacityGate } from "./request-body-capacity.js";

describe("request-body capacity gate", () => {
  it("bounds concurrent receipts and releases idempotently", () => {
    const gate = createRequestBodyCapacityGate({ maximum: 1 });
    const first = gate.acquire();

    expect(first).not.toBeNull();
    expect(gate.acquire()).toBeNull();
    first?.release();
    first?.release();

    expect(gate.acquire()).not.toBeNull();
  });

  it("rejects invalid limits", () => {
    expect(() => createRequestBodyCapacityGate({ maximum: 0 })).toThrow(
      /positive safe integer/u,
    );
  });
});
