import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InterviewCompletePlaceholder } from "./interview-complete-placeholder";

describe("InterviewCompletePlaceholder", () => {
  it("explains the temporary completion state and returns home", () => {
    const onReturnHome = vi.fn();
    render(<InterviewCompletePlaceholder onReturnHome={onReturnHome} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "That’s the end of this demo interview.",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(/review screen is not connected yet/iu),
    ).toBeVisible();
    expect(
      screen.getByText(/No score or automated hiring decision was created/iu),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Return home" }));
    expect(onReturnHome).toHaveBeenCalledOnce();
  });
});
