import { type HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

type Variant = "default" | "success" | "warning" | "danger" | "info" | "primary";

const variants: Record<Variant, string> = {
  default:  "border border-border/60 bg-surface-overlay text-text-muted",
  primary:  "border border-primary/30 bg-primary/10 text-primary",
  success:  "border border-success/30 bg-success/10 text-success",
  warning:  "border border-warning/30 bg-warning/10 text-warning",
  danger:   "border border-danger/30 bg-danger/10 text-danger",
  info:     "border border-accent/30 bg-accent/10 text-accent",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export default function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
