"use client";

import type { RolePreference } from "@screenpilot/contracts/interview/demo-context";
import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";

import { ManagedTurnstileGate } from "@/features/abuse-protection/managed-turnstile-gate";
import {
  TURNSTILE_ACTIONS,
  type ExecuteTurnstileChallenge,
} from "@/features/abuse-protection/turnstile-client";
import { Button, ButtonGroup } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
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
    return `${rolePreference.label} is a synthetic role for this browser session—not a real opening or application.`;
  }
  return "No role is confirmed yet. The interview stays role-neutral until you describe one, and any role discussed is synthetic for this browser session.";
}

function startButtonLabel(startStatus: VoiceStartStatus): string {
  return startStatus === "challenge_error"
    ? "Retry start check"
    : "Start AI interview";
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

  return (
    <div className="sp-demo-stage sp-preflight-handoff">
      <div className="sp-preflight-handoff__heading">
        <EntryModeBadge>
          {cvAssisted ? "CV-assisted" : "Conversation-first"}
        </EntryModeBadge>
        <p className="sp-eyebrow">Voice setup</p>
        <h1>Your first interview is prepared.</h1>
        <p className="sp-demo-stage__lead">
          {cvAssisted
            ? "Pilot will use grounded CV context as a starting point, then ask you to confirm or correct it."
            : "Pilot will begin broadly and build the conversation only from what you say."}
        </p>
        <p className="sp-preflight-handoff__role">
          {roleDisclosure(rolePreference)}
        </p>
      </div>

      <div className="sp-preflight-handoff__steps">
        <Card
          aria-labelledby="voice-disclosure-title"
          as="section"
          className="sp-preflight-disclosure"
          tone="soft"
        >
          <div className="sp-preflight-step-label">
            <span aria-hidden="true">01</span>
            <p>Before voice begins</p>
          </div>
          <div>
            <h2 id="voice-disclosure-title">How this voice demo works</h2>
            <ul className="sp-preflight-disclosure__list">
              <li>
                ElevenLabs streams microphone audio for the AI voice and live
                transcription only after you start.
              </li>
              <li>
                OpenAI processes CV planning and post-call note organization
                where applicable.
              </li>
              <li>
                Cloudflare Turnstile checks ordinary anti-abuse signals. Your
                CV, answers, and microphone audio are not sent to Turnstile.
              </li>
              <li>
                ScreenPilot does not record or save audio. The review remains in
                this tab's disposable session.
              </li>
              <li>
                Use synthetic information. The interview lasts no more than
                eight minutes and supports human review—not a hiring decision.
              </li>
            </ul>
          </div>
        </Card>

        <Card
          aria-labelledby="voice-consent-title"
          as="section"
          className="sp-preflight-consent"
        >
          <div className="sp-preflight-step-label">
            <span aria-hidden="true">02</span>
            <p>Your choice</p>
          </div>
          <div className="sp-preflight-consent__body">
            <div>
              <h2 id="voice-consent-title">Review and give consent</h2>
              <p>
                Nothing is listening yet. Microphone permission is requested
                only after you accept and choose to check it.
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
                I understand the processing, session, and synthetic-data
                boundaries above.
              </span>
            </label>
            <Button
              disabled={!consentChecked || consentAccepted}
              onClick={acceptConsent}
              variant="secondary"
            >
              {consentAccepted
                ? "Consent accepted"
                : "I understand and continue"}
            </Button>
          </div>
        </Card>

        <Card
          aria-labelledby="microphone-readiness-title"
          as="section"
          className="sp-preflight-microphone"
          tone="soft"
        >
          <div className="sp-preflight-step-label">
            <span aria-hidden="true">03</span>
            <p>Local device check</p>
          </div>
          <div className="sp-preflight-microphone__body">
            <div>
              <h2 id="microphone-readiness-title">Check your microphone</h2>
              <p>
                This meter measures input locally. ScreenPilot does not record
                or upload a test clip.
              </p>
            </div>

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

            {microphone.state.status === "idle" ||
            microphone.state.status === "requesting" ? (
              <Button
                disabled={!consentAccepted}
                loading={microphone.state.status === "requesting"}
                loadingLabel="Checking microphone"
                onClick={() => void microphone.requestMicrophone()}
                variant="secondary"
              >
                Check microphone
              </Button>
            ) : null}
          </div>
        </Card>

        <Card
          aria-labelledby="voice-start-title"
          as="section"
          className="sp-preflight-start"
        >
          <div className="sp-preflight-step-label">
            <span aria-hidden="true">04</span>
            <p>Protected start</p>
          </div>
          <div className="sp-preflight-start__body">
            <div>
              <h2 id="voice-start-title">Start when you are ready</h2>
              <p>
                The anti-abuse check runs only from this deliberate action. A
                challenge appears here only when Cloudflare requires one.
              </p>
            </div>

            <ul aria-label="Start readiness" className="sp-readiness-list">
              <li data-ready={consentAccepted}>Consent</li>
              <li data-ready={microphone.state.status === "ready"}>
                Microphone
              </li>
              <li data-ready={grantValid}>Prepared session</li>
              <li data-ready={clientReady}>Anti-abuse check</li>
            </ul>

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

            <ButtonGroup>
              <Button
                disabled={!prerequisitesReady || startInProgress}
                onClick={startInterview}
              >
                {startButtonLabel(startStatus)}
              </Button>
              {startInProgress ? (
                <Button onClick={cancelStart} variant="quiet">
                  Cancel start
                </Button>
              ) : null}
            </ButtonGroup>
          </div>
        </Card>
      </div>

      <ButtonGroup className="sp-preflight-handoff__actions">
        <Button disabled={startInProgress} onClick={onBack} variant="secondary">
          {cvAssisted ? "Back to interview plan" : "Change starting option"}
        </Button>
      </ButtonGroup>
    </div>
  );
}
