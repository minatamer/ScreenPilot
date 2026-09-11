"use client";

import { PrivacyDialog } from "@/features/privacy/privacy-dialog";

import { useScrollStory } from "./use-scroll-story";

const storySteps = [
  {
    copy: "Bring a CV for more focused questions, or skip it and begin with a broad conversation.",
    label: "Choose",
    title: "Start the way that feels easiest.",
  },
  {
    copy: "Pilot asks one question at a time and follows what you actually say—not a fixed script.",
    label: "Talk",
    title: "Answer in your own words.",
  },
  {
    copy: "Useful details are pulled into clear notes, always tied back to the answer they came from.",
    label: "Notes",
    title: "Watch the important parts become notes.",
  },
  {
    copy: "ScreenPilot organizes the conversation. A person reviews the notes and makes every decision.",
    label: "Review",
    title: "The final call stays human.",
  },
] as const;

function StoryVisual({ activeStep }: Readonly<{ activeStep: number }>) {
  return (
    <div aria-hidden="true" className="sp-scroll-story__scene">
      <div className="sp-scroll-story__scene-topline">
        <span>How it works</span>
        <span>0{activeStep + 1} / 04</span>
      </div>

      <div className="sp-scroll-story__progress">
        {storySteps.map(({ label }, index) => (
          <span
            data-active={index === activeStep}
            data-complete={index < activeStep}
            key={label}
          />
        ))}
      </div>

      <div className="sp-scroll-story__scene-body" data-scene={activeStep}>
        {activeStep === 0 ? (
          <div className="sp-scroll-story__choices-visual">
            <span>Use a CV</span>
            <i>or</i>
            <span>Just start talking</span>
          </div>
        ) : null}

        {activeStep === 1 ? (
          <div className="sp-scroll-story__talk-visual">
            <div className="sp-scroll-story__mini-bars">
              {Array.from({ length: 11 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
            <p>“Tell me about the work you enjoy most.”</p>
          </div>
        ) : null}

        {activeStep === 2 ? (
          <div className="sp-scroll-story__notes-visual">
            <blockquote>“I can start in about four weeks.”</blockquote>
            <span>becomes</span>
            <div>
              <small>Availability</small>
              <strong>About 4 weeks</strong>
            </div>
          </div>
        ) : null}

        {activeStep === 3 ? (
          <div className="sp-scroll-story__review-visual">
            <div>
              <span>Experience</span>
              <span>Availability</span>
              <span>Work preference</span>
            </div>
            <strong>Ready for a person to review</strong>
          </div>
        ) : null}
      </div>

      <div className="sp-scroll-story__scene-caption">
        <span>{storySteps[activeStep]?.label}</span>
        <strong>{storySteps[activeStep]?.title}</strong>
      </div>
    </div>
  );
}

export function HowItWorksStory() {
  const { activeStep, registerStep } = useScrollStory(storySteps.length);

  return (
    <section
      aria-labelledby="how-it-works-title"
      className="sp-landing__story"
      id="how-it-works"
    >
      <div className="sp-landing__story-heading">
        <p className="sp-eyebrow">How it works</p>
        <h2 id="how-it-works-title">From first question to clear notes.</h2>
        <p>Scroll through the four simple steps.</p>
      </div>

      <div className="sp-scroll-story">
        <StoryVisual activeStep={activeStep} />

        <ol className="sp-scroll-story__steps">
          {storySteps.map(({ copy, label, title }, index) => (
            <li
              data-active={activeStep === index}
              data-story-step={index}
              key={label}
              ref={registerStep(index)}
            >
              <span>
                0{index + 1} · {label}
              </span>
              <h3>{title}</h3>
              <p>{copy}</p>
              {index === storySteps.length - 1 ? (
                <div className="sp-scroll-story__privacy">
                  <p>
                    Your content stays inside this demo. Clear it when you are
                    done; ScreenPilot does not build a candidate profile.
                  </p>
                  <PrivacyDialog
                    triggerClassName="sp-scroll-story__privacy-button"
                    triggerLabel="Privacy details"
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
