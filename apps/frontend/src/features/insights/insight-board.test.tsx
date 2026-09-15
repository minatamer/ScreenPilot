import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createCvAnalysisResponseFixture } from "@/test/cv-analysis.fixture";

import { InsightBoard } from "./insight-board";

const NOW = "2026-09-15T08:00:00.000Z";

describe("InsightBoard", () => {
  it("presents a purposeful conversation-first empty state", () => {
    render(
      <InsightBoard
        entryMode="conversation_first"
        insights={[]}
        topicProgress={[]}
        transcript={[]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "What ScreenPilot understood" }),
    ).toBeVisible();
    expect(screen.getByText("Ready for candidate evidence")).toBeVisible();
    expect(
      screen.getByText("Cards appear only after your final spoken answers."),
    ).toBeVisible();
    expect(
      screen.queryByText(/AI-organized notes—not a score or hiring decision/i),
    ).not.toBeInTheDocument();
  });

  it("places cards in stable category order without staggered regions", () => {
    render(
      <InsightBoard
        entryMode="conversation_first"
        insights={[
          {
            id: "insight-current_context",
            category: "current_context",
            label: "Current context",
            value: "Recently completed a product internship",
            source: "Candidate",
            status: "confirmed",
            evidenceTurnIds: ["turn-2"],
            cvFactIds: [],
            createdAt: NOW,
            updatedAt: NOW,
          },
          {
            id: "insight-role_preference",
            category: "role_preference",
            label: "Role preference",
            value: "Product Designer",
            source: "Candidate",
            status: "confirmed",
            evidenceTurnIds: ["turn-1"],
            cvFactIds: [],
            createdAt: NOW,
            updatedAt: NOW,
          },
        ]}
        topicProgress={[]}
        transcript={[
          {
            id: "turn-1",
            sequence: 1,
            speaker: "candidate",
            status: "final",
            text: "I am interested in Product Designer roles.",
            occurredAt: NOW,
          },
          {
            id: "turn-2",
            sequence: 2,
            speaker: "candidate",
            status: "final",
            text: "I recently completed a product internship.",
            occurredAt: NOW,
          },
        ]}
      />,
    );

    const cards = within(
      screen.getByRole("list", { name: "Candidate insight cards" }),
    ).getAllByRole("listitem");
    expect(cards.map((card) => card.dataset["category"])).toEqual([
      "role_preference",
      "current_context",
    ]);
    expect(cards.every((card) => !card.hasAttribute("data-region"))).toBe(true);
  });

  it("shows correction, provenance, transcript/CV evidence, and topic state", () => {
    const response = createCvAnalysisResponseFixture();
    render(
      <InsightBoard
        cv={response.cv}
        entryMode="cv_assisted"
        insights={[
          {
            id: "insight-relevant_experience",
            category: "relevant_experience",
            label: "Relevant experience",
            value: "Worked mainly on internal operations products",
            source: "CV + Candidate",
            status: "corrected",
            evidenceTurnIds: ["turn-2"],
            cvFactIds: ["experience-1"],
            correctionReason: "Candidate corrected the CV interpretation.",
            createdAt: NOW,
            updatedAt: NOW,
          },
        ]}
        topicProgress={[
          {
            topicKey: "relevant_experience_summary",
            status: "needs_clarification",
            evidenceTurnIds: ["turn-2"],
            updatedAt: NOW,
          },
        ]}
        transcript={[
          {
            id: "turn-2",
            sequence: 2,
            speaker: "candidate",
            status: "final",
            text: "I mainly worked on internal operations products.",
            occurredAt: NOW,
          },
        ]}
      />,
    );

    const insightList = screen.getByRole("list", {
      name: "Candidate insight cards",
    });
    expect(within(insightList).getByText("Corrected")).toBeVisible();
    expect(within(insightList).getByText("CV + Candidate")).toBeVisible();
    expect(
      within(insightList).getByText(
        "Worked mainly on internal operations products",
      ),
    ).toBeVisible();

    fireEvent.click(within(insightList).getByText("Evidence"));
    expect(
      screen.getByText(response.cv.facts[0]?.statement ?? "missing fixture"),
    ).toBeVisible();
    expect(
      screen.getByText("I mainly worked on internal operations products."),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Correction note: Candidate corrected the CV interpretation.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("list", { name: "Interview topic progress" }),
    ).toHaveTextContent("experience");
    expect(
      screen.getByRole("list", { name: "Interview topic progress" }),
    ).toHaveTextContent("needs clarification");
  });
});
