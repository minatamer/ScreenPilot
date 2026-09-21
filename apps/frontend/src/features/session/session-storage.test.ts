// @vitest-environment node

import type { PublicRoleNeutralDemoContext } from "@screenpilot/contracts/interview/demo-context";
import {
  FIXED_TOPIC_KEYS,
  type ScreeningPlan,
  UNIVERSAL_TOPIC_KEYS,
} from "@screenpilot/contracts/interview/screening-plan";
import { describe, expect, it } from "vitest";

import { TEST_PUBLIC_RUNTIME_CONFIG } from "@/test/cv-analysis.fixture";

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

const demoContext: PublicRoleNeutralDemoContext = {
  kind: "role_agnostic_first_stage_hr_screen",
  roleAvailability: "candidate_selected_synthetic_session_vacancy",
  employerFactsAvailable: false,
};

const conversationPlan: ScreeningPlan = {
  entryMode: "conversation_first",
  openingIntent: "Begin a concise recruiter screening conversation.",
  branch: "discovery",
  roleClarification: {
    suggestedRole: null,
    reason: "The candidate must confirm the screening direction.",
    cvFactIds: [],
    requiresCandidateConfirmation: true,
  },
  topics: UNIVERSAL_TOPIC_KEYS.map((key) => ({
    key,
    title: key,
    reason: "Understand one universal HR field.",
    cvFactIds: [],
    intent: "Learn one universal HR field without professional assessment.",
    coverageCriteria: ["Candidate evidence covers this field."],
    followupDirections: [],
    required: key !== "clarifications_and_followups",
  })),
  fixedTopics: [...FIXED_TOPIC_KEYS],
};

function persistedSession(
  overrides: Partial<PersistedDemoSession> = {},
): PersistedDemoSession {
  return persistedDemoSessionSchema.parse({
    schemaVersion: 3,
    stage: "preflight",
    entryMode: "conversation_first",
    createdAt: CREATED_AT,
    expiresAt: EXPIRES_AT,
    runtimeConfig: TEST_PUBLIC_RUNTIME_CONFIG,
    demoContext,
    screeningPlan: conversationPlan,
    interviewGrant: "signed-test-grant",
    interviewGrantExpiresAt: "2026-09-09T10:15:00.000Z",
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
      suggestedRole: null,
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

  it("requires persisted name and role fields to match their insight cards", () => {
    const candidateTurn = {
      id: "turn-1",
      sequence: 1,
      speaker: "candidate" as const,
      status: "final" as const,
      text: "Call me Sam. I am interested in Product Designer roles.",
      occurredAt: CREATED_AT,
    };
    const synchronizedSession = persistedSession({
      transcript: [candidateTurn],
      insights: [
        {
          id: "insight-preferred_name",
          category: "preferred_name",
          label: "Preferred name",
          value: "Sam",
          source: "Candidate",
          status: "confirmed",
          evidenceTurnIds: [candidateTurn.id],
          cvFactIds: [],
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        },
        {
          id: "insight-role_preference",
          category: "role_preference",
          label: "Role preference",
          value: "Product Designer",
          source: "Candidate",
          status: "confirmed",
          evidenceTurnIds: [candidateTurn.id],
          cvFactIds: [],
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        },
      ],
      preferredName: {
        value: "Sam",
        source: "Candidate",
        evidenceTurnIds: [candidateTurn.id],
      },
      rolePreference: {
        label: "Product Designer",
        status: "candidate_stated",
        evidenceTurnIds: [candidateTurn.id],
      },
    });

    expect(
      persistedDemoSessionSchema.safeParse(synchronizedSession).success,
    ).toBe(true);
    expect(
      persistedDemoSessionSchema.safeParse({
        ...synchronizedSession,
        preferredName: {
          value: "Samantha",
          source: "Candidate",
          evidenceTurnIds: [candidateTurn.id],
        },
      }).success,
    ).toBe(false);
    expect(
      persistedDemoSessionSchema.safeParse({
        ...synchronizedSession,
        rolePreference: {
          label: "Customer Support Specialist",
          status: "candidate_stated",
          evidenceTurnIds: [candidateTurn.id],
        },
      }).success,
    ).toBe(false);
    expect(
      persistedDemoSessionSchema.safeParse({
        ...synchronizedSession,
        insights: [],
      }).success,
    ).toBe(false);
  });

  it("rejects the superseded fixed-catalogue envelope during restore", () => {
    const storage = new MemorySessionStorage();
    const invalidSession = {
      ...persistedSession(),
      employer: { catalogueKey: "obsolete-catalogue" },
      vacancies: [{ key: "obsolete-role" }],
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
        interviewGrantExpiresAt: undefined,
      }).success,
    ).toBe(false);
  });

  it("clears a restored transcript that exceeds the character bound", () => {
    const storage = new MemorySessionStorage();
    const oversizedTranscript = Array.from({ length: 8 }, (_, index) => ({
      id: `turn-${String(index)}`,
      sequence: index,
      speaker:
        index % 2 === 0 ? ("candidate" as const) : ("interviewer" as const),
      status: "final" as const,
      text: "x".repeat(index === 7 ? 2_001 : 4_000),
      occurredAt: new Date(
        Date.parse(CREATED_AT) + index * 1_000,
      ).toISOString(),
    }));
    storage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        ...persistedSession(),
        transcript: oversizedTranscript,
      }),
    );

    expect(
      loadPersistedSession(storage, new Date("2026-09-09T10:00:00.000Z")),
    ).toEqual({ status: "cleared", reason: "corrupt" });
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it.each([
    { name: "missing", voice: undefined },
    {
      name: "non-terminal",
      voice: {
        status: "connected" as const,
        startedAt: CREATED_AT,
      },
    },
  ])("clears review-ready storage with $name voice metadata", ({ voice }) => {
    const storage = new MemorySessionStorage();
    const validReview = persistedSession({
      stage: "review_ready",
      voice: {
        status: "ended",
        endedAt: "2026-09-09T09:30:00.000Z",
      },
    });
    const invalidReview = { ...validReview, voice };
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(invalidReview));

    expect(persistedDemoSessionSchema.safeParse(invalidReview).success).toBe(
      false,
    );
    expect(
      loadPersistedSession(storage, new Date("2026-09-09T10:00:00.000Z")),
    ).toEqual({ status: "cleared", reason: "corrupt" });
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("restores review-ready evidence with failed voice metadata", () => {
    const storage = new MemorySessionStorage();
    const partialReview = persistedSession({
      stage: "review_ready",
      voice: {
        status: "failed",
        endedAt: "2026-09-09T09:30:00.000Z",
        endReason: "The voice connection was interrupted.",
      },
    });
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(partialReview));

    expect(
      loadPersistedSession(storage, new Date("2026-09-09T10:00:00.000Z")),
    ).toEqual({ status: "restored", session: partialReview });
  });

  it("clears a prepared session whose grant is missing its expiry", () => {
    const storage = new MemorySessionStorage();
    const invalidSession = {
      ...persistedSession(),
      interviewGrantExpiresAt: undefined,
    };
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(invalidSession));

    expect(persistedDemoSessionSchema.safeParse(invalidSession).success).toBe(
      false,
    );
    expect(
      persistedDemoSessionSchema.safeParse({
        ...persistedSession(),
        interviewGrant: undefined,
      }).success,
    ).toBe(false);
    expect(
      loadPersistedSession(storage, new Date("2026-09-09T10:00:00.000Z")),
    ).toEqual({ status: "cleared", reason: "corrupt" });
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
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
      name: "an unsupported schema version",
      rawValue: JSON.stringify({ schemaVersion: 1 }),
      now: "2026-09-09T10:00:00.000Z",
      reason: "unsupported_version",
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

  it("finds and clears the old v1 storage key deliberately", () => {
    const storage = new MemorySessionStorage();
    const oldKey = "screenpilot:demo-session:v1";
    storage.setItem(oldKey, JSON.stringify({ schemaVersion: 1 }));

    expect(
      loadPersistedSession(storage, new Date("2026-09-09T10:00:00.000Z")),
    ).toEqual({ status: "cleared", reason: "unsupported_version" });
    expect(storage.getItem(oldKey)).toBeNull();
  });

  it("clears an old version while restoring a coexisting current session", () => {
    const storage = new MemorySessionStorage();
    const session = persistedSession();
    const oldKey = "screenpilot:demo-session:v1";
    storage.setItem(oldKey, JSON.stringify({ schemaVersion: 1 }));
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    storage.setItem("another-app:key", "keep");

    expect(
      loadPersistedSession(storage, new Date("2026-09-09T10:00:00.000Z")),
    ).toEqual({ status: "restored", session });
    expect(storage.getItem(oldKey)).toBeNull();
    expect(storage.getItem("another-app:key")).toBe("keep");
  });

  it("clears old versions when the coexisting current session is corrupt", () => {
    const storage = new MemorySessionStorage();
    const oldKey = "screenpilot:demo-session:v1";
    storage.setItem(oldKey, JSON.stringify({ schemaVersion: 1 }));
    storage.setItem(SESSION_STORAGE_KEY, "{not-json");
    storage.setItem("another-app:key", "keep");

    expect(
      loadPersistedSession(storage, new Date("2026-09-09T10:00:00.000Z")),
    ).toEqual({ status: "cleared", reason: "corrupt" });
    expect(storage.getItem(oldKey)).toBeNull();
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(storage.getItem("another-app:key")).toBe("keep");
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
