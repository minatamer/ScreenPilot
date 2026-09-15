"use client";

import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";
import type { InsightCard } from "@screenpilot/contracts/interview/insight-card";
import type { TopicProgress } from "@screenpilot/contracts/interview/topic-progress";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";
import { useCallback, useEffect, useRef, useState } from "react";

import type { VoicePerformanceTracker } from "@/features/interview/voice-performance";
import {
  createInsightClientTools,
  type InsightClientTools,
  type InsightToolSnapshot,
} from "./insight-client-tools";

const APPEARING_CARD_DURATION_MS = 420;

type UseInsightClientToolsOptions = Readonly<{
  entryMode: EntryMode;
  insights: readonly InsightCard[];
  onFinalTranscriptTurn: (turn: TranscriptTurn) => void;
  onInsight: (insight: InsightCard) => void;
  onTopicProgress: (progress: TopicProgress) => void;
  performanceTracker?: VoicePerformanceTracker | undefined;
  topicProgress: readonly TopicProgress[];
  transcript: readonly TranscriptTurn[];
}>;

type InsightToolController = Readonly<{
  clientTools: InsightClientTools;
  dispose: () => void;
  onFinalTranscriptTurn: (turn: TranscriptTurn) => void;
  reconcile: (options: UseInsightClientToolsOptions) => void;
}>;

function upsertById<T extends Readonly<{ id: string }>>(
  values: readonly T[],
  incoming: T,
): readonly T[] {
  const existingIndex = values.findIndex((value) => value.id === incoming.id);
  if (existingIndex < 0) {
    return [...values, incoming];
  }
  return values.map((value, index) =>
    index === existingIndex ? incoming : value,
  );
}

function mergeById<T extends Readonly<{ id: string }>>(
  optimisticValues: readonly T[],
  reducerValues: readonly T[],
): readonly T[] {
  return reducerValues.reduce<readonly T[]>(
    (values, value) => upsertById(values, value),
    optimisticValues,
  );
}

function upsertTopicProgress(
  values: readonly TopicProgress[],
  incoming: TopicProgress,
): readonly TopicProgress[] {
  const existingIndex = values.findIndex(
    (value) => value.topicKey === incoming.topicKey,
  );
  if (existingIndex < 0) {
    return [...values, incoming];
  }
  return values.map((value, index) =>
    index === existingIndex ? incoming : value,
  );
}

function createInsightToolController(
  initialOptions: UseInsightClientToolsOptions,
): InsightToolController {
  let callbacks = {
    onFinalTranscriptTurn: initialOptions.onFinalTranscriptTurn,
    onInsight: initialOptions.onInsight,
    onTopicProgress: initialOptions.onTopicProgress,
  };
  let snapshot: InsightToolSnapshot = {
    entryMode: initialOptions.entryMode,
    insights: initialOptions.insights,
    topicProgress: initialOptions.topicProgress,
    transcript: initialOptions.transcript,
  };
  const appearanceTimers = new Map<string, number>();

  const publishInsight = (insight: InsightCard) => {
    snapshot = {
      ...snapshot,
      insights: upsertById(snapshot.insights, insight),
    };
    callbacks.onInsight(insight);

    const pendingTimer = appearanceTimers.get(insight.id);
    if (pendingTimer !== undefined) {
      window.clearTimeout(pendingTimer);
      appearanceTimers.delete(insight.id);
    }
    if (insight.status !== "appearing") {
      return;
    }
    const timerId = window.setTimeout(() => {
      appearanceTimers.delete(insight.id);
      const currentInsight = snapshot.insights.find(
        (candidate) => candidate.id === insight.id,
      );
      if (
        currentInsight?.status !== "appearing" ||
        currentInsight.updatedAt !== insight.updatedAt
      ) {
        return;
      }
      const confirmedInsight: InsightCard = {
        ...currentInsight,
        status: "confirmed",
        updatedAt: new Date().toISOString(),
      };
      snapshot = {
        ...snapshot,
        insights: upsertById(snapshot.insights, confirmedInsight),
      };
      callbacks.onInsight(confirmedInsight);
    }, APPEARING_CARD_DURATION_MS);
    appearanceTimers.set(insight.id, timerId);
  };

  const unmeasuredClientTools = createInsightClientTools({
    getSnapshot: () => snapshot,
    onInsight: publishInsight,
    onTopicProgress: (progress) => {
      snapshot = {
        ...snapshot,
        topicProgress: upsertTopicProgress(snapshot.topicProgress, progress),
      };
      callbacks.onTopicProgress(progress);
    },
  });
  const measureCardTool = (
    tool: InsightClientTools[keyof InsightClientTools],
  ): InsightClientTools[keyof InsightClientTools] => {
    if (!initialOptions.performanceTracker) {
      return tool;
    }
    return (parameters) => {
      const measurementId = initialOptions.performanceTracker?.begin(
        "client_tool_to_card",
      );
      const retainOnlyWhenApplied = (result: string) => {
        if (!result.startsWith("Applied:") && measurementId) {
          initialOptions.performanceTracker?.cancel(measurementId);
        }
        return result;
      };
      try {
        const result = tool(parameters);
        if (typeof result === "string") {
          return retainOnlyWhenApplied(result);
        }
        return result.then(retainOnlyWhenApplied, (error: unknown) => {
          if (measurementId) {
            initialOptions.performanceTracker?.cancel(measurementId);
          }
          throw error;
        });
      } catch (error) {
        if (measurementId) {
          initialOptions.performanceTracker?.cancel(measurementId);
        }
        throw error;
      }
    };
  };
  const clientTools: InsightClientTools = Object.freeze({
    recordInsight: measureCardTool(unmeasuredClientTools.recordInsight),
    correctInsight: measureCardTool(unmeasuredClientTools.correctInsight),
    markTopic: unmeasuredClientTools.markTopic,
    recordCandidateQuestion: measureCardTool(
      unmeasuredClientTools.recordCandidateQuestion,
    ),
    requestFollowup: measureCardTool(unmeasuredClientTools.requestFollowup),
  });

  return {
    clientTools,
    dispose: () => {
      for (const timerId of appearanceTimers.values()) {
        window.clearTimeout(timerId);
      }
      appearanceTimers.clear();
    },
    onFinalTranscriptTurn: (turn) => {
      if (
        !snapshot.transcript.some(
          (existingTurn) =>
            existingTurn.id === turn.id ||
            (existingTurn.speaker === turn.speaker &&
              existingTurn.sequence === turn.sequence),
        )
      ) {
        snapshot = {
          ...snapshot,
          transcript: [...snapshot.transcript, turn].sort(
            (left, right) => left.sequence - right.sequence,
          ),
        };
      }
      callbacks.onFinalTranscriptTurn(turn);
    },
    reconcile: (options) => {
      callbacks = {
        onFinalTranscriptTurn: options.onFinalTranscriptTurn,
        onInsight: options.onInsight,
        onTopicProgress: options.onTopicProgress,
      };
      snapshot = {
        entryMode: options.entryMode,
        insights: mergeById(snapshot.insights, options.insights),
        topicProgress: options.topicProgress.reduce<readonly TopicProgress[]>(
          (values, progress) => upsertTopicProgress(values, progress),
          snapshot.topicProgress,
        ),
        transcript: mergeById(snapshot.transcript, options.transcript),
      };
    },
  };
}

export function useInsightClientTools(options: UseInsightClientToolsOptions) {
  const [controller] = useState(() => createInsightToolController(options));
  const renderedInsightVersionsRef = useRef(
    new Map(
      options.insights.map((insight) => [
        insight.id,
        `${insight.updatedAt}:${insight.status}`,
      ]),
    ),
  );

  useEffect(() => {
    controller.reconcile(options);
  }, [controller, options]);

  useEffect(() => {
    const nextVersions = new Map(
      options.insights.map((insight) => [
        insight.id,
        `${insight.updatedAt}:${insight.status}`,
      ]),
    );
    let renderedCardCount = 0;
    for (const [insightId, version] of nextVersions) {
      if (renderedInsightVersionsRef.current.get(insightId) !== version) {
        renderedCardCount += 1;
      }
    }
    renderedInsightVersionsRef.current = nextVersions;
    for (let index = 0; index < renderedCardCount; index += 1) {
      options.performanceTracker?.completeOldest("client_tool_to_card");
    }
  }, [options.insights, options.performanceTracker]);

  useEffect(() => {
    return () => {
      controller.dispose();
    };
  }, [controller]);

  const onFinalTranscriptTurn = useCallback(
    (turn: TranscriptTurn) => {
      controller.onFinalTranscriptTurn(turn);
    },
    [controller],
  );

  return {
    clientTools: controller.clientTools,
    onFinalTranscriptTurn,
  } as const;
}
