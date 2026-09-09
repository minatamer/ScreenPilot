import { act, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
          schemaVersion: 1,
          stage: "choosing_entry_mode",
          entryMode: null,
          createdAt: "2026-09-09T09:00:00.000Z",
          expiresAt: "2026-09-09T11:00:00.000Z",
          employer: {
            catalogueKey: "demo-engineering",
            displayName: "our company",
            summary: "An unnamed company with two engineering vacancies.",
            facts: [],
            faq: [],
          },
          vacancies: [
            {
              key: "frontend-developer",
              title: "Frontend Developer",
              employmentType: "full_time",
              workPattern: "remote_within_europe",
              summary: "Build accessible product interfaces.",
              responsibilities: ["Build product interfaces."],
              requirements: ["Relevant frontend experience."],
              benefits: [],
              salaryRange: {
                currency: "EUR",
                minimumGrossAnnual: 40_000,
                maximumGrossAnnual: 55_000,
              },
            },
            {
              key: "backend-developer",
              title: "Backend Developer",
              employmentType: "full_time",
              workPattern: "remote_within_europe",
              summary: "Build reliable product services.",
              responsibilities: ["Build product services."],
              requirements: ["Relevant backend experience."],
              benefits: [],
              salaryRange: {
                currency: "EUR",
                minimumGrossAnnual: 40_000,
                maximumGrossAnnual: 55_000,
              },
            },
          ],
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
});
