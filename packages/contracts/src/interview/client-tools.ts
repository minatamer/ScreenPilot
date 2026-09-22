import { z } from "zod";

import type { VoiceClientToolName } from "../api/voice-token.ts";
import { INSIGHT_SOURCES } from "./insight-card.ts";
import { UNIVERSAL_TOPIC_KEYS } from "./screening-plan.ts";

export const RECORDABLE_INSIGHT_CATEGORIES = [
  "preferred_name",
  "role_preference",
  "current_context",
  "relevant_experience",
  "responsibility",
  "strongest_areas",
  "team_work_style",
  "availability",
  "location_work_arrangement",
  "compensation",
  "english_use",
  "motivation",
] as const;

export const CLIENT_TOOL_TOPIC_STATUSES = [
  "in_progress",
  "covered",
  "skipped",
  "needs_clarification",
] as const;

export const UNDECIDED_ROLE_VALUE = "Undecided" as const;
export const UNSUPPORTED_EMPLOYER_QUESTION_FALLBACK =
  "I don’t have confirmed onboarding or work-arrangement details in this demo. A human recruiter would need to confirm that, so I’ll include your question in this session’s review." as const;

type DashboardClientToolParameter = Readonly<{
  description: string;
  enumValues?: readonly string[];
  maximumCharacters?: number;
  minimumCharacters?: number;
  required: true;
  type: "string";
}>;

type DashboardClientToolDefinition = Readonly<{
  description: string;
  dynamicVariableAssignments: false;
  parameters: Readonly<Record<string, DashboardClientToolParameter>>;
  responseMock: false;
  waitForResponse: true;
}>;

export function isUndecidedRoleValue(value: string): boolean {
  return value.trim().toLocaleLowerCase() === "undecided";
}

const normalizedToolTextSchema = (maximumCharacters: number) =>
  z.string().trim().normalize("NFC").min(1).max(maximumCharacters);

export const recordInsightArgumentsSchema = z
  .strictObject({
    category: z.enum(RECORDABLE_INSIGHT_CATEGORIES),
    label: normalizedToolTextSchema(120),
    value: normalizedToolTextSchema(600),
    source: z.enum(INSIGHT_SOURCES),
  })
  .superRefine((arguments_, context) => {
    if (
      (arguments_.category === "preferred_name" ||
        arguments_.category === "role_preference") &&
      Array.from(arguments_.value).length > 120
    ) {
      context.addIssue({
        code: "custom",
        message: "Name and role values cannot exceed 120 characters.",
        path: ["value"],
      });
    }
  });

export const correctInsightArgumentsSchema = z.strictObject({
  cardId: normalizedToolTextSchema(64),
  value: normalizedToolTextSchema(600),
  reason: normalizedToolTextSchema(500),
});

export const markTopicArgumentsSchema = z.strictObject({
  topicKey: z.enum(UNIVERSAL_TOPIC_KEYS),
  status: z.enum(CLIENT_TOOL_TOPIC_STATUSES),
});

export const recordCandidateQuestionArgumentsSchema = z.strictObject({
  question: normalizedToolTextSchema(600),
});

export const requestFollowupArgumentsSchema = z.strictObject({
  reason: normalizedToolTextSchema(500),
});

export const voiceClientToolArgumentsSchemas = Object.freeze({
  recordInsight: recordInsightArgumentsSchema,
  correctInsight: correctInsightArgumentsSchema,
  markTopic: markTopicArgumentsSchema,
  recordCandidateQuestion: recordCandidateQuestionArgumentsSchema,
  requestFollowup: requestFollowupArgumentsSchema,
} satisfies Readonly<Record<VoiceClientToolName, z.ZodType>>);

export const VOICE_CLIENT_TOOL_DASHBOARD_DEFINITIONS = Object.freeze({
  recordInsight: {
    description:
      "Create or confirm one local insight from explicit evidence in the latest eligible final candidate answer. Use Candidate in conversation-first and CV + Candidate only to confirm existing CV evidence. Never send a transcript ID.",
    dynamicVariableAssignments: false,
    parameters: {
      category: {
        description:
          "Insight category supported by the latest final candidate answer.",
        enumValues: RECORDABLE_INSIGHT_CATEGORIES,
        required: true,
        type: "string",
      },
      label: {
        description: "Short neutral display label, from 1 to 120 characters.",
        maximumCharacters: 120,
        minimumCharacters: 1,
        required: true,
        type: "string",
      },
      value: {
        description:
          'Explicit candidate fact or safe paraphrase, from 1 to 600 characters. preferred_name and role_preference are limited to 120 characters; use exactly "Undecided" only when the candidate explicitly remains undecided.',
        maximumCharacters: 600,
        minimumCharacters: 1,
        required: true,
        type: "string",
      },
      source: {
        description:
          "Evidence provenance. conversation-first requires Candidate. Use CV + Candidate only to confirm existing CV evidence; never create live CV-only evidence.",
        enumValues: INSIGHT_SOURCES,
        required: true,
        type: "string",
      },
    },
    responseMock: false,
    waitForResponse: true,
  },
  correctInsight: {
    description:
      "Replace an existing local insight only when the latest eligible final candidate answer explicitly corrects it. Use the existing browser-provided cardId and do not duplicate the change with recordInsight.",
    dynamicVariableAssignments: false,
    parameters: {
      cardId: {
        description:
          "Existing local insight-card identifier, from 1 to 64 characters. This is not a transcript-turn identifier.",
        maximumCharacters: 64,
        minimumCharacters: 1,
        required: true,
        type: "string",
      },
      value: {
        description:
          "Corrected neutral fact, from 1 to 600 characters. A preferred name or role preference remains limited to 120 characters.",
        maximumCharacters: 600,
        minimumCharacters: 1,
        required: true,
        type: "string",
      },
      reason: {
        description:
          "Neutral evidence-based correction reason, from 1 to 500 characters; never include a hiring judgment.",
        maximumCharacters: 500,
        minimumCharacters: 1,
        required: true,
        type: "string",
      },
    },
    responseMock: false,
    waitForResponse: true,
  },
  markTopic: {
    description:
      "Update one universal screening topic only after the latest eligible final candidate answer covers it, declines it, or genuinely leaves it needing clarification. Never infer coverage from silence.",
    dynamicVariableAssignments: false,
    parameters: {
      topicKey: {
        description: "Universal HR topic whose local progress should change.",
        enumValues: UNIVERSAL_TOPIC_KEYS,
        required: true,
        type: "string",
      },
      status: {
        description:
          "Evidence-supported topic state: in progress, covered, skipped after an explicit decline, or needing clarification.",
        enumValues: CLIENT_TOOL_TOPIC_STATUSES,
        required: true,
        type: "string",
      },
    },
    responseMock: false,
    waitForResponse: true,
  },
  recordCandidateQuestion: {
    description:
      "Record the actual latest eligible final candidate question as local evidence. Preserve the candidate's wording, use only when the candidate actually asked the question, and pair unsupported employer or vacancy questions with requestFollowup for the same final turn.",
    dynamicVariableAssignments: false,
    parameters: {
      question: {
        description:
          "Actual latest final candidate question in the candidate's wording, from 1 to 600 characters.",
        maximumCharacters: 600,
        minimumCharacters: 1,
        required: true,
        type: "string",
      },
    },
    responseMock: false,
    waitForResponse: true,
  },
  requestFollowup: {
    description:
      "Create a local human-follow-up item for a real unresolved contradiction, missing logistical fact, safety concern, or unsupported employer or vacancy question. For an unsupported candidate question, call this with recordCandidateQuestion against the same latest final turn. Do not use it for routine gaps or hiring judgments.",
    dynamicVariableAssignments: false,
    parameters: {
      reason: {
        description:
          "Neutral evidence-based reason for human follow-up, from 1 to 500 characters.",
        maximumCharacters: 500,
        minimumCharacters: 1,
        required: true,
        type: "string",
      },
    },
    responseMock: false,
    waitForResponse: true,
  },
} satisfies Readonly<
  Record<VoiceClientToolName, DashboardClientToolDefinition>
>);

export type RecordInsightArguments = z.infer<
  typeof recordInsightArgumentsSchema
>;
export type CorrectInsightArguments = z.infer<
  typeof correctInsightArgumentsSchema
>;
export type MarkTopicArguments = z.infer<typeof markTopicArgumentsSchema>;
export type RecordCandidateQuestionArguments = z.infer<
  typeof recordCandidateQuestionArgumentsSchema
>;
export type RequestFollowupArguments = z.infer<
  typeof requestFollowupArgumentsSchema
>;
