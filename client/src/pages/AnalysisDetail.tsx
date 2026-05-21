import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AnalysisResults from "../components/AnalysisResults";
import LoadingSpinner from "../components/LoadingSpinner";
import PageHeader from "../components/PageHeader";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import { getApiErrorMessage } from "../services/axios";
import { analysisService } from "../services/analysisService";
import type { JobMatchResult } from "../services/types";
import { ROUTES } from "../utils/constants";

export default function AnalysisDetail() {
  const { analysisId: idParam } = useParams<{ analysisId: string }>();
  const analysisId = Number(idParam);

  const [result, setResult] = useState<JobMatchResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (Number.isNaN(analysisId)) {
      setError("Invalid analysis ID");
      setLoading(false);
      return;
    }
    analysisService
      .get(analysisId)
      .then(setResult)
      .catch((e) => setError(getApiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [analysisId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <Alert variant="error">{error}</Alert>;
  if (!result) return null;

  return (
    <section>
      <PageHeader
        title="Analysis report"
        description={result.job_title || "Job match analysis"}
        action={
          <Link to={ROUTES.match(result.resume_id)}>
            <Button variant="secondary" size="sm">
              Re-run on resume
            </Button>
          </Link>
        }
      />
      <AnalysisResults result={result} />
    </section>
  );
}
