import type { SummaryModelOutput } from "@screenpilot/contracts/ai/summary-output";
import type { ScreeningSummary } from "@screenpilot/contracts/interview/screening-summary";

import {
  createGroundedInterviewSummary,
  createGroundedTeamWorkStyleFact,
} from "./create-grounded-interview-summary.js";
import type { InterviewSummaryInput } from "./ports/interview-summarizer.js";
import {
  InterviewSummaryValidationError,
  validateInterviewSummary,
} from "./validate-interview-summary.js";

function candidateStatementWithGroundedEvidence(
  modelValue: SummaryModelOutput["compensation"],
  groundedValue: ScreeningSummary["compensation"],
) {
  if (groundedValue === undefined) {
    return undefined;
  }
  return {
    candidateStatement:
      modelValue?.candidateStatement ?? groundedValue.candidateStatement,
    evidenceTurnIds: groundedValue.evidenceTurnIds,
  };
}

function hasSameEvidenceTurnIds(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((evidenceTurnId) => right.includes(evidenceTurnId))
  );
}

type EvidenceSetRelationship = "ambiguous" | "disjoint" | "exact";

function classifyEvidenceSetRelationship(
  modelEvidenceTurnIds: readonly string[],
  groundedEvidenceTurnIds: readonly string[],
): EvidenceSetRelationship {
  const intersects = modelEvidenceTurnIds.some((evidenceTurnId) =>
    groundedEvidenceTurnIds.includes(evidenceTurnId),
  );
  if (!intersects) {
    return "disjoint";
  }
  return hasSameEvidenceTurnIds(modelEvidenceTurnIds, groundedEvidenceTurnIds)
    ? "exact"
    : "ambiguous";
}

function withGroundedTeamWorkStyleFact(
  input: InterviewSummaryInput,
  modelFacts: SummaryModelOutput["confirmedFacts"],
  grounded: ScreeningSummary,
): SummaryModelOutput["confirmedFacts"] | null {
  const topicWasCovered = grounded.topicsCovered.some(
    (topic) => topic.topicKey === "team_work_style",
  );
  const groundedFact = createGroundedTeamWorkStyleFact(input);
  if (groundedFact === undefined) {
    return null;
  }
  if (!topicWasCovered) {
    return null;
  }

  const teamEvidenceIsSharedByAnotherGroundedFact =
    grounded.confirmedFacts.some(
      (fact) =>
        !(
          fact.statement === groundedFact.statement &&
          hasSameEvidenceTurnIds(
            fact.evidenceTurnIds,
            groundedFact.evidenceTurnIds,
          )
        ) &&
        fact.evidenceTurnIds.some((evidenceTurnId) =>
          groundedFact.evidenceTurnIds.includes(evidenceTurnId),
        ),
    );
  const evidenceRelationships = modelFacts.map((fact) =>
    classifyEvidenceSetRelationship(
      fact.evidenceTurnIds,
      groundedFact.evidenceTurnIds,
    ),
  );
  if (
    teamEvidenceIsSharedByAnotherGroundedFact ||
    evidenceRelationships.includes("ambiguous")
  ) {
    return null;
  }

  const firstExactFactIndex = evidenceRelationships.indexOf("exact");
  if (firstExactFactIndex === -1) {
    return [...modelFacts, groundedFact];
  }

  return modelFacts.flatMap((modelFact, index) => {
    if (evidenceRelationships[index] !== "exact") {
      return [modelFact];
    }
    return index === firstExactFactIndex ? [groundedFact] : [];
  });
}

/**
 * Keeps model-authored narrative where it passes the complete domain validator,
 * while projecting exact browser-owned evidence fields from the server ledger.
 * If narrative still violates a semantic or safety rule, the server returns the
 * same evidence-grounded summary used by deterministic mode instead of buying a
 * second model generation.
 */
export function reconcileSummaryModelOutput(
  input: InterviewSummaryInput,
  modelOutput: SummaryModelOutput,
): ScreeningSummary {
  const grounded = createGroundedInterviewSummary(input);
  const confirmedFacts = withGroundedTeamWorkStyleFact(
    input,
    modelOutput.confirmedFacts,
    grounded,
  );
  if (confirmedFacts === null) {
    return grounded;
  }
  const reconciledValue = {
    ...modelOutput,
    overview: grounded.overview,
    rolePreference: grounded.rolePreference,
    confirmedFacts,
    topicsCovered: grounded.topicsCovered,
    topicsNotCovered: grounded.topicsNotCovered,
    compensation: candidateStatementWithGroundedEvidence(
      modelOutput.compensation,
      grounded.compensation,
    ),
    availability: candidateStatementWithGroundedEvidence(
      modelOutput.availability,
      grounded.availability,
    ),
    candidateQuestions: grounded.candidateQuestions,
    humanFollowups: grounded.humanFollowups,
    limitations: grounded.limitations,
  };

  try {
    return validateInterviewSummary(input, reconciledValue);
  } catch (error: unknown) {
    if (!(error instanceof InterviewSummaryValidationError)) {
      throw error;
    }
    return grounded;
  }
}
