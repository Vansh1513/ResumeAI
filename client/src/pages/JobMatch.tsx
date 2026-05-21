import { type FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AnalysisResults from "../components/AnalysisResults";
import AnalysisSkeleton from "../components/AnalysisSkeleton";
import LoadingSpinner from "../components/LoadingSpinner";
import PageHeader from "../components/PageHeader";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Label from "../components/ui/Label";
import Textarea from "../components/ui/Textarea";
import { getApiErrorMessage } from "../services/axios";
import { analysisService } from "../services/analysisService";
import { resumeService } from "../services/resumeService";
import type { JobMatchResult, ResumeDetail } from "../services/types";

export default function JobMatch() {
  const { resumeId: resumeIdParam } = useParams<{ resumeId: string }>();
  const resumeId = Number(resumeIdParam);

  const [resume, setResume] = useState<ResumeDetail | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<JobMatchResult | null>(null);
  const [error, setError] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (Number.isNaN(resumeId)) {
      setError("Invalid resume ID");
      setPageLoading(false);
      return;
    }
    resumeService
      .get(resumeId)
      .then(setResume)
      .catch((e) => setError(getApiErrorMessage(e)))
      .finally(() => setPageLoading(false));
  }, [resumeId]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (jobDescription.trim().length < 50) {
      setError("Job description must be at least 50 characters.");
      return;
    }
    void runAnalysis();
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError("");
    setResult(null);
    try {
      const data = await analysisService.matchJob(resumeId, {
        job_title: jobTitle.trim() || undefined,
        job_description: jobDescription.trim(),
      });
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAnalyzing(false);
    }
  };

  if (pageLoading) return <LoadingSpinner />;
  if (error && !resume) return <Alert>{error}</Alert>;
  if (!resume) return null;

  return (
    <section>
      <PageHeader
        title="AI Job Match"
        description={`Analyze "${resume.filename}" against a job description with intelligent ATS scoring.`}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <section>
              <Label htmlFor="jobTitle">Job title (optional)</Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Software Engineer"
                disabled={analyzing}
              />
            </section>
            <section>
              <Label htmlFor="jobDescription">Job description</Label>
              <Textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job posting here…"
                required
                minLength={50}
                disabled={analyzing}
                className="min-h-[200px]"
              />
            </section>
            {error && resume && <Alert variant="error">{error}</Alert>}
            <Button type="submit" disabled={analyzing} className="w-full sm:w-auto">
              {analyzing ? "Generating AI analysis…" : "Run AI analysis"}
            </Button>
          </form>
        </Card>

        <section>
          {analyzing && <AnalysisSkeleton />}
          {!analyzing && result && <AnalysisResults result={result} />}
          {!analyzing && !result && (
            <Card className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <p className="text-lg font-medium text-text">Ready to analyze</p>
              <p className="mt-2 max-w-sm text-sm text-text-muted">
                Paste a job description and run AI analysis to see match score, strengths,
                weaknesses, and improved bullet points.
              </p>
            </Card>
          )}
        </section>
      </section>
    </section>
  );
}
