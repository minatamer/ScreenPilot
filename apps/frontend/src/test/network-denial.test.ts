import { describe, expect, it } from "vitest";

describe("deterministic frontend test network boundary", () => {
  it("forces the test process into fake paid-disabled mode", () => {
    expect(process.env["PROVIDER_MODE"]).toBe("fake");
    expect(process.env["PAID_DEMO_ENABLED"]).toBe("false");
  });

  it("fails an unexpected global network request", async () => {
    await expect(fetch("https://network.invalid")).rejects.toThrow(
      "Unexpected network request blocked by deterministic test setup.",
    );
  });
});
