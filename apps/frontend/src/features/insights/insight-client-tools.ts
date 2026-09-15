import {
  correctInsightArgumentsSchema,
  isUndecidedRoleValue,
  markTopicArgumentsSchema,
  recordCandidateQuestionArgumentsSchema,
  recordInsightArgumentsSchema,
  requestFollowupArgumentsSchema,
  UNDECIDED_ROLE_VALUE,
} from "@screenpilot/contracts/interview/client-tools";
import { containsUnsupportedAssessmentOrSensitiveInference } from "@screenpilot/contracts/interview/assessment-boundary";
import { roleLabelSchema } from "@screenpilot/contracts/interview/demo-context";
import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";
import {
  insightCardSchema,
  type InsightCard,
  type InsightCategory,
} from "@screenpilot/contracts/interview/insight-card";
import {
  topicProgressSchema,
  type TopicProgress,
} from "@screenpilot/contracts/interview/topic-progress";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";
import type { VoiceClientToolName } from "@screenpilot/contracts/api/voice-token";

import { INSIGHT_CATEGORY_METADATA } from "./insight-category-metadata";

export type InsightClientTool = (
  parameters: Record<string, unknown>,
) => string | Promise<string>;

export type InsightClientTools = Readonly<
  Record<VoiceClientToolName, InsightClientTool>
>;

export type InsightToolSnapshot = Readonly<{
  entryMode: EntryMode;
  insights: readonly InsightCard[];
  topicProgress: readonly TopicProgress[];
  transcript: readonly TranscriptTurn[];
}>;

type InsightClientToolDispatcherOptions = Readonly<{
  getSnapshot: () => InsightToolSnapshot;
  now?: () => string;
  onInsight: (insight: InsightCard) => void;
  onTopicProgress: (progress: TopicProgress) => void;
}>;

const rejected = (message: string) => `Rejected: ${message}`;
const applied = (message: string) => `Applied: ${message}`;

function latestCandidateEvidence(
  snapshot: InsightToolSnapshot,
): TranscriptTurn | null {
  const latestTurn = snapshot.transcript.reduce<TranscriptTurn | null>(
    (latest, turn) =>
      latest === null || turn.sequence > latest.sequence ? turn : latest,
    null,
  );
  return latestTurn?.speaker === "candidate" && latestTurn.status === "final"
    ? latestTurn
    : null;
}

function appendUnique(
  values: readonly string[],
  value: string,
): readonly string[] {
  return values.includes(value) ? values : [...values, value];
}

function normalizeInsightValue(category: InsightCategory, value: string) {
  if (category !== "role_preference") {
    return value;
  }
  if (isUndecidedRoleValue(value)) {
    return UNDECIDED_ROLE_VALUE;
  }
  return roleLabelSchema.parse(value);
}

function hasUnsupportedVisibleInference(...values: readonly string[]): boolean {
  return values.some(containsUnsupportedAssessmentOrSensitiveInference);
}

function parseInsight(insight: InsightCard): InsightCard | null {
  const parsed = insightCardSchema.safeParse(insight);
  return parsed.success ? parsed.data : null;
}

export function createInsightClientTools({
  getSnapshot,
  now = () => new Date().toISOString(),
  onInsight,
  onTopicProgress,
}: InsightClientToolDispatcherOptions): InsightClientTools {
  const requireEvidence = () => {
    const snapshot = getSnapshot();
    return { snapshot, turn: latestCandidateEvidence(snapshot) };
  };

  const recordInsight: InsightClientTool = (parameters) => {
    const parsed = recordInsightArgumentsSchema.safeParse(parameters);
    if (!parsed.success) {
      return rejected("The insight arguments are invalid or out of bounds.");
    }
    const { snapshot, turn } = requireEvidence();
    if (!turn) {
      return rejected(
        "Wait for the latest final candidate answer before recording evidence.",
      );
    }
    if (parsed.data.source === "CV") {
      return rejected("Live tools cannot create CV-only evidence.");
    }
    if (
      snapshot.entryMode === "conversation_first" &&
      parsed.data.source !== "Candidate"
    ) {
      return rejected("Conversation-first evidence must use Candidate source.");
    }
    if (hasUnsupportedVisibleInference(parsed.data.label, parsed.data.value)) {
      return rejected(
        "Insight cards cannot contain scores, assessments, or inferred traits.",
      );
    }

    let value: string;
    try {
      value = normalizeInsightValue(parsed.data.category, parsed.data.value);
    } catch {
      return rejected("The candidate name or role value is invalid.");
    }
    const existing = snapshot.insights.find(
      (insight) => insight.category === parsed.data.category,
    );
    if (existing) {
      if (existing.value !== value) {
        return rejected(
          `Use correctInsight with cardId ${existing.id} to replace this value.`,
        );
      }
      if (existing.evidenceTurnIds.includes(turn.id)) {
        return rejected("This evidence update has already been applied.");
      }
      if (
        existing.source !== "Candidate" &&
        parsed.data.source !== "CV + Candidate"
      ) {
        return rejected(
          "Confirm an existing CV fact with CV + Candidate source.",
        );
      }
      if (
        parsed.data.source === "CV + Candidate" &&
        existing.cvFactIds.length === 0
      ) {
        return rejected("Combined provenance requires an existing CV fact.");
      }
      const insight = parseInsight({
        ...existing,
        label: INSIGHT_CATEGORY_METADATA[existing.category].label,
        source: parsed.data.source,
        status: existing.status === "corrected" ? "corrected" : "confirmed",
        evidenceTurnIds: [...appendUnique(existing.evidenceTurnIds, turn.id)],
        updatedAt: now(),
      });
      if (!insight) {
        return rejected("The evidence update conflicts with the session.");
      }
      onInsight(insight);
      return applied(`Updated insight card ${insight.id}.`);
    }
    if (parsed.data.source !== "Candidate") {
      return rejected("Combined provenance requires an existing CV insight.");
    }
    const occurredAt = now();
    const insight = parseInsight({
      id: `insight-${parsed.data.category}`,
      category: parsed.data.category,
      label: INSIGHT_CATEGORY_METADATA[parsed.data.category].label,
      value,
      source: "Candidate",
      status: "appearing",
      evidenceTurnIds: [turn.id],
      cvFactIds: [],
      createdAt: occurredAt,
      updatedAt: occurredAt,
    });
    if (!insight) {
      return rejected("The evidence update conflicts with the session.");
    }
    onInsight(insight);
    return applied(`Created insight card ${insight.id}.`);
  };

  const correctInsight: InsightClientTool = (parameters) => {
    const parsed = correctInsightArgumentsSchema.safeParse(parameters);
    if (!parsed.success) {
      return rejected("The correction arguments are invalid or out of bounds.");
    }
    const { snapshot, turn } = requireEvidence();
    if (!turn) {
      return rejected(
        "Wait for the latest final candidate answer before correcting evidence.",
      );
    }
    const existing = snapshot.insights.find(
      (insight) => insight.id === parsed.data.cardId,
    );
    if (!existing) {
      return rejected("The requested insight card does not exist.");
    }
    if (existing.evidenceTurnIds.includes(turn.id)) {
      return rejected("This evidence update has already been applied.");
    }
    if (
      hasUnsupportedVisibleInference(
        existing.label,
        parsed.data.value,
        parsed.data.reason,
      )
    ) {
      return rejected(
        "Insight cards cannot contain scores, assessments, or inferred traits.",
      );
    }
    let value: string;
    try {
      value = normalizeInsightValue(existing.category, parsed.data.value);
    } catch {
      return rejected("The corrected candidate name or role value is invalid.");
    }
    if (existing.value === value) {
      return rejected("The correction must replace the current value.");
    }
    const insight = parseInsight({
      ...existing,
      value,
      source: existing.source === "Candidate" ? "Candidate" : "CV + Candidate",
      status: "corrected",
      evidenceTurnIds: [...appendUnique(existing.evidenceTurnIds, turn.id)],
      correctionReason: parsed.data.reason,
      updatedAt: now(),
    });
    if (!insight) {
      return rejected("The correction conflicts with the session.");
    }
    onInsight(insight);
    return applied(`Corrected insight card ${insight.id}.`);
  };

  const markTopic: InsightClientTool = (parameters) => {
    const parsed = markTopicArgumentsSchema.safeParse(parameters);
    if (!parsed.success) {
      return rejected("The topic update is invalid or out of bounds.");
    }
    const { snapshot, turn } = requireEvidence();
    if (!turn) {
      return rejected(
        "Wait for the latest final candidate answer before updating a topic.",
      );
    }
    const existing = snapshot.topicProgress.find(
      (progress) => progress.topicKey === parsed.data.topicKey,
    );
    if (existing?.status === parsed.data.status) {
      return rejected("This topic update has already been applied.");
    }
    const evidenceTurnIds = appendUnique(
      existing?.evidenceTurnIds ?? [],
      turn.id,
    );
    const progress = topicProgressSchema.safeParse({
      topicKey: parsed.data.topicKey,
      status: parsed.data.status,
      evidenceTurnIds,
      updatedAt: now(),
    });
    if (!progress.success) {
      return rejected("The topic update conflicts with the session.");
    }
    onTopicProgress(progress.data);
    return applied(`Updated topic ${progress.data.topicKey}.`);
  };

  const recordCandidateQuestion: InsightClientTool = (parameters) => {
    const parsed = recordCandidateQuestionArgumentsSchema.safeParse(parameters);
    if (!parsed.success) {
      return rejected("The candidate-question arguments are invalid.");
    }
    const { snapshot, turn } = requireEvidence();
    if (!turn) {
      return rejected(
        "Wait for the latest final candidate question before recording it.",
      );
    }
    if (
      snapshot.insights.some(
        (insight) =>
          insight.category === "candidate_question" &&
          insight.evidenceTurnIds.includes(turn.id),
      )
    ) {
      return rejected("This candidate question has already been recorded.");
    }
    const occurredAt = now();
    const insight = parseInsight({
      id: `candidate-question-${String(turn.sequence)}`,
      category: "candidate_question",
      label: INSIGHT_CATEGORY_METADATA.candidate_question.label,
      value: parsed.data.question,
      source: "Candidate",
      status: "appearing",
      evidenceTurnIds: [turn.id],
      cvFactIds: [],
      createdAt: occurredAt,
      updatedAt: occurredAt,
    });
    if (!insight) {
      return rejected("The candidate question conflicts with the session.");
    }
    onInsight(insight);
    return applied(`Created candidate-question card ${insight.id}.`);
  };

  const requestFollowup: InsightClientTool = (parameters) => {
    const parsed = requestFollowupArgumentsSchema.safeParse(parameters);
    if (!parsed.success) {
      return rejected("The human-follow-up arguments are invalid.");
    }
    const { snapshot, turn } = requireEvidence();
    if (!turn) {
      return rejected(
        "Wait for the latest final candidate answer before requesting follow-up.",
      );
    }
    if (
      snapshot.insights.some(
        (insight) =>
          insight.category === "follow_up_needed" &&
          insight.evidenceTurnIds.includes(turn.id),
      )
    ) {
      return rejected("This human follow-up has already been requested.");
    }
    if (hasUnsupportedVisibleInference(parsed.data.reason)) {
      return rejected(
        "Insight cards cannot contain scores, assessments, or inferred traits.",
      );
    }
    const occurredAt = now();
    const insight = parseInsight({
      id: `follow-up-${String(turn.sequence)}`,
      category: "follow_up_needed",
      label: INSIGHT_CATEGORY_METADATA.follow_up_needed.label,
      value: parsed.data.reason,
      source: "Candidate",
      status: "needs_clarification",
      evidenceTurnIds: [turn.id],
      cvFactIds: [],
      createdAt: occurredAt,
      updatedAt: occurredAt,
    });
    if (!insight) {
      return rejected("The human follow-up conflicts with the session.");
    }
    onInsight(insight);
    return applied(`Created human-follow-up card ${insight.id}.`);
  };

  return Object.freeze({
    recordInsight,
    correctInsight,
    markTopic,
    recordCandidateQuestion,
    requestFollowup,
  });
}
