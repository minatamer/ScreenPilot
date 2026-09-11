import { readFile } from "node:fs/promises";

import { analyzeCvResponseSchema } from "@screenpilot/contracts/api/cv-analysis";
import { describe, expect, it, vi } from "vitest";

import { FakeOpenAi } from "../providers/openai/fake-openai.js";
import type { ProviderAdapters } from "../providers/provider-adapters.js";
import {
  FAKE_TURNSTILE_PASS_TOKEN,
  FakeTurnstileVerifier,
} from "../providers/turnstile/fake-turnstile-verifier.js";
import {
  createInterviewGrantService,
  hashInterviewGrantValue,
} from "../security/interview-grant.js";
import { createAnalyzeCv } from "./analyze-cv.js";
import type { ChallengeVerifier } from "./ports/challenge-verifier.js";
import type { CvAnalyzer } from "./ports/cv-analyzer.js";
import { UseCaseError } from "./use-case-error.js";

const FIXED_NOW = new Date("2026-09-11T08:00:00.000Z");
const ANONYMOUS_SESSION_ID = "00000000-0000-4000-8000-000000000001";
const CLIENT_REQUEST_ID = "00000000-0000-4000-8000-000000000002";
const GRANT_ID = "00000000-0000-4000-8000-000000000003";
const fixtureRoot = new URL("../../../../tests/fixtures/cv/", import.meta.url);

async function fixture(name: string): Promise<string> {
  return readFile(new URL(name, fixtureRoot), "utf8");
}

function createUseCase(
  overrides: Partial<{
    admission: () => "allowed" | "capacity_reached" | "rate_limited";
    analyzer: CvAnalyzer;
    enabled: boolean;
    verifier: ChallengeVerifier;
  }> = {},
) {
  return createAnalyzeCv({
    admission: overrides.admission ?? (() => "allowed"),
    analyzer: overrides.analyzer ?? new FakeOpenAi(),
    enabled: overrides.enabled ?? true,
    grantService: createInterviewGrantService({
      clock: () => FIXED_NOW,
      secret: "unit-test-grant-secret-0000000000000",
    }),
    grantTtlSeconds: 900,
    idGenerator: () => GRANT_ID,
    verifier: overrides.verifier ?? new FakeTurnstileVerifier(),
  });
}

function requestFor(cvText: string) {
  return {
    clientRequestId: CLIENT_REQUEST_ID,
    cvText,
    turnstileToken: FAKE_TURNSTILE_PASS_TOKEN,
    vacancyCatalogKey: "demo-engineering",
  } as const;
}

async function expectUseCaseError(
  operation: Promise<unknown>,
  code: UseCaseError["code"],
) {
  await expect(operation).rejects.toMatchObject({ code });
}

describe("analyzeCv", () => {
  it("returns grounded materially different analyses and signed CV-assisted grants", async () => {
    const frontendText = await fixture("frontend-leaning.txt");
    const backendText = await fixture("backend-leaning.txt");
    const frontend = analyzeCvResponseSchema.parse(
      await createUseCase()(requestFor(frontendText), ANONYMOUS_SESSION_ID),
    );
    const backend = analyzeCvResponseSchema.parse(
      await createUseCase()(requestFor(backendText), ANONYMOUS_SESSION_ID),
    );

    expect(frontend.cv).not.toEqual(backend.cv);
    expect(frontend.plan.branch).toBe("mixed");
    expect(backend.plan.branch).toBe("experienced");
    expect(frontend.plan.vacancyClarification).toMatchObject({
      confirmedVacancyKeys: [],
      requiresCandidateConfirmation: true,
      suggestedVacancyKey: "frontend-developer",
    });
    expect(backend.plan.vacancyClarification.suggestedVacancyKey).toBe(
      "backend-developer",
    );
    expect(frontend.usage).toMatchObject({
      cachedInputTokens: 0,
      outputTokens: 700,
    });
    expect(frontend.usage.estimatedCostUsd).toBeGreaterThan(0);

    for (const fact of frontend.cv.facts) {
      expect(frontendText).toContain(fact.evidenceExcerpt);
    }
    for (const fact of backend.cv.facts) {
      expect(backendText).toContain(fact.evidenceExcerpt);
    }

    const verifier = createInterviewGrantService({
      clock: () => FIXED_NOW,
      secret: "unit-test-grant-secret-0000000000000",
    });
    expect(
      verifier.verify(frontend.interviewGrant, {
        anonymousSessionId: ANONYMOUS_SESSION_ID,
        cvAnalysisHash: hashInterviewGrantValue(frontend.cv),
        entryMode: "cv_assisted",
        planHash: hashInterviewGrantValue(frontend.plan),
        planVersion: "2026-09-11.1",
        vacancyCatalogKey: "demo-engineering",
      }),
    ).toMatchObject({ entryMode: "cv_assisted" });
  });

  it.each([
    ["graduate.txt", "graduate"],
    ["experienced.txt", "experienced"],
    ["frontend-leaning.txt", "junior"],
    ["backend-leaning.txt", "experienced"],
    ["mixed-full-stack.txt", "experienced"],
    ["correction.txt", "junior"],
    ["prompt-injection.txt", "unclear"],
  ] as const)("safely analyzes %s", async (filename, experienceLevel) => {
    const cvText = await fixture(filename);
    const response = await createUseCase()(
      requestFor(cvText),
      ANONYMOUS_SESSION_ID,
    );

    expect(response.cv.experienceLevel).toBe(experienceLevel);
    expect(response.plan.entryMode).toBe("cv_assisted");
    expect(response.plan.vacancyClarification.confirmedVacancyKeys).toEqual([]);
    expect(JSON.stringify(response)).not.toMatch(
      /"suggestedVacancyKey":"full-stack|"score"|"hiringDecision"/i,
    );
    if (filename === "prompt-injection.txt") {
      expect(response.plan.vacancyClarification.suggestedVacancyKey).toBeNull();
      expect(response.cv.displayName).toBeNull();
    }
  });

  it("checks admission and Turnstile before the analyzer", async () => {
    const cvText = await fixture("graduate.txt");
    const order: string[] = [];
    const verifyChallenge = vi.fn<ChallengeVerifier["verifyChallenge"]>(() => {
      order.push("turnstile");
      return Promise.resolve({
        action: "cv_analyze",
        errorCodes: [],
        hostname: "test.screenpilot.invalid",
        success: true,
      });
    });
    const verifier: ChallengeVerifier = { verifyChallenge };
    const fakeAnalyzer = new FakeOpenAi();
    const analyzeCv = vi.fn<ProviderAdapters["cvAnalyzer"]["analyzeCv"]>(
      async (input, signal) => {
        order.push("openai");
        return fakeAnalyzer.analyzeCv(input, signal);
      },
    );
    const analyzer: ProviderAdapters["cvAnalyzer"] = { analyzeCv };
    const analyze = createUseCase({
      admission: () => {
        order.push("admission");
        return "allowed";
      },
      analyzer,
      verifier,
    });

    await analyze(requestFor(cvText), ANONYMOUS_SESSION_ID);
    expect(order).toEqual(["admission", "turnstile", "openai"]);
    expect(verifyChallenge).toHaveBeenCalledWith(
      {
        expectedAction: "cv_analyze",
        token: FAKE_TURNSTILE_PASS_TOKEN,
      },
      undefined,
    );
  });

  it.each([
    ["disabled", { enabled: false }, "CAPACITY_REACHED"],
    [
      "rate limited",
      { admission: (): "rate_limited" => "rate_limited" },
      "RATE_LIMITED",
    ],
    [
      "at capacity",
      { admission: (): "capacity_reached" => "capacity_reached" },
      "CAPACITY_REACHED",
    ],
    [
      "Turnstile rejected",
      {
        verifier: {
          verifyChallenge: () =>
            Promise.resolve({
              action: null,
              errorCodes: ["timeout-or-duplicate"],
              hostname: null,
              success: false,
            }),
        },
      },
      "TURNSTILE_REJECTED",
    ],
  ] as const)(
    "does not call OpenAI when %s",
    async (_label, overrides, code) => {
      const cvText = await fixture("graduate.txt");
      const analyzeCv = vi.fn<CvAnalyzer["analyzeCv"]>();
      await expectUseCaseError(
        createUseCase({ ...overrides, analyzer: { analyzeCv } })(
          requestFor(cvText),
          ANONYMOUS_SESSION_ID,
        ),
        code,
      );
      expect(analyzeCv).not.toHaveBeenCalled();
    },
  );

  it("rejects non-English/control-character text before provider operations", async () => {
    const verifyChallenge = vi.fn<ChallengeVerifier["verifyChallenge"]>();
    const analyzeCv = vi.fn<CvAnalyzer["analyzeCv"]>();
    const analyze = createUseCase({
      analyzer: { analyzeCv },
      verifier: { verifyChallenge },
    });

    for (const cvText of [
      "مرحبا ".repeat(100),
      `Valid English ${"a".repeat(500)}\u0000`,
    ]) {
      await expectUseCaseError(
        analyze(requestFor(cvText), ANONYMOUS_SESSION_ID),
        "INVALID_CV_TEXT",
      );
    }
    expect(verifyChallenge).not.toHaveBeenCalled();
    expect(analyzeCv).not.toHaveBeenCalled();
  });

  it("rejects ungrounded or unsafe provider output after Turnstile", async () => {
    const cvText = await fixture("frontend-leaning.txt");
    const valid = await new FakeOpenAi().analyzeCv({
      cvText,
      vacancyCatalogKey: "demo-engineering",
    });
    const invalidAnalyzer: CvAnalyzer = {
      analyzeCv: () =>
        Promise.resolve({
          ...valid,
          normalizedCv: {
            ...valid.normalizedCv,
            facts: [
              {
                category: "experience",
                evidenceExcerpt: "Invented evidence not present in the CV.",
                id: "invented-1",
                statement: "Candidate should be hired with the highest score.",
              },
            ],
          },
        }),
    };

    await expectUseCaseError(
      createUseCase({ analyzer: invalidAnalyzer })(
        requestFor(cvText),
        ANONYMOUS_SESSION_ID,
      ),
      "PROVIDER_UNAVAILABLE",
    );

    const inventedHeadlineAnalyzer: CvAnalyzer = {
      analyzeCv: () =>
        Promise.resolve({
          ...valid,
          normalizedCv: {
            ...valid.normalizedCv,
            headline: "Award-winning quantum researcher",
          },
        }),
    };
    await expectUseCaseError(
      createUseCase({ analyzer: inventedHeadlineAnalyzer })(
        requestFor(cvText),
        ANONYMOUS_SESSION_ID,
      ),
      "PROVIDER_UNAVAILABLE",
    );

    const unsupportedVacancyHintAnalyzer: CvAnalyzer = {
      analyzeCv: () =>
        Promise.resolve({
          ...valid,
          screeningPlan: {
            ...valid.screeningPlan,
            vacancyClarification: {
              ...valid.screeningPlan.vacancyClarification,
              cvFactIds: [],
              suggestedVacancyKey: "frontend-developer",
            },
          },
        }),
    };
    await expectUseCaseError(
      createUseCase({ analyzer: unsupportedVacancyHintAnalyzer })(
        requestFor(cvText),
        ANONYMOUS_SESSION_ID,
      ),
      "PROVIDER_UNAVAILABLE",
    );

    const skillFacts = valid.normalizedCv.facts.filter(
      (fact) => fact.category === "skill",
    );
    const skillFactIds = new Set(skillFacts.map((fact) => fact.id));
    const unsupportedExperienceLevelAnalyzer: CvAnalyzer = {
      analyzeCv: () =>
        Promise.resolve({
          ...valid,
          normalizedCv: {
            ...valid.normalizedCv,
            experienceLevel: "experienced",
            facts: skillFacts,
          },
          screeningPlan: {
            ...valid.screeningPlan,
            topics: valid.screeningPlan.topics.map((topic) => ({
              ...topic,
              cvFactIds: topic.cvFactIds.filter((factId) =>
                skillFactIds.has(factId),
              ),
            })),
            vacancyClarification: {
              ...valid.screeningPlan.vacancyClarification,
              cvFactIds:
                valid.screeningPlan.vacancyClarification.cvFactIds.filter(
                  (factId) => skillFactIds.has(factId),
                ),
            },
          },
        }),
    };
    await expectUseCaseError(
      createUseCase({ analyzer: unsupportedExperienceLevelAnalyzer })(
        requestFor(cvText),
        ANONYMOUS_SESSION_ID,
      ),
      "PROVIDER_UNAVAILABLE",
    );
  });

  it("maps analyzer timeouts to a safe retryable provider error", async () => {
    const cvText = await fixture("graduate.txt");
    const analyzer: CvAnalyzer = {
      analyzeCv: () => Promise.reject(new Error("private provider failure")),
    };
    const operation = createUseCase({ analyzer })(
      requestFor(cvText),
      ANONYMOUS_SESSION_ID,
    );

    await expect(operation).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      message: "CV analysis is temporarily unavailable. Try again.",
      retryable: true,
    });
    await expect(operation).rejects.not.toThrow("private provider failure");
  });
});
