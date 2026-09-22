"use client";

import { useCallback, useEffect, useRef } from "react";

import type { SummarizeInterviewResponse } from "@screenpilot/contracts/api/interview-summary";
import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";
import type { InsightCard } from "@screenpilot/contracts/interview/insight-card";
import type { ScreeningPlan } from "@screenpilot/contracts/interview/screening-plan";
import type { TopicProgress } from "@screenpilot/contracts/interview/topic-progress";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";

import { ManagedTurnstileGate } from "@/features/abuse-protection/managed-turnstile-gate";
import {
  TURNSTILE_ACTIONS,
  type ExecuteTurnstileChallenge,
} from "@/features/abuse-protection/turnstile-client";
import type { SessionFailure } from "@/features/session/demo-session.types";
import {
  isAbortError,
  ScreenPilotApiError,
  summarizeInterview,
} from "@/shared/api/screenpilot-api";

export type SummaryRequester = typeof summarizeInterview;

type InterviewSummaryPreparationProps = Readonly<{
  active: boolean;
  entryMode: EntryMode;
  executeChallenge?: ExecuteTurnstileChallenge | undefined;
  insights: readonly InsightCard[];
  interviewGrant: string;
  onFailure: (failure: SessionFailure) => void;
  onPendingChange?: ((pending: boolean) => void) | undefined;
  onSummarySucceeded: (response: SummarizeInterviewResponse) => void;
  plan: ScreeningPlan;
  siteKey: string;
  summarize?: SummaryRequester | undefined;
  topicProgress: readonly TopicProgress[];
  transcript: readonly TranscriptTurn[];
}>;

function summaryFailure(error: unknown): SessionFailure {
  if (error instanceof ScreenPilotApiError) {
    return {
      stage: "summarizing",
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    };
  }
  return {
    stage: "summarizing",
    code: "SUMMARY_UNREACHABLE",
    message:
      "ScreenPilot could not organize the conversation. Your local evidence is still available.",
    retryable: true,
  };
}

export function InterviewSummaryPreparation({
  active,
  entryMode,
  executeChallenge,
  insights,
  interviewGrant,
  onFailure,
  onPendingChange,
  onSummarySucceeded,
  plan,
  siteKey,
  summarize = summarizeInterview,
  topicProgress,
  transcript,
}: InterviewSummaryPreparationProps) {
  const summaryAbortRef = useRef<AbortController | null>(null);
  const summaryRequestStartedRef = useRef(false);

  useEffect(
    () => () => {
      summaryAbortRef.current?.abort();
      summaryAbortRef.current = null;
      onPendingChange?.(false);
    },
    [onPendingChange],
  );

  const handleVerified = useCallback(
    (turnstileToken: string) => {
      if (!active || summaryRequestStartedRef.current) {
        return;
      }
      summaryRequestStartedRef.current = true;
      onPendingChange?.(true);
      const controller = new AbortController();
      summaryAbortRef.current?.abort();
      summaryAbortRef.current = controller;
      void summarize(
        {
          entryMode,
          insights: [...insights],
          interviewGrant,
          plan,
          topicProgress: [...topicProgress],
          transcript: [...transcript],
          turnstileToken,
        },
        controller.signal,
      )
        .then((response) => {
          if (!controller.signal.aborted) {
            onPendingChange?.(false);
            onSummarySucceeded(response);
          }
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || isAbortError(error)) {
            return;
          }
          summaryRequestStartedRef.current = false;
          onPendingChange?.(false);
          onFailure(summaryFailure(error));
        });
    },
    [
      active,
      entryMode,
      insights,
      interviewGrant,
      onFailure,
      onPendingChange,
      onSummarySucceeded,
      plan,
      summarize,
      topicProgress,
      transcript,
    ],
  );

  if (!active) {
    return null;
  }

  return (
    <ManagedTurnstileGate
      action={TURNSTILE_ACTIONS.interviewSummary}
      {...(executeChallenge ? { executeChallenge } : {})}
      onFailure={(challengeFailure) => {
        summaryRequestStartedRef.current = false;
        onPendingChange?.(false);
        onFailure({ stage: "summarizing", ...challengeFailure });
      }}
      onVerified={handleVerified}
      siteKey={siteKey}
    />
  );
}
