// @vitest-environment node

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DemoSessionProvider } from "./demo-session-provider";

describe("DemoSessionProvider server boundary", () => {
  it("renders without reading window or sessionStorage", () => {
    expect("window" in globalThis).toBe(false);

    expect(
      renderToString(
        <DemoSessionProvider storage={null}>
          <p>Hydration-safe content</p>
        </DemoSessionProvider>,
      ),
    ).toContain("Hydration-safe content");
  });
});
