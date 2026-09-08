import type { ReactNode } from "react";

type ErrorPanelProps = Readonly<{
  actions?: ReactNode;
  announce?: "assertive" | "polite" | false;
  children: ReactNode;
  title: string;
}>;

export function ErrorPanel({
  actions,
  announce = "assertive",
  children,
  title,
}: ErrorPanelProps) {
  return (
    <section
      aria-live={announce || undefined}
      className="sp-error-panel"
      role={announce ? "alert" : undefined}
    >
      <span aria-hidden="true" className="sp-error-panel__icon">
        !
      </span>
      <div className="sp-error-panel__copy">
        <h3>{title}</h3>
        <div>{children}</div>
      </div>
      {actions ? (
        <div className="sp-error-panel__actions">{actions}</div>
      ) : null}
    </section>
  );
}
