import type { ReactNode } from "react";

import { Card } from "./card";

type EntryModeCardProps = Readonly<{
  actions: ReactNode;
  badge?: ReactNode;
  description: string;
  headingLevel?: 2 | 3;
  icon: ReactNode;
  title: string;
}>;

export function EntryModeCard({
  actions,
  badge,
  description,
  headingLevel = 2,
  icon,
  title,
}: EntryModeCardProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <Card as="article" className="sp-entry-card">
      <div aria-hidden="true" className="sp-entry-card__icon">
        {icon}
      </div>
      <div className="sp-entry-card__copy">
        {badge}
        <Heading>{title}</Heading>
        <p>{description}</p>
      </div>
      <div className="sp-entry-card__actions">{actions}</div>
    </Card>
  );
}
