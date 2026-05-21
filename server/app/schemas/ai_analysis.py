from typing import Literal

from pydantic import BaseModel, Field


class InterviewQuestions(BaseModel):
    """Categorised interview questions generated from resume + job description."""

    hr: list[str] = Field(default_factory=list)
    technical: list[str] = Field(default_factory=list)
    project_based: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)


class AIAnalysisResult(BaseModel):
    """Unified ATS + job-match analysis (OpenAI or rule-based fallback)."""

    ats_score: float = Field(ge=0, le=100)
    match_score: float = Field(ge=0, le=100)
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    improved_bullets: list[str] = Field(default_factory=list)
    summary: str = ""
    analysis_source: Literal["openai", "rule_based"] = "rule_based"
    interview_questions: InterviewQuestions = Field(default_factory=InterviewQuestions)
