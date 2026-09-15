"use client";

import type { RolePreference } from "@screenpilot/contracts/interview/demo-context";
import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";

import { ManagedTurnstileGate } from "@/features/abuse-protection/managed-turnstile-gate";
import {
  TURNSTILE_ACTIONS,
  type ExecuteTurnstileChallenge,
} from "@/features/abuse-protection/turnstile-client";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { DemoActionFooter } from "@/shared/ui/demo-action-footer";
import { DemoStageHeading } from "@/shared/ui/demo-stage-heading";
import { EntryModeBadge } from "@/shared/ui/entry-mode-badge";
import { ErrorPanel } from "@/shared/ui/error-panel";

import {
  MICROPHONE_FAILURE_COPY,
  type OpenMicrophoneMonitor,
} from "./microphone-readiness";
import {
  useVoicePreflight,
  type VoiceStartStatus,
} from "./use-voice-preflight";

type PreflightStage = "preflight" | "ready";

interface PreflightHandoffProps {
  entryMode: EntryMode;
  executeChallenge?: ExecuteTurnstileChallenge;
  interviewGrant: string;
  interviewGrantExpiresAt: string;
  microphoneMonitor?: OpenMicrophoneMonitor;
  onBack: () => void;
  onGrantExpired: () => void;
  onNotReady: () => void;
  onReady: () => void;
  onStartAuthorized?: ((turnstileToken: string) => void) | undefined;
  rolePreference?: RolePreference | undefined;
  siteKey: string;
  stage: PreflightStage;
  turnstileClientReady?: boolean | undefined;
}

function roleDisclosure(rolePreference: RolePreference | undefined): string {
  if (rolePreference?.status === "candidate_stated" && rolePreference.label) {
    return `${rolePreference.label} is only for this demo session—not a real opening.`;
  }
  return "Any role you discuss is only for this demo session—not a real opening.";
}

function startButtonLabel(startStatus: VoiceStartStatus): string {
  return startStatus === "challenge_error"
    ? "Retry start check"
    : "Start interview";
}

export function PreflightHandoff({
  entryMode,
  executeChallenge,
  interviewGrant,
  interviewGrantExpiresAt,
  microphoneMonitor,
  onBack,
  onGrantExpired,
  onNotReady,
  onReady,
  onStartAuthorized,
  rolePreference,
  siteKey,
  stage,
  turnstileClientReady,
}: PreflightHandoffProps) {
  const cvAssisted = entryMode === "cv_assisted";
  const {
    acceptConsent,
    cancelStart,
    challengeFailure,
    consentAccepted,
    consentChecked,
    handleChallengeFailure,
    handleChallengeVerified,
    microphone,
    prerequisitesReady,
    setConsentChecked,
    startInterview,
    startStatus,
  } = useVoicePreflight({
    interviewGrant,
    interviewGrantExpiresAt,
    ...(microphoneMonitor ? { microphoneMonitor } : {}),
    onGrantExpired,
    onNotReady,
    onReady,
    onStartAuthorized,
    stage,
    turnstileClientReady,
  });
  const microphoneLevel =
    microphone.state.status === "ready" ? microphone.state.level : 0;
  const startInProgress =
    startStatus === "checking_challenge" || startStatus === "connecting";
  const checkMicrophone = () => {
    acceptConsent();
    void microphone.requestMicrophone();
  };

  return (
    <div className="sp-demo-stage sp-demo-stage--with-footer sp-preflight-handoff">
      <DemoStageHeading
        pretitle="Before you begin"
        title="Get ready for your interview."
      />
      <div className="sp-preflight-handoff__steps">
        <Card
          aria-labelledby="voice-disclosure-title"
          as="section"
          className="sp-preflight-disclosure"
          tone="soft"
        >
          <div className="sp-preflight-step-label">
            <span aria-hidden="true">01</span>
            <p>What to expect</p>
          </div>
          <div className="sp-preflight-disclosure__body">
            <div className="sp-preflight-disclosure__heading">
              <EntryModeBadge>
                {cvAssisted ? "CV-assisted" : "Conversation-first"}
              </EntryModeBadge>
              <h2 id="voice-disclosure-title">How the interview works</h2>
            </div>
            <ul className="sp-preflight-disclosure__list">
              <li>
                ScreenPilot listens through your microphone only during the
                interview.
              </li>
              <li>
                {cvAssisted
                  ? "The AI uses your CV and answers to ask useful follow-up questions."
                  : "The AI analyzes your answers to ask useful follow-up questions."}
              </li>
              <li>Key details become clear notes for a person to review.</li>
              <li>
                The conversation lasts up to eight minutes, and you can stop at
                any time.
              </li>
            </ul>
            <p className="sp-preflight-disclosure__boundary">
              ScreenPilot supports human review. It does not score you or make a
              hiring decision.
            </p>
          </div>
        </Card>

        <Card
          aria-labelledby="voice-consent-title"
          as="section"
          className="sp-preflight-consent"
        >
          <div className="sp-preflight-step-label">
            <span aria-hidden="true">02</span>
            <p>Before you start</p>
          </div>
          <div className="sp-preflight-consent__body">
            <div>
              <h2 id="voice-consent-title">Your privacy and consent</h2>
              <p>
                Your microphone stays off until you check it. ScreenPilot does
                not record or save your audio. Your notes stay only in this tab.
              </p>
              <p>
                Use made-up information for this demo.{" "}
                {roleDisclosure(rolePreference)}
              </p>
            </div>
            <label className="sp-preflight-consent__control">
              <input
                checked={consentChecked}
                disabled={consentAccepted}
                onChange={(event) => {
                  setConsentChecked(event.currentTarget.checked);
                }}
                type="checkbox"
              />
              <span>
                I understand how my microphone and answers will be used for this
                demo.
              </span>
            </label>

            {microphone.state.status === "ready" ? (
              <div aria-live="polite" className="sp-microphone-ready">
                <div>
                  <span aria-hidden="true" className="sp-status-dot" />
                  <div>
                    <strong>Microphone ready</strong>
                    <span>{microphone.state.deviceLabel}</span>
                  </div>
                </div>
                <div
                  aria-label="Microphone input level"
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={Math.round(microphoneLevel * 100)}
                  aria-valuetext={`${String(Math.round(microphoneLevel * 100))} percent`}
                  className="sp-microphone-meter"
                  role="meter"
                >
                  <span
                    style={{ transform: `scaleX(${String(microphoneLevel)})` }}
                  />
                </div>
              </div>
            ) : null}

            {microphone.state.status === "error" ? (
              <ErrorPanel
                actions={
                  microphone.state.error.retryable ? (
                    <Button
                      onClick={() => void microphone.requestMicrophone()}
                      variant="secondary"
                    >
                      Retry microphone
                    </Button>
                  ) : undefined
                }
                title={
                  MICROPHONE_FAILURE_COPY[microphone.state.error.code].title
                }
              >
                <p>{microphone.state.error.message}</p>
              </ErrorPanel>
            ) : null}

            {startStatus === "checking_challenge" ? (
              <ManagedTurnstileGate
                action={TURNSTILE_ACTIONS.voiceToken}
                {...(executeChallenge ? { executeChallenge } : {})}
                onFailure={handleChallengeFailure}
                onVerified={handleChallengeVerified}
                siteKey={siteKey}
              />
            ) : null}

            {challengeFailure ? (
              <ErrorPanel title="The start check could not finish">
                <p>{challengeFailure.message}</p>
              </ErrorPanel>
            ) : null}

            {startStatus === "connecting" ? (
              <div
                aria-live="polite"
                className="sp-preflight-connecting"
                role="status"
              >
                <span aria-hidden="true" className="sp-button__spinner" />
                <div>
                  <strong>Preparing the secure voice connection</strong>
                  <span>
                    You can cancel while the voice session gets ready.
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
      <DemoActionFooter>
        <Button disabled={startInProgress} onClick={onBack} variant="quiet">
          {cvAssisted ? "Back to interview plan" : "Change starting option"}
        </Button>
        <div className="sp-preflight-handoff__start-actions">
          {microphone.state.status === "idle" ||
          microphone.state.status === "requesting" ? (
            <Button
              disabled={!consentChecked}
              loading={microphone.state.status === "requesting"}
              loadingLabel="Checking microphone"
              onClick={checkMicrophone}
              variant="secondary"
            >
              Check microphone
            </Button>
          ) : null}
          {startInProgress ? (
            <Button onClick={cancelStart} variant="quiet">
              Cancel start
            </Button>
          ) : null}
          <Button
            disabled={!prerequisitesReady || startInProgress}
            onClick={startInterview}
          >
            {startButtonLabel(startStatus)}
          </Button>
        </div>
      </DemoActionFooter>
    </div>
  );
}
