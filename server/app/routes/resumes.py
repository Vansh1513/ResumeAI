import logging
import traceback

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.resume import (
    ResumeDetailResponse,
    ResumeListResponse,
    ResumeResponse,
    ResumeUploadResponse,
)
from app.services.resume_service import ResumeService

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()


def _to_response(resume) -> ResumeResponse:
    word_count = len(resume.extracted_text.split()) if resume.extracted_text else None
    return ResumeResponse(
        id=resume.id,
        user_id=resume.user_id,
        filename=resume.filename,
        uploaded_at=resume.uploaded_at,
        ats_score=resume.ats_score,
        word_count=word_count,
    )


def _to_detail(resume) -> ResumeDetailResponse:
    base = _to_response(resume)
    return ResumeDetailResponse(
        **base.model_dump(),
        extracted_text=resume.extracted_text,
        ats_breakdown=resume.ats_breakdown,
    )


@router.post("/upload", response_model=ResumeUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(..., description="PDF resume file"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload a PDF resume (authenticated).
    Saves file under uploads/{user_id}/, extracts text with pypdf, stores in PostgreSQL.
    """
    logger.info(
        "POST /resumes/upload — user_id=%s email=%s content_type=%s filename=%s",
        current_user.id,
        current_user.email,
        file.content_type,
        file.filename,
    )

    service = ResumeService(db)
    try:
        resume = await service.upload_resume(current_user, file)
        detail = _to_detail(resume)
        return ResumeUploadResponse(
            message="Resume uploaded successfully",
            resume=detail,
        )
    except ValueError as e:
        logger.warning("Upload validation error: %s", e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except SQLAlchemyError as e:
        db.rollback()
        logger.error("Upload database error:\n%s", traceback.format_exc())
        detail = str(e.orig) if settings.debug and getattr(e, "orig", None) else "Database error while saving resume"
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)
    except Exception as e:
        db.rollback()
        logger.error("Upload failed with unexpected error:\n%s", traceback.format_exc())
        detail = str(e) if settings.debug else "Resume upload failed"
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)


@router.get("/my-resumes", response_model=ResumeListResponse)
def my_resumes(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items, total = ResumeService(db).list_my_resumes(current_user.id, skip, limit)
    return ResumeListResponse(
        items=[_to_response(r) for r in items],
        total=total,
    )


@router.get("/{resume_id}", response_model=ResumeDetailResponse)
def get_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume = ResumeService(db).get_resume(current_user.id, resume_id)
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    return _to_detail(resume)


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not ResumeService(db).delete_resume(current_user, resume_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")


@router.get("/{resume_id}/heatmap")
def resume_heatmap(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return heatmap analysis for a resume: section strength, bullet quality, repeated words, missing keywords."""
    resume = ResumeService(db).get_resume(current_user.id, resume_id)
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    if not resume.extracted_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resume has no extracted text")

    from app.services.heatmap_service import HeatmapService
    return HeatmapService().analyse(resume.extracted_text)

