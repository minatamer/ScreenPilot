"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ManagedTurnstileFailure } from "@/features/abuse-protection/managed-turnstile-gate";

import type { OpenMicrophoneMonitor } from "./microphone-readiness";
import { useMicrophoneReadiness } from "./use-microphone-readiness";

type PreflightStage = "preflight" | "ready";

const MAX_BROWSER_TIMER_DELAY_MS = 2_147_483_647;

export type VoiceStartStatus =
  "idle" | "checking_challenge" | "challenge_error" | "connecting";

interface UseVoicePreflightOptions {
  interviewGrant: string;
  interviewGrantExpiresAt: string;
  microphoneMonitor?: OpenMicrophoneMonitor;
  onGrantExpired: () => void;
  onNotReady: () => void;
  onReady: () => void;
  onStartAuthorized?: ((turnstileToken: string) => void) | undefined;
  stage: PreflightStage;
  turnstileClientReady?: boolean | undefined;
}

function hasUsableTurnstileClient(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof AbortController === "function"
  );
}

function hasValidGrant(
  interviewGrant: string,
  interviewGrantExpiresAt: string,
): boolean {
  const expiresAt = Date.parse(interviewGrantExpiresAt);
  return (
    interviewGrant.trim() !== "" &&
    Number.isFinite(expiresAt) &&
    expiresAt > Date.now()
  );
}

export function useVoicePreflight({
  interviewGrant,
  interviewGrantExpiresAt,
  microphoneMonitor,
  onGrantExpired,
  onNotReady,
  onReady,
  onStartAuthorized,
  stage,
  turnstileClientReady,
}: UseVoicePreflightOptions) {
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [startStatus, setStartStatus] = useState<VoiceStartStatus>("idle");
  const [challengeFailure, setChallengeFailure] =
    useState<ManagedTurnstileFailure | null>(null);
  const startAuthorizedRef = useRef(false);
  const handledExpiredGrantRef = useRef<{
    grant: string;
    expiresAt: string;
  } | null>(null);
  const resetStartAfterPrerequisiteLoss = useCallback(() => {
    startAuthorizedRef.current = false;
    setChallengeFailure(null);
    setStartStatus("idle");
  }, []);
  const microphone = useMicrophoneReadiness({
    onUnavailable: resetStartAfterPrerequisiteLoss,
    openMicrophoneMonitor: microphoneMonitor,
  });
  const { resetMicrophone } = microphone;
  const grantValid = hasValidGrant(interviewGrant, interviewGrantExpiresAt);
  const clientReady = turnstileClientReady ?? hasUsableTurnstileClient();
  const prerequisitesReady =
    consentAccepted &&
    microphone.state.status === "ready" &&
    grantValid &&
    clientReady;
  const expireGrant = useCallback(() => {
    const handledGrant = handledExpiredGrantRef.current;
    if (
      handledGrant?.grant === interviewGrant &&
      handledGrant.expiresAt === interviewGrantExpiresAt
    ) {
      return;
    }
    handledExpiredGrantRef.current = {
      grant: interviewGrant,
      expiresAt: interviewGrantExpiresAt,
    };
    resetStartAfterPrerequisiteLoss();
    resetMicrophone();
    onGrantExpired();
  }, [
    interviewGrant,
    interviewGrantExpiresAt,
    onGrantExpired,
    resetMicrophone,
    resetStartAfterPrerequisiteLoss,
  ]);

  useEffect(() => {
    const expiresAt = Date.parse(interviewGrantExpiresAt);
    if (
      interviewGrant.trim() === "" ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      expireGrant();
      return;
    }

    let expiryTimer: number | undefined;
    const scheduleExpiryCheck = () => {
      const remainingMs = expiresAt - Date.now();
      if (remainingMs <= 0) {
        expireGrant();
        return;
      }
      expiryTimer = window.setTimeout(
        scheduleExpiryCheck,
        Math.min(remainingMs, MAX_BROWSER_TIMER_DELAY_MS),
      );
    };
    scheduleExpiryCheck();

    return () => {
      if (expiryTimer !== undefined) {
        window.clearTimeout(expiryTimer);
      }
    };
  }, [expireGrant, interviewGrant, interviewGrantExpiresAt]);

  useEffect(() => {
    if (!grantValid) {
      return;
    }
    if (stage === "preflight" && prerequisitesReady) {
      onReady();
    } else if (stage === "ready" && !prerequisitesReady) {
      onNotReady();
    }
  }, [grantValid, onNotReady, onReady, prerequisitesReady, stage]);

  const acceptConsent = useCallback(() => {
    if (consentChecked) {
      setConsentAccepted(true);
    }
  }, [consentChecked]);

  const startInterview = useCallback(() => {
    if (!hasValidGrant(interviewGrant, interviewGrantExpiresAt)) {
      expireGrant();
      return;
    }
    if (
      !prerequisitesReady ||
      startStatus === "checking_challenge" ||
      startStatus === "connecting"
    ) {
      return;
    }
    startAuthorizedRef.current = false;
    setChallengeFailure(null);
    setStartStatus("checking_challenge");
  }, [
    expireGrant,
    interviewGrant,
    interviewGrantExpiresAt,
    prerequisitesReady,
    startStatus,
  ]);

  const handleChallengeFailure = useCallback(
    (failure: ManagedTurnstileFailure) => {
      if (startStatus !== "checking_challenge") {
        return;
      }
      startAuthorizedRef.current = false;
      setChallengeFailure(failure);
      setStartStatus("challenge_error");
    },
    [startStatus],
  );

  const handleChallengeVerified = useCallback(
    (turnstileToken: string) => {
      if (startStatus !== "checking_challenge" || startAuthorizedRef.current) {
        return;
      }
      startAuthorizedRef.current = true;
      setStartStatus("connecting");
      onStartAuthorized?.(turnstileToken);
    },
    [onStartAuthorized, startStatus],
  );

  const cancelStart = useCallback(() => {
    startAuthorizedRef.current = false;
    setChallengeFailure(null);
    setStartStatus("idle");
  }, []);

  return {
    acceptConsent,
    cancelStart,
    challengeFailure,
    clientReady,
    consentAccepted,
    consentChecked,
    grantValid,
    handleChallengeFailure,
    handleChallengeVerified,
    microphone,
    prerequisitesReady,
    setConsentChecked,
    startInterview,
    startStatus,
  };
}
