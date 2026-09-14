import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";

import { INTERVIEW_HARD_STOP_MS } from "./interview-timer";
import { useVoiceSession } from "./use-voice-session";

function callbacks() {
  return {
    onConnected: vi.fn(),
    onConnectionFailure: vi.fn(),
    onEnded: vi.fn(),
    onEnding: vi.fn(),
    onFinalTranscriptTurn: vi.fn<(turn: TranscriptTurn) => void>(),
    onInterrupted: vi.fn(),
  };
}

describe("useVoiceSession", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("normalizes tentative-to-final captions and interruption without duplicate evidence", () => {
    const events = callbacks();
    const { result } = renderHook(() => useVoiceSession(events));

    act(() => {
      result.current.onSessionEvent({
        type: "connected",
        conversationId: "conversation-015",
      });
      result.current.onSessionEvent({
        type: "connected",
        conversationId: "late-duplicate-connection",
      });
      result.current.onSessionEvent({ type: "mode", mode: "speaking" });
      result.current.onSessionEvent({
        type: "message",
        eventId: 1,
        speaker: "candidate",
        stability: "tentative",
        text: "My current",
      });
      result.current.onSessionEvent({
        type: "message",
        eventId: 1,
        speaker: "candidate",
        stability: "final",
        text: "My current goal is a general HR conversation.",
      });
      result.current.onSessionEvent({
        type: "message",
        eventId: 1,
        speaker: "candidate",
        stability: "final",
        text: "Duplicate callback.",
      });
      result.current.onSessionEvent({ type: "interruption", eventId: 2 });
    });

    expect(result.current.phase).toBe("listening");
    expect(result.current.caption).toMatchObject({
      stability: "final",
      text: "My current goal is a general HR conversation.",
    });
    expect(events.onFinalTranscriptTurn).toHaveBeenCalledOnce();
    expect(events.onConnected).toHaveBeenCalledOnce();
    expect(events.onFinalTranscriptTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "voice-candidate-1",
        sequence: 1,
        status: "final",
      }),
    );
  });

  it("surfaces reconnect state and preserves final evidence on disconnect", () => {
    const events = callbacks();
    const { result } = renderHook(() => useVoiceSession(events));

    act(() => {
      result.current.onSessionEvent({
        type: "connected",
        conversationId: "conversation-015",
      });
      result.current.onSessionEvent({
        type: "message",
        eventId: 3,
        speaker: "candidate",
        stability: "final",
        text: "Keep this local final turn.",
      });
      result.current.onSessionEvent({
        type: "connection_status",
        status: "reconnecting",
      });
      result.current.onSessionEvent({ type: "mode", mode: "speaking" });
      result.current.onSessionEvent({ type: "interruption", eventId: 4 });
      result.current.onSessionEvent({
        type: "connection_status",
        status: "reconnecting",
      });
    });
    expect(result.current.phase).toBe("reconnecting");

    act(() => {
      result.current.onSessionEvent({
        type: "connection_status",
        status: "reconnected",
      });
      result.current.onSessionEvent({
        type: "connection_status",
        status: "reconnected",
      });
    });
    expect(result.current.phase).toBe("listening");

    act(() => {
      result.current.onSessionEvent({
        type: "disconnected",
        reason: "error",
        message: "Synthetic network loss.",
      });
      result.current.onSessionEvent({
        type: "error",
        message: "Late duplicate error.",
      });
    });
    expect(result.current.phase).toBe("failed");
    expect(events.onInterrupted).toHaveBeenCalledOnce();
    expect(events.onFinalTranscriptTurn).toHaveBeenCalledOnce();
  });

  it("retains an older final turn without replacing the newer caption", () => {
    const events = callbacks();
    const { result } = renderHook(() => useVoiceSession(events));

    act(() => {
      result.current.onSessionEvent({
        type: "connected",
        conversationId: "conversation-015",
      });
      result.current.onSessionEvent({
        type: "message",
        eventId: 8,
        speaker: "interviewer",
        stability: "final",
        text: "This is the newer visible caption.",
      });
      result.current.onSessionEvent({
        type: "message",
        eventId: 3,
        speaker: "candidate",
        stability: "final",
        text: "This older turn still belongs in evidence.",
      });
    });

    expect(result.current.caption?.text).toBe(
      "This is the newer visible caption.",
    );
    expect(events.onFinalTranscriptTurn).toHaveBeenCalledTimes(2);
    expect(
      events.onFinalTranscriptTurn.mock.calls.map(([turn]) => turn.sequence),
    ).toEqual([8, 3]);
  });

  it("keeps End and mute idempotent", () => {
    const events = callbacks();
    const { result } = renderHook(() => useVoiceSession(events));

    act(() => {
      result.current.onSessionEvent({
        type: "connected",
        conversationId: "conversation-015",
      });
      result.current.toggleMuted();
      result.current.requestEnd();
      result.current.requestEnd();
      result.current.onSessionEvent({ type: "mode", mode: "speaking" });
      result.current.onSessionEvent({
        type: "connection_status",
        status: "reconnecting",
      });
    });

    expect(result.current.isMuted).toBe(true);
    expect(result.current.phase).toBe("ending");
    expect(result.current.endRequested).toBe(true);
    expect(events.onEnding).toHaveBeenCalledOnce();

    act(() => {
      result.current.onSessionEvent({ type: "disconnected", reason: "user" });
      result.current.onSessionEvent({ type: "disconnected", reason: "user" });
      result.current.onSessionEvent({ type: "mode", mode: "speaking" });
      result.current.onSessionEvent({
        type: "message",
        eventId: 9,
        speaker: "candidate",
        stability: "final",
        text: "Late terminal callback.",
      });
    });
    expect(events.onEnded).toHaveBeenCalledOnce();
    expect(events.onFinalTranscriptTurn).not.toHaveBeenCalled();
    expect(result.current.phase).toBe("ended");
    expect(events.onEnded).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "conversation-015",
        endReason: "Interview ended by the candidate.",
        status: "ended",
      }),
    );
  });

  it("requests one end when the eight-minute hard stop is reached", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T12:00:00.000Z"));
    const events = callbacks();
    const { result } = renderHook(() => useVoiceSession(events));

    act(() => {
      result.current.onSessionEvent({
        type: "connected",
        conversationId: "conversation-015",
      });
    });
    act(() => {
      vi.advanceTimersByTime(INTERVIEW_HARD_STOP_MS);
    });

    expect(result.current.elapsedSeconds).toBe(480);
    expect(result.current.phase).toBe("ending");
    expect(events.onEnding).toHaveBeenCalledOnce();

    act(() => {
      result.current.onSessionEvent({ type: "disconnected", reason: "user" });
    });
    expect(events.onEnded).toHaveBeenCalledWith(
      expect.objectContaining({
        endReason: "The eight-minute interview limit was reached.",
      }),
    );
  });

  it("routes failures before connection back to connection recovery", () => {
    const events = callbacks();
    const { result } = renderHook(() => useVoiceSession(events));

    act(() => {
      result.current.markConnecting();
      result.current.onSessionEvent({
        type: "error",
        message: "Synthetic provider rejection.",
      });
    });

    expect(result.current.phase).toBe("failed");
    expect(events.onConnectionFailure).toHaveBeenCalledWith(
      "Synthetic provider rejection.",
    );
    expect(events.onInterrupted).not.toHaveBeenCalled();
  });

  it("treats an agent-completed disconnect as one orderly end", () => {
    const events = callbacks();
    const { result } = renderHook(() => useVoiceSession(events));

    act(() => {
      result.current.onSessionEvent({
        type: "connected",
        conversationId: "conversation-015",
      });
      result.current.onSessionEvent({ type: "disconnected", reason: "agent" });
    });

    expect(result.current.phase).toBe("ended");
    expect(events.onEnding).toHaveBeenCalledOnce();
    expect(events.onEnded).toHaveBeenCalledOnce();
    expect(events.onEnded).toHaveBeenCalledWith(
      expect.objectContaining({
        endReason: "Interview completed by the interviewer.",
      }),
    );
    expect(events.onInterrupted).not.toHaveBeenCalled();
  });

  it("ignores content callbacks that arrive before a verified connection", () => {
    const events = callbacks();
    const { result } = renderHook(() => useVoiceSession(events));

    act(() => {
      result.current.onSessionEvent({ type: "mode", mode: "speaking" });
      result.current.onSessionEvent({
        type: "connection_status",
        status: "reconnected",
      });
      result.current.onSessionEvent({
        type: "message",
        eventId: 1,
        speaker: "candidate",
        stability: "final",
        text: "This early callback must not become evidence.",
      });
      result.current.onSessionEvent({ type: "interruption", eventId: 2 });
    });

    expect(result.current.phase).toBe("requesting_token");
    expect(result.current.caption).toBeNull();
    expect(events.onFinalTranscriptTurn).not.toHaveBeenCalled();
  });
});
