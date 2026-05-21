import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import PageHeader from "../components/PageHeader";
import ScoreGauge from "../components/ScoreGauge";
import Alert from "../components/ui/Alert";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { dashboardService } from "../services/dashboardService";
import type { DashboardStats } from "../services/types";
import { ROUTES } from "../utils/constants";
import { formatDate, formatPercent } from "../utils/format";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService
      .getStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <Alert>{error}</Alert>;
  if (!stats) return null;

  return (
    <section>
      <PageHeader
        title="Dashboard"
        description="Overview of your resumes and job matches."
        action={
          <Link to={ROUTES.upload}>
            <Button>Upload resume</Button>
          </Link>
        }
      />

      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card className="!p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Resumes</p>
          <p className="mt-1 text-3xl font-bold text-text">{stats.total_resumes}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Avg ATS score</p>
          <p className="mt-1 text-3xl font-bold text-text">
            {stats.average_ats_score != null ? formatPercent(stats.average_ats_score) : "—"}
          </p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Job analyses</p>
          <p className="mt-1 text-3xl font-bold text-text">{stats.total_job_analyses}</p>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-text">Recent resumes</h2>
          {stats.recent_resumes.length === 0 ? (
            <EmptyState
              title="No resumes yet"
              description="Upload your first PDF to get an ATS score."
              action={
                <Link to={ROUTES.upload}>
                  <Button size="sm">Upload resume</Button>
                </Link>
              }
            />
          ) : (
            <ul className="space-y-3">
              {stats.recent_resumes.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border-muted bg-surface p-3"
                >
                  <section className="min-w-0 flex-1">
                    <Link
                      to={ROUTES.resume(r.id)}
                      className="truncate font-medium text-text hover:text-primary"
                    >
                      {r.filename}
                    </Link>
                    <p className="text-xs text-text-muted">{formatDate(r.created_at)}</p>
                  </section>
                  {r.ats_score != null && <ScoreGauge score={r.ats_score} label="ATS" size="sm" />}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-text">Recent job matches</h2>
          {stats.recent_analyses.length === 0 ? (
            <EmptyState title="No matches yet" description="Run a job match from any resume page." />
          ) : (
            <ul className="space-y-3">
              {stats.recent_analyses.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-border-muted bg-surface p-3"
                >
                  <section>
                    <p className="font-medium text-text">{a.job_title || "Untitled role"}</p>
                    <p className="text-xs text-text-muted">Resume #{a.resume_id}</p>
                  </section>
                  <Badge variant={a.match_score >= 70 ? "success" : a.match_score >= 50 ? "warning" : "danger"}>
                    {formatPercent(a.match_score)} match
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </section>
  );
}
