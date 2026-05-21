import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ATSBreakdown from "../components/ATSBreakdown";
import LoadingSpinner from "../components/LoadingSpinner";
import PageHeader from "../components/PageHeader";
import ResumeHeatmap from "../components/ResumeHeatmap";
import ScoreGauge from "../components/ScoreGauge";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { resumeService } from "../services/resumeService";
import type { ResumeDetail as ResumeDetailType, ResumeHeatmap as HeatmapData } from "../services/types";
import { ROUTES } from "../utils/constants";
import { formatDate } from "../utils/format";

export default function ResumeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const resumeId = Number(id);

  const [resume, setResume]       = useState<ResumeDetailType | null>(null);
  const [heatmap, setHeatmap]     = useState<HeatmapData | null>(null);
  const [heatmapLoading, setHL]   = useState(false);
  const [heatmapError, setHE]     = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(true);
  const [deleting, setDeleting]   = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    if (Number.isNaN(resumeId)) {
      setError("Invalid resume ID");
      setLoading(false);
      return;
    }
    resumeService
      .get(resumeId)
      .then(setResume)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [resumeId]);

  const handleDelete = async () => {
    if (!resume || !confirm("Delete this resume?")) return;
    setDeleting(true);
    try {
      await resumeService.delete(resume.id);
      navigate(ROUTES.home);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  };

  const handleHeatmap = async () => {
    if (heatmap) {
      setShowHeatmap((v) => !v);
      return;
    }
    setHL(true);
    setHE("");
    try {
      const data = await resumeService.heatmap(resumeId);
      setHeatmap(data);
      setShowHeatmap(true);
    } catch (e) {
      setHE(e instanceof Error ? e.message : "Heatmap analysis failed");
    } finally {
      setHL(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error)   return <Alert>{error}</Alert>;
  if (!resume) return null;

  return (
    <section>
      <PageHeader
        title={resume.filename}
        description={`Uploaded ${formatDate(resume.uploaded_at)}`}
        action={
          <section className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={handleHeatmap}
              disabled={heatmapLoading}
            >
              {heatmapLoading
                ? "Analysing…"
                : showHeatmap
                ? "Hide Heatmap"
                : "🔥 Resume Heatmap"}
            </Button>
            <Link to={ROUTES.match(resume.id)}>
              <Button>Match job</Button>
            </Link>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </section>
        }
      />

      {/* ATS score + breakdown */}
      <section className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center lg:col-span-1">
          {resume.ats_score != null ? (
            <ScoreGauge score={resume.ats_score} label="ATS Score" />
          ) : (
            <p className="text-text-muted">No ATS score</p>
          )}
          {resume.word_count != null && (
            <p className="mt-4 text-sm text-text-muted">{resume.word_count} words</p>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-text">ATS breakdown</h2>
          {resume.ats_breakdown && resume.ats_breakdown.length > 0 ? (
            <ATSBreakdown items={resume.ats_breakdown} />
          ) : (
            <p className="text-sm text-text-muted">No breakdown available.</p>
          )}
        </Card>
      </section>

      {/* Heatmap error */}
      {heatmapError && (
        <div className="mb-6">
          <Alert variant="error">{heatmapError}</Alert>
        </div>
      )}

      {/* Heatmap panel */}
      {showHeatmap && heatmap && (
        <Card className="mb-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text">Resume Heatmap</h2>
              <p className="mt-0.5 text-sm text-text-muted">
                Deep analysis of section quality, bullet impact, and keyword coverage.
              </p>
            </div>
            <button
              onClick={() => setShowHeatmap(false)}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-overlay hover:text-text"
              title="Close"
            >
              ✕
            </button>
          </div>
          <ResumeHeatmap data={heatmap} />
        </Card>
      )}

      {/* Extracted text */}
      {resume.extracted_text && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-text">Extracted text</h2>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-surface p-4 font-mono text-xs text-text-muted">
            {resume.extracted_text}
          </pre>
        </Card>
      )}
    </section>
  );
}
