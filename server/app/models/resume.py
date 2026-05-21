from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class Resume(Base):
    """Resume stored per user — PDF file on disk + extracted text in PostgreSQL."""

    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    filename = Column("original_filename", String(512), nullable=False)
    stored_filename = Column(String(512), nullable=False)
    file_path = Column(String(1024), nullable=False)
    extracted_text = Column(Text, nullable=True)

    uploaded_at = Column(
        "created_at",
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=True,
    )

    ats_score = Column(Float, nullable=True)
    ats_breakdown = Column(JSONB, nullable=True)

    owner = relationship("User", back_populates="resumes")
    job_analyses = relationship("JobAnalysis", back_populates="resume", cascade="all, delete-orphan")
