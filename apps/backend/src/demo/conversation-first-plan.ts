import { screeningPlanSchema } from "@screenpilot/contracts/interview/screening-plan";

export const CONVERSATION_FIRST_PLAN_VERSION = "2026-09-09.1";

export const CONVERSATION_FIRST_PLAN = screeningPlanSchema.parse({
  entryMode: "conversation_first",
  openingIntent:
    "Learn the candidate's preferred name and requested role before building a concise, evidence-led recruiter screening.",
  branch: "discovery",
  vacancyClarification: {
    confirmedVacancyKeys: [],
    suggestedVacancyKey: null,
    reason:
      "No application or CV establishes a role; the candidate must describe and confirm the screening direction.",
    cvFactIds: [],
    requiresCandidateConfirmation: true,
  },
  topics: [
    {
      key: "preferred_name",
      title: "Preferred name",
      reason: "Use the name the candidate chooses for this conversation.",
      cvFactIds: [],
      applicableVacancyKeys: [],
      intent:
        "Learn the candidate-stated preferred name without assuming identity details.",
      coverageCriteria: [
        "A final candidate turn supplies the preferred name or explicitly declines.",
      ],
      followupDirections: [
        "Accept a correction once and use the corrected name from then on.",
      ],
      required: true,
    },
    {
      key: "role_preference",
      title: "Requested role and screening direction",
      reason:
        "The fixed catalogue does not prove what position the candidate wants.",
      cvFactIds: [],
      applicableVacancyKeys: [],
      intent:
        "Learn the requested role in the candidate's own words, then confirm Frontend, Backend, both, or an unresolved general screen.",
      coverageCriteria: [
        "The requested label is recorded from a final candidate turn.",
        "The confirmed vacancy set contains Frontend, Backend, both, or remains unresolved.",
        "An unavailable request remains separate from the confirmed vacancy set.",
      ],
      followupDirections: [
        "If background is missing, learn one inclusive work, study, or strongest-skill context before presenting the confirmed catalogue.",
        "For Full Stack or another unavailable request, preserve the wording and explain the confirmed two-vacancy boundary.",
        "If neither confirmed role fits, keep the screen general and mark human follow-up.",
      ],
      required: true,
    },
    {
      key: "current_context",
      title: "Current context",
      reason:
        "A recruiter needs a concise view of the candidate's current or most recent professional context.",
      cvFactIds: [],
      applicableVacancyKeys: [],
      intent:
        "Learn whether the candidate is working, studying, between roles, or in another relevant context without assuming a conventional path.",
      coverageCriteria: [
        "One clear candidate statement describes the current or most recent context.",
      ],
      followupDirections: [
        "Use the candidate's own context such as work, internship, studies, volunteering, or career break.",
      ],
      required: true,
    },
    {
      key: "relevant_experience_summary",
      title: "Relevant experience summary",
      reason:
        "The review needs a grounded high-level synthesis rather than a recreated CV or technical assessment.",
      cvFactIds: [],
      applicableVacancyKeys: [],
      intent:
        "Synthesize recent context, broad responsibilities, strongest self-described areas, and relevant direction from volunteered details.",
      coverageCriteria: [
        "The available candidate evidence supports a concise high-level experience summary.",
        "Responsibilities and strongest areas retain the candidate's meaning and uncertainty.",
      ],
      followupDirections: [
        "Use at most one broad responsibility or ownership clarification when the context remains too vague.",
        "Do not pursue implementation, architecture, API, debugging, testing, or framework depth.",
      ],
      required: true,
    },
    {
      key: "team_work_style",
      title: "Team and work style",
      reason:
        "A recruiter-readable collaboration preference should remain separate from technical experience.",
      cvFactIds: [],
      applicableVacancyKeys: [],
      intent:
        "Learn one candidate-stated preference or example about collaboration, independence, communication, feedback, or helpful work environment.",
      coverageCriteria: [
        "One explicit candidate preference or example is recorded without personality inference.",
      ],
      followupDirections: [
        "Use one broad work-style intent only when the field has not already emerged.",
      ],
      required: true,
    },
    {
      key: "motivation_and_next_role",
      title: "Motivation and next role",
      reason:
        "The screen should capture what the candidate wants next without requiring criticism of a current employer.",
      cvFactIds: [],
      applicableVacancyKeys: [],
      intent:
        "Learn at least one motivation, next-role priority, growth area, or responsibility the candidate wants.",
      coverageCriteria: [
        "The candidate states a motivation, goal, or preferred growth area, or declines to discuss it.",
      ],
      followupDirections: [
        "Preserve neutral wording around job changes, gaps, and declined answers.",
      ],
      required: true,
    },
    {
      key: "remote_europe_fit",
      title: "Remote-Europe work pattern",
      reason:
        "Both confirmed openings are full-time, remote-first, and limited to remote work within Europe.",
      cvFactIds: [],
      applicableVacancyKeys: [],
      intent:
        "Confirm whether the fixed work pattern fits and record any volunteered working-hour or time-zone constraint.",
      coverageCriteria: [
        "The candidate confirms, declines, or identifies a work-pattern constraint.",
      ],
      followupDirections: [
        "Ask only about work logistics and never nationality or another protected trait.",
      ],
      required: true,
    },
    {
      key: "availability",
      title: "Availability",
      reason: "Human review needs a realistic earliest start or uncertainty.",
      cvFactIds: [],
      applicableVacancyKeys: [],
      intent:
        "Learn the notice period or earliest start timing while allowing uncertainty or a declined answer.",
      coverageCriteria: [
        "Timing, uncertainty, or a decision not to answer is recorded faithfully.",
      ],
      followupDirections: [],
      required: true,
    },
    {
      key: "compensation_expectation",
      title: "Compensation expectation",
      reason:
        "The synthetic employer range is EUR 40,000 to EUR 55,000 gross annually, but the candidate's expectation remains neutral evidence.",
      cvFactIds: [],
      applicableVacancyKeys: [],
      intent:
        "Learn the candidate's expected range with currency and period when offered, while allowing them to decline.",
      coverageCriteria: [
        "A candidate-stated expectation, uncertainty, or decline is recorded without scoring or negotiation.",
      ],
      followupDirections: [],
      required: true,
    },
    {
      key: "english_use_context",
      title: "Candidate-stated English use",
      reason:
        "The screen may record the candidate's own English-use context but never rate language, grammar, or accent.",
      cvFactIds: [],
      applicableVacancyKeys: [],
      intent:
        "Learn whether and where the candidate uses English in work, study, or collaboration when it has not emerged naturally.",
      coverageCriteria: [
        "Only a candidate statement about English-use context is recorded.",
      ],
      followupDirections: [],
      required: true,
    },
    {
      key: "candidate_questions",
      title: "Candidate questions and close",
      reason:
        "The candidate should have one clear opportunity to ask about the role, company context, process, or benefits.",
      cvFactIds: [],
      applicableVacancyKeys: [],
      intent:
        "Offer one opportunity for candidate questions, answer only from fixed context, identify unsupported details for human follow-up, and close as human review.",
      coverageCriteria: [
        "The candidate asks a question or confirms they have none.",
        "Unsupported company details are left for human follow-up rather than invented.",
      ],
      followupDirections: [
        "Accept zero questions as complete and do not manufacture another topic.",
      ],
      required: true,
    },
    {
      key: "frontend_role_context",
      title: "Dormant Frontend role context",
      reason:
        "This branch becomes relevant only after the candidate confirms Frontend coverage.",
      cvFactIds: [],
      applicableVacancyKeys: ["frontend-developer"],
      intent:
        "Learn at recruiter level whether the candidate broadly identifies with customer-facing interfaces, product UI, or another frontend responsibility when still unclear.",
      coverageCriteria: [
        "A broad Frontend responsibility or direction is supported by candidate evidence.",
      ],
      followupDirections: [
        "Keep the branch dormant unless Frontend is confirmed and the direction is still unclear.",
        "Do not ask framework, implementation, testing, debugging, or design-system questions.",
      ],
      required: false,
    },
    {
      key: "backend_role_context",
      title: "Dormant Backend role context",
      reason:
        "This branch becomes relevant only after the candidate confirms Backend coverage.",
      cvFactIds: [],
      applicableVacancyKeys: ["backend-developer"],
      intent:
        "Learn at recruiter level whether the candidate broadly identifies with server-side services, data or API work, or another backend responsibility when still unclear.",
      coverageCriteria: [
        "A broad Backend responsibility or direction is supported by candidate evidence.",
      ],
      followupDirections: [
        "Keep the branch dormant unless Backend is confirmed and the direction is still unclear.",
        "Do not ask architecture, implementation, API design, testing, or debugging questions.",
      ],
      required: false,
    },
    {
      key: "clarifications_and_followups",
      title: "Clarifications and human follow-up",
      reason:
        "Real contradictions, unsupported employer questions, or unavailable requested roles must remain visible without prolonging every screen.",
      cvFactIds: [],
      applicableVacancyKeys: [],
      intent:
        "Record only a genuine ambiguity, missing logistical detail, unavailable requested role, or unsupported detail requiring human follow-up.",
      coverageCriteria: [
        "A real unresolved item is recorded, or the topic remains not applicable.",
      ],
      followupDirections: [
        "Do not create a clarification merely to fill this optional slot.",
      ],
      required: false,
    },
  ],
  fixedTopics: [
    "preferred_name",
    "role_preference",
    "current_context",
    "relevant_experience_summary",
    "team_work_style",
    "motivation_and_next_role",
    "remote_europe_fit",
    "availability",
    "compensation_expectation",
    "english_use_context",
    "candidate_questions",
  ],
});
