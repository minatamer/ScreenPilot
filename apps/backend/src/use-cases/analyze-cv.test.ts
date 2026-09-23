import { readFile } from "node:fs/promises";

import { analyzeCvResponseSchema } from "@screenpilot/contracts/api/cv-analysis";
import {
  FIXED_TOPIC_KEYS,
  UNIVERSAL_TOPIC_KEYS,
} from "@screenpilot/contracts/interview/screening-plan";
import { describe, expect, it, vi } from "vitest";

import { FakeOpenAi } from "../providers/openai/fake-openai.js";
import { OpenAiRequestError } from "../providers/openai/openai-client.js";
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
    const backendText = await fixture("backend-developer.txt");
    const frontend = analyzeCvResponseSchema.parse(
      await createUseCase()(requestFor(frontendText), ANONYMOUS_SESSION_ID),
    );
    const backend = analyzeCvResponseSchema.parse(
      await createUseCase()(requestFor(backendText), ANONYMOUS_SESSION_ID),
    );

    expect(frontend.cv).not.toEqual(backend.cv);
    expect(frontend.plan.branch).toBe("mixed");
    expect(backend.plan.branch).toBe("experienced");
    expect(frontend.plan.roleClarification).toMatchObject({
      requiresCandidateConfirmation: true,
      suggestedRole: "Frontend Developer",
    });
    expect(backend.plan.roleClarification.suggestedRole).toBe(
      "Backend Developer",
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
        planVersion: "2026-09-16.1",
      }),
    ).toMatchObject({ entryMode: "cv_assisted" });
  });

  it.each([
    ["graphic-designer.txt", "Graphic Designer"],
    ["customer-support.txt", "Customer Support Representative"],
    ["product-manager.txt", "Product Manager"],
    ["backend-developer.txt", "Backend Developer"],
    ["full-stack-developer.txt", "Full Stack Developer"],
  ] as const)(
    "treats %s as an ordinary evidence-linked role suggestion",
    async (filename, suggestedRole) => {
      const response = await createUseCase()(
        requestFor(await fixture(filename)),
        ANONYMOUS_SESSION_ID,
      );

      expect(response.cv.suggestedRole).toEqual({
        cvFactIds: ["role-direction-1"],
        label: suggestedRole,
      });
      expect(response.plan.roleClarification).toMatchObject({
        cvFactIds: ["role-direction-1"],
        suggestedRole,
        requiresCandidateConfirmation: true,
      });
      expect(response.plan.topics.map((topic) => topic.key)).toEqual([
        ...UNIVERSAL_TOPIC_KEYS,
      ]);
      expect(response.plan.fixedTopics).toEqual([...FIXED_TOPIC_KEYS]);
      const clarificationTopic = response.plan.topics.find(
        (topic) => topic.key === "clarifications_and_followups",
      );
      expect(clarificationTopic?.required).toBe(false);
      expect(clarificationTopic?.intent).toMatch(
        /unsupported employer or vacancy/i,
      );
      expect(JSON.stringify(response.plan)).not.toMatch(
        /coding challenge|portfolio review|roleplay|professional knowledge|system design|framework trivia/i,
      );
    },
  );

  it.each([
    "graphic-designer.txt",
    "customer-support.txt",
    "product-manager.txt",
  ])("does not fabricate software experience for %s", async (filename) => {
    const response = await createUseCase()(
      requestFor(await fixture(filename)),
      ANONYMOUS_SESSION_ID,
    );
    const generatedStatementsAndPlan = JSON.stringify({
      factStatements: response.cv.facts.map((fact) => fact.statement),
      plan: response.plan,
    });

    expect(generatedStatementsAndPlan).not.toMatch(
      /software product experience|software engineering experience/i,
    );
  });

  it.each([
    ["graduate.txt", "graduate"],
    ["experienced.txt", "experienced"],
    ["frontend-leaning.txt", "junior"],
    ["backend-developer.txt", "experienced"],
    ["full-stack-developer.txt", "experienced"],
    ["correction.txt", "junior"],
    ["graphic-designer.txt", "experienced"],
    ["customer-support.txt", "junior"],
    ["product-manager.txt", "experienced"],
    ["prompt-injection.txt", "unclear"],
  ] as const)("safely analyzes %s", async (filename, experienceLevel) => {
    const cvText = await fixture(filename);
    const response = await createUseCase()(
      requestFor(cvText),
      ANONYMOUS_SESSION_ID,
    );

    expect(response.cv.experienceLevel).toBe(experienceLevel);
    expect(response.plan.entryMode).toBe("cv_assisted");
    expect(JSON.stringify(response)).not.toMatch(/"score"|"hiringDecision"/i);
    if (filename === "prompt-injection.txt") {
      expect(response.plan.roleClarification.suggestedRole).toBeNull();
      expect(response.cv.displayName).toBeNull();
    }
  });

  it("analyzes compact PDF text that uses line breaks without blank paragraphs", async () => {
    const cvText = [
      "Riley Vale",
      "Junior product contributor with experience supporting accessible workflow screens.",
      ...Array.from(
        { length: 10 },
        () =>
          "Collaborated with design and engineering partners on fictional delivery work and concise project notes.",
      ),
    ].join("\n");

    const response = await createUseCase()(
      requestFor(cvText),
      ANONYMOUS_SESSION_ID,
    );

    expect(response.cv.experienceLevel).toBe("junior");
    expect(response.cv.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "experience" }),
      ]),
    );
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

    const skillFacts = valid.normalizedCv.facts.filter(
      (fact) => fact.category === "skill",
    );
    const unsupportedExperienceLevelAnalyzer: CvAnalyzer = {
      analyzeCv: () =>
        Promise.resolve({
          ...valid,
          normalizedCv: {
            ...valid.normalizedCv,
            experienceLevel: "experienced",
            facts: skillFacts,
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

  it("maps a classified OpenAI account failure to safe owner action without Retry", async () => {
    const cvText = await fixture("graduate.txt");
    const sensitiveMessage =
      "PRIVATE BILLING DETAIL acct_secret_candidate@example.invalid";
    const analyzer: CvAnalyzer = {
      analyzeCv: () =>
        Promise.reject(
          new OpenAiRequestError({
            category: "http_non_success",
            cause: new Error(sensitiveMessage),
            durationMs: 18,
            httpStatus: 429,
            providerCode: "credit_balance_exhausted",
            providerFailureClass: "billing_or_quota",
            providerType: "requests",
            retryable: false,
          }),
        ),
    };

    const failure = await createUseCase({ analyzer })(
      requestFor(cvText),
      ANONYMOUS_SESSION_ID,
    ).catch((error: unknown) => error);

    expect(failure).toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      message:
        "CV analysis is unavailable right now. The demo owner must check the analysis service before another attempt.",
      retryable: false,
    });
    expect(String(failure)).not.toContain(sensitiveMessage);
  });
});
