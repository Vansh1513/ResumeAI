from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class JobAnalysis(Base):
    """Stores AI/rule-based job match analysis for a resume."""

    __tablename__ = "job_analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True)

    job_title = Column(String(512), nullable=True)
    job_description = Column(Text, nullable=False)

    match_score = Column(Float, nullable=False)
    ats_score = Column(Float, nullable=True)

    matched_keywords = Column(JSONB, nullable=True)
    missing_keywords = Column(JSONB, nullable=True)
    suggestions = Column(JSONB, nullable=True)

    strengths = Column(JSONB, nullable=True)
    weaknesses = Column(JSONB, nullable=True)
    improved_bullets = Column(JSONB, nullable=True)
    summary = Column(Text, nullable=True)
    analysis_source = Column(String(32), nullable=True, default="rule_based")
    interview_questions = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="job_analyses")
    resume = relationship("Resume", back_populates="job_analyses")
