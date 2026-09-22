import { UNDECIDED_ROLE_VALUE } from "@screenpilot/contracts/interview/client-tools";
import {
  SCREENING_SUMMARY_LIMITATIONS,
  screeningSummarySchema,
  type ScreeningSummary,
} from "@screenpilot/contracts/interview/screening-summary";
import type { z } from "zod";

import type { InterviewSummaryInput } from "./ports/interview-summarizer.js";
import { selectLatestCandidateInsight } from "./select-latest-candidate-insight.js";

type SummaryValidationIssue = Readonly<{
  path: string;
  ruleId: string;
}>;

export class InterviewSummaryValidationError extends Error {
  readonly validationPaths: readonly string[];
  readonly validationRuleIds: readonly string[];

  constructor(issues: readonly SummaryValidationIssue[]) {
    super("The interview summary did not contain usable grounded evidence.");
    this.name = "InterviewSummaryValidationError";
    this.validationPaths = [
      ...new Set(issues.map((issue) => issue.path)),
    ].slice(0, 16);
    this.validationRuleIds = [
      ...new Set(issues.map((issue) => issue.ruleId)),
    ].slice(0, 16);
  }
}

function schemaIssues(error: z.ZodError): readonly SummaryValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length === 0 ? "$" : issue.path.join("."),
    ruleId: `schema_${issue.code}`,
  }));
}

function evidenceCollections(summary: ScreeningSummary) {
  return [
    ...(summary.rolePreference === undefined
      ? []
      : [
          {
            ids: summary.rolePreference.evidenceTurnIds,
            path: "rolePreference.evidenceTurnIds",
          },
        ]),
    ...summary.confirmedFacts.map((fact, index) => ({
      ids: fact.evidenceTurnIds,
      path: `confirmedFacts.${String(index)}.evidenceTurnIds`,
    })),
    ...summary.clarifications.map((clarification, index) => ({
      ids: clarification.evidenceTurnIds,
      path: `clarifications.${String(index)}.evidenceTurnIds`,
    })),
    ...summary.topicsCovered.map((topic, index) => ({
      ids: topic.evidenceTurnIds,
      path: `topicsCovered.${String(index)}.evidenceTurnIds`,
    })),
    ...(summary.compensation === undefined
      ? []
      : [
          {
            ids: summary.compensation.evidenceTurnIds,
            path: "compensation.evidenceTurnIds",
          },
        ]),
    ...(summary.availability === undefined
      ? []
      : [
          {
            ids: summary.availability.evidenceTurnIds,
            path: "availability.evidenceTurnIds",
          },
        ]),
    ...summary.communicationNotes.map((note, index) => ({
      ids: note.evidenceTurnIds,
      path: `communicationNotes.${String(index)}.evidenceTurnIds`,
    })),
    ...summary.candidateQuestions.map((question, index) => ({
      ids: question.evidenceTurnIds,
      path: `candidateQuestions.${String(index)}.evidenceTurnIds`,
    })),
    ...summary.humanFollowups.map((followup, index) => ({
      ids: followup.evidenceTurnIds,
      path: `humanFollowups.${String(index)}.evidenceTurnIds`,
    })),
  ];
}

function sectionContainsEvidence(
  section: readonly Readonly<{ evidenceTurnIds: readonly string[] }>[],
  evidenceTurnId: string,
): boolean {
  return section.some((entry) =>
    entry.evidenceTurnIds.includes(evidenceTurnId),
  );
}

type RequiredFactEvidence = Readonly<{
  evidenceTurnId: string;
  section: "clarification" | "confirmed";
}>;

type SummaryFactEntry = Readonly<{
  evidenceTurnIds: readonly string[];
  section: "clarification" | "confirmed";
}>;

function hasDistinctFactEntries(
  groups: readonly (readonly RequiredFactEvidence[])[],
  entries: readonly SummaryFactEntry[],
): boolean {
  const usedEntryIndexes = new Set<number>();
  const assignGroup = (groupIndex: number): boolean => {
    const group = groups[groupIndex];
    if (group === undefined) {
      return true;
    }
    for (const [entryIndex, entry] of entries.entries()) {
      if (usedEntryIndexes.has(entryIndex)) {
        continue;
      }
      const matchesGroup = group.some(
        (requirement) =>
          requirement.section === entry.section &&
          entry.evidenceTurnIds.includes(requirement.evidenceTurnId),
      );
      if (!matchesGroup) {
        continue;
      }
      usedEntryIndexes.add(entryIndex);
      if (assignGroup(groupIndex + 1)) {
        return true;
      }
      usedEntryIndexes.delete(entryIndex);
    }
    return false;
  };
  return assignGroup(0);
}

export function validateInterviewSummary(
  input: InterviewSummaryInput,
  value: unknown,
): ScreeningSummary {
  const parsed = screeningSummarySchema.safeParse(value);
  if (!parsed.success) {
    throw new InterviewSummaryValidationError(schemaIssues(parsed.error));
  }
  const summary = parsed.data;
  const issues: SummaryValidationIssue[] = [];
  const candidateTurnIds = new Set(
    input.transcript
      .filter((turn) => turn.speaker === "candidate" && turn.status === "final")
      .map((turn) => turn.id),
  );

  for (const evidence of evidenceCollections(summary)) {
    if (evidence.ids.some((id) => !candidateTurnIds.has(id))) {
      issues.push({
        path: evidence.path,
        ruleId: "evidence_not_final_candidate_turn",
      });
    }
  }

  const roleInsight = selectLatestCandidateInsight(input, "role_preference");
  if (roleInsight === undefined && summary.rolePreference !== undefined) {
    issues.push({
      path: "rolePreference",
      ruleId: "role_without_candidate_evidence",
    });
  } else if (roleInsight !== undefined) {
    if (summary.rolePreference === undefined) {
      issues.push({
        path: "rolePreference",
        ruleId: "candidate_role_omitted",
      });
    } else {
      const isUndecided =
        roleInsight.value.toLocaleLowerCase("en") ===
        UNDECIDED_ROLE_VALUE.toLocaleLowerCase("en");
      const expectedLabel = isUndecided ? null : roleInsight.value;
      const expectedStatus = isUndecided ? "undecided" : "candidate_stated";
      const latestEvidenceId = roleInsight.evidenceTurnIds.at(-1);
      if (
        summary.rolePreference.label !== expectedLabel ||
        summary.rolePreference.status !== expectedStatus ||
        summary.rolePreference.evidenceTurnIds.some(
          (id) => !roleInsight.evidenceTurnIds.includes(id),
        ) ||
        (latestEvidenceId !== undefined &&
          !summary.rolePreference.evidenceTurnIds.includes(latestEvidenceId))
      ) {
        issues.push({
          path: "rolePreference",
          ruleId: "candidate_role_mismatch",
        });
      }
    }
  }

  const coveredTopicKeys = summary.topicsCovered.map((topic) => topic.topicKey);
  if (new Set(coveredTopicKeys).size !== coveredTopicKeys.length) {
    issues.push({
      path: "topicsCovered",
      ruleId: "duplicate_covered_topic",
    });
  }
  if (
    new Set(summary.topicsNotCovered).size !== summary.topicsNotCovered.length
  ) {
    issues.push({
      path: "topicsNotCovered",
      ruleId: "duplicate_missing_topic",
    });
  }
  const planTopicKeys = input.plan.topics.map((topic) => topic.key);
  const partitionedTopicKeys = new Set([
    ...coveredTopicKeys,
    ...summary.topicsNotCovered,
  ]);
  if (
    coveredTopicKeys.some((key) => summary.topicsNotCovered.includes(key)) ||
    planTopicKeys.some((key) => !partitionedTopicKeys.has(key))
  ) {
    issues.push({
      path: "topicsCovered",
      ruleId: "topic_partition_incomplete",
    });
  }
  if (!summary.limitations.includes(SCREENING_SUMMARY_LIMITATIONS[0])) {
    issues.push({
      path: "limitations",
      ruleId: "human_review_limitation_omitted",
    });
  }
  const missingTopicsLimitation = SCREENING_SUMMARY_LIMITATIONS[1];
  if (
    summary.topicsNotCovered.length > 0 !==
    summary.limitations.includes(missingTopicsLimitation)
  ) {
    issues.push({
      path: "limitations",
      ruleId: "missing_topics_limitation_mismatch",
    });
  }
  summary.topicsCovered.forEach((coveredTopic, index) => {
    const progress = input.topicProgress.find(
      (candidate) => candidate.topicKey === coveredTopic.topicKey,
    );
    if (
      progress?.status !== "covered" ||
      !coveredTopic.evidenceTurnIds.every((id) =>
        progress.evidenceTurnIds.includes(id),
      )
    ) {
      issues.push({
        path: `topicsCovered.${String(index)}`,
        ruleId: "topic_coverage_not_grounded",
      });
    }
  });
  for (const progress of input.topicProgress) {
    if (
      progress.status === "covered" &&
      !summary.topicsCovered.some(
        (coveredTopic) => coveredTopic.topicKey === progress.topicKey,
      )
    ) {
      issues.push({
        path: "topicsCovered",
        ruleId: "covered_topic_omitted",
      });
    }
  }

  const requiredFactGroups = [
    {
      categories: new Set(["current_context"]),
      ruleId: "required_current_context_omitted",
    },
    {
      categories: new Set([
        "relevant_experience",
        "responsibility",
        "strongest_areas",
      ]),
      ruleId: "required_experience_context_omitted",
    },
    {
      categories: new Set(["team_work_style"]),
      ruleId: "required_team_work_style_omitted",
    },
  ] as const;
  const requiredFactEvidenceGroups: RequiredFactEvidence[][] = [];
  for (const group of requiredFactGroups) {
    const requiredInsights = input.insights.filter(
      (insight) =>
        insight.source !== "CV" &&
        group.categories.has(insight.category) &&
        insight.evidenceTurnIds.length > 0,
    );
    requiredFactEvidenceGroups.push(
      requiredInsights.flatMap((insight) => {
        const evidenceTurnId = insight.evidenceTurnIds.at(-1);
        return evidenceTurnId === undefined
          ? []
          : [
              {
                evidenceTurnId,
                section:
                  insight.status === "needs_clarification"
                    ? ("clarification" as const)
                    : ("confirmed" as const),
              },
            ];
      }),
    );
    const omitted = requiredInsights.some((insight) => {
      const latestEvidenceId = insight.evidenceTurnIds.at(-1);
      if (latestEvidenceId === undefined) {
        return false;
      }
      const section =
        insight.status === "needs_clarification"
          ? summary.clarifications
          : summary.confirmedFacts;
      return !sectionContainsEvidence(section, latestEvidenceId);
    });
    if (omitted) {
      issues.push({
        path: requiredInsights.some(
          (insight) => insight.status === "needs_clarification",
        )
          ? "clarifications"
          : "confirmedFacts",
        ruleId: group.ruleId,
      });
    }
  }
  const activeRequiredFactEvidenceGroups = requiredFactEvidenceGroups.filter(
    (group) => group.length > 0,
  );
  const summaryFactEntries: SummaryFactEntry[] = [
    ...summary.confirmedFacts.map((fact) => ({
      evidenceTurnIds: fact.evidenceTurnIds,
      section: "confirmed" as const,
    })),
    ...summary.clarifications.map((clarification) => ({
      evidenceTurnIds: clarification.evidenceTurnIds,
      section: "clarification" as const,
    })),
  ];
  if (
    !hasDistinctFactEntries(
      activeRequiredFactEvidenceGroups,
      summaryFactEntries,
    )
  ) {
    issues.push({
      path: "confirmedFacts",
      ruleId: "required_insight_groups_collapsed",
    });
  }

  for (const questionInsight of input.insights.filter(
    (insight) =>
      insight.category === "candidate_question" && insight.source !== "CV",
  )) {
    const latestEvidenceId = questionInsight.evidenceTurnIds.at(-1);
    if (
      latestEvidenceId !== undefined &&
      !sectionContainsEvidence(summary.candidateQuestions, latestEvidenceId)
    ) {
      issues.push({
        path: "candidateQuestions",
        ruleId: "candidate_question_omitted",
      });
    }
  }

  for (const category of ["compensation", "availability"] as const) {
    const insight = selectLatestCandidateInsight(input, category);
    const output = summary[category];
    if (insight !== undefined && output === undefined) {
      issues.push({
        path: category,
        ruleId: `${category}_omitted`,
      });
    } else if (
      insight !== undefined &&
      output !== undefined &&
      !output.evidenceTurnIds.includes(insight.evidenceTurnIds.at(-1) ?? "")
    ) {
      issues.push({
        path: `${category}.evidenceTurnIds`,
        ruleId: `${category}_evidence_mismatch`,
      });
    }
  }

  for (const insight of input.insights.filter(
    (candidate) => candidate.category === "follow_up_needed",
  )) {
    if (
      !summary.humanFollowups.some((followup) =>
        followup.evidenceTurnIds.some((id) =>
          insight.evidenceTurnIds.includes(id),
        ),
      )
    ) {
      issues.push({
        path: "humanFollowups",
        ruleId: "candidate_followup_omitted",
      });
    }
  }

  if (issues.length > 0) {
    throw new InterviewSummaryValidationError(issues);
  }
  return summary;
}
