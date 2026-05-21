from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.job_analysis import JobAnalysis
from app.models.resume import Resume
from app.schemas.analysis import DashboardStats


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def get_stats(self, user_id: int) -> DashboardStats:
        total_resumes = self.db.query(Resume).filter(Resume.user_id == user_id).count()
        avg_ats = (
            self.db.query(func.avg(Resume.ats_score))
            .filter(Resume.user_id == user_id, Resume.ats_score.isnot(None))
            .scalar()
        )
        total_analyses = self.db.query(JobAnalysis).filter(JobAnalysis.user_id == user_id).count()

        recent_resumes = (
            self.db.query(Resume)
            .filter(Resume.user_id == user_id)
            .order_by(Resume.uploaded_at.desc())
            .limit(5)
            .all()
        )
        recent_analyses = (
            self.db.query(JobAnalysis)
            .filter(JobAnalysis.user_id == user_id)
            .order_by(JobAnalysis.created_at.desc())
            .limit(5)
            .all()
        )

        return DashboardStats(
            total_resumes=total_resumes,
            average_ats_score=round(float(avg_ats), 1) if avg_ats else None,
            total_job_analyses=total_analyses,
            recent_resumes=[
                {
                    "id": r.id,
                    "filename": r.filename,
                    "ats_score": r.ats_score,
                    "created_at": r.uploaded_at.isoformat() if r.uploaded_at else None,
                }
                for r in recent_resumes
            ],
            recent_analyses=[
                {
                    "id": a.id,
                    "resume_id": a.resume_id,
                    "job_title": a.job_title,
                    "match_score": a.match_score,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                }
                for a in recent_analyses
            ],
        )
