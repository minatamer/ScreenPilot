import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  Readonly<{
    loading?: boolean;
    loadingLabel?: string;
    variant?: ButtonVariant;
  }>;

export function Button({
  children,
  className,
  disabled = false,
  loading = false,
  loadingLabel = "Loading",
  type = "button",
  variant = "primary",
  ...buttonProps
}: ButtonProps) {
  const classes = ["sp-button", `sp-button--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...buttonProps}
      aria-busy={loading || undefined}
      className={classes}
      disabled={disabled || loading}
      type={type}
    >
      {loading ? (
        <span aria-hidden="true" className="sp-button__spinner" />
      ) : null}
      <span>{loading ? loadingLabel : children}</span>
    </button>
  );
}

export type ButtonGroupProps = Readonly<{
  children: ReactNode;
  className?: string;
}>;

export function ButtonGroup({ children, className }: ButtonGroupProps) {
  const classes = ["sp-button-group", className].filter(Boolean).join(" ");

  return <div className={classes}>{children}</div>;
}
