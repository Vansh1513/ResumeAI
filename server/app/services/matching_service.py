from app.utils.text_analysis import keyword_overlap


class MatchingService:
    """Compares resume text against a job description."""

    def match(self, resume_text: str, job_description: str) -> tuple[float, list[str], list[str]]:
        if not resume_text:
            return 0.0, [], []
        matched, missing, score = keyword_overlap(resume_text, job_description)
        return score, matched, missing
