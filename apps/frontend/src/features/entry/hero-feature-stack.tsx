type HeroFeatureIconName = "follow-up" | "human" | "notes" | "voice";

const HERO_FEATURES: readonly {
  description: string;
  icon: HeroFeatureIconName;
  title: string;
}[] = [
  {
    description: "Runs first-round interviews.",
    icon: "voice",
    title: "Voice interviews",
  },
  {
    description: "Adapts to answers and CVs.",
    icon: "follow-up",
    title: "Adaptive follow-ups",
  },
  {
    description: "Turns spoken details into notes.",
    icon: "notes",
    title: "Clear interview notes",
  },
  {
    description: "No scores, rankings, or automatic rejection.",
    icon: "human",
    title: "Human decisions",
  },
];

function HeroFeatureIcon({ name }: { name: HeroFeatureIconName }) {
  if (name === "voice") {
    return (
      <svg aria-hidden="true" viewBox="0 0 32 32">
        <rect height="13" rx="5" width="8" x="12" y="4" />
        <path d="M8.5 14.5A7.5 7.5 0 0 0 16 22a7.5 7.5 0 0 0 7.5-7.5M16 22v5M12 27h8" />
        <path d="M5 11v5M27 9v9" />
      </svg>
    );
  }

  if (name === "follow-up") {
    return (
      <svg aria-hidden="true" viewBox="0 0 32 32">
        <circle cx="7" cy="8" r="3" />
        <circle cx="25" cy="8" r="3" />
        <circle cx="16" cy="25" r="3" />
        <path d="M10 8h4a2 2 0 0 1 2 2v12M22 8h-4a2 2 0 0 0-2 2" />
      </svg>
    );
  }

  if (name === "notes") {
    return (
      <svg aria-hidden="true" viewBox="0 0 32 32">
        <path d="M7 4h14l5 5v19H7V4Z" />
        <path d="M21 4v6h5M11 15h10M11 20h7" />
        <path d="m11 25 2 2 5-5" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <circle cx="12" cy="10" r="4" />
      <path d="M4.5 25c.8-5.1 3.3-7.7 7.5-7.7 2.4 0 4.2.8 5.5 2.4" />
      <circle cx="23" cy="22" r="6" />
      <path d="m20.5 22 1.7 1.8 3.5-4" />
    </svg>
  );
}

export function HeroFeatureStack() {
  return (
    <div className="sp-hero-feature-stack">
      <ol aria-label="ScreenPilot core features">
        {HERO_FEATURES.map((feature, index) => (
          <li
            className={`sp-hero-feature-stack__card sp-hero-feature-stack__card--${feature.icon}`}
            key={feature.title}
          >
            <div className="sp-hero-feature-stack__card-heading">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span className="sp-hero-feature-stack__icon">
                <HeroFeatureIcon name={feature.icon} />
              </span>
            </div>
            <strong>{feature.title}</strong>
            <p>{feature.description}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
