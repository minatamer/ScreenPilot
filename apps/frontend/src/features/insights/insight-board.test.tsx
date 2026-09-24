import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createCvAnalysisResponseFixture } from "@/test/cv-analysis.fixture";

import { InsightBoard } from "./insight-board";

const NOW = "2026-09-15T08:00:00.000Z";
const cancelCarouselAnimation = vi.fn();
const animateCarousel = vi.fn(() => ({
  cancel: cancelCarouselAnimation,
}));

function parentElementOf(element: HTMLElement): HTMLElement {
  const parentElement = element.parentElement;
  if (!parentElement) {
    throw new Error("Expected the carousel track to have a viewport parent.");
  }
  return parentElement;
}

describe("InsightBoard", () => {
  beforeEach(() => {
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      value: animateCarousel,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(Element.prototype, "animate");
    vi.clearAllMocks();
  });

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

    const insightList = screen.getByRole("list", {
      name: "Candidate insight cards",
    });
    const insightViewport = insightList;
    const cards = within(insightList).getAllByRole("listitem");
    expect(cards.map((card) => card.dataset["category"])).toEqual([
      "role_preference",
      "current_context",
    ]);
    expect(cards.every((card) => !card.hasAttribute("data-region"))).toBe(true);
    expect(cards[0]).toHaveAttribute("data-carousel-active", "true");
    expect(cards[1]).toHaveAttribute("data-carousel-active", "false");

    const slideshowControls = screen.getByRole("group", {
      name: "candidate note slideshow controls",
    });
    expect(
      within(slideshowControls).getByRole("button", {
        name: "Previous candidate note",
      }),
    ).toBeDisabled();
    fireEvent.pointerDown(insightViewport, {
      button: 0,
      clientX: 260,
      clientY: 120,
      pointerId: 1,
    });
    fireEvent.pointerMove(insightViewport, {
      button: 0,
      clientX: 180,
      clientY: 124,
      pointerId: 1,
    });
    expect(insightViewport).toHaveAttribute("data-dragging", "true");
    expect(insightViewport).not.toHaveAttribute("style");
    expect(animateCarousel).toHaveBeenCalledWith(
      [{ transform: "translate3d(calc(0% + -80px), 0, 0)" }],
      { duration: 1, fill: "forwards" },
    );
    fireEvent.pointerUp(insightViewport, {
      button: 0,
      clientX: 180,
      clientY: 124,
      pointerId: 1,
    });
    expect(cards[0]).toHaveAttribute("data-carousel-active", "false");
    expect(cards[1]).toHaveAttribute("data-carousel-active", "true");
    expect(insightViewport).toHaveAttribute("data-carousel-direction", "next");
    expect(insightViewport).toHaveAttribute("data-carousel-slide", "1");
    expect(insightViewport).toHaveAttribute("data-dragging", "false");
    expect(insightViewport).not.toHaveAttribute("style");
    expect(within(slideshowControls).getByText("2 of 2")).toBeVisible();

    fireEvent.click(
      within(slideshowControls).getByRole("button", {
        name: "Previous candidate note",
      }),
    );
    expect(cards[0]).toHaveAttribute("data-carousel-active", "true");
    expect(insightViewport).toHaveAttribute(
      "data-carousel-direction",
      "previous",
    );
  });

  it("pages conversation coverage in compact groups of three", () => {
    render(
      <InsightBoard
        entryMode="conversation_first"
        insights={[]}
        topicProgress={[
          {
            topicKey: "role_preference",
            status: "covered",
            evidenceTurnIds: [],
            updatedAt: NOW,
          },
          {
            topicKey: "current_context",
            status: "covered",
            evidenceTurnIds: [],
            updatedAt: NOW,
          },
          {
            topicKey: "relevant_experience_summary",
            status: "covered",
            evidenceTurnIds: [],
            updatedAt: NOW,
          },
          {
            topicKey: "availability",
            status: "not_started",
            evidenceTurnIds: [],
            updatedAt: NOW,
          },
          {
            topicKey: "motivation_and_next_role",
            status: "not_started",
            evidenceTurnIds: [],
            updatedAt: NOW,
          },
        ]}
        transcript={[]}
      />,
    );

    const topics = within(
      screen.getByRole("list", { name: "Interview topic progress" }),
    ).getAllByRole("listitem");
    expect(
      topics.map((topic) => topic.getAttribute("data-carousel-active")),
    ).toEqual(["true", "true", "true", "false", "false"]);
    expect(
      topics.map((topic) => topic.getAttribute("data-carousel-index")),
    ).toEqual(["0", "1", "2", "3", "4"]);
    expect(topics.every((topic) => !topic.hasAttribute("style"))).toBe(true);

    const slideshowControls = screen.getByRole("group", {
      name: "coverage topics slideshow controls",
    });
    const topicList = screen.getByRole("list", {
      name: "Interview topic progress",
    });
    const topicViewport = parentElementOf(topicList);
    fireEvent.pointerDown(topicViewport, {
      button: 0,
      clientX: 250,
      clientY: 80,
      pointerId: 2,
    });
    fireEvent.pointerMove(topicViewport, {
      button: 0,
      clientX: 170,
      clientY: 84,
      pointerId: 2,
    });
    expect(topicViewport).toHaveAttribute("data-dragging", "true");
    expect(topicViewport).not.toHaveAttribute("style");
    fireEvent.pointerUp(topicViewport, {
      button: 0,
      clientX: 170,
      clientY: 84,
      pointerId: 2,
    });
    expect(
      topics.map((topic) => topic.getAttribute("data-carousel-active")),
    ).toEqual(["false", "false", "false", "true", "true"]);
    expect(topicViewport).toHaveAttribute("data-carousel-direction", "next");
    expect(topicViewport).toHaveAttribute("data-carousel-slide", "1");
    expect(topicViewport).toHaveAttribute("data-dragging", "false");
    expect(within(slideshowControls).getByText("2 of 2")).toBeVisible();

    fireEvent.click(
      within(slideshowControls).getByRole("button", {
        name: "Previous coverage topics",
      }),
    );
    expect(
      topics.map((topic) => topic.getAttribute("data-carousel-active")),
    ).toEqual(["true", "true", "true", "false", "false"]);
    expect(topicViewport).toHaveAttribute(
      "data-carousel-direction",
      "previous",
    );
  });

  it("shows paired candidate-question and human-follow-up cards during the interview", () => {
    const question =
      "What onboarding and work-arrangement details can a recruiter share?";
    const followup =
      "A human recruiter must confirm the unsupported onboarding and work-arrangement details.";
    const evidenceTurn = {
      id: "candidate-question-turn",
      sequence: 9,
      speaker: "candidate" as const,
      status: "final" as const,
      text: question,
      occurredAt: NOW,
    };

    render(
      <InsightBoard
        entryMode="conversation_first"
        insights={[
          {
            id: "candidate-question-9",
            category: "candidate_question",
            label: "Candidate question",
            value: question,
            source: "Candidate",
            status: "confirmed",
            evidenceTurnIds: [evidenceTurn.id],
            cvFactIds: [],
            createdAt: NOW,
            updatedAt: NOW,
          },
          {
            id: "follow-up-9",
            category: "follow_up_needed",
            label: "Human follow-up",
            value: followup,
            source: "Candidate",
            status: "needs_clarification",
            evidenceTurnIds: [evidenceTurn.id],
            cvFactIds: [],
            createdAt: NOW,
            updatedAt: NOW,
          },
        ]}
        topicProgress={[]}
        transcript={[evidenceTurn]}
      />,
    );

    const insightList = screen.getByRole("list", {
      name: "Candidate insight cards",
    });
    const candidateQuestionCard = within(insightList)
      .getByText("Candidate question")
      .closest("article");
    expect(candidateQuestionCard).toHaveAttribute(
      "data-status",
      "needs_clarification",
    );
    if (!candidateQuestionCard) {
      throw new Error("Expected the Candidate question card to render.");
    }
    expect(
      within(candidateQuestionCard).getByText("Needs clarification"),
    ).toBeVisible();
    expect(within(insightList).getAllByText(question)).not.toHaveLength(0);
    expect(within(insightList).getByText("Human follow-up")).toBeVisible();
    expect(within(insightList).getByText(followup)).toBeVisible();
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

    const evidenceToggle = within(insightList).getByRole("button", {
      name: "Evidence 2",
    });
    expect(evidenceToggle.parentElement).toHaveClass("sp-insight-card__meta");
    expect(evidenceToggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.pointerDown(evidenceToggle, {
      button: 0,
      clientX: 220,
      clientY: 120,
      pointerId: 3,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(evidenceToggle, {
      button: 0,
      clientX: 220,
      clientY: 120,
      pointerId: 3,
      pointerType: "mouse",
    });
    expect(insightList).not.toHaveAttribute("data-dragging", "true");
    fireEvent.click(evidenceToggle);
    expect(evidenceToggle).toHaveAttribute("aria-expanded", "true");
    expect(evidenceToggle).toHaveClass("sp-insight-card__evidence-toggle");
    expect(evidenceToggle.nextElementSibling).toHaveClass(
      "sp-insight-card__evidence-content",
    );
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
