from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.job_analysis import JobAnalysis
from app.models.user import User
from app.schemas.analysis import ATSAnalysisResponse, JobMatchRequest, JobMatchResponse
from app.services.analysis_service import AnalysisService
from app.services.resume_service import ResumeService

router = APIRouter()


def _to_match_response(analysis: JobAnalysis) -> JobMatchResponse:
    from app.schemas.ai_analysis import InterviewQuestions

    raw_iq = analysis.interview_questions or {}
    iq = InterviewQuestions(
        hr=raw_iq.get("hr", []),
        technical=raw_iq.get("technical", []),
        project_based=raw_iq.get("project_based", []),
        missing_skills=raw_iq.get("missing_skills", []),
    )

    return JobMatchResponse(
        id=analysis.id,
        resume_id=analysis.resume_id,
        job_title=analysis.job_title,
        match_score=analysis.match_score,
        ats_score=analysis.ats_score,
        matched_keywords=analysis.matched_keywords or [],
        missing_keywords=analysis.missing_keywords or [],
        suggestions=analysis.suggestions or [],
        strengths=analysis.strengths or [],
        weaknesses=analysis.weaknesses or [],
        improved_bullets=analysis.improved_bullets or [],
        summary=analysis.summary,
        analysis_source=analysis.analysis_source or "rule_based",
        interview_questions=iq,
        created_at=analysis.created_at,
    )


@router.post("/{resume_id}/match", response_model=JobMatchResponse)
async def match_job(
    resume_id: int,
    data: JobMatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume = ResumeService(db).get_resume(current_user.id, resume_id)
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")

    try:
        analysis = await AnalysisService(db).match_job(current_user, resume, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return _to_match_response(analysis)


@router.post("/{resume_id}/ats", response_model=ATSAnalysisResponse)
async def reanalyze_ats(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ResumeService(db)
    resume = service.get_resume(current_user.id, resume_id)
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")

    try:
        resume = service.reanalyze_ats(resume)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    from app.services.ats_service import ATSService
    _, _, summary = ATSService().analyze(resume.extracted_text or "")

    return ATSAnalysisResponse(
        resume_id=resume.id,
        ats_score=resume.ats_score or 0,
        ats_breakdown=resume.ats_breakdown or [],
        summary=summary,
        analysis_source="rule_based",
    )


@router.get("/history", response_model=list[JobMatchResponse])
def analysis_history(
    resume_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    analyses = AnalysisService(db).list_analyses(current_user.id, resume_id)
    return [_to_match_response(a) for a in analyses]


@router.get("/history/{analysis_id}", response_model=JobMatchResponse)
def get_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    analysis = AnalysisService(db).get_analysis(current_user.id, analysis_id)
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
    return _to_match_response(analysis)
