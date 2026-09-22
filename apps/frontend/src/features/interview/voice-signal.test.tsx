import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VoiceSignal } from "./voice-signal";

describe("VoiceSignal", () => {
  it("uses four speaking bars, a static listening microphone, and no decorative reconnect indicator", () => {
    const rendered = render(<VoiceSignal phase="speaking" />);
    const speakingSignal = rendered.container.querySelector(
      ".sp-interview-signal",
    );

    expect(speakingSignal).toHaveAttribute("data-active", "true");
    expect(speakingSignal?.querySelectorAll(":scope > span")).toHaveLength(4);
    expect(speakingSignal?.querySelector("svg")).not.toBeInTheDocument();

    rendered.rerender(<VoiceSignal phase="listening" />);
    const listeningSignal = rendered.container.querySelector(
      ".sp-interview-signal",
    );
    expect(listeningSignal).toHaveAttribute("data-active", "false");
    expect(listeningSignal?.querySelector("svg")).toBeInTheDocument();
    expect(listeningSignal?.querySelectorAll(":scope > span")).toHaveLength(0);

    rendered.rerender(<VoiceSignal phase="reconnecting" />);
    expect(
      rendered.container.querySelector(".sp-interview-signal"),
    ).not.toBeInTheDocument();
  });
});
