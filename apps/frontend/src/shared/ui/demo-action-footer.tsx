import type { ReactNode } from "react";

type DemoActionFooterProps = Readonly<{
  children: ReactNode;
  className?: string;
  note?: ReactNode;
}>;

export function DemoActionFooter({
  children,
  className,
  note,
}: DemoActionFooterProps) {
  const classes = ["sp-demo-action-footer", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} data-has-note={Boolean(note)}>
      {note ? <div className="sp-demo-action-footer__note">{note}</div> : null}
      <div className="sp-demo-action-footer__actions">{children}</div>
    </div>
  );
}
