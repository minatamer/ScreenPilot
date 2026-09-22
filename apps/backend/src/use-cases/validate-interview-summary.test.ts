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
  it("grounds role corrections by chronological instant across timezone offsets", () => {
    const input = createSummaryFixtureInput();
    const originalRoleInsight = input.insights.find(
      (insight) => insight.category === "role_preference",
    );
    if (originalRoleInsight === undefined) {
      throw new Error("The summary fixture requires a role insight.");
    }
    originalRoleInsight.createdAt = "2026-09-21T07:00:00Z";
    originalRoleInsight.updatedAt = "2026-09-21T10:30:00+03:00";
    input.transcript.push({
      id: "turn-role-correction",
      sequence: input.transcript.length + 1,
      speaker: "candidate",
      status: "final",
      text: "I would like to use UX Researcher as the role for this session.",
      occurredAt: "2026-09-21T08:00:00Z",
    });
    input.insights.push({
      ...originalRoleInsight,
      id: "insight-role-correction",
      value: "UX Researcher",
      evidenceTurnIds: ["turn-role-correction"],
      createdAt: "2026-09-21T08:00:00Z",
      updatedAt: "2026-09-21T08:00:00Z",
    });
    const summary = createSummaryFixture(input);

    expect(summary.rolePreference).toMatchObject({
      label: "UX Researcher",
      evidenceTurnIds: ["turn-role-correction"],
    });
    expect(() => validateInterviewSummary(input, summary)).not.toThrow();
    expect(
      validationRuleIds(() =>
        validateInterviewSummary(input, {
          ...summary,
          rolePreference: {
            label: originalRoleInsight.value,
            status: "candidate_stated",
            evidenceTurnIds: originalRoleInsight.evidenceTurnIds,
          },
        }),
      ),
    ).toContain("candidate_role_mismatch");
  });

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
