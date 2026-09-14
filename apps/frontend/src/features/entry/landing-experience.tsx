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
import { HeroFeatureStack } from "./hero-feature-stack";
import { HowItWorksStory } from "./how-it-works-story";
import { IllustrativeInterviewPreview } from "./illustrative-interview-preview";
import { MarketSignals } from "./market-signals";
import { useDeliberateAnchorScroll } from "./use-deliberate-anchor-scroll";
import { useDemoBootstrap } from "./use-demo-bootstrap";

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
  const scrollToHowItWorks = useDeliberateAnchorScroll("how-it-works");
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
    <AppShell className="sp-landing-shell" id="top" tone="dark">
      <a className="sp-skip-link" href="#main-content">
        Skip to main content
      </a>
      <SiteHeader
        className="sp-site-header--landing"
        actions={
          <>
            <a
              className="sp-landing-header-link"
              href="#how-it-works"
              onClick={scrollToHowItWorks}
            >
              How it works
            </a>
            <a className="sp-landing-header-cta" href="/demo">
              Start demo
            </a>
          </>
        }
      />
      <main className="sp-landing" id="main-content">
        <section
          aria-labelledby="landing-hero-title"
          className="sp-landing__hero-field"
        >
          <PageContainer className="sp-landing__hero">
            <div className="sp-landing__hero-intro">
              <div className="sp-landing__hero-copy">
                <h1 id="landing-hero-title">
                  Automate the first interview.{" "}
                  <span>
                    ScreenPilot takes the{" "}
                    <span className="sp-landing__written-word">
                      <span className="sp-visually-hidden">notes.</span>
                      <svg
                        aria-hidden="true"
                        className="sp-landing__handwritten-word"
                        viewBox="0 0 220 96"
                      >
                        <path
                          d="M7 74C10 61 12 48 15 41C13 52 12 64 14 74C20 57 27 46 36 46C45 46 48 57 44 74"
                          pathLength="1"
                        />
                        <path
                          d="M61 48C53 54 52 68 59 74C67 81 79 76 84 66C88 56 84 47 75 45C69 44 64 45 61 48Z"
                          pathLength="1"
                        />
                        <path
                          d="M108 24C106 39 102 58 100 70C99 76 102 78 107 74"
                          pathLength="1"
                        />
                        <path d="M92 45C103 42 116 43 125 41" pathLength="1" />
                        <path
                          d="M132 61C143 63 158 57 158 51C158 46 151 43 144 46C134 50 131 63 136 71C142 79 155 77 164 70"
                          pathLength="1"
                        />
                        <path
                          d="M195 49C188 43 176 44 172 50C168 58 180 60 187 63C195 66 195 74 189 77C181 81 170 77 166 72"
                          pathLength="1"
                        />
                        <circle cx="210" cy="75" r="3.5" />
                      </svg>
                      <svg
                        aria-hidden="true"
                        className="sp-landing__written-word-underline"
                        preserveAspectRatio="none"
                        viewBox="0 0 220 18"
                      >
                        <path d="M4 11C46 4 82 15 124 9S181 7 216 12" />
                      </svg>
                    </span>
                  </span>
                </h1>
                <p className="sp-landing__lead">
                  Give every candidate a consistent first-round conversation
                  without asking recruiters to repeat the same questions all
                  day. ScreenPilot captures each answer as clear notes, ready
                  for your team to review.
                </p>
                <ButtonGroup className="sp-landing__hero-actions">
                  <a className="sp-button sp-button--primary" href="#start">
                    <span>Try the screening demo</span>
                  </a>
                  <a
                    className="sp-button sp-landing__secondary-action"
                    href="#how-it-works"
                    onClick={scrollToHowItWorks}
                  >
                    <span>See it step by step</span>
                  </a>
                </ButtonGroup>
              </div>
              <HeroFeatureStack />
            </div>
            <div className="sp-landing__product-frame">
              <div
                aria-hidden="true"
                className="sp-landing__product-frame-chrome"
              >
                <span />
                <span />
                <span />
              </div>
              <IllustrativeInterviewPreview />
            </div>
            <a className="sp-landing__scroll-cue" href="#how-it-works">
              <span>Scroll to see the journey</span>
              <span aria-hidden="true">↓</span>
            </a>
          </PageContainer>
        </section>

        <PageContainer>
          <MarketSignals />
        </PageContainer>

        <PageContainer>
          <HowItWorksStory />
        </PageContainer>

        <PageContainer as="section" className="sp-landing__choices" id="start">
          <div className="sp-section-heading">
            <div>
              <p className="sp-eyebrow">Start your interview</p>
              <h2>Bring a CV, or just start talking.</h2>
            </div>
            <p>
              Both options lead to the same voice interview. A CV helps Pilot
              ask more focused follow-up questions.
            </p>
          </div>

          {hasActiveSession ? (
            <Card className="sp-resume-session">
              <div>
                <p className="sp-eyebrow">Your demo is still open</p>
                <h2>Continue where you left off.</h2>
                <p>Pick up here, or clear it and start again.</p>
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
      </main>
    </AppShell>
  );
}
