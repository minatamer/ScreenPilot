import type { ReactNode } from "react";

import { ScreenPilotMark } from "./screenpilot-mark";

type NavigationItem = Readonly<{
  href: string;
  label: string;
}>;

type SiteHeaderProps = Readonly<{
  actions?: ReactNode;
  brandHref?: string;
  className?: string;
  middle?: ReactNode;
  navigation?: readonly NavigationItem[];
}>;

export function SiteHeader({
  actions,
  brandHref = "#top",
  className,
  middle,
  navigation = [],
}: SiteHeaderProps) {
  const classes = ["sp-site-header", className].filter(Boolean).join(" ");
  const brand = <ScreenPilotMark href={brandHref} />;
  const middleContent = middle ? (
    <div className="sp-site-header__middle">{middle}</div>
  ) : navigation.length > 0 ? (
    <nav aria-label="Primary navigation" className="sp-site-header__nav">
      {navigation.map(({ href, label }) => (
        <a href={href} key={`${href}:${label}`}>
          {label}
        </a>
      ))}
    </nav>
  ) : null;
  const actionContent = actions ? (
    <div className="sp-site-header__actions">{actions}</div>
  ) : null;

  return (
    <header className={classes}>
      <div className="sp-site-header__inner">
        {brand}
        {middleContent}
        {actionContent}
      </div>
    </header>
  );
}
