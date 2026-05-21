import logging

from sqlalchemy.orm import Session

from app.models.job_analysis import JobAnalysis
from app.models.resume import Resume
from app.models.user import User
from app.schemas.analysis import JobMatchRequest
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)


class AnalysisService:
    def __init__(self, db: Session):
        self.db = db
        self.ai = AIService()

    async def match_job(self, user: User, resume: Resume, data: JobMatchRequest) -> JobAnalysis:
        if not resume.extracted_text:
            raise ValueError("Resume has no extracted text")

        logger.info(
            "Running job analysis: user_id=%s resume_id=%s",
            user.id,
            resume.id,
        )

        result = await self.ai.analyze_resume_for_job(
            resume_text=resume.extracted_text,
            job_description=data.job_description,
            job_title=data.job_title,
        )

        analysis = JobAnalysis(
            user_id=user.id,
            resume_id=resume.id,
            job_title=data.job_title,
            job_description=data.job_description,
            match_score=result.match_score,
            ats_score=result.ats_score,
            matched_keywords=result.matched_skills,
            missing_keywords=result.missing_skills,
            suggestions=result.suggestions,
            strengths=result.strengths,
            weaknesses=result.weaknesses,
            improved_bullets=result.improved_bullets,
            summary=result.summary,
            analysis_source=result.analysis_source,
            interview_questions=result.interview_questions.model_dump(),
        )
        self.db.add(analysis)
        self.db.commit()
        self.db.refresh(analysis)
        return analysis

    def list_analyses(self, user_id: int, resume_id: int | None = None, limit: int = 50) -> list[JobAnalysis]:
        query = self.db.query(JobAnalysis).filter(JobAnalysis.user_id == user_id)
        if resume_id is not None:
            query = query.filter(JobAnalysis.resume_id == resume_id)
        return query.order_by(JobAnalysis.created_at.desc()).limit(limit).all()

    def get_analysis(self, user_id: int, analysis_id: int) -> JobAnalysis | None:
        return (
            self.db.query(JobAnalysis)
            .filter(JobAnalysis.id == analysis_id, JobAnalysis.user_id == user_id)
            .first()
        )
