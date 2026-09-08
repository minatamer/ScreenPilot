import type { HTMLAttributes } from "react";

type CardElement = "article" | "div" | "section";
export type CardTone = "default" | "soft";

type CardProps = HTMLAttributes<HTMLElement> &
  Readonly<{
    as?: CardElement;
    tone?: CardTone;
  }>;

export function Card({
  as: Component = "div",
  className,
  tone = "default",
  ...cardProps
}: CardProps) {
  const classes = ["sp-card", `sp-card--${tone}`, className]
    .filter(Boolean)
    .join(" ");

  return <Component {...cardProps} className={classes} />;
}
