import { describe, expect, it } from "vitest";

import {
  normalizeSummaryModelOutput,
  summaryModelOutputJsonSchema,
  summaryModelOutputSchema,
} from "./summary-output.js";

function modelOutput() {
  return {
    overview:
      "Local interview evidence was organized into cautious notes for human review.",
    rolePreference: {
      label: "Graphic Designer and UX Researcher",
      status: "candidate_stated",
      evidenceTurnIds: ["turn-role"],
    },
    confirmedFacts: [
      {
        statement: "Candidate described current work context.",
        evidenceTurnIds: ["turn-context"],
      },
    ],
    clarifications: [],
    topicsCovered: [
      {
        topicKey: "current_context",
        evidenceTurnIds: ["turn-context"],
      },
    ],
    topicsNotCovered: ["availability"],
    compensation: null,
    availability: null,
    communicationNotes: [],
    candidateQuestions: [],
    humanFollowups: [],
    limitations: [
      "These AI-organized notes require human review.",
      "Some planned topics were not covered in the local evidence.",
    ],
  } as const;
}

describe("summary model output", () => {
  it("uses one strict JSON schema and normalizes nullable optional sections", () => {
    const parsed = summaryModelOutputSchema.parse(modelOutput());
    expect(normalizeSummaryModelOutput(parsed)).toEqual({
      ...modelOutput(),
      compensation: undefined,
      availability: undefined,
    });
    expect(summaryModelOutputJsonSchema).toMatchObject({
      additionalProperties: false,
      type: "object",
    });
  });

  it.each([
    "The candidate received a score of 9.",
    "The candidate has a collaborative personality.",
    "The candidate has advanced English proficiency.",
    "The candidate should be hired.",
    "The company offers a remote work policy.",
    "The candidate applied for this role.",
  ])("rejects forbidden assessment output: %s", (statement) => {
    expect(
      summaryModelOutputSchema.safeParse({
        ...modelOutput(),
        confirmedFacts: [{ statement, evidenceTurnIds: ["turn-context"] }],
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate evidence IDs and unknown topic keys", () => {
    expect(
      summaryModelOutputSchema.safeParse({
        ...modelOutput(),
        confirmedFacts: [
          {
            statement: "Candidate described current context.",
            evidenceTurnIds: ["turn-context", "turn-context"],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      summaryModelOutputSchema.safeParse({
        ...modelOutput(),
        topicsNotCovered: ["technical_competency"],
      }).success,
    ).toBe(false);
  });
});
