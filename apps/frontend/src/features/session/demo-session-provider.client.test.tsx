import { act, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createCvAnalysisResponseFixture,
  TEST_PUBLIC_RUNTIME_CONFIG,
} from "@/test/cv-analysis.fixture";
import { createConversationFirstPlanFixture } from "@/test/conversation-first-plan.fixture";

import { DemoSessionProvider } from "./demo-session-provider";
import { persistedDemoSessionSchema } from "./persisted-session.schema";
import { SESSION_STORAGE_KEY } from "./session-storage";
import type { SessionStorageLike } from "./session-storage";
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
          const completion = {
            reason: "candidate_ended" as const,
            elapsedSeconds: 300,
          };
          dispatch({ type: "VOICE_ENDING", completion });
          completeInterview(
            {
              conversationId: "fake-conversation-1",
              status: "ended",
              startedAt: "2026-09-09T09:05:00.000Z",
              endedAt: "2026-09-09T09:10:00.000Z",
              endReason: "Interview ended by the candidate.",
            },
            completion,
          );
        }}
        type="button"
      >
        Complete interview
      </button>
    </>
  );
}

function ReviewStorageProbe() {
  const { state, storageStatus } = useDemoSession();
  return (
    <output>
      {state.stage}:{String(state.transcript.length)}:{storageStatus}
    </output>
  );
}

function ClearSessionProbe() {
  const { clearSession, state, storageStatus } = useDemoSession();
  const [clearResult, setClearResult] = useState("idle");
  return (
    <>
      <output>
        {state.stage}:{storageStatus}:{clearResult}
      </output>
      <button
        onClick={() => {
          setClearResult(clearSession() ? "cleared" : "failed");
        }}
        type="button"
      >
        Clear stored session
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

  it("persists the bounded review when an interview completes", async () => {
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
    expect(screen.getByText("interview_complete")).toBeInTheDocument();
    const storedCompletedSession =
      window.sessionStorage.getItem(SESSION_STORAGE_KEY) ?? "";
    expect(JSON.parse(storedCompletedSession)).toMatchObject({
      stage: "interview_complete",
      interviewCompletion: {
        reason: "candidate_ended",
        elapsedSeconds: 300,
      },
      voice: { status: "ended" },
    });
    expect(storedCompletedSession).not.toContain("conversationToken");
    expect(storedCompletedSession).not.toContain("turnstileToken");
    expect(storedCompletedSession).not.toContain("isMuted");
    expect(storedCompletedSession).not.toContain("audio");
  });

  it("keeps restored review evidence visible when browser quota rejects saving", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T10:00:00.000Z"));
    const storedReview = JSON.stringify(
      persistedDemoSessionSchema.parse({
        schemaVersion: 3,
        stage: "review_ready",
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
        interviewGrantExpiresAt: "2026-09-09T10:30:00.000Z",
        voice: {
          status: "ended",
          endedAt: "2026-09-09T09:10:00.000Z",
        },
        transcript: [
          {
            id: "candidate-turn-1",
            sequence: 0,
            speaker: "candidate",
            status: "final",
            text: "I can start next month.",
            occurredAt: "2026-09-09T09:08:00.000Z",
          },
        ],
        insights: [],
        topicProgress: [],
      }),
    );
    const quotaStorage: SessionStorageLike = {
      get length() {
        return 1;
      },
      getItem: (key) => (key === SESSION_STORAGE_KEY ? storedReview : null),
      key: (index) => (index === 0 ? SESSION_STORAGE_KEY : null),
      removeItem: vi.fn(),
      setItem: () => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      },
    };

    render(
      <DemoSessionProvider storage={quotaStorage}>
        <ReviewStorageProbe />
      </DemoSessionProvider>,
    );

    await act(() => Promise.resolve());
    expect(screen.getByText("review_ready:1:unavailable")).toBeInTheDocument();
  });

  it("keeps in-memory review state when browser removal throws", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T10:00:00.000Z"));
    const storedReview = JSON.stringify(
      persistedDemoSessionSchema.parse({
        schemaVersion: 3,
        stage: "review_ready",
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
        interviewGrantExpiresAt: "2026-09-09T10:30:00.000Z",
        voice: {
          status: "ended",
          endedAt: "2026-09-09T09:10:00.000Z",
        },
        transcript: [
          {
            id: "candidate-turn-1",
            sequence: 0,
            speaker: "candidate",
            status: "final",
            text: "Keep this candidate evidence visible for a safe retry.",
            occurredAt: "2026-09-09T09:08:00.000Z",
          },
        ],
        insights: [],
        topicProgress: [],
      }),
    );
    const blockedStorage: SessionStorageLike = {
      get length() {
        return 1;
      },
      getItem: (key) => (key === SESSION_STORAGE_KEY ? storedReview : null),
      key: (index) => (index === 0 ? SESSION_STORAGE_KEY : null),
      removeItem: () => {
        throw new DOMException("Removal blocked", "SecurityError");
      },
      setItem: vi.fn(),
    };

    render(
      <DemoSessionProvider storage={blockedStorage}>
        <ClearSessionProbe />
      </DemoSessionProvider>,
    );

    await act(() => Promise.resolve());
    expect(screen.getByText("review_ready:saved:idle")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Clear stored session" }),
    );

    expect(screen.getByText("review_ready:unavailable:failed")).toBeVisible();
    expect(blockedStorage.getItem(SESSION_STORAGE_KEY)).toBe(storedReview);
  });
});
