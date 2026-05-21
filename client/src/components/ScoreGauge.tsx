import { formatPercent, scoreRingColor } from "../utils/format";
import { cn } from "../utils/cn";

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: "sm" | "lg";
}

export default function ScoreGauge({ score, label, size = "lg" }: ScoreGaugeProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const ringSize = size === "sm" ? "h-14 w-14" : "h-24 w-24";
  const textSize = size === "sm" ? "text-sm" : "text-xl";

  return (
    <section className="flex flex-col items-center gap-2">
      <section
        className={cn("relative flex items-center justify-center rounded-full", ringSize)}
        style={{
          background: `conic-gradient(${scoreRingColor(clamped)} ${clamped * 3.6}deg, var(--color-border) 0deg)`,
        }}
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-full bg-surface-raised font-bold",
            textSize,
            size === "sm" ? "h-10 w-10" : "h-[4.5rem] w-[4.5rem]"
          )}
        >
          {formatPercent(clamped)}
        </span>
      </section>
      <p className="text-xs text-text-muted">{label}</p>
    </section>
  );
}
