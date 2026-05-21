import { type ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size    = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover active:scale-[0.97] shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30",
  secondary:
    "bg-surface-overlay text-text border border-border hover:bg-border hover:border-primary/30 active:scale-[0.97]",
  ghost:
    "bg-transparent text-text-muted hover:bg-surface-overlay hover:text-text active:scale-[0.97]",
  danger:
    "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 hover:border-danger/40 active:scale-[0.97]",
};

const sizes: Record<Size, string> = {
  xs: "px-2.5 py-1 text-xs rounded-md gap-1",
  sm: "px-3.5 py-1.5 text-sm rounded-lg gap-1.5",
  md: "px-4 py-2 text-sm rounded-lg gap-2",
  lg: "px-5 py-2.5 text-base rounded-xl gap-2",
};

export default function Button({
  className,
  variant = "primary",
  size = "md",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center font-medium",
        "transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
