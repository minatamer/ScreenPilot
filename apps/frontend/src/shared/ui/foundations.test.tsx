import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell } from "./app-shell";
import { Badge } from "./badge";
import { Button } from "./button";
import { EntryModeCard } from "./entry-mode-card";
import { ErrorPanel } from "./error-panel";
import { ScreenPilotMark } from "./screenpilot-mark";
import { SiteHeader } from "./site-header";
import { StageIndicator } from "./stage-indicator";

describe("Signal Canvas foundations", () => {
  it("exposes light and dark shells through one component", () => {
    const { rerender } = render(<AppShell data-testid="shell" tone="light" />);

    expect(screen.getByTestId("shell")).toHaveAttribute("data-theme", "light");

    rerender(<AppShell data-testid="shell" tone="dark" />);
    expect(screen.getByTestId("shell")).toHaveAttribute("data-theme", "dark");
  });

  it("makes loading buttons unavailable and names the active state", () => {
    render(
      <Button loading loadingLabel="Checking permissions">
        Continue
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Checking permissions" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("marks the current stage and completed stages", () => {
    const { rerender } = render(
      <StageIndicator
        currentIndex={1}
        stages={["Setup", "Preflight", "Interview"]}
      />,
    );

    expect(
      screen.getByRole("group", { name: "Interview progress" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 3 · Preflight")).toBeVisible();
    expect(screen.getByText("Preflight").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.getByText("Setup").closest("li")).toHaveAttribute(
      "data-state",
      "complete",
    );

    rerender(
      <StageIndicator
        currentIndex={99}
        stages={["Setup", "Preflight", "Interview"]}
      />,
    );
    expect(screen.getByText("Interview").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );

    rerender(
      <StageIndicator
        currentIndex={Number.NaN}
        stages={["Setup", "Preflight", "Interview"]}
      />,
    );
    expect(screen.getByText("Setup").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  it("announces runtime errors and keeps a recovery action", () => {
    render(
      <ErrorPanel
        actions={<Button>Retry</Button>}
        title="Microphone unavailable"
      >
        <p>Choose another input.</p>
      </ErrorPanel>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Microphone unavailable",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("keeps entry cards, navigation, badges, and the logo presentational", () => {
    render(
      <AppShell tone="light">
        <SiteHeader
          actions={<Badge>Preview</Badge>}
          navigation={[{ href: "#preview", label: "Preview" }]}
        />
        <EntryModeCard
          actions={<Button>Choose</Button>}
          description="A deliberately long description that remains readable."
          icon={<span>Icon</span>}
          title="Bring context"
        />
        <ScreenPilotMark />
      </AppShell>,
    );

    expect(
      screen.getByRole("link", { name: "ScreenPilot home" }),
    ).toHaveAttribute("href", "#top");
    expect(
      screen.getByRole("navigation", { name: "Primary navigation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Bring context" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "ScreenPilot" }),
    ).toBeInTheDocument();
  });
});
