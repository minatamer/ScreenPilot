import { readFileSync } from "node:fs";

import { publicRoleNeutralDemoContextSchema } from "@screenpilot/contracts/interview/demo-context";
import {
  FIXED_TOPIC_KEYS,
  screeningPlanSchema,
  UNIVERSAL_TOPIC_KEYS,
} from "@screenpilot/contracts/interview/screening-plan";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  CONVERSATION_FIRST_PLAN,
  CONVERSATION_FIRST_PLAN_VERSION,
} from "./conversation-first-plan.js";
import { PUBLIC_ROLE_NEUTRAL_DEMO_CONTEXT } from "./role-neutral-demo-context.js";

const fixtureManifestSchema = z.strictObject({
  schemaVersion: z.literal(2),
  synthetic: z.literal(true),
  scope: z.literal("role-agnostic"),
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
          suggestedRole: z.string().min(1).max(120).nullable(),
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
    .length(11),
});

function readCvFixture(file: string): string {
  return readFileSync(
    new URL(`../../../../tests/fixtures/cv/${file}`, import.meta.url),
    "utf8",
  );
}

describe("SP-010A server-owned role-neutral demo content", () => {
  it("exposes only the role-neutral synthetic-demo disclosure", () => {
    expect(
      publicRoleNeutralDemoContextSchema.parse(
        PUBLIC_ROLE_NEUTRAL_DEMO_CONTEXT,
      ),
    ).toEqual({
      kind: "role_agnostic_first_stage_hr_screen",
      roleAvailability: "candidate_selected_synthetic_session_vacancy",
      employerFactsAvailable: false,
    });
    expect(JSON.stringify(PUBLIC_ROLE_NEUTRAL_DEMO_CONTEXT)).not.toMatch(
      /roles|openings|salary|benefits|location|responsibilities|qualifications/i,
    );
  });

  it("provides a universal deterministic discovery plan without scripted questions", () => {
    expect(CONVERSATION_FIRST_PLAN_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    expect(screeningPlanSchema.parse(CONVERSATION_FIRST_PLAN)).toEqual(
      CONVERSATION_FIRST_PLAN,
    );
    expect(CONVERSATION_FIRST_PLAN).toMatchObject({
      entryMode: "conversation_first",
      branch: "discovery",
      roleClarification: {
        suggestedRole: null,
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
    expect(CONVERSATION_FIRST_PLAN.topics.map((topic) => topic.key)).toContain(
      "clarifications_and_followups",
    );
    expect(CONVERSATION_FIRST_PLAN.topics.map((topic) => topic.key)).toEqual([
      ...UNIVERSAL_TOPIC_KEYS,
    ]);
    expect(
      CONVERSATION_FIRST_PLAN.topics.find(
        (topic) => topic.key === "clarifications_and_followups",
      ),
    ).toMatchObject({ required: false });

    const planText = JSON.stringify(CONVERSATION_FIRST_PLAN);
    expect(planText).not.toContain("?");
    expect(planText).not.toMatch(
      /frontend|backend|full stack|remote within europe|40,?000|55,?000|coding challenge/i,
    );
  });

  it("keeps the fixture corpus cross-profession, varied, and synthetic", () => {
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
    }

    expect(
      manifest.fixtures.map((fixture) => fixture.expected.suggestedRole),
    ).toEqual(
      expect.arrayContaining([
        "Graphic Designer",
        "Customer Support Representative",
        "Product Manager",
        "Backend Developer",
        "Full Stack Developer",
        null,
      ]),
    );
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
