import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DemoSessionProvider } from "@/features/session/demo-session-provider";

import HomePage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe("HomePage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
  });

  it("shows the real role-neutral landing instead of the SP-005 showcase", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            abuseProtection: {
              appearance: "interaction-only",
              provider: "cloudflare_turnstile",
              siteKey: "",
            },
            limits: {
              callSeconds: 480,
              cvCharacters: 40_000,
              pdfBytes: 5_242_880,
              pdfPages: 8,
            },
            paidVoiceEnabled: false,
            privacyNoticeVersion: "2026-09-11",
            demoContext: {
              kind: "role_agnostic_first_stage_hr_screen",
              roleAvailability: "candidate_selected_synthetic_session_vacancy",
              employerFactsAvailable: false,
            },
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        ),
      ),
    );

    render(
      <DemoSessionProvider>
        <HomePage />
      </DemoSessionProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Adaptive AI screening, live in your browser.",
      }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Use a CV" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Start without a CV" }),
    ).toBeEnabled();
    expect(
      screen.getByText(/synthetic vacancy for this browser session/),
    ).toBeVisible();
    expect(screen.getByText(/No account. No phone call/)).toBeVisible();
    expect(
      screen.queryByText("The shared visual foundation for ScreenPilot."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Foundation preview")).not.toBeInTheDocument();
    expect(screen.queryByText("Reusable states")).not.toBeInTheDocument();
    expect(screen.queryByText("Pilot is listening.")).not.toBeInTheDocument();
  });
});
