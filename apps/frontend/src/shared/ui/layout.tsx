import type { HTMLAttributes } from "react";

type LayoutElement = "div" | "section";

type PageContainerProps = HTMLAttributes<HTMLElement> &
  Readonly<{
    as?: LayoutElement;
    width?: "content" | "reading";
  }>;

export function PageContainer({
  as: Component = "div",
  className,
  width = "content",
  ...containerProps
}: PageContainerProps) {
  const classes = ["sp-container", `sp-container--${width}`, className]
    .filter(Boolean)
    .join(" ");

  return <Component {...containerProps} className={classes} />;
}

type StackProps = HTMLAttributes<HTMLDivElement> &
  Readonly<{
    gap?: "small" | "medium" | "large";
  }>;

export function Stack({
  className,
  gap = "medium",
  ...stackProps
}: StackProps) {
  const classes = ["sp-stack", `sp-stack--${gap}`, className]
    .filter(Boolean)
    .join(" ");

  return <div {...stackProps} className={classes} />;
}
