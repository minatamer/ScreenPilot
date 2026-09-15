import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createInitialDemoSessionState } from "@/features/session/demo-session.reducer";

import { DemoExperience } from "./demo-experience";

const sessionActions = vi.hoisted(() => ({
  clearSession: vi.fn(),
  completeInterview: vi.fn(),
  dispatch: vi.fn(),
  startOver: vi.fn(),
}));
const router = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/features/session/use-demo-session", () => ({
  useDemoSession: () => ({
    ...sessionActions,
    state: {
      ...createInitialDemoSessionState(),
      hydrationStatus: "ready",
      stage: "complete_placeholder",
    },
    storageStatus: "idle",
  }),
}));

describe("DemoExperience completion stage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the reducer-owned placeholder at the Review step", () => {
    render(<DemoExperience />);

    const workspace = screen
      .getByRole("region", { name: "Current demo stage" })
      .closest("section");
    expect(workspace).toHaveAttribute("data-stage", "complete_placeholder");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "That’s the end of this demo interview.",
      }),
    ).toBeVisible();
    expect(screen.getByText("Review").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(router.replace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Return home" }));
    expect(sessionActions.clearSession).toHaveBeenCalledOnce();
    expect(router.replace).toHaveBeenCalledWith("/");

    const header = document.querySelector(".sp-site-header");
    expect(header).not.toBeNull();
    expect(
      within(header as HTMLElement).getByRole("button", {
        name: "Clear & exit",
      }),
    ).toBeEnabled();
  });
});
