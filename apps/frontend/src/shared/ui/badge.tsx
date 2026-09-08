import type { HTMLAttributes } from "react";

export type BadgeTone = "neutral" | "coral" | "success" | "warning" | "danger";

type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  Readonly<{
    tone?: BadgeTone;
  }>;

export function Badge({
  className,
  tone = "neutral",
  ...badgeProps
}: BadgeProps) {
  const classes = ["sp-badge", `sp-badge--${tone}`, className]
    .filter(Boolean)
    .join(" ");

  return <span {...badgeProps} className={classes} />;
}
