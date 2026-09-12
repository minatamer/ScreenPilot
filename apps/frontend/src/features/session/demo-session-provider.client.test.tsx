import { act, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import {
  FIXED_TOPIC_KEYS,
  UNIVERSAL_TOPIC_KEYS,
} from "@screenpilot/contracts/interview/screening-plan";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createCvAnalysisResponseFixture,
  TEST_PUBLIC_RUNTIME_CONFIG,
} from "@/test/cv-analysis.fixture";

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

  it("returns an expired conversation-first grant to deterministic preparation", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T09:00:00.000Z"));
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
          screeningPlan: {
            entryMode: "conversation_first",
            openingIntent: "Begin with the candidate's preferred name.",
            branch: "discovery",
            roleClarification: {
              suggestedRole: null,
              reason: "Ask the candidate openly which role to use.",
              cvFactIds: [],
              requiresCandidateConfirmation: true,
            },
            topics: UNIVERSAL_TOPIC_KEYS.map((key) => ({
              key,
              title: key,
              reason: "Learn one universal HR field.",
              cvFactIds: [],
              intent: "Learn this field without professional assessment.",
              coverageCriteria: ["Candidate evidence covers the field."],
              followupDirections: [],
              required: key !== "clarifications_and_followups",
            })),
            fixedTopics: [...FIXED_TOPIC_KEYS],
          },
          interviewGrant: "signed-test-grant",
          interviewGrantExpiresAt: "2026-09-09T09:05:00.000Z",
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
    expect(screen.getByText("ready:preflight:none")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1_000);
    });
    expect(
      screen.getByText("ready:preparing_conversation:interview_grant_expired"),
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).not.toContain(
      "signed-test-grant",
    );
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
});
