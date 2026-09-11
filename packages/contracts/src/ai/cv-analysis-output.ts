import { z } from "zod";

import {
  EXPERIENCE_LEVELS,
  normalizedCvFactSchema,
  normalizedCvSchema,
  type NormalizedCv,
} from "../interview/normalized-cv.js";
import {
  FIXED_TOPIC_KEYS,
  screeningPlanSchema,
  type ScreeningPlan,
} from "../interview/screening-plan.js";

const technicalEvaluationPattern =
  /\b(?:coding challenge|framework trivia|system design|technical (?:assessment|exercise|interview|question|quiz|screen))\b|\b(?:ask|assess|evaluate|explore|follow up|grade|probe|question|quiz|score|test)\b.{0,80}\b(?:algorithm|api|architecture|coding|debugging|framework|implementation|system design|technical|testing)\b/i;
const unsupportedAssessmentPattern =
  /\b(?:accent|age|culture[ -]?fit|disability|employability|employable|ethnicity|gender|hire|hired|hiring|marital status|nationality|personality|pregnancy|protected(?: trait)?|race|rank|ranked|ranking|rating|reject|rejected|rejection|religion|sentiment|sexual orientation|score|scored|scoring)\b|\b(?:recommend|recommendation)\b.{0,40}\b(?:candidate|hire|hiring|reject|role)\b/i;
const unsupportedApplicationClaimPattern =
  /\b(?:applied|application)\b.{0,48}\b(?:Backend|Frontend|Full Stack)\b/i;
const unsupportedPlanApplicationClaimPattern =
  /\b(?:applied\s+(?:for|to)|application\s+(?:for|to)|(?:Backend|Frontend|Full Stack)\b.{0,48}\b(?:applied|application))\b/i;

const modelAmbiguitySchema = z.strictObject({
  description: z.string().trim().min(1).max(500),
  evidenceExcerpt: z.string().trim().min(1).max(500).nullable(),
});

const modelNormalizedCvSchema = z.strictObject({
  displayName: z.string().trim().min(1).max(120).nullable(),
  displayNameEvidence: z.string().trim().min(1).max(300).nullable(),
  headline: z.string().trim().min(1).max(240).nullable(),
  experienceLevel: z.enum(EXPERIENCE_LEVELS),
  facts: z.array(normalizedCvFactSchema).max(32),
  ambiguities: z.array(modelAmbiguitySchema).max(16),
});

function addIssue(
  context: z.core.$RefinementCtx,
  message: string,
  path: PropertyKey[],
): void {
  context.addIssue({ code: "custom", message, path });
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function planDescriptions(plan: ScreeningPlan): string[] {
  return [
    plan.openingIntent,
    plan.vacancyClarification.reason,
    ...plan.topics.flatMap((topic) => [
      topic.key,
      topic.title,
      topic.reason,
      topic.intent,
      ...topic.coverageCriteria,
      ...topic.followupDirections,
    ]),
  ];
}

function hasExperienceLevelEvidence(
  experienceLevel: CvAnalysisValidationInput["cv"]["experienceLevel"],
  facts: CvAnalysisValidationInput["cv"]["facts"],
): boolean {
  const supportingCategories =
    experienceLevel === "graduate"
      ? new Set(["education", "experience", "project"])
      : new Set(["experience", "project"]);
  return facts.some((fact) => supportingCategories.has(fact.category));
}

type CvAnalysisValidationInput = Readonly<{
  cv: Readonly<{
    ambiguities: readonly Readonly<{ description: string }>[];
    displayName: string | null;
    displayNameEvidence: string | null;
    experienceLevel: "experienced" | "graduate" | "junior" | "unclear";
    facts: readonly Readonly<{
      category:
        | "education"
        | "experience"
        | "language"
        | "location"
        | "project"
        | "skill";
      id: string;
      statement: string;
    }>[];
    headline: string | null;
  }>;
  plan: ScreeningPlan;
}>;

function validateCvAnalysisOutput(
  output: CvAnalysisValidationInput,
  context: z.core.$RefinementCtx,
): void {
  if (
    (output.cv.displayName === null) !==
    (output.cv.displayNameEvidence === null)
  ) {
    addIssue(
      context,
      "A display name and its evidence must be present or absent together.",
      ["cv", "displayNameEvidence"],
    );
  }

  const factIds = output.cv.facts.map((fact) => fact.id);
  if (hasDuplicates(factIds)) {
    addIssue(context, "CV fact IDs must be unique.", ["cv", "facts"]);
  }
  if (
    output.cv.experienceLevel !== "unclear" &&
    !hasExperienceLevelEvidence(output.cv.experienceLevel, output.cv.facts)
  ) {
    addIssue(
      context,
      "A classified experience level requires supporting education, experience, or project evidence.",
      ["cv", "experienceLevel"],
    );
  }
  const candidateDescriptions = [
    ...output.cv.facts.map((fact) => fact.statement),
    output.cv.headline,
    ...output.cv.ambiguities.map((ambiguity) => ambiguity.description),
  ].filter((value): value is string => typeof value === "string");
  if (
    candidateDescriptions.some((value) =>
      unsupportedAssessmentPattern.test(value),
    )
  ) {
    addIssue(
      context,
      "CV analysis cannot contain a score, hiring judgment, or sensitive inference.",
      ["cv"],
    );
  }
  if (
    candidateDescriptions.some((value) =>
      unsupportedApplicationClaimPattern.test(value),
    )
  ) {
    addIssue(
      context,
      "CV analysis cannot claim that the candidate applied for a vacancy.",
      ["cv"],
    );
  }

  const screeningPlanDescriptions = planDescriptions(output.plan);
  if (screeningPlanDescriptions.some((value) => value.includes("?"))) {
    addIssue(
      context,
      "Screening plans must describe intent and direction rather than literal questions.",
      ["plan"],
    );
  }
  if (
    screeningPlanDescriptions.some((value) =>
      unsupportedAssessmentPattern.test(value),
    )
  ) {
    addIssue(
      context,
      "Screening plans cannot contain scoring, ranking, hiring judgments, or sensitive inference.",
      ["plan"],
    );
  }
  if (
    screeningPlanDescriptions.some((value) =>
      unsupportedPlanApplicationClaimPattern.test(value),
    )
  ) {
    addIssue(
      context,
      "Screening plans cannot claim that the candidate applied for a role.",
      ["plan"],
    );
  }
  if (
    screeningPlanDescriptions.some((value) =>
      technicalEvaluationPattern.test(value),
    )
  ) {
    addIssue(
      context,
      "Technical evaluation directions are not allowed in an HR screening plan.",
      ["plan"],
    );
  }

  if (output.plan.entryMode !== "cv_assisted") {
    addIssue(context, "CV analysis must produce a CV-assisted plan.", [
      "plan",
      "entryMode",
    ]);
  }
  if (output.plan.branch === "discovery") {
    addIssue(context, "CV-assisted plans cannot use the discovery branch.", [
      "plan",
      "branch",
    ]);
  }
  if (output.plan.vacancyClarification.confirmedVacancyKeys.length > 0) {
    addIssue(
      context,
      "A CV cannot confirm the candidate's requested vacancy.",
      ["plan", "vacancyClarification", "confirmedVacancyKeys"],
    );
  }
  if (
    output.plan.vacancyClarification.suggestedVacancyKey !== null &&
    output.plan.vacancyClarification.cvFactIds.length === 0
  ) {
    addIssue(
      context,
      "A suggested vacancy requires at least one linked CV fact.",
      ["plan", "vacancyClarification", "cvFactIds"],
    );
  }

  const topicKeys = output.plan.topics.map((topic) => topic.key);
  if (hasDuplicates(topicKeys)) {
    addIssue(context, "Screening topic keys must be unique.", [
      "plan",
      "topics",
    ]);
  }
  if (
    output.plan.fixedTopics.length !== FIXED_TOPIC_KEYS.length ||
    FIXED_TOPIC_KEYS.some((key) => !output.plan.fixedTopics.includes(key))
  ) {
    addIssue(
      context,
      "CV-assisted plans must retain every fixed HR screening topic.",
      ["plan", "fixedTopics"],
    );
  }
  for (const key of FIXED_TOPIC_KEYS) {
    if (!topicKeys.includes(key)) {
      addIssue(context, `CV-assisted plans must define the ${key} topic.`, [
        "plan",
        "topics",
      ]);
    }
  }

  const knownFactIds = new Set(factIds);
  const referencedFactIds = [
    ...output.plan.vacancyClarification.cvFactIds,
    ...output.plan.topics.flatMap((topic) => topic.cvFactIds),
  ];
  for (const factId of referencedFactIds) {
    if (!knownFactIds.has(factId)) {
      addIssue(
        context,
        `Screening plan references unknown CV fact ${factId}.`,
        ["plan", "topics"],
      );
    }
  }
}

export const cvAnalysisModelOutputSchema = z
  .strictObject({
    cv: modelNormalizedCvSchema,
    plan: screeningPlanSchema,
  })
  .superRefine(validateCvAnalysisOutput);

export const cvAnalysisOutputSchema = z
  .strictObject({
    cv: normalizedCvSchema,
    plan: screeningPlanSchema,
  })
  .superRefine(validateCvAnalysisOutput);

export type CvAnalysisModelOutput = z.infer<typeof cvAnalysisModelOutputSchema>;

export type ValidatedCvAnalysis = Readonly<{
  cv: NormalizedCv;
  plan: ScreeningPlan;
}>;

export function normalizeCvAnalysisModelOutput(
  output: CvAnalysisModelOutput,
): ValidatedCvAnalysis {
  return {
    cv: {
      ...output.cv,
      ambiguities: output.cv.ambiguities.map((ambiguity) =>
        ambiguity.evidenceExcerpt === null
          ? { description: ambiguity.description }
          : {
              description: ambiguity.description,
              evidenceExcerpt: ambiguity.evidenceExcerpt,
            },
      ),
    },
    plan: output.plan,
  };
}

export const cvAnalysisModelOutputJsonSchema = z.toJSONSchema(
  cvAnalysisModelOutputSchema,
  { target: "draft-7" },
);
