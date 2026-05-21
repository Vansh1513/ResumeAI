import logging
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.resume import Resume
from app.models.user import User
from app.services.ats_service import ATSService
from app.utils.pdf_extractor import extract_text_from_pdf

logger = logging.getLogger(__name__)
settings = get_settings()


class ResumeService:
    def __init__(self, db: Session):
        self.db = db
        self.ats = ATSService()

    def _user_upload_dir(self, user_id: int) -> Path:
        path = Path(settings.upload_dir) / str(user_id)
        path.mkdir(parents=True, exist_ok=True)
        return path.resolve()

    async def upload_resume(self, user: User, file: UploadFile) -> Resume:
        filename = file.filename or ""
        logger.info("Upload started: user_id=%s filename=%s", user.id, filename)

        if not filename.lower().endswith(".pdf"):
            raise ValueError("Only PDF files are allowed")

        content_type = (file.content_type or "").lower()
        if content_type and content_type not in ("application/pdf", "application/x-pdf"):
            raise ValueError("Only PDF files are allowed")

        content = await file.read()
        logger.info("File read: %s bytes", len(content))

        max_bytes = settings.max_upload_size_mb * 1024 * 1024
        if len(content) > max_bytes:
            raise ValueError(f"File exceeds {settings.max_upload_size_mb}MB limit")

        if not content.startswith(b"%PDF"):
            raise ValueError("Invalid PDF file")

        try:
            extracted = extract_text_from_pdf(content)
        except Exception as exc:
            logger.exception("pypdf extraction failed")
            raise ValueError(f"PDF text extraction failed: {exc}") from exc

        if not extracted:
            raise ValueError(
                "Could not extract text from PDF. Use a text-based PDF, not a scanned image-only file."
            )

        logger.info("Extracted %s characters from PDF", len(extracted))

        ats_score, ats_breakdown, _ = self.ats.analyze(extracted)

        stored_name = f"{uuid.uuid4().hex}.pdf"
        dest_dir = self._user_upload_dir(user.id)
        file_path = (dest_dir / stored_name).resolve()

        try:
            file_path.write_bytes(content)
            logger.info("Saved PDF to %s", file_path)
        except OSError as exc:
            logger.exception("Failed to write PDF to disk")
            raise ValueError(f"Could not save file: {exc}") from exc

        resume = Resume(
            user_id=user.id,
            filename=filename,
            stored_filename=stored_name,
            file_path=str(file_path),
            extracted_text=extracted,
            ats_score=float(ats_score),
            ats_breakdown=ats_breakdown,
        )

        try:
            self.db.add(resume)
            self.db.commit()
            self.db.refresh(resume)
            logger.info("Resume saved: id=%s user_id=%s", resume.id, user.id)
            return resume
        except SQLAlchemyError as exc:
            self.db.rollback()
            logger.exception("Database insert failed for resume upload")
            if file_path.is_file():
                try:
                    file_path.unlink()
                except OSError:
                    logger.exception("Failed to remove file after DB error: %s", file_path)
            raise

    def list_my_resumes(self, user_id: int, skip: int = 0, limit: int = 50) -> tuple[list[Resume], int]:
        query = (
            self.db.query(Resume)
            .filter(Resume.user_id == user_id)
            .order_by(Resume.uploaded_at.desc())
        )
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total

    def get_resume(self, user_id: int, resume_id: int) -> Resume | None:
        return (
            self.db.query(Resume)
            .filter(Resume.id == resume_id, Resume.user_id == user_id)
            .first()
        )

    def delete_resume(self, user: User, resume_id: int) -> bool:
        resume = self.get_resume(user.id, resume_id)
        if not resume:
            return False

        path = Path(resume.file_path)
        if path.is_file():
            path.unlink()

        self.db.delete(resume)
        self.db.commit()
        return True

    def reanalyze_ats(self, resume: Resume) -> Resume:
        if not resume.extracted_text:
            raise ValueError("No extracted text available")
        score, breakdown, _ = self.ats.analyze(resume.extracted_text)
        resume.ats_score = float(score)
        resume.ats_breakdown = breakdown
        self.db.commit()
        self.db.refresh(resume)
        return resume
