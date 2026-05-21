import type {
  HeatmapBullet,
  HeatmapSection,
  ResumeHeatmap,
  SectionStrength,
} from "../services/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STRENGTH_CONFIG: Record<
  SectionStrength,
  { label: string; bar: string; text: string; bg: string; border: string; icon: string }
> = {
  strong:   { label: "Strong",   bar: "bg-success",  text: "text-success",  bg: "bg-success/10",  border: "border-success/30",  icon: "✦" },
  moderate: { label: "Moderate", bar: "bg-warning",  text: "text-warning",  bg: "bg-warning/10",  border: "border-warning/30",  icon: "◈" },
  weak:     { label: "Weak",     bar: "bg-danger",   text: "text-danger",   bg: "bg-danger/10",   border: "border-danger/30",   icon: "✕" },
  missing:  { label: "Missing",  bar: "bg-surface-overlay", text: "text-text-muted", bg: "bg-surface-overlay/50", border: "border-border", icon: "–" },
};

const BULLET_CONFIG = {
  strong:   { label: "Strong",   dot: "bg-success",  text: "text-success",  bg: "bg-success/10"  },
  moderate: { label: "Moderate", dot: "bg-warning",  text: "text-warning",  bg: "bg-warning/10"  },
  weak:     { label: "Weak",     dot: "bg-danger",   text: "text-danger",   bg: "bg-danger/10"   },
};

function pct(score: number) {
  return `${Math.min(100, Math.max(0, score))}%`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ section }: { section: HeatmapSection }) {
  const cfg = STRENGTH_CONFIG[section.strength];
  return (
    <div
      className={`rounded-xl border p-4 transition-all hover:shadow-lg ${cfg.bg} ${cfg.border}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-base font-bold ${cfg.text}`}>{cfg.icon}</span>
          <span className="text-sm font-semibold text-text">{section.name}</span>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.text} ${cfg.bg} border ${cfg.border}`}
        >
          {cfg.label}
        </span>
      </div>

      {/* Score bar */}
      {section.present && (
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface-overlay">
          <div
            className={`h-full rounded-full transition-all ${cfg.bar}`}
            style={{ width: pct(section.score) }}
          />
        </div>
      )}

      <p className="text-xs leading-relaxed text-text-muted">{section.feedback}</p>
    </div>
  );
}

function BulletRow({ bullet }: { bullet: HeatmapBullet }) {
  const cfg = BULLET_CONFIG[bullet.impact];
  return (
    <div className="group flex items-start gap-3 rounded-lg border border-border-muted bg-surface px-3 py-2.5 transition-colors hover:border-border">
      {/* Impact dot */}
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cfg.dot}`}
        title={cfg.label}
      />

      {/* Text */}
      <p className="flex-1 text-sm leading-relaxed text-text">{bullet.text}</p>

      {/* Tags */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.text} ${cfg.bg}`}
        >
          {cfg.label}
        </span>
        <div className="flex gap-1">
          {bullet.has_action_verb && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
              verb ✓
            </span>
          )}
          {bullet.has_metric && (
            <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] text-success">
              metric ✓
            </span>
          )}
          {!bullet.has_action_verb && (
            <span className="rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] text-danger">
              no verb
            </span>
          )}
          {!bullet.has_metric && (
            <span className="rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">
              no metric
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function WordFrequencyBar({ word, count, max }: { word: string; count: number; max: number }) {
  const width = `${(count / max) * 100}%`;
  const isHigh = count >= 6;
  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-28 shrink-0 text-right text-sm font-mono font-medium ${
          isHigh ? "text-danger" : "text-text-muted"
        }`}
      >
        {word}
      </span>
      <div className="relative flex-1">
        <div className="h-5 overflow-hidden rounded-md bg-surface-overlay">
          <div
            className={`h-full rounded-md transition-all ${
              isHigh ? "bg-danger/60" : "bg-accent/40"
            }`}
            style={{ width }}
          />
        </div>
      </div>
      <span
        className={`w-8 shrink-0 text-right text-xs font-semibold ${
          isHigh ? "text-danger" : "text-text-muted"
        }`}
      >
        ×{count}
      </span>
    </div>
  );
}

function SummaryPill({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className={`flex flex-col items-center rounded-xl border px-5 py-3 ${color}`}>
      <span className="text-2xl font-bold tabular-nums">{count}</span>
      <span className="mt-0.5 text-xs font-medium">{label}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface ResumeHeatmapProps {
  data: ResumeHeatmap;
}

export default function ResumeHeatmap({ data }: ResumeHeatmapProps) {
  const { sections, bullets, repeated_words, missing_keywords, summary } = data;

  const maxCount = repeated_words.length > 0 ? repeated_words[0].count : 1;
  const strongBullets   = bullets.filter((b) => b.impact === "strong");
  const weakBullets     = bullets.filter((b) => b.impact === "weak");
  const moderateBullets = bullets.filter((b) => b.impact === "moderate");

  return (
    <div className="space-y-8">

      {/* ── Overview pills ─────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Section Overview
        </h2>
        <div className="flex flex-wrap gap-3">
          <SummaryPill
            label="Strong"
            count={summary.strong}
            color="bg-success/10 border-success/30 text-success"
          />
          <SummaryPill
            label="Moderate"
            count={summary.moderate}
            color="bg-warning/10 border-warning/30 text-warning"
          />
          <SummaryPill
            label="Weak"
            count={summary.weak}
            color="bg-danger/10 border-danger/30 text-danger"
          />
          <SummaryPill
            label="Missing"
            count={summary.missing}
            color="bg-surface-overlay border-border text-text-muted"
          />
        </div>
      </div>

      {/* ── Section heatmap ────────────────────────────────────────────── */}
      {sections.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Section Analysis
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sections.map((s) => (
              <SectionCard key={s.name} section={s} />
            ))}
          </div>
        </div>
      )}

      {/* ── Bullet quality ─────────────────────────────────────────────── */}
      {bullets.length > 0 && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              Bullet Quality ({bullets.length} detected)
            </h2>
            <div className="flex gap-3 text-xs text-text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success" /> {strongBullets.length} strong
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-warning" /> {moderateBullets.length} moderate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-danger" /> {weakBullets.length} weak
              </span>
            </div>
          </div>

          {/* Weak bullets section first for attention */}
          {weakBullets.length > 0 && (
            <div className="mb-4 rounded-xl border border-danger/20 bg-danger/5 p-4">
              <p className="mb-3 text-xs font-semibold text-danger">
                ⚠ Low-impact bullets — rewrite these with an action verb and a measurable result
              </p>
              <div className="space-y-2">
                {weakBullets.map((b, i) => (
                  <BulletRow key={`weak-${i}`} bullet={b} />
                ))}
              </div>
            </div>
          )}

          {/* All bullets (collapsed behind tabs for readability) */}
          <div className="space-y-2">
            {[...strongBullets, ...moderateBullets].map((b, i) => (
              <BulletRow key={`rest-${i}`} bullet={b} />
            ))}
          </div>
        </div>
      )}

      {/* ── Repeated words ─────────────────────────────────────────────── */}
      {repeated_words.length > 0 && (
        <div>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Word Frequency
          </h2>
          <p className="mb-4 text-xs text-text-muted">
            Words appearing ≥3× — high counts (red) may signal repetition; vary your vocabulary.
          </p>
          <div className="rounded-xl border border-border bg-surface-raised p-5 space-y-3">
            {repeated_words.map((rw) => (
              <WordFrequencyBar
                key={rw.word}
                word={rw.word}
                count={rw.count}
                max={maxCount}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Missing keywords ────────────────────────────────────────────── */}
      {missing_keywords.length > 0 && (
        <div>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Missing Common Keywords
          </h2>
          <p className="mb-4 text-xs text-text-muted">
            High-signal tech terms not found in your resume — add those that are relevant to your roles.
          </p>
          <div className="flex flex-wrap gap-2">
            {missing_keywords.map((kw) => (
              <span
                key={kw}
                className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-primary hover:text-primary cursor-default"
              >
                + {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
