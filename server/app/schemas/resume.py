from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ResumeResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    uploaded_at: datetime
    ats_score: float | None = None
    word_count: int | None = None

    model_config = {"from_attributes": True}


class ResumeDetailResponse(ResumeResponse):
    extracted_text: str | None = None
    ats_breakdown: list[dict[str, Any]] | None = None


class ResumeListResponse(BaseModel):
    items: list[ResumeResponse]
    total: int


class ResumeUploadResponse(BaseModel):
    message: str = "Resume uploaded successfully"
    resume: ResumeDetailResponse
