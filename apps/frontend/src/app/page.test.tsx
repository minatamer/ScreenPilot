import { StrictMode } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
      vi.fn().mockImplementation(() =>
        Promise.resolve(
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
                roleAvailability:
                  "candidate_selected_synthetic_session_vacancy",
                employerFactsAvailable: false,
              },
            }),
            { headers: { "content-type": "application/json" }, status: 200 },
          ),
        ),
      ),
    );
    vi.stubGlobal("matchMedia", () => ({
      addEventListener: vi.fn(),
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      removeEventListener: vi.fn(),
    }));

    render(
      <DemoSessionProvider>
        <HomePage />
      </DemoSessionProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Automate the first interview. ScreenPilot takes the notes.",
      }),
    ).toBeVisible();
    expect(
      screen.queryByText("AI voice screening for hiring teams"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Your hiring team reviews the notes and makes every decision.",
      ),
    ).not.toBeInTheDocument();
    const heroFeatures = screen.getByRole("list", {
      name: "ScreenPilot core features",
    });
    expect(within(heroFeatures).getByText("Voice interviews")).toBeVisible();
    expect(within(heroFeatures).getByText("Adaptive follow-ups")).toBeVisible();
    expect(
      within(heroFeatures).getByText("Clear interview notes"),
    ).toBeVisible();
    expect(within(heroFeatures).getByText("Human decisions")).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "AI hiring is already here. Candidate trust still matters.",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: /Read LinkedIn's 2025 Future of Recruiting report/iu,
      }),
    ).toHaveAttribute(
      "href",
      "https://business.linkedin.com/hire/resources/future-of-recruiting",
    );
    expect(screen.getByText("73%")).toBeVisible();
    expect(
      screen.getByText(/agree AI will change how organizations hire/iu),
    ).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: /Read Gartner's 2025 candidate trust research/iu,
      }),
    ).toHaveAttribute(
      "href",
      "https://www.gartner.com/en/newsroom/press-releases/2025-07-31-gartner-survey-shows-just-26-percent-of-job-applicants-trust-ai-will-fairly-evaluate-them",
    );
    const cvButton = await screen.findByRole("button", { name: "Use a CV" });
    const conversationButton = screen.getByRole("button", {
      name: "Start without a CV",
    });
    await waitFor(() => {
      expect(cvButton).toBeEnabled();
      expect(conversationButton).toBeEnabled();
    });
    expect(cvButton).toHaveClass("sp-button--primary");
    expect(conversationButton).toHaveClass("sp-button--primary");
    expect(
      screen.getByRole("figure", { name: "Example interview" }),
    ).toBeVisible();
    expect(
      screen.getByLabelText("What are your salary expectations?"),
    ).toBeVisible();
    expect(screen.getByLabelText("Around 25k–30k.")).toBeVisible();
    const notesBoard = screen.getByRole("region", {
      name: "Notes created from this interview",
    });
    expect(within(notesBoard).getByText("Salary expectation")).toBeVisible();
    expect(within(notesBoard).getByText("Relevant experience")).toBeVisible();
    expect(within(notesBoard).getByText("Availability")).toBeVisible();
    expect(
      screen.queryByText("Added from your answer"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Speak naturally. There are no perfect answers."),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(
        document.querySelectorAll(".sp-live-conversation__spoken-word").length,
      ).toBeGreaterThan(1);
    });
    expect(
      screen.queryByRole("button", { name: /hold on .* example/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /(?:play|pause) interview example/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "The final call stays human." }),
    ).toBeVisible();
    expect(
      screen.queryByText("The shared visual foundation for ScreenPilot."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Foundation preview")).not.toBeInTheDocument();
    expect(screen.queryByText("Reusable states")).not.toBeInTheDocument();

    const header = document.querySelector(".sp-site-header");
    expect(header).not.toBeNull();
    expect(
      within(header as HTMLElement)
        .getAllByRole("link")
        .map(
          (link) => link.getAttribute("aria-label") ?? link.textContent.trim(),
        ),
    ).toEqual(["ScreenPilot home", "How it works", "Start demo"]);
    expect(
      within(header as HTMLElement).queryByRole("button", {
        name: /privacy/iu,
      }),
    ).not.toBeInTheDocument();
    expect(
      within(header as HTMLElement).queryByRole("link", {
        name: "Project source",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Project source" }),
    ).not.toBeInTheDocument();
    expect(document.querySelector("footer")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Privacy details" }));
    expect(
      screen.getByRole("dialog", { name: "What happens to your information" }),
    ).toHaveAttribute("open");
  });

  it("starts a fresh landing session once after Clear in Strict Mode", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
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
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("matchMedia", () => ({
      addEventListener: vi.fn(),
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      removeEventListener: vi.fn(),
    }));

    render(
      <StrictMode>
        <DemoSessionProvider>
          <HomePage />
        </DemoSessionProvider>
      </StrictMode>,
    );

    const conversationButton = await screen.findByRole("button", {
      name: "Start without a CV",
    });
    await waitFor(() => {
      expect(conversationButton).toBeEnabled();
    });
    fireEvent.click(conversationButton);
    fireEvent.click(
      await screen.findByRole("button", { name: "Clear session" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Use a CV" })).toBeEnabled();
      expect(
        screen.getByRole("button", { name: "Start without a CV" }),
      ).toBeEnabled();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
