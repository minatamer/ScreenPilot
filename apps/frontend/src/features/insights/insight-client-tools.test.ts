import type { InsightCard } from "@screenpilot/contracts/interview/insight-card";
import type { TopicProgress } from "@screenpilot/contracts/interview/topic-progress";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";
import { describe, expect, it } from "vitest";

import {
  createInsightClientTools,
  type InsightToolSnapshot,
} from "./insight-client-tools";

const NOW = "2026-09-15T08:00:00.000Z";

function candidateTurn(
  id: string,
  sequence: number,
  text: string,
): TranscriptTurn {
  return {
    id,
    sequence,
    speaker: "candidate",
    status: "final",
    text,
    occurredAt: NOW,
  };
}

function dispatcher(initialSnapshot: InsightToolSnapshot): Readonly<{
  getSnapshot: () => InsightToolSnapshot;
  tools: ReturnType<typeof createInsightClientTools>;
}> {
  let snapshot = initialSnapshot;
  const tools = createInsightClientTools({
    getSnapshot: () => snapshot,
    now: () => NOW,
    onInsight: (insight) => {
      const existingIndex = snapshot.insights.findIndex(
        (candidate) => candidate.id === insight.id,
      );
      snapshot = {
        ...snapshot,
        insights:
          existingIndex < 0
            ? [...snapshot.insights, insight]
            : snapshot.insights.map((candidate, index) =>
                index === existingIndex ? insight : candidate,
              ),
      };
    },
    onTopicProgress: (progress) => {
      const existingIndex = snapshot.topicProgress.findIndex(
        (candidate) => candidate.topicKey === progress.topicKey,
      );
      snapshot = {
        ...snapshot,
        topicProgress:
          existingIndex < 0
            ? [...snapshot.topicProgress, progress]
            : snapshot.topicProgress.map((candidate, index) =>
                index === existingIndex ? progress : candidate,
              ),
      };
    },
  });
  return { getSnapshot: () => snapshot, tools };
}

describe("SP-016 insight client-tool dispatcher", () => {
  it("records a neutral salary fact, rejects a duplicate, and preserves correction evidence", async () => {
    const firstTurn = candidateTurn(
      "turn-1",
      1,
      "I am looking for between €45k and €50k.",
    );
    const testDispatcher = dispatcher({
      entryMode: "conversation_first",
      insights: [],
      topicProgress: [],
      transcript: [firstTurn],
    });

    expect(
      await testDispatcher.tools.recordInsight({
        category: "compensation",
        label: "Compensation expectation",
        value: "Expected range €45k–€50k",
        source: "Candidate",
      }),
    ).toContain("Applied");
    expect(testDispatcher.getSnapshot().insights[0]).toMatchObject({
      category: "compensation",
      status: "appearing",
      source: "Candidate",
      evidenceTurnIds: ["turn-1"],
    });

    expect(
      await testDispatcher.tools.recordInsight({
        category: "compensation",
        label: "Compensation expectation",
        value: "Expected range €45k–€50k",
        source: "Candidate",
      }),
    ).toContain("already been applied");

    const secondTurn = candidateTurn(
      "turn-2",
      2,
      "Correction: my expectation is €52k.",
    );
    const correctedDispatcher = dispatcher({
      ...testDispatcher.getSnapshot(),
      transcript: [firstTurn, secondTurn],
    });
    await correctedDispatcher.tools.correctInsight({
      cardId: "insight-compensation",
      value: "Expected compensation €52k",
      reason: "Candidate corrected the earlier range.",
    });

    expect(correctedDispatcher.getSnapshot().insights[0]).toMatchObject({
      value: "Expected compensation €52k",
      status: "corrected",
      evidenceTurnIds: ["turn-1", "turn-2"],
      correctionReason: "Candidate corrected the earlier range.",
    });
    expect(
      await correctedDispatcher.tools.correctInsight({
        cardId: "insight-compensation",
        value: "Expected compensation €55k",
        reason: "Duplicate update for the same turn.",
      }),
    ).toContain("already been applied");
  });

  it("keeps a corrected card visibly corrected when later evidence confirms the same value", async () => {
    const correctionTurn = candidateTurn(
      "turn-1",
      1,
      "Correction: my expectation is €52k.",
    );
    const confirmationTurn = candidateTurn(
      "turn-2",
      2,
      "Yes, €52k is still my expected compensation.",
    );
    const testDispatcher = dispatcher({
      entryMode: "conversation_first",
      insights: [
        {
          id: "insight-compensation",
          category: "compensation",
          label: "Compensation expectation",
          value: "Expected compensation €52k",
          source: "Candidate",
          status: "corrected",
          evidenceTurnIds: [correctionTurn.id],
          cvFactIds: [],
          correctionReason: "Candidate corrected the earlier range.",
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
      topicProgress: [],
      transcript: [correctionTurn, confirmationTurn],
    });

    expect(
      await testDispatcher.tools.recordInsight({
        category: "compensation",
        label: "Compensation expectation",
        value: "Expected compensation €52k",
        source: "Candidate",
      }),
    ).toContain("Applied");
    expect(testDispatcher.getSnapshot().insights[0]).toMatchObject({
      status: "corrected",
      correctionReason: "Candidate corrected the earlier range.",
      evidenceTurnIds: ["turn-1", "turn-2"],
    });
  });

  it("rejects missing, stale, invented, cross-mode, and assessment-like evidence", async () => {
    const noEvidence = dispatcher({
      entryMode: "conversation_first",
      insights: [],
      topicProgress: [],
      transcript: [],
    });
    expect(
      await noEvidence.tools.recordInsight({
        category: "availability",
        label: "Availability",
        value: "Four weeks",
        source: "Candidate",
      }),
    ).toContain("Wait for the latest final candidate answer");

    const turn = candidateTurn("turn-1", 1, "I am available in four weeks.");
    const staleEvidence = dispatcher({
      entryMode: "conversation_first",
      insights: [],
      topicProgress: [],
      transcript: [
        turn,
        {
          ...turn,
          id: "turn-2",
          sequence: 2,
          speaker: "interviewer",
          text: "What would you like from your next role?",
        },
      ],
    });
    expect(
      await staleEvidence.tools.recordInsight({
        category: "availability",
        label: "Availability",
        value: "Four weeks",
        source: "Candidate",
      }),
    ).toContain("Wait for the latest final candidate answer");

    const validEvidence = dispatcher({
      entryMode: "conversation_first",
      insights: [],
      topicProgress: [],
      transcript: [turn],
    });
    expect(
      await validEvidence.tools.recordInsight({
        category: "availability",
        label: "Availability",
        value: "Four weeks",
        source: "Candidate",
        evidenceTurnIds: ["invented-turn"],
      }),
    ).toContain("arguments are invalid");
    expect(
      await validEvidence.tools.recordInsight({
        category: "availability",
        label: "Availability",
        value: "Four weeks",
        source: "CV",
      }),
    ).toContain("CV-only");
    expect(
      await validEvidence.tools.recordInsight({
        category: "english_use",
        label: "English proficiency score",
        value: "Excellent English proficiency",
        source: "Candidate",
      }),
    ).toContain("cannot contain scores");
  });

  it("guards every model-authored visible field without rejecting neutral exam facts or candidate questions", async () => {
    const turn = candidateTurn(
      "turn-1",
      1,
      "I passed my certification exam. How does your hiring process rank candidates?",
    );
    const forbiddenValues = [
      "Positive sentiment suggests a strong culture fit.",
      "Rank the candidate first with an excellent rating.",
      "Their age and religion make them suitable.",
      "The candidate should be hired.",
      "Recommend the candidate for this role.",
      "The candidate has excellent English proficiency.",
    ];

    for (const value of forbiddenValues) {
      const blockedDispatcher = dispatcher({
        entryMode: "conversation_first",
        insights: [],
        topicProgress: [],
        transcript: [turn],
      });
      expect(
        await blockedDispatcher.tools.recordInsight({
          category: "relevant_experience",
          label: "Relevant experience",
          value,
          source: "Candidate",
        }),
      ).toContain("cannot contain scores");
    }

    const allowedDispatcher = dispatcher({
      entryMode: "conversation_first",
      insights: [],
      topicProgress: [],
      transcript: [turn],
    });
    expect(
      await allowedDispatcher.tools.recordInsight({
        category: "relevant_experience",
        label: "Relevant experience",
        value: "Passed the professional certification exam in May.",
        source: "Candidate",
      }),
    ).toContain("Applied");
    expect(
      await allowedDispatcher.tools.recordCandidateQuestion({
        question: "How does your hiring process rank candidates?",
      }),
    ).toContain("Applied");

    const correctionTurn = candidateTurn(
      "turn-2",
      2,
      "I completed another certification last month.",
    );
    const correctionDispatcher = dispatcher({
      ...allowedDispatcher.getSnapshot(),
      transcript: [turn, correctionTurn],
    });
    expect(
      await correctionDispatcher.tools.correctInsight({
        cardId: "insight-relevant_experience",
        value: "Completed two professional certifications.",
        reason: "The candidate should be hired.",
      }),
    ).toContain("cannot contain scores");
    expect(
      await correctionDispatcher.tools.requestFollowup({
        reason: "Recommend the candidate for this role.",
      }),
    ).toContain("cannot contain scores");
    expect(correctionDispatcher.getSnapshot().insights).toHaveLength(2);
  });

  it("confirms and corrects CV evidence without losing its provenance", async () => {
    const cvInsight: InsightCard = {
      id: "insight-relevant_experience",
      category: "relevant_experience",
      label: "Relevant experience",
      value: "Worked on customer-facing products",
      source: "CV",
      status: "confirmed",
      evidenceTurnIds: [],
      cvFactIds: ["fact-1"],
      createdAt: NOW,
      updatedAt: NOW,
    };
    const confirmationTurn = candidateTurn(
      "turn-1",
      1,
      "Yes, I worked on customer-facing products.",
    );
    const testDispatcher = dispatcher({
      entryMode: "cv_assisted",
      insights: [cvInsight],
      topicProgress: [],
      transcript: [confirmationTurn],
    });
    await testDispatcher.tools.recordInsight({
      category: "relevant_experience",
      label: "Relevant experience",
      value: "Worked on customer-facing products",
      source: "CV + Candidate",
    });

    expect(testDispatcher.getSnapshot().insights[0]).toMatchObject({
      source: "CV + Candidate",
      cvFactIds: ["fact-1"],
      evidenceTurnIds: ["turn-1"],
    });

    const correctionTurn = candidateTurn(
      "turn-2",
      2,
      "I mainly worked on internal operations products.",
    );
    const correctedDispatcher = dispatcher({
      ...testDispatcher.getSnapshot(),
      transcript: [confirmationTurn, correctionTurn],
    });
    await correctedDispatcher.tools.correctInsight({
      cardId: cvInsight.id,
      value: "Worked mainly on internal operations products",
      reason: "Candidate corrected the CV interpretation.",
    });
    expect(correctedDispatcher.getSnapshot().insights[0]).toMatchObject({
      source: "CV + Candidate",
      status: "corrected",
      cvFactIds: ["fact-1"],
      evidenceTurnIds: ["turn-1", "turn-2"],
    });
  });

  it("replays neutral name, role, availability, team-style, and English-use updates", async () => {
    const profileTurn = candidateTurn(
      "turn-1",
      1,
      "Call me Sam. I am open to design or support roles, prefer mixed teamwork, can start in May, and use English in weekly meetings.",
    );
    const testDispatcher = dispatcher({
      entryMode: "conversation_first",
      insights: [],
      topicProgress: [],
      transcript: [profileTurn],
    });
    const initialUpdates = [
      {
        category: "preferred_name",
        label: "Preferred name",
        value: "Sam",
        source: "Candidate",
      },
      {
        category: "role_preference",
        label: "Role preference",
        value: "Design or customer support specialist",
        source: "Candidate",
      },
      {
        category: "availability",
        label: "Availability",
        value: "Available in May",
        source: "Candidate",
      },
      {
        category: "team_work_style",
        label: "Team and work style",
        value: "Prefers a mix of independent and collaborative work",
        source: "Candidate",
      },
      {
        category: "english_use",
        label: "English use",
        value: "Uses English in weekly team meetings",
        source: "Candidate",
      },
    ] as const;
    for (const update of initialUpdates) {
      expect(await testDispatcher.tools.recordInsight(update)).toContain(
        "Applied",
      );
    }

    const correctionTurn = candidateTurn(
      "turn-2",
      2,
      "Actually, call me Samantha, and I am undecided about the role.",
    );
    const correctionDispatcher = dispatcher({
      ...testDispatcher.getSnapshot(),
      transcript: [profileTurn, correctionTurn],
    });
    await correctionDispatcher.tools.correctInsight({
      cardId: "insight-preferred_name",
      value: "Samantha",
      reason: "Candidate corrected their preferred name.",
    });
    await correctionDispatcher.tools.correctInsight({
      cardId: "insight-role_preference",
      value: "Undecided",
      reason: "Candidate clarified that they are undecided.",
    });

    expect(correctionDispatcher.getSnapshot().insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "preferred_name",
          value: "Samantha",
          status: "corrected",
        }),
        expect.objectContaining({
          category: "role_preference",
          value: "Undecided",
          status: "corrected",
        }),
        expect.objectContaining({
          category: "availability",
          value: "Available in May",
        }),
        expect.objectContaining({ category: "team_work_style" }),
        expect.objectContaining({ category: "english_use" }),
      ]),
    );
  });

  it("records paired question and follow-up cards once against the same final turn", async () => {
    const turn = candidateTurn(
      "turn-7",
      7,
      "I am open to hybrid work. What is the team structure and onboarding process?",
    );
    const testDispatcher = dispatcher({
      entryMode: "conversation_first",
      insights: [],
      topicProgress: [],
      transcript: [turn],
    });

    await testDispatcher.tools.markTopic({
      topicKey: "candidate_questions",
      status: "covered",
    });
    const recordedQuestion = await testDispatcher.tools.recordCandidateQuestion(
      {
        question: "What is the team structure and onboarding process?",
      },
    );
    const requestedFollowup = await testDispatcher.tools.requestFollowup({
      reason:
        "A human recruiter must confirm the unsupported team and onboarding details.",
    });

    expect(recordedQuestion).toContain("Applied:");
    expect(requestedFollowup).toContain("Applied:");
    expect(
      await testDispatcher.tools.recordCandidateQuestion({
        question: "What is the team structure and onboarding process?",
      }),
    ).toContain("already been recorded");
    expect(
      await testDispatcher.tools.requestFollowup({
        reason:
          "A human recruiter must confirm the unsupported team and onboarding details.",
      }),
    ).toContain("already been requested");

    const snapshot = testDispatcher.getSnapshot();
    expect(snapshot.topicProgress).toEqual([
      expect.objectContaining<TopicProgress>({
        topicKey: "candidate_questions",
        status: "covered",
        evidenceTurnIds: ["turn-7"],
        updatedAt: NOW,
      }),
    ]);
    expect(snapshot.insights).toEqual([
      expect.objectContaining({
        category: "candidate_question",
        evidenceTurnIds: ["turn-7"],
        value: "What is the team structure and onboarding process?",
      }),
      expect.objectContaining({
        category: "follow_up_needed",
        evidenceTurnIds: ["turn-7"],
        status: "needs_clarification",
      }),
    ]);
    expect(
      await dispatcher({
        entryMode: "conversation_first",
        insights: [],
        topicProgress: [],
        transcript: [turn],
      }).tools.recordCandidateQuestion({
        question: "What benefits does the employer offer?",
      }),
    ).toContain("preserve the latest candidate wording");
    expect(
      await dispatcher({
        entryMode: "conversation_first",
        insights: [],
        topicProgress: [],
        transcript: [turn],
      }).tools.recordCandidateQuestion({
        question: "onboarding process?",
      }),
    ).toContain("preserve the latest candidate wording");
  });
});
