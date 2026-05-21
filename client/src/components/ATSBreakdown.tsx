import type { ATSBreakdownItem } from "../services/types";

export default function ATSBreakdown({ items }: { items: ATSBreakdownItem[] }) {
  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const pct = item.max_score > 0 ? (item.score / item.max_score) * 100 : 0;
        return (
          <li key={item.category} className="space-y-2">
            <section className="flex items-center justify-between text-sm">
              <span className="font-medium text-text">{item.category}</span>
              <span className="text-text-muted">
                {item.score}/{item.max_score}
              </span>
            </section>
            <section className="h-2 overflow-hidden rounded-full bg-surface">
              <section
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </section>
            <p className="text-xs text-text-muted">{item.feedback}</p>
          </li>
        );
      })}
    </ul>
  );
}
