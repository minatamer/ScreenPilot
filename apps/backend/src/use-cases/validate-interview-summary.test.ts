import { describe, expect, it } from "vitest";

import {
  createSummaryFixture,
  createSummaryFixtureInput,
} from "../test/interview-summary-fixtures.js";
import {
  InterviewSummaryValidationError,
  validateInterviewSummary,
} from "./validate-interview-summary.js";

function validationRuleIds(operation: () => unknown): readonly string[] {
  try {
    operation();
  } catch (error: unknown) {
    if (error instanceof InterviewSummaryValidationError) {
      return error.validationRuleIds;
    }
    throw error;
  }
  throw new Error("Expected summary validation to fail.");
}

describe("validateInterviewSummary", () => {
  it.each([
    [
      "current context",
      "turn-current_context",
      "required_current_context_omitted",
    ],
    [
      "experience context",
      "turn-relevant_experience_summary",
      "required_experience_context_omitted",
    ],
    [
      "team/work style",
      "turn-team_work_style",
      "required_team_work_style_omitted",
    ],
  ])(
    "rejects omitted candidate-backed %s content",
    (_name, evidenceTurnId, expectedRuleId) => {
      const input = createSummaryFixtureInput();
      const summary = createSummaryFixture(input);
      const incompleteSummary = {
        ...summary,
        confirmedFacts: summary.confirmedFacts.filter(
          (fact) => !fact.evidenceTurnIds.includes(evidenceTurnId),
        ),
      };

      expect(
        validationRuleIds(() =>
          validateInterviewSummary(input, incompleteSummary),
        ),
      ).toContain(expectedRuleId);
    },
  );

  it("rejects an omitted recorded candidate question", () => {
    const input = createSummaryFixtureInput({ includeCandidateQuestion: true });
    const summary = createSummaryFixture(input);

    expect(
      validationRuleIds(() =>
        validateInterviewSummary(input, {
          ...summary,
          candidateQuestions: [],
        }),
      ),
    ).toContain("candidate_question_omitted");
  });

  it("rejects one combined fact used for all distinct required insight groups", () => {
    const input = createSummaryFixtureInput();
    const summary = createSummaryFixture(input);
    const groupedEvidenceIds = [
      "turn-current_context",
      "turn-relevant_experience_summary",
      "turn-team_work_style",
    ];
    const collapsedSummary = {
      ...summary,
      confirmedFacts: [
        ...summary.confirmedFacts.filter(
          (fact) =>
            !fact.evidenceTurnIds.some((evidenceTurnId) =>
              groupedEvidenceIds.includes(evidenceTurnId),
            ),
        ),
        {
          statement:
            "Candidate shared context, experience, and a work preference.",
          evidenceTurnIds: groupedEvidenceIds,
        },
      ],
    };

    expect(
      validationRuleIds(() =>
        validateInterviewSummary(input, collapsedSummary),
      ),
    ).toContain("required_insight_groups_collapsed");
  });

  it("rejects a covered input topic reported as not covered", () => {
    const input = createSummaryFixtureInput();
    const summary = createSummaryFixture(input);
    const topicKey = "current_context" as const;

    expect(
      validationRuleIds(() =>
        validateInterviewSummary(input, {
          ...summary,
          topicsCovered: summary.topicsCovered.filter(
            (topic) => topic.topicKey !== topicKey,
          ),
          topicsNotCovered: [...summary.topicsNotCovered, topicKey],
        }),
      ),
    ).toContain("covered_topic_omitted");
  });
});
