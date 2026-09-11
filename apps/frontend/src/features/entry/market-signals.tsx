const MARKET_SIGNALS = [
  {
    detail: "1,271 recruiting professionals · 23 countries",
    href: "https://business.linkedin.com/hire/resources/future-of-recruiting",
    label:
      "of recruiting organizations are already integrating or testing generative AI in hiring.",
    layout: "adoption",
    source: "LinkedIn, 2025",
    sourceLabel: "Read LinkedIn's 2025 Future of Recruiting report",
    title: "Recruiting adoption",
    value: "37%",
  },
  {
    detail: "1,271 recruiting professionals · 23 countries",
    href: "https://business.linkedin.com/hire/resources/future-of-recruiting",
    label:
      "of talent-acquisition professionals agree AI will change how organizations hire. That shift creates room to automate repetitive screening while keeping judgment with hiring teams.",
    layout: "outlook",
    source: "LinkedIn, 2025",
    sourceLabel: "Read LinkedIn's 2025 hiring-change research",
    title: "Where teams think hiring is headed",
    value: "73%",
  },
  {
    detail: "Teams integrating or experimenting with generative AI",
    href: "https://business.linkedin.com/hire/resources/future-of-recruiting",
    label:
      "of the workweek is the average time talent teams using generative AI say it saves them. That is about one day.",
    layout: "time",
    source: "LinkedIn, 2025",
    sourceLabel: "Read LinkedIn's 2025 recruiting time-savings research",
    title: "Reported time saved",
    value: "20%",
  },
  {
    detail: "1,200 active job seekers in the United States",
    href: "https://www.greenhouse.com/newsroom/63-of-job-seekers-have-faced-an-ai-interview-most-havent-had-a-good-one-yet",
    label: "of U.S. job seekers say they have already had an AI interview.",
    layout: "exposure",
    source: "Greenhouse, 2026",
    sourceLabel: "Read Greenhouse's 2026 Candidate AI Interview research",
    title: "AI interview exposure",
    value: "63%",
  },
  {
    detail: "2,918 job candidates surveyed",
    href: "https://www.gartner.com/en/newsroom/press-releases/2025-07-31-gartner-survey-shows-just-26-percent-of-job-applicants-trust-ai-will-fairly-evaluate-them",
    label: "of candidates trust AI to evaluate them fairly.",
    layout: "trust",
    source: "Gartner, 2025",
    sourceLabel: "Read Gartner's 2025 candidate trust research",
    title: "Candidate trust",
    value: "26%",
  },
] as const;

export function MarketSignals() {
  return (
    <section
      aria-labelledby="market-signals-title"
      className="sp-market-signals"
    >
      <div className="sp-market-signals__intro">
        <div>
          <p className="sp-eyebrow">The hiring market is moving</p>
          <h2 id="market-signals-title">
            AI hiring is already here.{" "}
            <span>Candidate trust still matters.</span>
          </h2>
        </div>
        <p>
          Recruiting teams are getting real time back from AI, while candidates
          are asking for clearer boundaries. ScreenPilot is built for both: it
          runs the repeatable first conversation and leaves every hiring
          decision with people.
        </p>
      </div>

      <ul className="sp-market-signals__grid">
        {MARKET_SIGNALS.map((signal, index) => (
          <li
            className={`sp-market-signals__card sp-market-signals__card--${signal.layout}`}
            key={`${signal.source}-${signal.value}`}
          >
            <div className="sp-market-signals__card-heading">
              <span>{signal.title}</span>
              <span aria-hidden="true">0{index + 1}</span>
            </div>
            <div className="sp-market-signals__metric">
              <strong>{signal.value}</strong>
            </div>
            <div className="sp-market-signals__card-copy">
              <p>{signal.label}</p>
              <span>{signal.detail}</span>
              <cite>
                <a
                  aria-label={`${signal.sourceLabel} (opens in a new tab)`}
                  href={signal.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="sp-market-signals__source-label">
                    {signal.source}
                  </span>
                  <span aria-hidden="true">↗</span>
                </a>
              </cite>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
