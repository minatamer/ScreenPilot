import type { ReactNode } from "react";

import { ScreenPilotMark } from "./screenpilot-mark";

type NavigationItem = Readonly<{
  href: string;
  label: string;
}>;

type SiteHeaderProps = Readonly<{
  actions?: ReactNode;
  middle?: ReactNode;
  navigation?: readonly NavigationItem[];
}>;

export function SiteHeader({
  actions,
  middle,
  navigation = [],
}: SiteHeaderProps) {
  return (
    <header className="sp-site-header">
      <div className="sp-site-header__inner">
        <ScreenPilotMark href="#top" />
        {middle ? (
          <div className="sp-site-header__middle">{middle}</div>
        ) : navigation.length > 0 ? (
          <nav aria-label="Primary navigation" className="sp-site-header__nav">
            {navigation.map(({ href, label }) => (
              <a href={href} key={`${href}:${label}`}>
                {label}
              </a>
            ))}
          </nav>
        ) : null}
        {actions ? (
          <div className="sp-site-header__actions">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
