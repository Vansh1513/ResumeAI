import { useState } from "react";
import type { InterviewQuestions as IQ } from "../services/types";

interface Tab {
  key: keyof IQ;
  label: string;
  icon: string;
  accent: string;       // Tailwind text colour
  border: string;       // Tailwind border colour (active tab underline)
  bg: string;           // Tailwind bg colour (active tab pill)
  dot: string;          // bullet dot colour
}

const TABS: Tab[] = [
  {
    key: "hr",
    label: "HR / Behavioural",
    icon: "🤝",
    accent: "text-accent",
    border: "border-accent",
    bg: "bg-accent/10 text-accent",
    dot: "text-accent",
  },
  {
    key: "technical",
    label: "Technical",
    icon: "⚙️",
    accent: "text-primary",
    border: "border-primary",
    bg: "bg-primary/10 text-primary",
    dot: "text-primary",
  },
  {
    key: "project_based",
    label: "Project-Based",
    icon: "🏗️",
    accent: "text-warning",
    border: "border-warning",
    bg: "bg-warning/10 text-warning",
    dot: "text-warning",
  },
  {
    key: "missing_skills",
    label: "Skill Gaps",
    icon: "🔍",
    accent: "text-danger",
    border: "border-danger",
    bg: "bg-danger/10 text-danger",
    dot: "text-danger",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy question"
      className={`
        ml-2 shrink-0 rounded-md px-2 py-1 text-xs font-medium transition-all
        ${copied
          ? "bg-success/20 text-success"
          : "bg-surface-overlay text-text-muted hover:text-text hover:bg-border"
        }
      `}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

interface InterviewQuestionsProps {
  questions: IQ;
  isExporting?: boolean;
}

export default function InterviewQuestions({ questions, isExporting = false }: InterviewQuestionsProps) {
  const [activeTab, setActiveTab] = useState<keyof IQ>("hr");

  const totalCount =
    (questions.hr?.length ?? 0) +
    (questions.technical?.length ?? 0) +
    (questions.project_based?.length ?? 0) +
    (questions.missing_skills?.length ?? 0);

  if (totalCount === 0) return null;

  return (
    <section className={`rounded-xl border border-border bg-surface-raised overflow-hidden ${isExporting ? 'bg-transparent border-none' : ''}`}>
      {/* Header */}
      {!isExporting && (
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              Interview Preparation
            </h3>
            <p className="mt-0.5 text-xs text-text-muted">
              {totalCount} questions tailored to your profile and the job description
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {totalCount} Qs
          </span>
        </div>
      )}

      {/* Tab bar (hidden during export) */}
      {!isExporting && (
        <div className="flex overflow-x-auto border-b border-border bg-surface scrollbar-none">
          {TABS.map((t) => {
            const count = (questions[t.key] ?? []).length;
            const isActive = t.key === activeTab;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`
                  relative flex shrink-0 items-center gap-1.5 px-4 py-3 text-xs font-medium
                  transition-colors whitespace-nowrap
                  ${isActive
                    ? `${t.accent} border-b-2 ${t.border} -mb-px`
                    : "text-text-muted hover:text-text border-b-2 border-transparent"
                  }
                `}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {count > 0 && (
                  <span
                    className={`
                      ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none
                      ${isActive ? t.bg : "bg-surface-overlay text-text-muted"}
                    `}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Questions list */}
      <div className={isExporting ? "p-0 space-y-6" : "p-5"}>
        {isExporting ? (
          // EXPORT MODE: Render ALL tabs sequentially
          <>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-primary border-b border-border pb-2 mb-4">
              All Interview Questions ({totalCount})
            </h3>
            {TABS.map((tab) => {
              const items = questions[tab.key] ?? [];
              if (items.length === 0) return null;
              
              return (
                <div key={tab.key} className="space-y-3">
                  <h4 className={`text-sm font-bold ${tab.accent} flex items-center gap-2`}>
                    {tab.icon} {tab.label}
                  </h4>
                  <ol className="space-y-2">
                    {items.map((q, i) => (
                      <li
                        key={`${tab.key}-${i}`}
                        className="flex items-start gap-3 rounded-lg border border-border-muted bg-surface px-4 py-3"
                      >
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${tab.bg}`}>
                          {i + 1}
                        </span>
                        <span className="flex-1 text-sm leading-relaxed text-text">{q}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </>
        ) : (
          // INTERACTIVE MODE: Render only active tab
          (() => {
            const tab = TABS.find((t) => t.key === activeTab)!;
            const items: string[] = questions[activeTab] ?? [];
            
            if (items.length === 0) {
              return (
                <p className="text-sm text-text-muted italic">
                  No questions generated for this category.
                </p>
              );
            }
            
            return (
              <ol className="space-y-3">
                {items.map((q, i) => (
                  <li
                    key={`${activeTab}-${i}`}
                    className="group flex items-start gap-3 rounded-lg border border-border-muted bg-surface px-4 py-3 transition-colors hover:border-border"
                  >
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${tab.bg}`}>
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm leading-relaxed text-text">{q}</span>
                    <CopyButton text={q} />
                  </li>
                ))}
              </ol>
            );
          })()
        )}

        {/* Tip footer */}
        {!isExporting && (
          <p className="mt-4 text-[11px] text-text-muted">
             Use the STAR method (Situation, Task, Action, Result) to structure your answers to behavioural questions.
          </p>
        )}
      </div>
    </section>
  );
}
