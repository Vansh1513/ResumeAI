import { cn } from "../../utils/cn";

type Variant = "error" | "info" | "success" | "warning";

const styles: Record<Variant, { wrap: string; icon: string }> = {
  error:   { wrap: "border-danger/25 bg-danger/8 text-danger",   icon: "⚠" },
  info:    { wrap: "border-primary/25 bg-primary/8 text-primary", icon: "ℹ" },
  success: { wrap: "border-success/25 bg-success/8 text-success", icon: "✓" },
  warning: { wrap: "border-warning/25 bg-warning/8 text-warning", icon: "!" },
};

export default function Alert({
  children,
  variant = "error",
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  const { wrap, icon } = styles[variant];
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3.5 text-sm leading-relaxed",
        wrap,
        className
      )}
      role="alert"
    >
      <span className="mt-0.5 shrink-0 text-base font-bold">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
