import { type ChangeEvent, type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ATSBreakdown from "../components/ATSBreakdown";
import PageHeader from "../components/PageHeader";
import ResumeList from "../components/ResumeList";
import ScoreGauge from "../components/ScoreGauge";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import LoadingSpinner from "../components/LoadingSpinner";
import { getApiErrorMessage } from "../services/axios";
import { resumeService } from "../services/resumeService";
import type { Resume, ResumeDetail } from "../services/types";
import { ROUTES } from "../utils/constants";

export default function Upload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);

  const [file, setFile] = useState<File | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [lastUpload, setLastUpload] = useState<ResumeDetail | null>(null);

  const [listLoading, setListLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadResumes = useCallback(async () => {
    try {
      const data = await resumeService.listMyResumes();
      if (isMounted.current) {
        setResumes(data.items);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (isMounted.current) {
        setListLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    void loadResumes();
    return () => {
      isMounted.current = false;
    };
  }, [loadResumes]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setError("");
    setSuccess("");

    if (selected && !selected.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are allowed.");
      setFile(null);
      e.target.value = "";
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || uploading) return;
    void submitUpload();
  };

  const submitUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError("");
    setSuccess("");
    setLastUpload(null);

    try {
      const response = await resumeService.upload(file);
      if (!isMounted.current) return;

      setSuccess(response.message);
      setLastUpload(response.resume);
      setResumes((prev) => [response.resume, ...prev.filter((r) => r.id !== response.resume.id)]);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      if (isMounted.current) {
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (isMounted.current) {
        setUploading(false);
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this resume?")) return;

    setDeletingId(id);
    setError("");
    try {
      await resumeService.delete(id);
      if (isMounted.current) {
        setResumes((prev) => prev.filter((r) => r.id !== id));
        if (lastUpload?.id === id) setLastUpload(null);
        setSuccess("Resume deleted.");
      }
    } catch (err) {
      if (isMounted.current) {
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (isMounted.current) {
        setDeletingId(null);
      }
    }
  };

  return (
    <section>
      <PageHeader
        title="Upload resume"
        description="Upload a PDF resume. Text is extracted automatically and stored in your account."
      />

      <Card className="mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
              uploading
                ? "pointer-events-none border-border bg-surface opacity-60"
                : "border-border bg-surface hover:border-primary/50 hover:bg-surface-overlay/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              disabled={uploading}
              onChange={handleFileChange}
            />
            <p className="text-sm font-medium text-text">
              {uploading ? "Uploading…" : file ? file.name : "Click to select a PDF resume"}
            </p>
            <p className="mt-1 text-xs text-text-muted">PDF only · Max 10 MB</p>
          </label>

          {error && <Alert variant="error">{error}</Alert>}
          {success && !error && <Alert variant="success">{success}</Alert>}

          <Button type="submit" disabled={!file || uploading} className="w-full sm:w-auto">
            {uploading ? "Uploading & extracting text…" : "Upload resume"}
          </Button>
        </form>
      </Card>

      {uploading && (
        <section className="mb-6">
          <LoadingSpinner label="Saving PDF and extracting text…" />
        </section>
      )}

      {lastUpload && !uploading && (
        <Card className="mb-6 border-success/30">
          <section className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <section>
              <p className="text-xs font-medium uppercase tracking-wide text-success">Latest upload</p>
              <h2 className="text-lg font-semibold text-text">{lastUpload.filename}</h2>
              {lastUpload.word_count != null && (
                <p className="text-sm text-text-muted">{lastUpload.word_count} words extracted</p>
              )}
            </section>
            {lastUpload.ats_score != null && (
              <ScoreGauge score={lastUpload.ats_score} label="ATS Score" />
            )}
          </section>

          {lastUpload.ats_breakdown && lastUpload.ats_breakdown.length > 0 && (
            <section className="mb-4">
              <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-text-muted">
                ATS breakdown
              </h3>
              <ATSBreakdown items={lastUpload.ats_breakdown} />
            </section>
          )}

          <section className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => navigate(ROUTES.resume(lastUpload.id))}>
              View details
            </Button>
            <Button onClick={() => navigate(ROUTES.match(lastUpload.id))}>Match to a job</Button>
          </section>
        </Card>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-text">My resumes</h2>
        {listLoading ? (
          <LoadingSpinner label="Loading your resumes…" />
        ) : (
          <ResumeList resumes={resumes} deletingId={deletingId} onDelete={handleDelete} />
        )}
      </section>
    </section>
  );
}
