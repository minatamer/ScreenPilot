import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell } from "./app-shell";
import { Badge } from "./badge";
import { Button } from "./button";
import { DemoStageHeading } from "./demo-stage-heading";
import { EntryModeCard } from "./entry-mode-card";
import { ErrorPanel } from "./error-panel";
import { ScreenPilotMark } from "./screenpilot-mark";
import { SiteHeader } from "./site-header";

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

  it("keeps demo stage pretitles and page titles in one shared hierarchy", () => {
    render(
      <DemoStageHeading
        pretitle="Before you begin"
        step={3}
        title="Get ready for your interview."
        titleId="preflight-title"
      />,
    );

    expect(screen.getByText("Step 3 of 5 · Before you begin")).toHaveClass(
      "sp-eyebrow",
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Get ready for your interview.",
      }),
    ).toHaveAttribute("id", "preflight-title");
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
