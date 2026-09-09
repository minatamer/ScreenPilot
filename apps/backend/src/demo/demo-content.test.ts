import { readFileSync } from "node:fs";

import {
  publicEmployerContextSchema,
  publicVacancyCatalogueSchema,
} from "@screenpilot/contracts/interview/employer-context";
import {
  FIXED_TOPIC_KEYS,
  screeningPlanSchema,
} from "@screenpilot/contracts/interview/screening-plan";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { EMPLOYER_FAQ, ROLE_CATALOGUE_BOUNDARY } from "./employer-faq.js";
import {
  CONVERSATION_FIRST_PLAN,
  CONVERSATION_FIRST_PLAN_VERSION,
} from "./conversation-first-plan.js";
import {
  PUBLIC_EMPLOYER_CONTEXT,
  PUBLIC_VACANCY_CATALOGUE,
} from "./vacancy-catalogue.js";

const fixtureManifestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  synthetic: z.literal(true),
  scope: z.literal("generic-european"),
  privacyNote: z.string().min(1),
  fixtures: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        file: z.string().regex(/^[a-z0-9-]+\.(?:txt|expected\.txt)$/),
        source: z.enum(["text", "public_pdf_expected"]),
        synthetic: z.literal(true),
        purpose: z.string().min(1),
        expected: z.strictObject({
          experienceLevel: z.enum([
            "graduate",
            "junior",
            "experienced",
            "unclear",
          ]),
          roleAlignment: z.enum(["frontend", "backend", "mixed", "unclear"]),
          factSignals: z.array(z.string().min(1)).min(2),
          topicDirections: z.array(z.string().min(1)).min(2),
          supportsNameCorrection: z.boolean(),
          adversarial: z.boolean(),
          expectedCorrection: z
            .strictObject({ from: z.string().min(1), to: z.string().min(1) })
            .optional(),
        }),
      }),
    )
    .length(8),
});

function readCvFixture(file: string): string {
  return readFileSync(
    new URL(`../../../../tests/fixtures/cv/${file}`, import.meta.url),
    "utf8",
  );
}

describe("SP-007 server-owned demo content", () => {
  it("exposes exactly two coherent unnamed synthetic vacancies", () => {
    expect(
      publicEmployerContextSchema.safeParse(PUBLIC_EMPLOYER_CONTEXT).success,
    ).toBe(true);
    expect(
      publicVacancyCatalogueSchema.safeParse(PUBLIC_VACANCY_CATALOGUE).success,
    ).toBe(true);
    expect(PUBLIC_EMPLOYER_CONTEXT.displayName).toBe("our company");
    expect(PUBLIC_VACANCY_CATALOGUE.map((vacancy) => vacancy.key)).toEqual([
      "frontend-developer",
      "backend-developer",
    ]);
    for (const vacancy of PUBLIC_VACANCY_CATALOGUE) {
      expect(vacancy).toMatchObject({
        employmentType: "full_time",
        workPattern: "remote_within_europe",
        salaryRange: {
          currency: "EUR",
          minimumGrossAnnual: 40_000,
          maximumGrossAnnual: 55_000,
        },
      });
    }
    expect(PUBLIC_VACANCY_CATALOGUE[0]?.responsibilities).not.toEqual(
      PUBLIC_VACANCY_CATALOGUE[1]?.responsibilities,
    );
  });

  it("keeps Full Stack unconfirmed and covers fixed candidate questions", () => {
    expect(ROLE_CATALOGUE_BOUNDARY.confirmedVacancies).toHaveLength(2);
    expect(
      ROLE_CATALOGUE_BOUNDARY.confirmedVacancies.map(({ label }) => label),
    ).not.toContain("Full Stack");
    expect(ROLE_CATALOGUE_BOUNDARY.unavailableRoleGuidance).toContain(
      "only Frontend Developer and Backend Developer are confirmed",
    );
    expect(ROLE_CATALOGUE_BOUNDARY.neitherConfirmedGuidance).toContain(
      "human follow-up",
    );
    expect(EMPLOYER_FAQ.map(({ key }) => key)).toEqual(
      expect.arrayContaining([
        "company-work",
        "confirmed-openings",
        "full-stack-boundary",
        "remote-pattern",
        "salary",
        "benefits",
        "availability",
        "screening-process",
        "unsupported-detail",
      ]),
    );
  });

  it("provides a versioned deterministic discovery plan without scripted questions", () => {
    expect(CONVERSATION_FIRST_PLAN_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    expect(screeningPlanSchema.safeParse(CONVERSATION_FIRST_PLAN).success).toBe(
      true,
    );
    expect(CONVERSATION_FIRST_PLAN).toMatchObject({
      entryMode: "conversation_first",
      branch: "discovery",
      vacancyClarification: {
        confirmedVacancyKeys: [],
        suggestedVacancyKey: null,
        cvFactIds: [],
      },
    });
    expect(new Set(CONVERSATION_FIRST_PLAN.fixedTopics)).toEqual(
      new Set(FIXED_TOPIC_KEYS),
    );
    expect(
      CONVERSATION_FIRST_PLAN.topics.every(
        (topic) => topic.cvFactIds.length === 0,
      ),
    ).toBe(true);

    const dormantRoleBranches = CONVERSATION_FIRST_PLAN.topics.filter(
      (topic) => topic.applicableVacancyKeys.length === 1,
    );
    expect(dormantRoleBranches).toHaveLength(2);
    expect(dormantRoleBranches.every((topic) => !topic.required)).toBe(true);
    expect(
      dormantRoleBranches.flatMap((topic) => topic.applicableVacancyKeys),
    ).toEqual(["frontend-developer", "backend-developer"]);

    const planText = JSON.stringify(CONVERSATION_FIRST_PLAN);
    expect(planText).not.toContain("?");
    expect(planText).not.toContain("Hi, what's your name");
  });

  it("keeps the fixture corpus explicit, varied, and synthetic", () => {
    const manifest = fixtureManifestSchema.parse(
      JSON.parse(readCvFixture("fixture-manifest.json")),
    );

    for (const fixture of manifest.fixtures) {
      const fixtureText = readCvFixture(fixture.file);
      expect(fixtureText).toContain("SCREENPILOT SYNTHETIC CV FIXTURE");
      expect(fixtureText.length).toBeGreaterThanOrEqual(500);
      expect(fixtureText).not.toMatch(
        /\b(?:Google|Microsoft|Amazon|Meta|Apple|OpenAI|ElevenLabs)\b/i,
      );
      expect(fixtureText).not.toMatch(
        /\b(?:United Kingdom|Germany|France|Spain|Italy|Netherlands|Poland)\b/i,
      );
    }

    const profileSignatures = new Set(
      manifest.fixtures.map((fixture) =>
        JSON.stringify({
          experienceLevel: fixture.expected.experienceLevel,
          roleAlignment: fixture.expected.roleAlignment,
          factSignals: fixture.expected.factSignals,
          topicDirections: fixture.expected.topicDirections,
        }),
      ),
    );
    expect(profileSignatures.size).toBe(manifest.fixtures.length);
    expect(
      manifest.fixtures.find((fixture) => fixture.id === "correction")?.expected
        .expectedCorrection,
    ).toEqual({ from: "Taylor Venn", to: "Tay" });
    expect(
      manifest.fixtures.find((fixture) => fixture.id === "prompt-injection")
        ?.expected.adversarial,
    ).toBe(true);
  });
});
