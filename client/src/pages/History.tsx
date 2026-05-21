import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import PageHeader from "../components/PageHeader";
import Alert from "../components/ui/Alert";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { getApiErrorMessage } from "../services/axios";
import { analysisService } from "../services/analysisService";
import type { JobMatchResult } from "../services/types";
import { ROUTES } from "../utils/constants";
import { formatDate, formatPercent } from "../utils/format";

export default function History() {
  const [items, setItems] = useState<JobMatchResult[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analysisService
      .history()
      .then(setItems)
      .catch((e) => setError(getApiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <Alert variant="error">{error}</Alert>;

  return (
    <section>
      <PageHeader title="Match history" description="All AI and rule-based job analyses." />

      {items.length === 0 ? (
        <EmptyState
          title="No analyses yet"
          description="Upload a resume and run a job match to see results here."
        />
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <section className="min-w-0 flex-1">
                  <section className="mb-2 flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-text">{item.job_title || "Untitled role"}</p>
                    <Badge variant={item.analysis_source === "openai" ? "success" : "default"}>
                      {item.analysis_source === "openai" ? "AI" : "Rules"}
                    </Badge>
                  </section>
                  <p className="text-sm text-text-muted">
                    {formatDate(item.created_at)} ·{" "}
                    <Link to={ROUTES.resume(item.resume_id)} className="text-primary hover:underline">
                      Resume #{item.resume_id}
                    </Link>
                  </p>
                  {item.summary && (
                    <p className="mt-2 line-clamp-2 text-sm text-text-muted">{item.summary}</p>
                  )}
                  <p className="mt-2 text-xs text-text-muted">
                    {item.matched_keywords.length} matched skills · {item.missing_keywords.length}{" "}
                    missing
                    {item.ats_score != null && ` · ATS ${formatPercent(item.ats_score)}`}
                  </p>
                </section>

                <section className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      item.match_score >= 70 ? "success" : item.match_score >= 50 ? "warning" : "danger"
                    }
                  >
                    {formatPercent(item.match_score)} match
                  </Badge>
                  <Link to={`/history/${item.id}`}>
                    <Button size="sm">View report</Button>
                  </Link>
                </section>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
