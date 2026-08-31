import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("HomePage", () => {
  it("states the human decision boundary", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "ScreenPilot" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "AI handles the first screen. Humans make the decision.",
      ),
    ).toBeInTheDocument();
  });
});
