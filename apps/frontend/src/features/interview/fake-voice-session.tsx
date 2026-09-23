"use client";

import type { VoiceClientToolName } from "@screenpilot/contracts/api/voice-token";
import { UNSUPPORTED_EMPLOYER_QUESTION_FALLBACK } from "@screenpilot/contracts/interview/client-tools";
import { useEffect, useRef } from "react";

import { INSIGHT_CATEGORY_METADATA } from "@/features/insights/insight-category-metadata";

import type {
  VoiceSessionBridgeProps,
  VoiceSessionEvent,
} from "./voice-session-bridge";
import {
  classifyVoiceProviderFailure,
  VOICE_SESSION_IDENTITY_FAILURE,
} from "./voice-provider-failure";

type FakeVoiceEventTraceEntry = Readonly<{
  afterMs: number;
  event: VoiceSessionEvent;
}>;

type FakeVoiceToolTraceEntry = Readonly<{
  afterMs: number;
  name: VoiceClientToolName;
  parameters: Record<string, unknown>;
}>;

export const FAKE_AGENT_DISCONNECT_AFTER_MS = 8_650;

const fakeFinalTurn = (
  afterMs: number,
  eventId: number,
  speaker: "candidate" | "interviewer",
  text: string,
): readonly FakeVoiceEventTraceEntry[] => {
  const isCandidate = speaker === "candidate";
  return [
    {
      afterMs: afterMs - 160,
      event: isCandidate
        ? { type: "mode", mode: "listening" }
        : { type: "mode", mode: "speaking" },
    },
    ...(isCandidate
      ? [
          {
            afterMs: afterMs - 120,
            event: {
              type: "candidate_speech_activity",
              active: true,
            } as const,
          },
        ]
      : [
          {
            afterMs: afterMs - 120,
            event: { type: "agent_audio_started" } as const,
          },
        ]),
    {
      afterMs,
      event: {
        type: "message",
        eventId,
        speaker,
        stability: "final",
        text,
      },
    },
    ...(isCandidate
      ? [
          {
            afterMs: afterMs + 30,
            event: {
              type: "candidate_speech_activity",
              active: false,
            } as const,
          },
        ]
      : []),
  ];
};

export const FAKE_VOICE_EVENT_TRACE: readonly FakeVoiceEventTraceEntry[] = [
  {
    afterMs: 80,
    event: { type: "mode", mode: "speaking" },
  },
  {
    afterMs: 100,
    event: { type: "agent_audio_started" },
  },
  {
    afterMs: 180,
    event: {
      type: "message",
      eventId: 0,
      speaker: "interviewer",
      stability: "tentative",
      text: "Hi. What would you like me to call you?",
    },
  },
  {
    afterMs: 420,
    event: {
      type: "message",
      eventId: 0,
      speaker: "interviewer",
      stability: "tentative",
      text: "Hi. What would you like me to call you, and which role should this synthetic session use?",
    },
  },
  ...fakeFinalTurn(
    650,
    0,
    "interviewer",
    "Hi. What would you like me to call you, and which role should this synthetic session use?",
  ),
  {
    afterMs: 960,
    event: {
      type: "message",
      eventId: 1,
      speaker: "candidate",
      stability: "tentative",
      text: "Riley is fine. Please use Junior Software Developer",
    },
  },
  ...fakeFinalTurn(
    1_200,
    1,
    "candidate",
    "Riley is fine. Please use Junior Software Developer for this session.",
  ),
  ...fakeFinalTurn(
    1_750,
    2,
    "interviewer",
    "What context and experience would you like to highlight?",
  ),
  ...fakeFinalTurn(
    2_300,
    3,
    "candidate",
    "I am an early-career developer. My six-month product internship focused on accessible workflow screens, and I also built a scheduling project with a browser interface and small server-side service.",
  ),
  ...fakeFinalTurn(
    2_850,
    4,
    "interviewer",
    "What kind of team and working rhythm helps you do your best work?",
  ),
  ...fakeFinalTurn(
    3_400,
    5,
    "candidate",
    "I value collaborative code review, clear handoffs, and protected focus time for implementation.",
  ),
  ...fakeFinalTurn(
    3_950,
    6,
    "interviewer",
    "What should a recruiter know about your availability and work-arrangement preference?",
  ),
  ...fakeFinalTurn(
    4_500,
    7,
    "candidate",
    "I could start in four weeks. I am open to remote or hybrid work, with the location details still to discuss.",
  ),
  ...fakeFinalTurn(
    5_050,
    8,
    "interviewer",
    "How do you use English in your work, and how would you like to handle compensation?",
  ),
  ...fakeFinalTurn(
    5_600,
    9,
    "candidate",
    "I use English for project notes and distributed collaboration. I am open to discussing compensation with a recruiter. What onboarding and work-arrangement details can a recruiter share?",
  ),
  ...fakeFinalTurn(
    6_150,
    10,
    "interviewer",
    `${UNSUPPORTED_EMPLOYER_QUESTION_FALLBACK} What matters most in your next role?`,
  ),
  ...fakeFinalTurn(
    6_700,
    11,
    "candidate",
    "Structured onboarding, mentorship, and room to grow matter most.",
  ),
  ...fakeFinalTurn(
    7_250,
    12,
    "interviewer",
    "Do you have any final questions or anything else you would like to add?",
  ),
  ...fakeFinalTurn(
    7_750,
    13,
    "candidate",
    "No, I do not have any other questions.",
  ),
  ...fakeFinalTurn(
    8_450,
    14,
    "interviewer",
    "Thanks, Riley. I have enough context to organize this conversation for your review.",
  ),
];

const FAKE_RELEVANT_EXPERIENCE_VALUE =
  "Six-month product internship supporting accessible workflow screens";

export function createFakeVoiceToolTrace(
  entryMode: "conversation_first" | "cv_assisted",
): readonly FakeVoiceToolTraceEntry[] {
  const relevantExperienceTool: FakeVoiceToolTraceEntry =
    entryMode === "cv_assisted"
      ? {
          afterMs: 2_420,
          name: "correctInsight",
          parameters: {
            cardId: "insight-relevant_experience",
            value: FAKE_RELEVANT_EXPERIENCE_VALUE,
            reason:
              "The candidate confirmed the internship focus in conversation.",
          },
        }
      : {
          afterMs: 2_420,
          name: "recordInsight",
          parameters: {
            category: "relevant_experience",
            label: INSIGHT_CATEGORY_METADATA.relevant_experience.label,
            value: FAKE_RELEVANT_EXPERIENCE_VALUE,
            source: "Candidate",
          },
        };

  return [
    {
      afterMs: 1_260,
      name: "recordInsight",
      parameters: {
        category: "role_preference",
        label: INSIGHT_CATEGORY_METADATA.role_preference.label,
        value: "Junior Software Developer",
        source: "Candidate",
      },
    },
    {
      afterMs: 1_320,
      name: "markTopic",
      parameters: {
        topicKey: "preferred_name",
        status: "covered",
      },
    },
    {
      afterMs: 1_380,
      name: "markTopic",
      parameters: {
        topicKey: "role_preference",
        status: "covered",
      },
    },
    {
      afterMs: 2_360,
      name: "recordInsight",
      parameters: {
        category: "current_context",
        label: INSIGHT_CATEGORY_METADATA.current_context.label,
        value:
          "Early-career developer with product internship and project experience",
        source: "Candidate",
      },
    },
    relevantExperienceTool,
    {
      afterMs: 2_480,
      name: "markTopic",
      parameters: {
        topicKey: "current_context",
        status: "covered",
      },
    },
    {
      afterMs: 2_540,
      name: "markTopic",
      parameters: {
        topicKey: "relevant_experience_summary",
        status: "covered",
      },
    },
    {
      afterMs: 3_460,
      name: "recordInsight",
      parameters: {
        category: "team_work_style",
        label: INSIGHT_CATEGORY_METADATA.team_work_style.label,
        value: "Collaborative code review with protected focus time",
        source: "Candidate",
      },
    },
    {
      afterMs: 3_520,
      name: "markTopic",
      parameters: {
        topicKey: "team_work_style",
        status: "covered",
      },
    },
    {
      afterMs: 4_560,
      name: "recordInsight",
      parameters: {
        category: "availability",
        label: INSIGHT_CATEGORY_METADATA.availability.label,
        value: "Available to start in four weeks",
        source: "Candidate",
      },
    },
    {
      afterMs: 4_620,
      name: "recordInsight",
      parameters: {
        category: "location_work_arrangement",
        label: INSIGHT_CATEGORY_METADATA.location_work_arrangement.label,
        value: "Open to remote or hybrid work; location to discuss",
        source: "Candidate",
      },
    },
    {
      afterMs: 4_680,
      name: "markTopic",
      parameters: {
        topicKey: "availability",
        status: "covered",
      },
    },
    {
      afterMs: 4_740,
      name: "markTopic",
      parameters: {
        topicKey: "location_work_arrangement",
        status: "covered",
      },
    },
    {
      afterMs: 5_660,
      name: "recordInsight",
      parameters: {
        category: "compensation",
        label: INSIGHT_CATEGORY_METADATA.compensation.label,
        value: "Open to discussing compensation with a recruiter",
        source: "Candidate",
      },
    },
    {
      afterMs: 5_720,
      name: "recordInsight",
      parameters: {
        category: "english_use",
        label: INSIGHT_CATEGORY_METADATA.english_use.label,
        value: "Uses English for project notes and distributed collaboration",
        source: "Candidate",
      },
    },
    {
      afterMs: 5_780,
      name: "markTopic",
      parameters: {
        topicKey: "compensation_expectation",
        status: "covered",
      },
    },
    {
      afterMs: 5_840,
      name: "markTopic",
      parameters: {
        topicKey: "english_use_context",
        status: "covered",
      },
    },
    {
      afterMs: 5_900,
      name: "recordCandidateQuestion",
      parameters: {
        question:
          "What onboarding and work-arrangement details can a recruiter share?",
      },
    },
    {
      afterMs: 5_960,
      name: "requestFollowup",
      parameters: {
        reason:
          "A human recruiter must confirm the unsupported onboarding and work-arrangement details.",
      },
    },
    {
      afterMs: 6_020,
      name: "markTopic",
      parameters: {
        topicKey: "candidate_questions",
        status: "covered",
      },
    },
    {
      afterMs: 6_080,
      name: "markTopic",
      parameters: {
        topicKey: "clarifications_and_followups",
        status: "needs_clarification",
      },
    },
    {
      afterMs: 6_760,
      name: "recordInsight",
      parameters: {
        category: "motivation",
        label: INSIGHT_CATEGORY_METADATA.motivation.label,
        value: "Structured onboarding, mentorship, and room to grow",
        source: "Candidate",
      },
    },
    {
      afterMs: 6_940,
      name: "markTopic",
      parameters: {
        topicKey: "motivation_and_next_role",
        status: "covered",
      },
    },
  ];
}

export function FakeVoiceSession({
  authorization,
  clientTools,
  dynamicVariables,
  endRequested,
  expectedConversationId,
  onAuthorizationConsumed,
  onEvent,
}: VoiceSessionBridgeProps) {
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const traceTimerIdsRef = useRef<number[]>([]);
  const initialSessionRef = useRef({
    authorization,
    clientTools,
    dynamicVariables,
    expectedConversationId,
    onAuthorizationConsumed,
    onEvent,
  });

  useEffect(() => {
    const initialSession = initialSessionRef.current;
    const startTimer = window.setTimeout(() => {
      if (startedRef.current || !initialSession.authorization) {
        return;
      }
      startedRef.current = true;
      initialSession.onAuthorizationConsumed();
      if (
        initialSession.expectedConversationId === undefined ||
        initialSession.authorization.conversationId !==
          initialSession.expectedConversationId
      ) {
        initialSession.onEvent({
          type: "error",
          failure: VOICE_SESSION_IDENTITY_FAILURE,
        });
        return;
      }
      initialSession.onEvent({
        type: "connected",
        conversationId: initialSession.expectedConversationId,
      });
      const fakeToolTrace = createFakeVoiceToolTrace(
        initialSession.dynamicVariables.screenpilot_entry_mode === "cv_assisted"
          ? "cv_assisted"
          : "conversation_first",
      );
      for (const traceEntry of FAKE_VOICE_EVENT_TRACE) {
        const traceTimerId = window.setTimeout(() => {
          if (!endedRef.current) {
            initialSession.onEvent(traceEntry.event);
          }
        }, traceEntry.afterMs);
        traceTimerIdsRef.current.push(traceTimerId);
      }
      for (const toolEntry of fakeToolTrace) {
        const toolTimerId = window.setTimeout(() => {
          if (endedRef.current) {
            return;
          }
          const clientTool = initialSession.clientTools[toolEntry.name];
          if (!clientTool) {
            initialSession.onEvent({
              type: "error",
              failure: classifyVoiceProviderFailure(),
            });
            return;
          }
          try {
            void Promise.resolve(clientTool(toolEntry.parameters)).catch(() => {
              initialSession.onEvent({
                type: "error",
                failure: classifyVoiceProviderFailure(),
              });
            });
          } catch {
            initialSession.onEvent({
              type: "error",
              failure: classifyVoiceProviderFailure(),
            });
          }
        }, toolEntry.afterMs);
        traceTimerIdsRef.current.push(toolTimerId);
      }
      const disconnectTimerId = window.setTimeout(() => {
        if (endedRef.current) {
          return;
        }
        endedRef.current = true;
        initialSession.onEvent({
          type: "connection_status",
          status: "disconnecting",
        });
        initialSession.onEvent({ type: "disconnected", reason: "agent" });
      }, FAKE_AGENT_DISCONNECT_AFTER_MS);
      traceTimerIdsRef.current.push(disconnectTimerId);
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      for (const traceTimerId of traceTimerIdsRef.current) {
        window.clearTimeout(traceTimerId);
      }
      traceTimerIdsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!endRequested || endedRef.current || !startedRef.current) {
      return;
    }
    endedRef.current = true;
    onEvent({ type: "connection_status", status: "disconnecting" });
    onEvent({ type: "disconnected", reason: "user" });
  }, [endRequested, onEvent]);

  return null;
}
