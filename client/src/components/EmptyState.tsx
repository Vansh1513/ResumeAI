import { type ReactNode } from "react";

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-dashed border-border py-12 text-center">
      <p className="font-medium text-text">{title}</p>
      {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
      {action && <section className="mt-4">{action}</section>}
    </section>
  );
}
