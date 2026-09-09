import { z } from "zod";

export const VACANCY_CATALOG_KEY = "demo-engineering" as const;
export const VACANCY_KEYS = [
  "frontend-developer",
  "backend-developer",
] as const;

export const vacancyCatalogKeySchema = z.literal(VACANCY_CATALOG_KEY);
export const vacancyKeySchema = z.enum(VACANCY_KEYS);

const publicEmployerFactSchema = z.strictObject({
  key: z.string().trim().min(1).max(64),
  statement: z.string().trim().min(1).max(400),
});

const publicEmployerFaqSchema = z.strictObject({
  key: z.string().trim().min(1).max(64),
  question: z.string().trim().min(1).max(200),
  answer: z.string().trim().min(1).max(600),
});

export const publicEmployerContextSchema = z.strictObject({
  catalogueKey: vacancyCatalogKeySchema,
  displayName: z.enum(["our company", "the company"]),
  summary: z.string().trim().min(1).max(600),
  facts: z.array(publicEmployerFactSchema).max(16),
  faq: z.array(publicEmployerFaqSchema).max(16),
});

const publicSalaryRangeSchema = z.strictObject({
  currency: z.literal("EUR"),
  minimumGrossAnnual: z.number().int().nonnegative(),
  maximumGrossAnnual: z.number().int().positive(),
});

export const publicVacancySnapshotSchema = z
  .strictObject({
    key: vacancyKeySchema,
    title: z.string().trim().min(1).max(100),
    employmentType: z.literal("full_time"),
    workPattern: z.literal("remote_within_europe"),
    summary: z.string().trim().min(1).max(600),
    responsibilities: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
    requirements: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
    benefits: z.array(z.string().trim().min(1).max(300)).max(12),
    salaryRange: publicSalaryRangeSchema,
  })
  .superRefine((vacancy, context) => {
    if (
      vacancy.salaryRange.minimumGrossAnnual >
      vacancy.salaryRange.maximumGrossAnnual
    ) {
      context.addIssue({
        code: "custom",
        message: "The salary minimum cannot exceed the maximum.",
        path: ["salaryRange", "minimumGrossAnnual"],
      });
    }
  });

export const publicVacancyCatalogueSchema = z
  .array(publicVacancySnapshotSchema)
  .length(2)
  .superRefine((vacancies, context) => {
    const vacancyKeys = new Set(vacancies.map((vacancy) => vacancy.key));
    if (
      vacancyKeys.size !== 2 ||
      !vacancyKeys.has("frontend-developer") ||
      !vacancyKeys.has("backend-developer")
    ) {
      context.addIssue({
        code: "custom",
        message:
          "The public catalogue must contain one Frontend and one Backend vacancy.",
      });
    }
  });

export type PublicEmployerContext = z.infer<typeof publicEmployerContextSchema>;
export type PublicVacancyCatalogue = z.infer<
  typeof publicVacancyCatalogueSchema
>;
export type PublicVacancySnapshot = z.infer<typeof publicVacancySnapshotSchema>;
export type VacancyCatalogKey = z.infer<typeof vacancyCatalogKeySchema>;
export type VacancyKey = z.infer<typeof vacancyKeySchema>;
