import {
  publicEmployerContextSchema,
  publicVacancyCatalogueSchema,
} from "@screenpilot/contracts/interview/employer-context";

import { EMPLOYER_FACTS, EMPLOYER_FAQ } from "./employer-faq.js";

const SHARED_BENEFITS = [
  "Structured onboarding",
  "Mentorship",
  "Learning budget",
  "Optional team meetups",
] as const;

const SYNTHETIC_SALARY_RANGE = {
  currency: "EUR",
  minimumGrossAnnual: 40_000,
  maximumGrossAnnual: 55_000,
} as const;

export const PUBLIC_EMPLOYER_CONTEXT = publicEmployerContextSchema.parse({
  catalogueKey: "demo-engineering",
  displayName: "our company",
  summary:
    "Our company is an unnamed synthetic employer building internal workflow products for distributed teams. The two confirmed openings are full-time and remote within Europe.",
  facts: EMPLOYER_FACTS,
  faq: EMPLOYER_FAQ,
});

export const PUBLIC_VACANCY_CATALOGUE = publicVacancyCatalogueSchema.parse([
  {
    key: "frontend-developer",
    title: "Frontend Developer",
    employmentType: "full_time",
    workPattern: "remote_within_europe",
    summary:
      "A synthetic full-time role focused on accessible, responsive interfaces for internal workflow products used by distributed teams.",
    responsibilities: [
      "Build and maintain accessible customer-facing product interfaces.",
      "Collaborate with product and design on clear workflow experiences.",
      "Participate in collaborative code review and lightweight agile delivery.",
    ],
    requirements: [
      "Relevant professional, internship, academic, or personal experience building web interfaces.",
      "Ability to explain broad frontend responsibilities without a framework-specific assessment.",
      "Comfort collaborating in a remote-first distributed team.",
    ],
    benefits: [...SHARED_BENEFITS],
    salaryRange: SYNTHETIC_SALARY_RANGE,
  },
  {
    key: "backend-developer",
    title: "Backend Developer",
    employmentType: "full_time",
    workPattern: "remote_within_europe",
    summary:
      "A synthetic full-time role focused on reliable server-side product services and data flows for internal workflow products.",
    responsibilities: [
      "Build and maintain reliable server-side product services.",
      "Support clear application data flows and service integrations.",
      "Participate in collaborative code review and lightweight agile delivery.",
    ],
    requirements: [
      "Relevant professional, internship, academic, or personal experience with server-side services or APIs.",
      "Ability to explain broad backend responsibilities without an architecture or coding assessment.",
      "Comfort collaborating in a remote-first distributed team.",
    ],
    benefits: [...SHARED_BENEFITS],
    salaryRange: SYNTHETIC_SALARY_RANGE,
  },
]);
