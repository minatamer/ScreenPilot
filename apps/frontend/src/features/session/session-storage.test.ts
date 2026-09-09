// @vitest-environment node

import type {
  PublicEmployerContext,
  PublicVacancySnapshot,
} from "@screenpilot/contracts/interview/employer-context";
import type { ScreeningPlan } from "@screenpilot/contracts/interview/screening-plan";
import { describe, expect, it } from "vitest";

import type { DemoSessionState } from "./demo-session.types";
import {
  MAX_PERSISTED_SESSION_BYTES,
  persistedDemoSessionSchema,
  projectPersistedDemoSession,
  type PersistedDemoSession,
} from "./persisted-session.schema";
import {
  clearScreenPilotSession,
  getBrowserSessionStorage,
  loadPersistedSession,
  savePersistedSession,
  SESSION_STORAGE_KEY,
  type SessionStorageLike,
} from "./session-storage";

const CREATED_AT = "2026-09-09T09:00:00.000Z";
const EXPIRES_AT = "2026-09-09T11:00:00.000Z";

class MemorySessionStorage implements SessionStorageLike {
  readonly #values = new Map<string, string>();

  get length() {
    return this.#values.size;
  }

  getItem(key: string) {
    return this.#values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.#values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.#values.delete(key);
  }

  setItem(key: string, value: string) {
    this.#values.set(key, value);
  }
}

const employer: PublicEmployerContext = {
  catalogueKey: "demo-engineering",
  displayName: "our company",
  summary:
    "An unnamed company building workflow products for distributed teams.",
  facts: [],
  faq: [],
};

function vacancy(
  key: "frontend-developer" | "backend-developer",
  title: string,
): PublicVacancySnapshot {
  return {
    key,
    title,
    employmentType: "full_time",
    workPattern: "remote_within_europe",
    summary: `${title} role summary.`,
    responsibilities: ["Build useful product experiences."],
    requirements: ["Relevant professional or project experience."],
    benefits: [],
    salaryRange: {
      currency: "EUR",
      minimumGrossAnnual: 40_000,
      maximumGrossAnnual: 55_000,
    },
  };
}

const vacancies = [
  vacancy("frontend-developer", "Frontend Developer"),
  vacancy("backend-developer", "Backend Developer"),
];

const conversationPlan: ScreeningPlan = {
  entryMode: "conversation_first",
  openingIntent: "Begin a concise recruiter screening conversation.",
  branch: "discovery",
  vacancyClarification: {
    confirmedVacancyKeys: [],
    suggestedVacancyKey: null,
    reason: "The candidate must confirm the screening direction.",
    cvFactIds: [],
    requiresCandidateConfirmation: true,
  },
  topics: [
    {
      key: "current_context",
      title: "Current context",
      reason: "Understand the candidate's current professional context.",
      cvFactIds: [],
      applicableVacancyKeys: [],
      intent: "Learn the candidate's current work or study context.",
      coverageCriteria: ["A concise current-context statement is available."],
      followupDirections: [],
      required: true,
    },
  ],
  fixedTopics: ["current_context"],
};

function persistedSession(
  overrides: Partial<PersistedDemoSession> = {},
): PersistedDemoSession {
  return persistedDemoSessionSchema.parse({
    schemaVersion: 1,
    stage: "preflight",
    entryMode: "conversation_first",
    createdAt: CREATED_AT,
    expiresAt: EXPIRES_AT,
    employer,
    vacancies,
    screeningPlan: conversationPlan,
    interviewGrant: "signed-test-grant",
    transcript: [],
    insights: [],
    topicProgress: [],
    ...overrides,
  });
}

describe("session storage", () => {
  it("saves and restores a validated current-tab session", () => {
    const storage = new MemorySessionStorage();
    const session = persistedSession();

    expect(savePersistedSession(storage, session)).toEqual({ status: "saved" });
    expect(
      loadPersistedSession(storage, new Date("2026-09-09T10:00:00.000Z")),
    ).toEqual({ status: "restored", session });
  });

  it("constructs an explicit projection and rejects forbidden fields", () => {
    const stateWithRuntimeOnlyFields = {
      ...persistedSession(),
      hydrationStatus: "ready",
      rawCvText: "must remain in memory",
      turnstileToken: "must never be serialized",
    } satisfies DemoSessionState & {
      rawCvText: string;
      turnstileToken: string;
    };

    const projection = projectPersistedDemoSession(stateWithRuntimeOnlyFields);
    expect(projection).not.toHaveProperty("rawCvText");
    expect(projection).not.toHaveProperty("turnstileToken");
    expect(
      persistedDemoSessionSchema.safeParse({
        ...persistedSession(),
        rawCvText: "forbidden",
      }).success,
    ).toBe(false);
  });

  it("rejects CV state and provenance in conversation-first sessions", () => {
    const baseSession = persistedSession();
    const normalizedCv = {
      displayName: null,
      displayNameEvidence: null,
      headline: null,
      experienceLevel: "unclear",
      facts: [],
      ambiguities: [],
    } as const;
    const cvResult = persistedDemoSessionSchema.safeParse({
      ...baseSession,
      cv: normalizedCv,
    });
    const provenanceResult = persistedDemoSessionSchema.safeParse({
      ...baseSession,
      insights: [
        {
          id: "insight-1",
          category: "current_context",
          label: "Current context",
          value: "Candidate context",
          source: "CV",
          status: "confirmed",
          evidenceTurnIds: [],
          cvFactIds: ["fact-1"],
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        },
      ],
    });

    expect(cvResult.success).toBe(false);
    expect(provenanceResult.success).toBe(false);
  });

  it("rejects duplicate fixed vacancies during restore", () => {
    const storage = new MemorySessionStorage();
    const invalidSession = {
      ...persistedSession(),
      vacancies: [
        vacancy("frontend-developer", "Frontend Developer"),
        vacancy("frontend-developer", "Frontend Developer duplicate"),
      ],
    };
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(invalidSession));

    expect(persistedDemoSessionSchema.safeParse(invalidSession).success).toBe(
      false,
    );
    expect(
      loadPersistedSession(storage, new Date("2026-09-09T10:00:00.000Z")),
    ).toEqual({ status: "cleared", reason: "corrupt" });
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it.each([
    {
      stage: "extracting_cv",
      entryMode: "conversation_first",
    },
    {
      stage: "preparing_conversation",
      entryMode: "cv_assisted",
    },
    {
      stage: "preflight",
      entryMode: null,
    },
  ] as const)(
    "rejects the impossible $entryMode/$stage restore combination",
    ({ stage, entryMode }) => {
      expect(
        persistedDemoSessionSchema.safeParse({
          ...persistedSession(),
          stage,
          entryMode,
        }).success,
      ).toBe(false);
    },
  );

  it("requires prepared stages to contain their plan and grant", () => {
    expect(
      persistedDemoSessionSchema.safeParse({
        ...persistedSession(),
        screeningPlan: undefined,
        interviewGrant: undefined,
      }).success,
    ).toBe(false);
  });

  it.each([
    {
      name: "corrupt JSON",
      rawValue: "{not-json",
      now: "2026-09-09T10:00:00.000Z",
      reason: "corrupt",
    },
    {
      name: "an expired session",
      rawValue: JSON.stringify(
        persistedSession({
          createdAt: "2026-09-09T06:00:00.000Z",
          expiresAt: "2026-09-09T08:00:00.000Z",
        }),
      ),
      now: "2026-09-09T10:00:00.000Z",
      reason: "expired",
    },
    {
      name: "a session created in the future",
      rawValue: JSON.stringify(
        persistedSession({
          createdAt: "2026-09-09T11:00:00.000Z",
          expiresAt: "2026-09-09T13:00:00.000Z",
        }),
      ),
      now: "2026-09-09T10:00:00.000Z",
      reason: "corrupt",
    },
    {
      name: "an unsupported future version",
      rawValue: JSON.stringify({ schemaVersion: 2 }),
      now: "2026-09-09T10:00:00.000Z",
      reason: "future_version",
    },
    {
      name: "an oversized payload",
      rawValue: "x".repeat(MAX_PERSISTED_SESSION_BYTES + 1),
      now: "2026-09-09T10:00:00.000Z",
      reason: "oversized",
    },
  ])("clears $name safely", ({ rawValue, now, reason }) => {
    const storage = new MemorySessionStorage();
    storage.setItem(SESSION_STORAGE_KEY, rawValue);

    expect(loadPersistedSession(storage, new Date(now))).toEqual({
      status: "cleared",
      reason,
    });
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("clears every ScreenPilot key without touching other tab data", () => {
    const storage = new MemorySessionStorage();
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(persistedSession()));
    storage.setItem("screenpilot:future-key", "value");
    storage.setItem("another-app:key", "keep");

    expect(clearScreenPilotSession(storage)).toBe(true);
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(storage.getItem("screenpilot:future-key")).toBeNull();
    expect(storage.getItem("another-app:key")).toBe("keep");
  });

  it("is safe to import and call without browser globals", () => {
    expect("window" in globalThis).toBe(false);
    expect(getBrowserSessionStorage()).toBeNull();
  });
});
