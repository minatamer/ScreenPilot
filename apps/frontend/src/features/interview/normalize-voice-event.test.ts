import { describe, expect, it } from "vitest";

import type { VoiceSessionEvent } from "./voice-session-bridge";
import {
  createVoiceEventNormalizerState,
  MAX_LIVE_CAPTION_CHARACTERS,
  normalizeVoiceEvent,
} from "./normalize-voice-event";
import {
  MAX_LOCAL_TRANSCRIPT_CHARACTERS,
  MAX_LOCAL_TRANSCRIPT_TURNS,
} from "@/features/transcript/transcript-limits";

const OCCURRED_AT = "2026-09-14T12:00:00.000Z";

function normalizeMessages(events: readonly VoiceSessionEvent[]) {
  let state = createVoiceEventNormalizerState();
  return events.map((event) => {
    const result = normalizeVoiceEvent(event, state, OCCURRED_AT);
    state = result.state;
    return result.event;
  });
}

describe("normalizeVoiceEvent", () => {
  it("replaces tentative user captions without creating transcript turns", () => {
    const [first, second] = normalizeMessages([
      {
        type: "message",
        eventId: 4,
        speaker: "candidate",
        stability: "tentative",
        text: "I am looking",
      },
      {
        type: "message",
        eventId: 4,
        speaker: "candidate",
        stability: "tentative",
        text: "I am looking for a role",
      },
    ]);

    expect(first).toMatchObject({
      caption: { text: "I am looking", turnId: "voice-candidate-4" },
      type: "message",
    });
    expect(second).toMatchObject({
      caption: {
        text: "I am looking for a role",
        turnId: "voice-candidate-4",
      },
      type: "message",
    });
    if (first?.type !== "message" || second?.type !== "message") {
      throw new Error("Expected normalized message events.");
    }
    expect(first.transcriptTurn).toBeUndefined();
    expect(second.transcriptTurn).toBeUndefined();
  });

  it("creates bounded final turns with stable local IDs and provider order", () => {
    const [later, earlier, duplicate] = normalizeMessages([
      {
        type: "message",
        eventId: 8,
        speaker: "interviewer",
        stability: "final",
        text: `  ${"A".repeat(MAX_LIVE_CAPTION_CHARACTERS + 50)}  `,
      },
      {
        type: "message",
        eventId: 3,
        speaker: "candidate",
        stability: "final",
        text: "My goals are role neutral.",
      },
      {
        type: "message",
        eventId: 8,
        speaker: "interviewer",
        stability: "final",
        text: "Duplicate callback text is ignored.",
      },
    ]);

    if (later?.type !== "message" || earlier?.type !== "message") {
      throw new Error("Expected normalized final messages.");
    }
    expect(later.transcriptTurn).toMatchObject({
      id: "voice-interviewer-8",
      occurredAt: OCCURRED_AT,
      sequence: 8,
      speaker: "interviewer",
      status: "final",
    });
    expect(later.caption.turnId).toBe("voice-interviewer-8");
    expect(later.transcriptTurn?.text).toHaveLength(
      MAX_LIVE_CAPTION_CHARACTERS,
    );
    expect(earlier.transcriptTurn).toMatchObject({
      id: "voice-candidate-3",
      sequence: 3,
    });
    expect(later.shouldDisplayCaption).toBe(true);
    expect(earlier.shouldDisplayCaption).toBe(false);
    expect(duplicate).toBeNull();
  });

  it("keeps candidate and interviewer messages that share a provider event ID", () => {
    const [candidate, interviewer, duplicateInterviewer] = normalizeMessages([
      {
        type: "message",
        eventId: 5,
        speaker: "candidate",
        stability: "final",
        text: "I am available next month.",
      },
      {
        type: "message",
        eventId: 5,
        speaker: "interviewer",
        stability: "final",
        text: "What work arrangement would you prefer?",
      },
      {
        type: "message",
        eventId: 5,
        speaker: "interviewer",
        stability: "final",
        text: "Duplicate interviewer callback.",
      },
    ]);

    expect(candidate).toMatchObject({
      transcriptTurn: {
        id: "voice-candidate-5",
        speaker: "candidate",
      },
      type: "message",
    });
    expect(interviewer).toMatchObject({
      transcriptTurn: {
        id: "voice-interviewer-5",
        speaker: "interviewer",
      },
      type: "message",
    });
    expect(duplicateInterviewer).toBeNull();
  });

  it("does not regress a finalized caption with a late tentative callback", () => {
    const [final, lateTentative, unidentifiedTentative] = normalizeMessages([
      {
        type: "message",
        eventId: 12,
        speaker: "candidate",
        stability: "final",
        text: "This is the finalized statement.",
      },
      {
        type: "message",
        eventId: 12,
        speaker: "candidate",
        stability: "tentative",
        text: "This is the stale partial",
      },
      {
        type: "message",
        speaker: "candidate",
        stability: "tentative",
        text: "This tentative callback has no usable identity.",
      },
    ]);

    expect(final).toMatchObject({
      shouldDisplayCaption: true,
      type: "message",
    });
    expect(lateTentative).toBeNull();
    expect(unidentifiedTentative).toBeNull();
  });

  it("suppresses adjacent indistinguishable ID-less duplicates without collapsing identified repetitions", () => {
    const [
      firstIdless,
      duplicateIdless,
      firstIdentified,
      repeatedIdentified,
      separatedIdlessRepeat,
    ] = normalizeMessages([
      {
        type: "message",
        speaker: "candidate",
        stability: "final",
        text: "I would like to repeat that.",
      },
      {
        type: "message",
        speaker: "candidate",
        stability: "final",
        text: "I would like to repeat that.",
      },
      {
        type: "message",
        eventId: 20,
        speaker: "candidate",
        stability: "final",
        text: "This identified statement is repeated.",
      },
      {
        type: "message",
        eventId: 21,
        speaker: "candidate",
        stability: "final",
        text: "This identified statement is repeated.",
      },
      {
        type: "message",
        speaker: "candidate",
        stability: "final",
        text: "I would like to repeat that.",
      },
    ]);

    expect(firstIdless).toMatchObject({ type: "message" });
    expect(duplicateIdless).toBeNull();
    expect(firstIdentified).toMatchObject({
      transcriptTurn: { sequence: 20 },
      type: "message",
    });
    expect(repeatedIdentified).toMatchObject({
      transcriptTurn: { sequence: 21 },
      type: "message",
    });
    expect(separatedIdlessRepeat).toMatchObject({
      transcriptTurn: { sequence: 22 },
      type: "message",
    });
  });

  it("ignores content-free messages and assigns bounded fallback sequences", () => {
    const [empty, first, second] = normalizeMessages([
      {
        type: "message",
        speaker: "candidate",
        stability: "final",
        text: "   ",
      },
      {
        type: "message",
        eventId: Number.MAX_SAFE_INTEGER,
        speaker: "candidate",
        stability: "final",
        text: "First fallback turn.",
      },
      {
        type: "message",
        speaker: "interviewer",
        stability: "final",
        text: "Second fallback turn.",
      },
    ]);

    expect(empty).toBeNull();
    if (first?.type !== "message" || second?.type !== "message") {
      throw new Error("Expected normalized fallback messages.");
    }
    expect(first.transcriptTurn?.sequence).toBe(0);
    expect(second.transcriptTurn?.sequence).toBe(1);
  });

  it("stops retaining final events at the collection and character bounds", () => {
    let eventBoundState = createVoiceEventNormalizerState();
    let retainedEventCount = 0;
    for (let eventId = 0; eventId <= MAX_LOCAL_TRANSCRIPT_TURNS; eventId += 1) {
      const result = normalizeVoiceEvent(
        {
          type: "message",
          eventId,
          speaker: "candidate",
          stability: "final",
          text: `Bounded turn ${String(eventId)}.`,
        },
        eventBoundState,
        OCCURRED_AT,
      );
      eventBoundState = result.state;
      if (result.event) {
        retainedEventCount += 1;
      }
    }
    expect(retainedEventCount).toBe(MAX_LOCAL_TRANSCRIPT_TURNS);

    let characterBoundState = createVoiceEventNormalizerState();
    let retainedCharacterCount = 0;
    for (let eventId = 0; eventId < 8; eventId += 1) {
      const result = normalizeVoiceEvent(
        {
          type: "message",
          eventId,
          speaker: "interviewer",
          stability: "final",
          text: "A".repeat(MAX_LIVE_CAPTION_CHARACTERS),
        },
        characterBoundState,
        OCCURRED_AT,
      );
      characterBoundState = result.state;
      if (result.event) {
        retainedCharacterCount += 1;
      }
    }
    expect(retainedCharacterCount).toBe(7);
    expect(characterBoundState.transcriptCharacters).toBeLessThanOrEqual(
      MAX_LOCAL_TRANSCRIPT_CHARACTERS,
    );
  });
});
