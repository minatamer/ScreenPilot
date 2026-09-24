"use client";

import type { RolePreference } from "@screenpilot/contracts/interview/demo-context";
import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";

import { ManagedTurnstileGate } from "@/features/abuse-protection/managed-turnstile-gate";
import {
  TURNSTILE_ACTIONS,
  type ExecuteTurnstileChallenge,
} from "@/features/abuse-protection/turnstile-client";
import { PRIVACY_NOTICE_COPY } from "@/features/privacy/privacy-copy";
import { PrivacyNotice } from "@/features/privacy/privacy-notice";
import { ProviderOperationsUnavailable } from "@/features/session/provider-operations-unavailable";
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
  providerOperationsEnabled: boolean;
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

type PreflightFactIconKind = "clock" | "microphone" | "notes" | "spark";

function PreflightFactIcon({
  kind,
}: Readonly<{ kind: PreflightFactIconKind }>) {
  if (kind === "microphone") {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <rect
          height="10"
          rx="4"
          stroke="currentColor"
          width="7"
          x="8.5"
          y="3"
        />
        <path
          d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7"
          stroke="currentColor"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "spark") {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path
          d="M12 3.5 14 9l5.5 2-5.5 2-2 5.5-2-5.5-5.5-2L10 9l2-5.5Z"
          stroke="currentColor"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "notes") {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path
          d="M6 4.5h12v15H6zM9 9h6M9 12h6M9 15h4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" stroke="currentColor" />
      <path
        d="M12 7.5V12l3 2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PreflightFact({
  children,
  icon,
}: Readonly<{ children: string; icon: PreflightFactIconKind }>) {
  return (
    <div className="sp-preflight-fact" role="listitem">
      <span className="sp-preflight-fact__icon">
        <PreflightFactIcon kind={icon} />
      </span>
      <p>{children}</p>
    </div>
  );
}

export function PreflightHandoff(props: PreflightHandoffProps) {
  if (!props.providerOperationsEnabled) {
    return (
      <ProviderOperationsUnavailable
        actionLabel={
          props.entryMode === "cv_assisted"
            ? "Back to interview plan"
            : "Change starting option"
        }
        description="External actions are disabled for this safety check. ScreenPilot will not request microphone access, run a start challenge, or open a voice connection."
        onAction={props.onBack}
        title="Voice interview is unavailable right now."
      />
    );
  }

  return <EnabledPreflightHandoff {...props} />;
}

function EnabledPreflightHandoff({
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
        step={3}
        title="Get ready for your interview."
      />
      <div className="sp-preflight-handoff__steps">
        <Card
          aria-labelledby="voice-disclosure-title"
          as="section"
          className="sp-preflight-disclosure"
          tone="soft"
        >
          <div className="sp-preflight-disclosure__body">
            <div className="sp-preflight-disclosure__heading">
              <div>
                <p className="sp-preflight-kicker">01 · Interview</p>
                <h2 id="voice-disclosure-title">How the interview works</h2>
              </div>
              <EntryModeBadge>
                {cvAssisted ? "CV-assisted" : "Conversation-first"}
              </EntryModeBadge>
            </div>
            <div className="sp-preflight-fact-grid" role="list">
              <PreflightFact icon="microphone">
                Your microphone is used only during the interview.
              </PreflightFact>
              <PreflightFact icon="spark">
                {cvAssisted
                  ? "Pilot uses your CV and answers for follow-up questions."
                  : "Pilot uses your answers for follow-up questions."}
              </PreflightFact>
              <PreflightFact icon="notes">
                Key details become notes for a person to review.
              </PreflightFact>
              <PreflightFact icon="clock">
                It lasts up to eight minutes; you can stop anytime.
              </PreflightFact>
            </div>
          </div>
        </Card>

        <Card
          aria-labelledby="voice-consent-title"
          as="section"
          className="sp-preflight-consent"
        >
          <div className="sp-preflight-consent__body">
            <div className="sp-preflight-consent__heading">
              <p className="sp-preflight-kicker">02 · Permission</p>
              <h2 id="voice-consent-title">Your privacy and consent</h2>
            </div>
            <PrivacyNotice
              roleDisclosure={roleDisclosure(rolePreference)}
              variant="preflight"
            />
            <label className="sp-preflight-consent__control">
              <input
                checked={consentChecked}
                disabled={consentAccepted}
                onChange={(event) => {
                  setConsentChecked(event.currentTarget.checked);
                }}
                type="checkbox"
              />
              <span>{PRIVACY_NOTICE_COPY.preflight.consent}</span>
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
                <meter
                  aria-label="Microphone input level"
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={Math.round(microphoneLevel * 100)}
                  aria-valuetext={`${String(Math.round(microphoneLevel * 100))} percent`}
                  className="sp-microphone-meter"
                  max={1}
                  min={0}
                  value={microphoneLevel}
                />
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
