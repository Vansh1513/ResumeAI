import { type ComponentPropsWithRef } from "react";
import { cn } from "../../utils/cn";

interface CardProps extends ComponentPropsWithRef<"div"> {
  /** Visual elevation level — controls shadow and border brightness */
  elevation?: "flat" | "raised" | "elevated";
  /** Add a subtle hover lift + glow effect */
  hoverable?: boolean;
}

const elevations = {
  flat:     "border-border-muted bg-surface-card shadow-none",
  raised:   "border-border bg-surface-raised shadow-sm",
  elevated: "border-border bg-surface-overlay shadow-md",
};

export default function Card({
  className,
  children,
  elevation = "raised",
  hoverable = false,
  ref,
  ...props
}: CardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border p-6 transition-all duration-200",
        elevations[elevation],
        hoverable && "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
