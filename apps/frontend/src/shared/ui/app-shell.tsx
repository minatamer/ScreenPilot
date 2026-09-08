import type { HTMLAttributes } from "react";

type AppShellProps = HTMLAttributes<HTMLDivElement> &
  Readonly<{
    embedded?: boolean;
    tone?: "dark" | "light";
  }>;

export function AppShell({
  className,
  embedded = false,
  tone = "light",
  ...shellProps
}: AppShellProps) {
  const classes = [
    "sp-app-shell",
    embedded && "sp-app-shell--embedded",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div {...shellProps} className={classes} data-theme={tone} />;
}
