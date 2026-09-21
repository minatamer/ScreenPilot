import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";

import { INTERVIEW_HARD_STOP_MS } from "./interview-timer";
import { useVoiceSession } from "./use-voice-session";
import { createVoicePerformanceTracker } from "./voice-performance";

function callbacks() {
  return {
    endTransitionMs: 0,
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
      vi.advanceTimersByTime(INTERVIEW_HARD_STOP_MS - 1);
    });
    expect(result.current.phase).toBe("listening");
    act(() => {
      vi.advanceTimersByTime(1);
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

  it("keeps an absolute deadline while a resumed session reconnects", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T12:00:00.000Z"));
    const events = callbacks();
    const hardStopAtMs = Date.now() + 6 * 60 * 1_000;
    const { result } = renderHook(() =>
      useVoiceSession({ ...events, hardStopAtMs }),
    );

    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    act(() => {
      result.current.onSessionEvent({
        type: "connected",
        conversationId: "conversation-018-reconnected",
      });
    });
    expect(result.current.elapsedSeconds).toBe(150);

    act(() => {
      vi.advanceTimersByTime(5.5 * 60 * 1_000 - 1);
    });
    expect(result.current.phase).toBe("listening");
    expect(result.current.elapsedSeconds).toBe(479);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.phase).toBe("ending");
    expect(events.onEnding).toHaveBeenCalledOnce();
  });

  it("shows the visual and text thresholds while filler audio leaves TTFA running", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T10:00:00.000Z"));
    const events = callbacks();
    const tracker = createVoicePerformanceTracker(() => Date.now());
    const { result } = renderHook(() =>
      useVoiceSession({ ...events, performanceTracker: tracker }),
    );

    act(() => {
      result.current.onSessionEvent({
        type: "connected",
        conversationId: "conversation-018",
      });
      result.current.onSessionEvent({
        type: "candidate_speech_activity",
        active: true,
      });
      result.current.onSessionEvent({
        type: "candidate_speech_activity",
        active: false,
      });
      result.current.onSessionEvent({
        type: "message",
        eventId: 1,
        speaker: "candidate",
        stability: "final",
        text: "A synthetic answer for timing.",
      });
    });
    expect(result.current.latencyStage).toBe("visual");

    act(() => {
      vi.advanceTimersByTime(799);
    });
    expect(result.current.latencyStage).toBe("visual");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.latencyStage).toBe("reviewing");

    act(() => {
      vi.advanceTimersByTime(701);
      result.current.onSessionEvent({ type: "agent_audio_started" });
      result.current.onSessionEvent({ type: "latency_filler" });
    });
    expect(result.current.latencyStage).toBe("reviewing");
    expect(result.current.fillerPolicy).toMatchObject({
      count: 1,
      reviewFailed: false,
    });
    expect(
      tracker
        .getSnapshot()
        .samples.filter((sample) => sample.metric === "ttfa"),
    ).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(99);
      result.current.onSessionEvent({ type: "agent_audio_started" });
      vi.advanceTimersByTime(200);
      result.current.onSessionEvent({
        type: "message",
        eventId: 2,
        speaker: "interviewer",
        stability: "final",
        text: "A substantive follow-up question.",
      });
    });

    expect(result.current.latencyStage).toBe("idle");
    expect(
      tracker.getSnapshot().samples.find((sample) => sample.metric === "ttfa"),
    ).toMatchObject({ durationMs: 1_600 });
    expect(events.onFinalTranscriptTurn).toHaveBeenCalledTimes(2);
    expect(
      events.onFinalTranscriptTurn.mock.calls.map(([turn]) => turn.text),
    ).not.toContain("Mm-hm…");
  });

  it("starts TTFA at provider VAD speech end rather than transcript finalization", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T10:00:00.000Z"));
    const tracker = createVoicePerformanceTracker(() => Date.now());
    const { result } = renderHook(() =>
      useVoiceSession({ ...callbacks(), performanceTracker: tracker }),
    );

    act(() => {
      result.current.onSessionEvent({
        type: "connected",
        conversationId: "conversation-018",
      });
      result.current.onSessionEvent({
        type: "candidate_speech_activity",
        active: true,
      });
      result.current.onSessionEvent({
        type: "candidate_speech_activity",
        active: false,
      });
      vi.advanceTimersByTime(300);
      result.current.onSessionEvent({
        type: "message",
        eventId: 1,
        speaker: "candidate",
        stability: "final",
        text: "The final transcript arrived after speech ended.",
      });
      vi.advanceTimersByTime(500);
      result.current.onSessionEvent({ type: "agent_audio_started" });
      result.current.onSessionEvent({
        type: "message",
        eventId: 2,
        speaker: "interviewer",
        stability: "final",
        text: "A substantive response.",
      });
    });

    expect(
      tracker.getSnapshot().samples.find((sample) => sample.metric === "ttfa"),
    ).toMatchObject({ durationMs: 800 });
  });

  it("does not label transcript-final latency as TTFA when VAD is unavailable", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T10:00:00.000Z"));
    const tracker = createVoicePerformanceTracker(() => Date.now());
    const { result } = renderHook(() =>
      useVoiceSession({ ...callbacks(), performanceTracker: tracker }),
    );

    act(() => {
      result.current.onSessionEvent({
        type: "connected",
        conversationId: "conversation-018",
      });
      result.current.onSessionEvent({
        type: "message",
        eventId: 1,
        speaker: "candidate",
        stability: "final",
        text: "No VAD boundary was delivered.",
      });
      vi.advanceTimersByTime(500);
      result.current.onSessionEvent({ type: "agent_audio_started" });
      result.current.onSessionEvent({
        type: "message",
        eventId: 2,
        speaker: "interviewer",
        stability: "final",
        text: "A substantive response.",
      });
    });

    expect(
      tracker
        .getSnapshot()
        .samples.filter((sample) => sample.metric === "ttfa"),
    ).toHaveLength(0);
  });

  it("measures interruption until the provider returns to listening", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T10:00:00.000Z"));
    const tracker = createVoicePerformanceTracker(() => Date.now());
    const { result } = renderHook(() =>
      useVoiceSession({ ...callbacks(), performanceTracker: tracker }),
    );

    act(() => {
      result.current.onSessionEvent({
        type: "connected",
        conversationId: "conversation-018",
      });
      result.current.onSessionEvent({ type: "mode", mode: "speaking" });
      result.current.onSessionEvent({ type: "interruption", eventId: 1 });
      vi.advanceTimersByTime(250);
      result.current.onSessionEvent({ type: "mode", mode: "listening" });
    });

    expect(
      tracker
        .getSnapshot()
        .samples.find(
          (sample) => sample.metric === "interruption_to_audio_stop",
        ),
    ).toMatchObject({ durationMs: 250 });
  });

  it("measures interruption when listening arrives before its notification", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T10:00:00.000Z"));
    const tracker = createVoicePerformanceTracker(() => Date.now());
    const { result } = renderHook(() =>
      useVoiceSession({ ...callbacks(), performanceTracker: tracker }),
    );

    act(() => {
      result.current.onSessionEvent({
        type: "connected",
        conversationId: "conversation-018",
      });
      result.current.onSessionEvent({ type: "mode", mode: "speaking" });
      result.current.onSessionEvent({
        type: "candidate_speech_activity",
        active: true,
      });
      vi.advanceTimersByTime(250);
      result.current.onSessionEvent({ type: "mode", mode: "listening" });
      vi.advanceTimersByTime(40);
      result.current.onSessionEvent({ type: "interruption", eventId: 2 });
    });

    expect(
      tracker
        .getSnapshot()
        .samples.filter(
          (sample) => sample.metric === "interruption_to_audio_stop",
        ),
    ).toEqual([expect.objectContaining({ durationMs: 250 })]);
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
    vi.useFakeTimers();
    const events = callbacks();
    const { result } = renderHook(() =>
      useVoiceSession({ ...events, endTransitionMs: 420 }),
    );

    act(() => {
      result.current.onSessionEvent({
        type: "connected",
        conversationId: "conversation-015",
      });
      result.current.onSessionEvent({ type: "disconnected", reason: "agent" });
    });

    expect(result.current.phase).toBe("ending");
    expect(events.onEnding).toHaveBeenCalledOnce();
    expect(events.onEnded).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(419);
    });
    expect(result.current.phase).toBe("ending");
    expect(events.onEnded).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.phase).toBe("ended");
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
