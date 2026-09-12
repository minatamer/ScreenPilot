import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createCvAnalysisResponseFixture } from "@/test/cv-analysis.fixture";

import { CvPlanPreview } from "./cv-plan-preview";

describe("CvPlanPreview", () => {
  it("links every CV-derived topic to evidence and marks fixed HR topics", () => {
    const response = createCvAnalysisResponseFixture();
    const onContinue = vi.fn();
    const onStartOver = vi.fn();
    render(
      <CvPlanPreview
        cv={response.cv}
        onContinue={onContinue}
        onStartOver={onStartOver}
        plan={response.plan}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "What the CV says" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "What ScreenPilot will explore",
      }),
    ).toBeVisible();
    const suggestion = screen.getByRole("region", {
      name: "Unconfirmed role suggestion",
    });
    expect(
      within(suggestion).getByText(
        "Suggested from CV — confirm during the call",
      ),
    ).toBeVisible();
    expect(within(suggestion).getByText("Product Manager")).toBeVisible();
    expect(screen.queryByText(/applied role/iu)).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByText(/supported roles/iu)).not.toBeInTheDocument();

    const topicCards = document.querySelectorAll(".sp-plan-topic-card");
    expect(topicCards).toHaveLength(12);
    expect(screen.getAllByText("Standard screen")).toHaveLength(11);
    for (const topic of response.plan.topics.filter(
      (candidateTopic) => candidateTopic.cvFactIds.length > 0,
    )) {
      const topicCard = screen
        .getByRole("heading", { name: topic.title })
        .closest(".sp-plan-topic-card");
      expect(topicCard).not.toBeNull();
      expect(
        within(topicCard as HTMLElement).getAllByRole("link", {
          name: /CV evidence/iu,
        }),
      ).toHaveLength(topic.cvFactIds.length);
    }
    expect(
      screen.getAllByRole("link", { name: /CV evidence/iu })[0],
    ).toHaveAttribute("href", expect.stringMatching(/^#cv-fact-/u));

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(onContinue).toHaveBeenCalledOnce();
    expect(onStartOver).toHaveBeenCalledOnce();
  });

  it("renders unrelated role suggestions and no-suggestion plans identically", () => {
    const graphicDesign = createCvAnalysisResponseFixture({
      displayName: "Avery Chen",
      experienceEvidence:
        "Created campaign systems, launch assets, and accessible brand templates.",
      experienceStatement:
        "The CV describes cross-functional visual design delivery.",
      planFocus: "visual design delivery",
      suggestedRole: "Graphic Designer",
    });
    const { rerender } = render(
      <CvPlanPreview
        cv={graphicDesign.cv}
        onContinue={vi.fn()}
        onStartOver={vi.fn()}
        plan={graphicDesign.plan}
      />,
    );
    expect(screen.getByText("Graphic Designer")).toBeVisible();
    expect(
      screen.getByText(
        "The CV describes cross-functional visual design delivery.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Confirm the candidate's current visual design delivery context.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText("Explore evidence connected to visual design delivery."),
    ).toBeVisible();

    const noSuggestion = createCvAnalysisResponseFixture({
      suggestedRole: null,
    });
    rerender(
      <CvPlanPreview
        cv={noSuggestion.cv}
        onContinue={vi.fn()}
        onStartOver={vi.fn()}
        plan={noSuggestion.plan}
      />,
    );
    expect(
      screen.getByRole("region", { name: "Role direction" }),
    ).toHaveTextContent("No role assumed from the CV");
    expect(screen.queryByText("Graphic Designer")).not.toBeInTheDocument();
    expect(
      screen.getByText(/candidate can name any role—or stay undecided/iu),
    ).toBeVisible();
  });
});
