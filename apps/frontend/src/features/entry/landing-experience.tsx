"use client";

import { useRouter } from "next/navigation";

import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";

import { useDemoSession } from "@/features/session/use-demo-session";
import { AppShell } from "@/shared/ui/app-shell";
import { Button, ButtonGroup } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { PageContainer } from "@/shared/ui/layout";
import { SiteHeader } from "@/shared/ui/site-header";

import { BootstrapStatus } from "./bootstrap-status";
import { EntryModeChooser } from "./entry-mode-chooser";
import { useDemoBootstrap } from "./use-demo-bootstrap";

const landingNavigation = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#privacy", label: "Privacy" },
] as const;

const ACTIVE_SESSION_STAGES = new Set([
  "awaiting_cv",
  "extracting_cv",
  "analyzing_cv",
  "plan_ready",
  "preparing_conversation",
  "preflight",
  "ready",
  "connecting",
  "live",
  "ending",
  "summarizing",
  "review_ready",
]);

export function LandingExperience() {
  const router = useRouter();
  const { clearSession, dispatch, state } = useDemoSession();
  useDemoBootstrap(true);

  const selectEntryMode = (entryMode: EntryMode) => {
    if (state.stage !== "choosing_entry_mode") {
      return;
    }
    dispatch({ type: "SELECT_ENTRY_MODE", entryMode });
    router.push("/demo");
  };
  const hasActiveSession = ACTIVE_SESSION_STAGES.has(state.stage);
  const isOpeningSession =
    state.hydrationStatus === "pending" ||
    state.stage === "empty" ||
    state.stage === "bootstrapping" ||
    state.stage === "cleared";

  return (
    <AppShell id="top" tone="light">
      <a className="sp-skip-link" href="#main-content">
        Skip to main content
      </a>
      <SiteHeader
        actions={
          <a
            className="sp-header-link"
            href="https://github.com/minatamer/ScreenPilot"
            rel="noreferrer"
            target="_blank"
          >
            Project source
          </a>
        }
        navigation={landingNavigation}
      />
      <main className="sp-landing" id="main-content">
        <PageContainer as="section" className="sp-landing__hero">
          <div>
            <p className="sp-eyebrow">Private, disposable screening demo</p>
            <h1>Adaptive AI screening, live in your browser.</h1>
            <p className="sp-landing__lead">
              Bring a CV for focused questions, or start talking and let
              ScreenPilot learn as you go.
            </p>
          </div>
          <Card className="sp-landing__decision-note" tone="soft">
            <p>Human decision boundary</p>
            <h2>ScreenPilot organizes a first conversation.</h2>
            <p>
              It supports recruiter judgment and never makes an automated hiring
              decision.
            </p>
          </Card>
        </PageContainer>

        <PageContainer as="section" className="sp-landing__context">
          <div>
            <p className="sp-eyebrow">Role-neutral by design</p>
            <h2>You choose the role in the conversation.</h2>
          </div>
          <p>
            Any bounded role you state becomes a synthetic vacancy for this
            browser session only. It is not a real employer opening, and you can
            stay undecided for an open role-neutral screen.
          </p>
          <p className="sp-landing__privacy-line">
            No account. No phone call. No ScreenPilot recording or durable
            candidate storage.
          </p>
        </PageContainer>

        <PageContainer as="section" className="sp-landing__choices">
          <div className="sp-section-heading">
            <div>
              <p className="sp-eyebrow">Choose your starting point</p>
              <h2>Two paths, one shared screening experience.</h2>
            </div>
            <p>
              Both routes reach the same disclosure and preflight. One begins
              with document context; the other begins with open discovery.
            </p>
          </div>

          {hasActiveSession ? (
            <Card className="sp-resume-session">
              <div>
                <p className="sp-eyebrow">Private session in progress</p>
                <h2>Continue where you left off.</h2>
                <p>
                  Your current preparation remains only in this browser tab.
                </p>
              </div>
              <ButtonGroup>
                <Button
                  onClick={() => {
                    router.push("/demo");
                  }}
                >
                  Continue demo
                </Button>
                <Button onClick={clearSession} variant="quiet">
                  Clear session
                </Button>
              </ButtonGroup>
            </Card>
          ) : (
            <EntryModeChooser
              disabled={isOpeningSession}
              onSelect={selectEntryMode}
            />
          )}

          {isOpeningSession ? (
            <BootstrapStatus
              failure={state.failure}
              onRetry={() => {
                dispatch({ type: "RETRY" });
              }}
            />
          ) : null}
        </PageContainer>

        <PageContainer
          as="section"
          className="sp-landing__explanation"
          id="how-it-works"
        >
          <div className="sp-section-heading">
            <div>
              <p className="sp-eyebrow">How it works</p>
              <h2>A useful screen without a candidate record.</h2>
            </div>
            <p>
              The experience becomes more specific only when evidence appears in
              the current session.
            </p>
          </div>
          <ol className="sp-how-grid">
            <li>
              <span>01</span>
              <h3>Set the context</h3>
              <p>
                Use a synthetic CV or let the voice conversation discover it.
              </p>
            </li>
            <li>
              <span>02</span>
              <h3>Have one open interview</h3>
              <p>Universal first-stage HR topics adapt to confirmed answers.</p>
            </li>
            <li>
              <span>03</span>
              <h3>Review structured notes</h3>
              <p>
                Evidence stays local and is clearly separated from judgment.
              </p>
            </li>
          </ol>
        </PageContainer>

        <PageContainer
          as="section"
          className="sp-landing__privacy"
          id="privacy"
        >
          <div>
            <p className="sp-eyebrow">Privacy and demo limits</p>
            <h2>Your session is designed to disappear.</h2>
          </div>
          <div>
            <p>
              Candidate content stays in the active browser/request lifecycle.
              Closing or clearing the tab ends the recoverable demo session.
            </p>
            <p>
              Conversation-first uses your answers—not a document—as local
              transcript and insight evidence. Before voice starts, ScreenPilot
              will separately disclose AI voice, transcription, provider
              processing, the eight-minute limit, and microphone access.
            </p>
          </div>
        </PageContainer>
      </main>
    </AppShell>
  );
}
