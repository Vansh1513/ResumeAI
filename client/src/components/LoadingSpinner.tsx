import { cn } from "../utils/cn";

export default function LoadingSpinner({ className, label = "Loading…" }: { className?: string; label?: string }) {
  return (
    <section className={cn("flex flex-col items-center justify-center gap-3 py-16", className)}>
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      <p className="text-sm text-text-muted">{label}</p>
    </section>
  );
}
