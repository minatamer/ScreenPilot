import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

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

afterEach(cleanup);
