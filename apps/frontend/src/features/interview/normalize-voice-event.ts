import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";

import type {
  VoiceSessionEvent,
  VoiceSessionSpeaker,
} from "./voice-session-bridge";

export const MAX_LIVE_CAPTION_CHARACTERS = 4_000;
export const MAX_NORMALIZED_FINAL_EVENTS = 160;
export const MAX_NORMALIZED_TRANSCRIPT_CHARACTERS = 30_000;
const MAX_TRANSCRIPT_SEQUENCE = 10_000;

export type LiveCaption = Readonly<{
  speaker: VoiceSessionSpeaker;
  stability: "tentative" | "final";
  text: string;
  turnId: string;
}>;

type VoiceMessageEvent = Extract<VoiceSessionEvent, { type: "message" }>;

export type NormalizedVoiceEvent =
  | Exclude<VoiceSessionEvent, VoiceMessageEvent>
  | (VoiceMessageEvent &
      Readonly<{
        caption: LiveCaption;
        shouldDisplayCaption: boolean;
        transcriptTurn?: TranscriptTurn;
      }>);

export type VoiceEventNormalizerState = Readonly<{
  finalizedProviderMessages: readonly string[];
  lastIdlessFinalFingerprint: string | null;
  latestCaptionSequence: number | null;
  nextFallbackSequence: number;
  seenFinalTurnIds: readonly string[];
  transcriptCharacters: number;
}>;

export type VoiceEventNormalizationResult = Readonly<{
  event: NormalizedVoiceEvent | null;
  state: VoiceEventNormalizerState;
}>;

export function createVoiceEventNormalizerState(): VoiceEventNormalizerState {
  return {
    finalizedProviderMessages: [],
    lastIdlessFinalFingerprint: null,
    latestCaptionSequence: null,
    nextFallbackSequence: 0,
    seenFinalTurnIds: [],
    transcriptCharacters: 0,
  };
}

function providerMessageKey(speaker: VoiceSessionSpeaker, sequence: number) {
  return `${speaker}:${String(sequence)}`;
}

function boundCaptionText(text: string) {
  return text
    .trim()
    .replace(/\s+/gu, " ")
    .slice(0, MAX_LIVE_CAPTION_CHARACTERS);
}

function validProviderSequence(eventId: number | undefined) {
  return eventId !== undefined &&
    Number.isSafeInteger(eventId) &&
    eventId >= 0 &&
    eventId <= MAX_TRANSCRIPT_SEQUENCE
    ? eventId
    : undefined;
}

function voiceTurnId(speaker: VoiceSessionSpeaker, sequence: number) {
  return `voice-${speaker}-${String(sequence)}`;
}

function createLiveCaption(
  event: VoiceMessageEvent,
  text: string,
  sequence: number,
): LiveCaption {
  return {
    speaker: event.speaker,
    stability: event.stability,
    text,
    turnId: voiceTurnId(event.speaker, sequence),
  };
}

function nextSequence(
  eventId: number | undefined,
  state: VoiceEventNormalizerState,
) {
  const providerSequence = validProviderSequence(eventId);
  if (providerSequence !== undefined) {
    return {
      sequence: providerSequence,
      nextFallbackSequence: Math.min(
        MAX_TRANSCRIPT_SEQUENCE + 1,
        Math.max(state.nextFallbackSequence, providerSequence + 1),
      ),
    };
  }
  if (state.nextFallbackSequence > MAX_TRANSCRIPT_SEQUENCE) {
    return null;
  }
  return {
    sequence: state.nextFallbackSequence,
    nextFallbackSequence: state.nextFallbackSequence + 1,
  };
}

export function normalizeVoiceEvent(
  event: VoiceSessionEvent,
  state: VoiceEventNormalizerState,
  occurredAt: string,
): VoiceEventNormalizationResult {
  if (event.type !== "message") {
    return { event, state };
  }

  const text = boundCaptionText(event.text);
  if (!text) {
    return { event: null, state };
  }

  const providerSequence = validProviderSequence(event.eventId);
  const providerKey =
    providerSequence === undefined
      ? undefined
      : providerMessageKey(event.speaker, providerSequence);
  if (event.stability === "tentative") {
    if (
      providerSequence === undefined ||
      providerKey === undefined ||
      state.finalizedProviderMessages.includes(providerKey) ||
      (state.latestCaptionSequence !== null &&
        providerSequence < state.latestCaptionSequence)
    ) {
      return { event: null, state };
    }
    return {
      event: {
        ...event,
        caption: createLiveCaption(event, text, providerSequence),
        shouldDisplayCaption: true,
      },
      state: {
        ...state,
        latestCaptionSequence: providerSequence,
      },
    };
  }

  if (
    providerKey !== undefined &&
    state.finalizedProviderMessages.includes(providerKey)
  ) {
    return { event: null, state };
  }
  const idlessFingerprint =
    providerSequence === undefined ? `${event.speaker}\u0000${text}` : null;
  if (
    idlessFingerprint !== null &&
    idlessFingerprint === state.lastIdlessFinalFingerprint
  ) {
    return { event: null, state };
  }

  const resolvedSequence = nextSequence(event.eventId, state);
  if (!resolvedSequence) {
    return { event: null, state };
  }
  const id = voiceTurnId(event.speaker, resolvedSequence.sequence);
  if (state.seenFinalTurnIds.includes(id)) {
    return {
      event: null,
      state: {
        ...state,
        nextFallbackSequence: resolvedSequence.nextFallbackSequence,
      },
    };
  }
  if (
    state.seenFinalTurnIds.length >= MAX_NORMALIZED_FINAL_EVENTS ||
    state.transcriptCharacters + text.length >
      MAX_NORMALIZED_TRANSCRIPT_CHARACTERS
  ) {
    return {
      event: null,
      state: {
        ...state,
        nextFallbackSequence: resolvedSequence.nextFallbackSequence,
      },
    };
  }

  const transcriptTurn: TranscriptTurn = {
    id,
    occurredAt,
    sequence: resolvedSequence.sequence,
    speaker: event.speaker,
    status: "final",
    text,
  };
  const shouldDisplayCaption =
    state.latestCaptionSequence === null ||
    resolvedSequence.sequence >= state.latestCaptionSequence;

  return {
    event: {
      ...event,
      caption: createLiveCaption(event, text, resolvedSequence.sequence),
      shouldDisplayCaption,
      transcriptTurn,
    },
    state: {
      finalizedProviderMessages:
        providerKey === undefined
          ? state.finalizedProviderMessages
          : [...state.finalizedProviderMessages, providerKey],
      lastIdlessFinalFingerprint: idlessFingerprint,
      latestCaptionSequence: shouldDisplayCaption
        ? resolvedSequence.sequence
        : state.latestCaptionSequence,
      nextFallbackSequence: resolvedSequence.nextFallbackSequence,
      seenFinalTurnIds: [...state.seenFinalTurnIds, id],
      transcriptCharacters: state.transcriptCharacters + text.length,
    },
  };
}
