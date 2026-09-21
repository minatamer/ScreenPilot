import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { InsightCard } from "@screenpilot/contracts/interview/insight-card";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";

import { transcriptTurnDomId } from "@/features/transcript/transcript-timeline";

import { InterviewEvidenceReview } from "./interview-evidence-review";

const candidateTurn: TranscriptTurn = {
  id: "candidate/turn 1",
  sequence: 1,
  speaker: "candidate",
  status: "final",
  text: "I want a collaborative role with room to keep learning.",
  occurredAt: "2026-09-21T09:10:00.000Z",
};

const interviewerTurn: TranscriptTurn = {
  id: "pilot-turn-2",
  sequence: 2,
  speaker: "interviewer",
  status: "final",
  text: "Thanks. Let us talk about your availability.",
  occurredAt: "2026-09-21T09:10:05.000Z",
};

function candidateInsight(
  evidenceTurnIds: readonly string[] = [candidateTurn.id],
): InsightCard {
  return {
    id: "insight-1",
    category: "motivation",
    label: "Motivation / next role",
    value: "Collaborative team and continued learning",
    source: "Candidate",
    status: "confirmed",
    evidenceTurnIds: [...evidenceTurnIds],
    cvFactIds: [],
    createdAt: "2026-09-21T09:10:10.000Z",
    updatedAt: "2026-09-21T09:10:10.000Z",
  };
}

const baseProps = {
  entryMode: "conversation_first" as const,
  insights: [candidateInsight()],
  isPartial: false,
  onReturnHome: vi.fn(),
  storageStatus: "saved" as const,
  transcript: [interviewerTurn, candidateTurn],
};

describe("InterviewEvidenceReview", () => {
  it("orders final turns and moves focus from Candidate evidence to its stable anchor and back", () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    render(<InterviewEvidenceReview {...baseProps} />);

    const transcriptArticles = screen.getAllByRole("article");
    expect(transcriptArticles.map((article) => article.textContent)).toEqual([
      expect.stringContaining(candidateTurn.text),
      expect.stringContaining(interviewerTurn.text),
    ]);

    const evidenceButton = screen.getByRole("button", {
      name: "View Candidate evidence, turn 2, for Motivation / next role",
    });
    fireEvent.click(evidenceButton);

    const target = document.getElementById(
      transcriptTurnDomId(candidateTurn.id),
    );
    expect(target).toHaveFocus();
    expect(target).toHaveAttribute("data-active-evidence", "true");
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Return to evidence card" }),
    );
    expect(evidenceButton).toHaveFocus();
  });

  it("shows missing and ineligible references as unavailable evidence", () => {
    const partialTurn: TranscriptTurn = {
      ...candidateTurn,
      id: "partial-turn",
      status: "partial",
    };
    render(
      <InterviewEvidenceReview
        {...baseProps}
        insights={[candidateInsight(["missing-turn", partialTurn.id])]}
        transcript={[candidateTurn, partialTurn]}
      />,
    );

    expect(screen.getAllByText("Candidate evidence unavailable")).toHaveLength(
      2,
    );
    expect(
      screen.queryByRole("button", {
        name: /missing-turn|partial-turn/u,
      }),
    ).not.toBeInTheDocument();
  });

  it("labels an interrupted review as partial and keeps long visible evidence when saving fails", () => {
    const longText = `A long answer ${"without-breaks".repeat(180)}`;
    render(
      <InterviewEvidenceReview
        {...baseProps}
        isPartial
        storageStatus="unavailable"
        transcript={[{ ...candidateTurn, text: longText }]}
      />,
    );

    expect(screen.getByText("Partial transcript")).toBeVisible();
    expect(
      screen.getByText(
        "The connection ended before a complete transcript was received.",
      ),
    ).toBeVisible();
    expect(screen.getByText(longText)).toBeVisible();
    expect(
      screen.getByText(/the browser could not save the latest review state/u),
    ).toBeVisible();
  });

  it("keeps CV-assisted provenance distinct on review cards", () => {
    const combinedInsight: InsightCard = {
      ...candidateInsight(),
      source: "CV + Candidate",
      cvFactIds: ["fact-1"],
    };
    render(
      <InterviewEvidenceReview
        {...baseProps}
        cv={{
          displayName: "Synthetic Candidate",
          displayNameEvidence: "Synthetic Candidate",
          headline: "Product contributor",
          experienceLevel: "experienced",
          facts: [
            {
              id: "fact-1",
              category: "experience",
              statement: "Worked with cross-functional product teams.",
              evidenceExcerpt: "cross-functional product teams",
            },
          ],
          ambiguities: [],
          suggestedRole: null,
        }}
        entryMode="cv_assisted"
        insights={[combinedInsight]}
      />,
    );

    expect(screen.getByText("CV-assisted")).toBeVisible();
    expect(screen.getByText("CV + Candidate")).toBeVisible();
    expect(
      screen.getByText(
        "CV source: Worked with cross-functional product teams.",
      ),
    ).toBeVisible();
  });
});
