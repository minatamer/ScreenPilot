import { act, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createCvAnalysisResponseFixture,
  TEST_PUBLIC_RUNTIME_CONFIG,
} from "@/test/cv-analysis.fixture";
import { createConversationFirstPlanFixture } from "@/test/conversation-first-plan.fixture";

import { DemoSessionProvider } from "./demo-session-provider";
import { persistedDemoSessionSchema } from "./persisted-session.schema";
import { SESSION_STORAGE_KEY } from "./session-storage";
import { useDemoSession } from "./use-demo-session";

function SessionProbe() {
  const { state } = useDemoSession();
  return (
    <output>
      {state.hydrationStatus}:{state.stage}:{state.restoreNotice ?? "none"}
    </output>
  );
}

function CompletionProbe() {
  const { completeInterview, dispatch, state } = useDemoSession();
  return (
    <>
      <output>{state.stage}</output>
      <button
        onClick={() => {
          dispatch({ type: "PREFLIGHT_READY" });
          dispatch({ type: "VOICE_CONNECTING" });
          dispatch({
            type: "VOICE_CONNECTED",
            voice: {
              conversationId: "fake-conversation-1",
              status: "connected",
              startedAt: "2026-09-09T09:05:00.000Z",
            },
          });
          dispatch({ type: "VOICE_ENDING" });
          completeInterview();
        }}
        type="button"
      >
        Complete interview
      </button>
    </>
  );
}

describe("DemoSessionProvider client lifecycle", () => {
  afterEach(() => {
    vi.useRealTimers();
    window.sessionStorage.clear();
  });

  it("restores only once when React checks effects twice in Strict Mode", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T10:00:00.000Z"));
    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify(
        persistedDemoSessionSchema.parse({
          schemaVersion: 3,
          stage: "choosing_entry_mode",
          entryMode: null,
          createdAt: "2026-09-09T09:00:00.000Z",
          expiresAt: "2026-09-09T11:00:00.000Z",
          runtimeConfig: TEST_PUBLIC_RUNTIME_CONFIG,
          demoContext: {
            kind: "role_agnostic_first_stage_hr_screen",
            roleAvailability: "candidate_selected_synthetic_session_vacancy",
            employerFactsAvailable: false,
          },
          transcript: [],
          insights: [],
          topicProgress: [],
        }),
      ),
    );

    render(
      <StrictMode>
        <DemoSessionProvider>
          <SessionProbe />
        </DemoSessionProvider>
      </StrictMode>,
    );

    await act(() => Promise.resolve());
    expect(
      screen.getByText("ready:choosing_entry_mode:none"),
    ).toBeInTheDocument();
  });

  it("expires and clears a tab that remains open for two hours", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T09:00:00.000Z"));

    render(
      <DemoSessionProvider>
        <SessionProbe />
      </DemoSessionProvider>,
    );

    await act(() => Promise.resolve());
    expect(screen.getByText("ready:empty:none")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1_000);
    });

    expect(
      screen.getByText("ready:cleared:expired_session_cleared"),
    ).toBeInTheDocument();
  });

  it("releases prepared CV data when its grant expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T09:00:00.000Z"));
    const analysis = createCvAnalysisResponseFixture({
      expiresAt: "2026-09-09T09:05:00.000Z",
    });
    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify(
        persistedDemoSessionSchema.parse({
          schemaVersion: 3,
          stage: "plan_ready",
          entryMode: "cv_assisted",
          createdAt: "2026-09-09T09:00:00.000Z",
          expiresAt: "2026-09-09T11:00:00.000Z",
          runtimeConfig: TEST_PUBLIC_RUNTIME_CONFIG,
          demoContext: {
            kind: "role_agnostic_first_stage_hr_screen",
            roleAvailability: "candidate_selected_synthetic_session_vacancy",
            employerFactsAvailable: false,
          },
          cv: analysis.cv,
          screeningPlan: analysis.plan,
          interviewGrant: analysis.interviewGrant,
          interviewGrantExpiresAt: analysis.expiresAt,
          cvAnalysisUsage: analysis.usage,
          transcript: [],
          insights: [],
          topicProgress: [],
        }),
      ),
    );

    render(
      <DemoSessionProvider>
        <SessionProbe />
      </DemoSessionProvider>,
    );
    await act(() => Promise.resolve());
    expect(screen.getByText("ready:plan_ready:none")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1_000);
    });
    expect(
      screen.getByText("ready:awaiting_cv:interview_grant_expired"),
    ).toBeInTheDocument();
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    expect(stored).not.toContain(analysis.interviewGrant);
    expect(stored).not.toContain(analysis.cv.facts[0]?.evidenceExcerpt);
  });

  it("clears browser storage while entering the scrubbed completion stage", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T09:05:00.000Z"));
    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify(
        persistedDemoSessionSchema.parse({
          schemaVersion: 3,
          stage: "preflight",
          entryMode: "conversation_first",
          createdAt: "2026-09-09T09:00:00.000Z",
          expiresAt: "2026-09-09T11:00:00.000Z",
          runtimeConfig: TEST_PUBLIC_RUNTIME_CONFIG,
          demoContext: {
            kind: "role_agnostic_first_stage_hr_screen",
            roleAvailability: "candidate_selected_synthetic_session_vacancy",
            employerFactsAvailable: false,
          },
          screeningPlan: createConversationFirstPlanFixture(),
          interviewGrant: "signed-conversation-first-grant",
          interviewGrantExpiresAt: "2026-09-09T09:15:00.000Z",
          transcript: [],
          insights: [],
          topicProgress: [],
        }),
      ),
    );

    render(
      <DemoSessionProvider>
        <CompletionProbe />
      </DemoSessionProvider>,
    );

    await act(() => Promise.resolve());
    expect(screen.getByText("preflight")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Complete interview" }));

    await act(() => Promise.resolve());
    expect(screen.getByText("complete_placeholder")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});
