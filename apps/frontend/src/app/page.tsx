import { AppShell } from "@/shared/ui/app-shell";
import { Badge } from "@/shared/ui/badge";
import { Button, ButtonGroup } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EntryModeBadge } from "@/shared/ui/entry-mode-badge";
import { EntryModeCard } from "@/shared/ui/entry-mode-card";
import { ErrorPanel } from "@/shared/ui/error-panel";
import { PageContainer, Stack } from "@/shared/ui/layout";
import { ScreenPilotMark } from "@/shared/ui/screenpilot-mark";
import { SiteHeader } from "@/shared/ui/site-header";
import { StageIndicator } from "@/shared/ui/stage-indicator";

const foundationNavigation = [
  { href: "#entry-modes", label: "Entry cards" },
  { href: "#states", label: "States" },
  { href: "#dark-shell", label: "Dark shell" },
] as const;

function DocumentIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M7 3.75h6.5L18 8.3v11.95H7V3.75Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M13.5 3.75V8.3H18M9.5 12h6M9.5 15.5h4.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ConversationIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M4.5 6.25h15v9.5h-8l-4.75 3v-3H4.5v-9.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M8 10h8M8 13h5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function HomePage() {
  return (
    <AppShell id="top" tone="light">
      <a className="sp-skip-link" href="#main-content">
        Skip to main content
      </a>
      <SiteHeader
        actions={<Badge tone="neutral">Foundation preview</Badge>}
        navigation={foundationNavigation}
      />
      <main className="sp-foundations" id="main-content">
        <PageContainer as="section" className="sp-foundations__hero">
          <div>
            <p className="sp-foundations__eyebrow">Signal Canvas · SP-005</p>
            <h1>The shared visual foundation for ScreenPilot.</h1>
            <p className="sp-foundations__lead">
              Deep Ink brings focus, Warm Coral shows the next action, and a
              quiet neutral canvas keeps the candidate at the center.
            </p>
          </div>
          <p className="sp-foundations__principle">
            AI supports the conversation. People make every hiring decision.
          </p>
        </PageContainer>

        <PageContainer
          as="section"
          className="sp-foundations__section"
          id="entry-modes"
        >
          <div className="sp-section-heading">
            <div>
              <p className="sp-section-heading__eyebrow">Entry mode</p>
              <h2>One card pattern, two clear starting points.</h2>
            </div>
            <p>
              These cards are deliberately presentational. Later tickets will
              connect them to CV and conversation workflows without duplicating
              the visual structure.
            </p>
          </div>
          <div className="sp-foundations__entry-grid">
            <EntryModeCard
              actions={<Button>Bring a CV</Button>}
              badge={<EntryModeBadge>Focused path</EntryModeBadge>}
              description="Use candidate-provided context to prepare a focused, evidence-aware conversation."
              icon={<DocumentIcon />}
              title="Start with a CV"
            />
            <EntryModeCard
              actions={<Button variant="secondary">Start without a CV</Button>}
              badge={<EntryModeBadge>Open path</EntryModeBadge>}
              description="Begin with a conversation and let the interview plan adapt as useful signals emerge."
              icon={<ConversationIcon />}
              title="Start with a conversation"
            />
          </div>
        </PageContainer>

        <PageContainer
          as="section"
          className="sp-foundations__section"
          id="states"
        >
          <div className="sp-section-heading">
            <div>
              <p className="sp-section-heading__eyebrow">Reusable states</p>
              <h2>Predictable before, during, and after an action.</h2>
            </div>
            <p>
              Controls, progress, and errors share the same accessible language
              in both color modes.
            </p>
          </div>
          <div className="sp-foundations__state-grid">
            <Card className="sp-foundations__state-card">
              <StageIndicator
                currentIndex={2}
                stages={[
                  "Setup",
                  "Prepare",
                  "Preflight",
                  "Interview",
                  "Review",
                ]}
              />
              <ButtonGroup>
                <Button>Primary action</Button>
                <Button variant="secondary">Secondary action</Button>
                <Button loading loadingLabel="Preparing">
                  Prepare
                </Button>
                <Button disabled variant="quiet">
                  Unavailable
                </Button>
              </ButtonGroup>
            </Card>
            <Stack gap="small">
              <Badge tone="success">Ready</Badge>
              <Badge tone="warning">Needs attention</Badge>
              <Badge tone="danger">Unavailable</Badge>
              <p className="sp-foundations__note">
                Every control keeps a minimum 44 × 44 pixel touch target.
              </p>
            </Stack>
          </div>
          <ErrorPanel
            actions={<Button variant="secondary">Try again</Button>}
            announce={false}
            title="The preview could not refresh"
          >
            <p>Your work is still here. Check the connection and try again.</p>
          </ErrorPanel>
        </PageContainer>

        <PageContainer
          as="section"
          className="sp-foundations__section"
          id="dark-shell"
        >
          <div className="sp-section-heading">
            <div>
              <p className="sp-section-heading__eyebrow">Focused shell</p>
              <h2>Dark only when the conversation needs full attention.</h2>
            </div>
            <p>
              Preflight and interview stages inherit the same tokens and
              components rather than becoming a second interface.
            </p>
          </div>
          <AppShell aria-labelledby="dark-preview-title" embedded tone="dark">
            <div className="sp-dark-preview">
              <div className="sp-dark-preview__topline">
                <ScreenPilotMark />
                <Badge tone="neutral">Private browser session</Badge>
              </div>
              <div className="sp-dark-preview__body">
                <div>
                  <div aria-hidden="true" className="sp-dark-preview__signal">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <h3 id="dark-preview-title">Pilot is listening.</h3>
                  <p>
                    A quiet, high-contrast canvas keeps the live conversation
                    readable without turning ScreenPilot into the
                    decision-maker.
                  </p>
                </div>
              </div>
              <div className="sp-dark-preview__status">
                <span>Connection ready</span>
                <ButtonGroup className="sp-dark-preview__controls">
                  <Button variant="secondary">Mute</Button>
                  <Button variant="danger">End interview</Button>
                </ButtonGroup>
              </div>
            </div>
          </AppShell>
        </PageContainer>
      </main>
    </AppShell>
  );
}
