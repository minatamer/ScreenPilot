import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("HomePage", () => {
  it("shows the SP-005 foundation harness and human decision boundary", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "The shared visual foundation for ScreenPilot.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "AI supports the conversation. People make every hiring decision.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "ScreenPilot" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preparing" })).toBeDisabled();
  });
});
