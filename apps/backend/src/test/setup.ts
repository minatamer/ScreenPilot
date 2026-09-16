import { beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(() =>
      Promise.reject(
        new Error(
          "Unexpected network request blocked by deterministic test setup.",
        ),
      ),
    ),
  );
});
