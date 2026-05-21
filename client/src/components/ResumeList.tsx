import { Link } from "react-router-dom";
import type { Resume } from "../services/types";
import { ROUTES } from "../utils/constants";
import { formatDate, formatPercent } from "../utils/format";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import Card from "./ui/Card";
import EmptyState from "./EmptyState";

interface ResumeListProps {
  resumes: Resume[];
  deletingId: number | null;
  onDelete: (id: number) => void;
}

export default function ResumeList({ resumes, deletingId, onDelete }: ResumeListProps) {
  if (resumes.length === 0) {
    return (
      <EmptyState
        title="No resumes uploaded"
        description="Upload a PDF resume above to see it listed here."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {resumes.map((resume) => (
        <li key={resume.id}>
          <Card className="!p-4">
            <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <section className="min-w-0 flex-1">
                <Link
                  to={ROUTES.resume(resume.id)}
                  className="truncate font-medium text-text hover:text-primary"
                >
                  {resume.filename}
                </Link>
                <p className="mt-1 text-xs text-text-muted">
                  Uploaded {formatDate(resume.uploaded_at)}
                  {resume.word_count != null && ` · ${resume.word_count} words`}
                </p>
              </section>

              <section className="flex flex-wrap items-center gap-2">
                {resume.ats_score != null && (
                  <Badge
                    variant={
                      resume.ats_score >= 70 ? "success" : resume.ats_score >= 50 ? "warning" : "danger"
                    }
                  >
                    ATS {formatPercent(resume.ats_score)}
                  </Badge>
                )}
                <Link to={ROUTES.match(resume.id)}>
                  <Button variant="secondary" size="sm">
                    Match job
                  </Button>
                </Link>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={deletingId === resume.id}
                  onClick={() => onDelete(resume.id)}
                >
                  {deletingId === resume.id ? "Deleting…" : "Delete"}
                </Button>
              </section>
            </section>
          </Card>
        </li>
      ))}
    </ul>
  );
}
