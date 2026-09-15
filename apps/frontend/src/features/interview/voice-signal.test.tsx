import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VoiceSignal } from "./voice-signal";

describe("VoiceSignal", () => {
  it("animates only while Pilot is speaking", () => {
    const rendered = render(<VoiceSignal phase="speaking" />);

    expect(
      screen.getByRole("img", { name: "Pilot is speaking" }),
    ).toHaveAttribute("data-active", "true");

    rendered.rerender(<VoiceSignal phase="listening" />);
    expect(
      screen.getByRole("img", { name: "Pilot is listening" }),
    ).toHaveAttribute("data-active", "false");
  });
});
