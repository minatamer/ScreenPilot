import type { PublicEmployerContext } from "@screenpilot/contracts/interview/employer-context";

export const ROLE_CATALOGUE_BOUNDARY = Object.freeze({
  confirmedVacancies: [
    { key: "frontend-developer", label: "Frontend Developer" },
    { key: "backend-developer", label: "Backend Developer" },
  ],
  unconfirmedRoleExample: "Full Stack",
  unavailableRoleGuidance:
    "Record the candidate's requested role in their own words, explain that only Frontend Developer and Backend Developer are confirmed, and ask whether the screening should cover one or both confirmed openings.",
  neitherConfirmedGuidance:
    "Continue with a general engineering screen and record that vacancy matching requires human follow-up; never invent or promise another opening.",
  humanFollowupStatement:
    "A human recruiter would need to follow up on details outside this synthetic demo context.",
} as const);

export const EMPLOYER_FACTS = [
  {
    key: "company-work",
    statement:
      "Our company builds internal workflow products for distributed teams.",
  },
  {
    key: "confirmed-openings",
    statement:
      "The only confirmed openings are Frontend Developer and Backend Developer.",
  },
  {
    key: "employment-and-location",
    statement:
      "Both confirmed openings are full-time and remote within Europe.",
  },
  {
    key: "work-pattern",
    statement: "The work pattern is remote-first with optional team meetups.",
  },
  {
    key: "delivery-practice",
    statement:
      "The team uses collaborative code review and lightweight agile delivery.",
  },
  {
    key: "compensation",
    statement:
      "The synthetic range for either confirmed opening is EUR 40,000 to EUR 55,000 gross annually.",
  },
] satisfies PublicEmployerContext["facts"];

export const EMPLOYER_FAQ = [
  {
    key: "company-work",
    question: "What does the company build?",
    answer:
      "Our company builds internal workflow products for distributed teams.",
  },
  {
    key: "confirmed-openings",
    question: "Which positions are confirmed?",
    answer:
      "The confirmed openings are Frontend Developer and Backend Developer. Both are synthetic demo vacancies.",
  },
  {
    key: "full-stack-boundary",
    question: "Is there a Full Stack opening?",
    answer:
      "No Full Stack opening is confirmed. ScreenPilot may record that preference, but a human recruiter must follow up while the screening covers Frontend, Backend, both, or remains general.",
  },
  {
    key: "remote-pattern",
    question: "Where and how does the team work?",
    answer:
      "Both openings are full-time and remote within Europe. The team is remote-first, with optional team meetups and no country-specific location in this demo.",
  },
  {
    key: "salary",
    question: "What is the compensation range?",
    answer:
      "The synthetic employer range for either confirmed opening is EUR 40,000 to EUR 55,000 gross annually.",
  },
  {
    key: "benefits",
    question: "Which benefits are included?",
    answer:
      "Both openings include structured onboarding, mentorship, a learning budget, and optional team meetups.",
  },
  {
    key: "availability",
    question: "When would the role start?",
    answer:
      "The synthetic vacancy context does not set a start date. Candidate availability is recorded for human review and is not treated as a hiring score.",
  },
  {
    key: "screening-process",
    question: "What happens after this screening?",
    answer:
      "The demo produces evidence-linked notes for human review. It does not make, promise, or communicate a hiring decision.",
  },
  {
    key: "unsupported-detail",
    question: "What if a company detail is not listed here?",
    answer: ROLE_CATALOGUE_BOUNDARY.humanFollowupStatement,
  },
] satisfies PublicEmployerContext["faq"];
