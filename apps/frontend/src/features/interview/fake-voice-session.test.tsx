import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { InsightClientTools } from "@/features/insights/insight-client-tools";
import { createConversationFirstPlanFixture } from "@/test/conversation-first-plan.fixture";

import {
  createFakeVoiceToolTrace,
  FAKE_AGENT_DISCONNECT_AFTER_MS,
  FakeVoiceSession,
} from "./fake-voice-session";
import { createVoiceSessionContext } from "./voice-session-context";
import type { VoiceSessionEvent } from "./voice-session-bridge";

const DEMO_CONTEXT = {
  kind: "role_agnostic_first_stage_hr_screen",
  roleAvailability: "candidate_selected_synthetic_session_vacancy",
  employerFactsAvailable: false,
} as const;

describe("FakeVoiceSession", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("disconnects as the agent only after every final trace and client tool", async () => {
    vi.useFakeTimers();
    const timeline: string[] = [];
    const tool = (name: string) => (parameters: Record<string, unknown>) => {
      timeline.push(`tool:${name}:${JSON.stringify(parameters)}`);
      return "Applied";
    };
    const clientTools: InsightClientTools = {
      correctInsight: tool("correctInsight"),
      markTopic: tool("markTopic"),
      recordCandidateQuestion: tool("recordCandidateQuestion"),
      recordInsight: tool("recordInsight"),
      requestFollowup: tool("requestFollowup"),
    };
    const events: VoiceSessionEvent[] = [];
    const onEvent = vi.fn((event: VoiceSessionEvent) => {
      events.push(event);
      timeline.push(
        event.type === "message"
          ? `event:message:${String(event.eventId)}:${event.stability}`
          : event.type === "disconnected"
            ? `event:disconnected:${event.reason}`
            : `event:${event.type}`,
      );
    });

    render(
      <FakeVoiceSession
        authorization={{
          conversationId: "fake-conversation-complete",
          conversationToken: "fake-token",
        }}
        clientTools={clientTools}
        dynamicVariables={createVoiceSessionContext({
          demoContext: DEMO_CONTEXT,
          entryMode: "conversation_first",
          insights: [],
          plan: createConversationFirstPlanFixture(),
          remainingSeconds: 480,
          topicProgress: [],
        })}
        endRequested={false}
        expectedConversationId="fake-conversation-complete"
        isMuted={false}
        onAuthorizationConsumed={vi.fn()}
        onEvent={onEvent}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAKE_AGENT_DISCONNECT_AFTER_MS);
    });

    expect(
      events.filter(
        (event) => event.type === "message" && event.stability === "final",
      ),
    ).toHaveLength(15);
    expect(timeline.filter((entry) => entry.startsWith("tool:"))).toHaveLength(
      createFakeVoiceToolTrace("conversation_first").length,
    );
    const disconnectIndex = timeline.indexOf("event:disconnected:agent");
    expect(disconnectIndex).toBeGreaterThan(
      timeline.lastIndexOf("event:message:14:final"),
    );
    expect(disconnectIndex).toBeGreaterThan(
      timeline.findLastIndex((entry) => entry.startsWith("tool:")),
    );
    expect(events.at(-2)).toEqual({
      type: "connection_status",
      status: "disconnecting",
    });
    expect(events.at(-1)).toEqual({
      type: "disconnected",
      reason: "agent",
    });
    expect(
      events.filter(
        (event) =>
          event.type === "message" &&
          event.stability === "final" &&
          event.speaker === "candidate" &&
          event.text === "No, I do not have any other questions.",
      ),
    ).toHaveLength(1);
    expect(
      events.filter(
        (event) =>
          event.type === "message" &&
          event.stability === "final" &&
          event.speaker === "interviewer" &&
          event.text.includes("organize this conversation"),
      ),
    ).toHaveLength(1);
  });
});
