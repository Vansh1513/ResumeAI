from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.ai_analysis import InterviewQuestions


class JobMatchRequest(BaseModel):
    job_title: str | None = Field(default=None, max_length=512)
    job_description: str = Field(min_length=50, max_length=20000)


class JobMatchResponse(BaseModel):
    id: int
    resume_id: int
    job_title: str | None
    match_score: float
    ats_score: float | None = None
    matched_keywords: list[str]
    missing_keywords: list[str]
    suggestions: list[str]
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    improved_bullets: list[str] = Field(default_factory=list)
    summary: str | None = None
    analysis_source: Literal["openai", "rule_based"] | None = "rule_based"
    interview_questions: InterviewQuestions = Field(default_factory=InterviewQuestions)
    created_at: datetime

    model_config = {"from_attributes": True}


class ATSAnalysisResponse(BaseModel):
    resume_id: int
    ats_score: float
    ats_breakdown: list[dict[str, Any]]
    summary: str
    analysis_source: Literal["openai", "rule_based"] | None = None


class DashboardStats(BaseModel):
    total_resumes: int
    average_ats_score: float | None
    total_job_analyses: int
    recent_resumes: list[dict[str, Any]]
    recent_analyses: list[dict[str, Any]]
