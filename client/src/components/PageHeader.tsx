import { type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0 pt-0.5">{action}</div>}
      </div>
      {/* Divider */}
      <div className="mt-6 h-px bg-gradient-to-r from-border via-border/60 to-transparent" />
    </header>
  );
}
