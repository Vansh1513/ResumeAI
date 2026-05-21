import json
import logging
from typing import Any

from pydantic import ValidationError

from app.config import get_settings
from app.schemas.ai_analysis import AIAnalysisResult, InterviewQuestions
from app.services.ats_service import ATSService
from app.services.matching_service import MatchingService
from app.utils.text_analysis import extract_tech_skills

logger = logging.getLogger(__name__)
settings = get_settings()

OPENAI_JSON_SCHEMA_HINT = """
Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "ats_score": <integer 0-100>,
  "match_score": <integer 0-100>,
  "matched_skills": ["exact skill from resume that is also in JD"],
  "missing_skills": ["exact skill required by JD but absent from resume"],
  "strengths": ["specific strength statement"],
  "weaknesses": ["specific weakness or gap"],
  "suggestions": ["actionable, specific improvement tip"],
  "improved_bullets": ["rewritten achievement bullet with metric"],
  "summary": "2-3 sentence honest overview of fit",
  "interview_questions": {
    "hr": ["HR/behavioural question 1", "HR/behavioural question 2", "HR/behavioural question 3"],
    "technical": ["Technical question 1", "Technical question 2", "Technical question 3", "Technical question 4"],
    "project_based": ["Project-based question about their resume 1", "Project-based question 2", "Project-based question 3"],
    "missing_skills": ["Question probing a skill gap 1", "Question probing a skill gap 2", "Question probing a skill gap 3"]
  }
}
"""

OPENAI_SCORING_GUIDE = """
Scoring guidelines (be realistic and strict):
- ats_score: Evaluate ATS formatting readiness ONLY (not job fit).
  • 85-100: Perfect formatting, quantified bullets, all sections, rich tech keywords.
  • 70-84: Good structure, minor gaps in keywords or metrics.
  • 50-69: Missing sections, weak keyword density, few quantified results.
  • 30-49: Poor formatting, no clear sections, minimal keywords.
  • 0-29: Unreadable, no structure, no tech keywords.
  Do NOT give 90+ unless the resume is truly exceptional in structure and content.

- match_score: Evaluate fit for THIS specific job only.
  • 85-100: Candidate has nearly every required skill listed in JD, right seniority, domain experience.
  • 65-84: Good overlap, some gaps that could be bridged.
  • 40-64: Partial match — several key skills or domain experience missing.
  • 20-39: Weak match — few overlapping skills.
  • 0-19: Very little relevance.
  Do NOT give 80+ unless most required skills from the JD are explicitly present in the resume.

Skills extraction rules:
- matched_skills: List ONLY concrete technologies, languages, frameworks, databases, cloud tools.
  Example: ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"]
  DO NOT list generic words like "communication", "teamwork", "problem solving", "experience", "strong".
- missing_skills: Same rule — only real technical or domain-specific skills absent from resume.
"""


class AIService:
    """
    Intelligent resume vs job analysis.
    Primary: OpenAI structured JSON. Fallback: rule-based ATS + keyword matching.
    """

    def __init__(self) -> None:
        self._matcher = MatchingService()
        self._ats = ATSService()

    async def analyze_resume_for_job(
        self,
        resume_text: str,
        job_description: str,
        job_title: str | None = None,
    ) -> AIAnalysisResult:
        resume_excerpt = resume_text[:12_000]
        job_excerpt = job_description[:12_000]

        if settings.openai_api_key:
            try:
                result = await self._analyze_with_openai(
                    resume_excerpt, job_excerpt, job_title
                )
                logger.info(
                    "OpenAI analysis complete: ats=%s match=%s",
                    result.ats_score,
                    result.match_score,
                )
                return result
            except Exception:
                logger.exception("OpenAI analysis failed — using rule-based fallback")

        return self._analyze_with_rules(resume_excerpt, job_excerpt, job_title)

    async def _analyze_with_openai(
        self,
        resume_text: str,
        job_description: str,
        job_title: str | None,
    ) -> AIAnalysisResult:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.openai_api_key)
        title_line = f"Target role: {job_title}\n\n" if job_title else ""

        system_message = (
            "You are a senior ATS specialist and technical recruiter with 15 years of experience "
            "screening software engineering and data roles. "
            "Evaluate resumes honestly and critically — do not inflate scores. "
            "Only list concrete technologies and frameworks as skills, never soft skills or generic terms. "
            "Scores must be integers from 0 to 100."
        )

        user_message = f"""{title_line}=== JOB DESCRIPTION ===
{job_description}

=== RESUME ===
{resume_text}

{OPENAI_JSON_SCHEMA_HINT}

{OPENAI_SCORING_GUIDE}

Additional output rules:
- improved_bullets: Rewrite 4-5 weak resume bullets as strong achievement bullets with metrics.
  Format: "Led migration of X to Y, reducing latency by 40% and cutting infra costs by $12k/month."
- suggestions: Provide 5-7 specific, actionable tips (not generic advice).
  Reference actual skills/gaps from the JD when possible.
- strengths / weaknesses: Each 3-5 items. Be specific — reference actual resume content.
- interview_questions: Generate realistic questions a technical interviewer would ask THIS specific candidate for THIS role.
  • hr (3 questions): Behavioural questions (STAR method) relevant to their background and the team culture.
  • technical (4 questions): Deep technical questions on the tools and languages in the JD they claim to know.
  • project_based (3 questions): Questions that ask them to explain or expand on specific projects/achievements listed in the resume.
  • missing_skills (3 questions): Probing questions about gaps — how would they handle a situation requiring a skill they haven't listed?
"""

        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message},
            ],
            temperature=0.2,   # lower = more consistent, realistic scores
            max_tokens=2200,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content or "{}"
        try:
            data = self._parse_openai_json(raw)
            data["analysis_source"] = "openai"
            # Post-process: strip generic words from skill lists
            data["matched_skills"] = _filter_skill_list(data.get("matched_skills", []))
            data["missing_skills"] = _filter_skill_list(data.get("missing_skills", []))
            # Normalise interview_questions into InterviewQuestions model
            raw_iq = data.get("interview_questions", {})
            if isinstance(raw_iq, dict):
                data["interview_questions"] = InterviewQuestions(
                    hr=raw_iq.get("hr", []),
                    technical=raw_iq.get("technical", []),
                    project_based=raw_iq.get("project_based", []),
                    missing_skills=raw_iq.get("missing_skills", []),
                ).model_dump()
            else:
                data["interview_questions"] = InterviewQuestions().model_dump()
            return AIAnalysisResult.model_validate(data)
        except (json.JSONDecodeError, ValidationError) as exc:
            logger.warning("OpenAI returned invalid JSON: %s", exc)
            raise ValueError("Invalid AI response format") from exc

    def _parse_openai_json(self, raw: str) -> dict[str, Any]:
        text = raw.strip()
        if text.startswith("```"):
            text = text.split("```", 2)[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)

    def _analyze_with_rules(
        self,
        resume_text: str,
        job_description: str,
        job_title: str | None,
    ) -> AIAnalysisResult:
        match_score, matched, missing = self._matcher.match(resume_text, job_description)
        ats_score, breakdown, ats_summary = self._ats.analyze(resume_text)

        # Extract all tech skills mentioned in resume for richer analysis
        resume_tech = extract_tech_skills(resume_text)
        job_tech = extract_tech_skills(job_description)

        strengths = self._derive_strengths(resume_text, matched, breakdown, resume_tech)
        weaknesses = self._derive_weaknesses(resume_text, missing, breakdown, resume_tech, job_tech)
        suggestions = self._rule_based_suggestions(matched, missing, match_score, breakdown)
        improved_bullets = self._rule_based_bullets(matched, job_title)
        interview_questions = self._rule_based_questions(matched, missing, resume_text, job_description, job_title)

        # Blend ATS score towards match_score slightly so they don't diverge wildly
        # (purely cosmetic — prevents "ATS 90 / Match 20" confusing users)
        final_ats = round(ats_score, 1)

        return AIAnalysisResult(
            ats_score=final_ats,
            match_score=round(match_score, 1),
            matched_skills=matched[:20],   # cap at 20 for readability
            missing_skills=missing[:15],   # cap at 15
            strengths=strengths,
            weaknesses=weaknesses,
            suggestions=suggestions,
            improved_bullets=improved_bullets,
            summary=self._build_combined_summary(ats_score, match_score, ats_summary),
            analysis_source="rule_based",
            interview_questions=interview_questions,
        )

    def _derive_strengths(
        self,
        resume_text: str,
        matched: list[str],
        breakdown: list[dict[str, Any]],
        resume_tech: set[str],
    ) -> list[str]:
        strengths: list[str] = []
        if matched:
            top = matched[:6]
            strengths.append(f"Strong keyword overlap with the job description: {', '.join(top)}.")
        high = [b for b in breakdown if b.get("score", 0) >= b.get("max_score", 1) * 0.75]
        for item in high[:2]:
            strengths.append(f"{item['category']}: {item['feedback']}")
        if len(resume_tech) >= 15:
            strengths.append(
                f"Broad technical skill set with {len(resume_tech)} distinct technologies listed."
            )
        elif len(resume_tech) >= 8:
            strengths.append(f"Solid technical background covering {len(resume_tech)} technologies.")
        word_count = len(resume_text.split())
        if 350 <= word_count <= 850:
            strengths.append("Resume length is within the optimal ATS-friendly range.")
        return strengths[:5] or ["Resume provides a usable foundation for ATS screening."]

    def _derive_weaknesses(
        self,
        resume_text: str,
        missing: list[str],
        breakdown: list[dict[str, Any]],
        resume_tech: set[str],
        job_tech: set[str],
    ) -> list[str]:
        weaknesses: list[str] = []
        if missing:
            top_missing = missing[:6]
            weaknesses.append(
                f"Key job requirements not found in resume: {', '.join(top_missing)}."
            )
        low = [b for b in breakdown if b.get("score", 0) < b.get("max_score", 1) * 0.5]
        for item in low[:2]:
            weaknesses.append(f"{item['category']}: {item['feedback']}")
        if len(resume_tech) < 5 and job_tech:
            weaknesses.append(
                "Very few specific technologies listed — add languages, frameworks, and tools explicitly."
            )
        if len(resume_text.split()) < 300:
            weaknesses.append("Resume is too short; expand on roles, responsibilities, and achievements.")
        return weaknesses[:5] or ["Consider tailoring this resume specifically for the target job description."]

    def _rule_based_suggestions(
        self,
        matched: list[str],
        missing: list[str],
        match_score: float,
        breakdown: list[dict[str, Any]],
    ) -> list[str]:
        suggestions: list[str] = []

        if missing:
            top_missing = missing[:6]
            suggestions.append(
                f"Incorporate these missing job-required skills (where applicable): {', '.join(top_missing)}."
            )

        if match_score < 40:
            suggestions.append(
                "Overall keyword overlap is low. Carefully re-read the job description and "
                "mirror its exact technology and tool names throughout your resume."
            )
        elif match_score < 65:
            suggestions.append(
                "Moderate keyword match. Weave missing technical terms into your experience bullets "
                "and add a dedicated Skills section listing all relevant technologies."
            )
        else:
            suggestions.append(
                "Good keyword match — strengthen your resume further by adding quantified outcomes "
                "(e.g., '↑ throughput by 35%', 'reduced P99 latency from 500ms to 120ms')."
            )

        # Check for quant impact from breakdown
        quant_item = next((b for b in breakdown if b["category"] == "Quantified Impact"), None)
        if quant_item and quant_item.get("score", 5) < 3:
            suggestions.append(
                "Add measurable results to your bullet points: percentages, dollar values, "
                "user counts, or time saved make achievements concrete and memorable."
            )

        # Check formatting
        format_item = next((b for b in breakdown if b["category"] == "Formatting"), None)
        if format_item and format_item.get("score", 10) < 6:
            suggestions.append(
                "Improve formatting: use bullet points starting with action verbs for every role, "
                "and avoid tables or multi-column layouts that confuse ATS parsers."
            )

        if matched:
            suggestions.append(
                f"Deepen your narrative around matched skills — {', '.join(matched[:4])} "
                f"— with specific project context and measurable impact."
            )

        suggestions.extend([
            "Begin each bullet with a strong past-tense action verb: Led, Built, Optimized, Shipped, Automated.",
            "Mirror the exact job title in your professional summary if it accurately reflects your experience.",
            "Ensure your LinkedIn profile URL is included and matches your resume's career narrative.",
        ])
        return suggestions[:7]

    def _rule_based_bullets(
        self,
        matched: list[str],
        job_title: str | None,
    ) -> list[str]:
        role = job_title or "the target role"
        skill = matched[0] if matched else "core technologies"
        skill2 = matched[1] if len(matched) > 1 else "related tooling"
        return [
            f"Architected and deployed {skill} solution for {role}, reducing system latency by 35% and improving uptime to 99.9%.",
            f"Led a 4-engineer team to migrate legacy service to {skill2}, cutting infrastructure costs by 28% and deployment time by 60%.",
            "Automated CI/CD pipeline using GitHub Actions and Docker, reducing release cycle from 2 weeks to daily deployments.",
            "Designed and implemented RESTful API consumed by 3 downstream services, handling 50k+ requests/day with < 100ms P99 latency.",
            "Refactored data ingestion pipeline, improving throughput by 4x and eliminating daily on-call incidents caused by race conditions.",
        ]

    def _build_combined_summary(
        self,
        ats_score: float,
        match_score: float,
        ats_summary: str,
    ) -> str:
        if match_score >= 75 and ats_score >= 70:
            return (
                f"Strong candidate profile. {ats_summary} "
                f"Your skills closely align with the role — focus on adding quantified achievements to stand out."
            )
        if match_score >= 55:
            return (
                f"Moderate job fit (match score: {match_score:.0f}/100). {ats_summary} "
                f"Bridge the gap by explicitly listing the missing technologies and adding role-specific context."
            )
        return (
            f"Limited alignment with this specific role (match score: {match_score:.0f}/100). "
            f"{ats_summary} Consider whether this role matches your background, or tailor the resume heavily."
        )

    def _rule_based_questions(
        self,
        matched: list[str],
        missing: list[str],
        resume_text: str,
        job_description: str,
        job_title: str | None,
    ) -> InterviewQuestions:
        """Generate realistic interview questions from matched/missing skills and resume content."""
        role = job_title or "this role"
        s1 = matched[0] if matched else "your primary technical stack"
        s2 = matched[1] if len(matched) > 1 else "backend services"
        s3 = matched[2] if len(matched) > 2 else "system design"
        m1 = missing[0] if missing else "a new technology"
        m2 = missing[1] if len(missing) > 1 else "an unfamiliar framework"

        hr_questions = [
            f"Tell me about a time you had to quickly learn a new technology to meet a deadline. What was your approach?",
            f"Describe a situation where you disagreed with a technical decision made by your team lead. How did you handle it?",
            f"Walk me through a project you're most proud of. What was your specific contribution and what would you do differently?",
            f"How do you prioritise competing tasks when working on multiple features or bug-fixes simultaneously?",
        ]

        technical_questions = [
            f"Explain how you would design a scalable REST API using {s1}. What trade-offs would you consider?",
            f"How does {s2} handle concurrency, and what issues have you encountered in production?",
            f"Describe the difference between horizontal and vertical scaling. When would you choose each for a {s3} system?",
            f"Walk me through how you would debug a sudden performance regression in a {s1} service running in production.",
            f"How do you approach writing unit and integration tests for {s2}-based services?",
        ]

        # Try to extract a project snippet from the resume for context
        project_context = _extract_project_snippet(resume_text)
        project_based_questions = [
            f"You mentioned {project_context} in your resume — can you walk me through the architecture decisions you made?",
            f"What was the most technically challenging aspect of working with {s1}, and how did you resolve it?",
            f"How did you ensure the reliability and observability of the systems you built in your previous role?",
            f"If you were to refactor your most recent project from scratch, what would you change and why?",
        ]

        missing_skill_questions = [
            f"This role requires experience with {m1}. How would you get up to speed, and can you describe any adjacent experience?",
            f"Have you worked with {m2} or anything similar? How do you approach learning tools outside your current stack?",
            f"Our team heavily uses {m1}. Can you describe a situation where you had to pick up an unfamiliar tool under time pressure?",
        ]

        return InterviewQuestions(
            hr=hr_questions[:3],
            technical=technical_questions[:4],
            project_based=project_based_questions[:3],
            missing_skills=missing_skill_questions[:3],
        )


# ---------------------------------------------------------------------------
# Utility: strip generic/soft-skill words that AI sometimes adds to skill lists
# ---------------------------------------------------------------------------
_GENERIC_SKILL_WORDS = frozenset({
    "communication", "teamwork", "collaboration", "leadership", "problem solving",
    "problem-solving", "critical thinking", "time management", "adaptability",
    "creativity", "attention to detail", "work ethic", "interpersonal",
    "verbal", "written", "presentation", "organizational", "analytical",
    "multitasking", "flexibility", "proactive", "self-motivated",
    "fast learner", "quick learner", "team player", "detail oriented",
    "strong", "excellent", "good", "proficient", "experience", "knowledge",
    "understanding", "familiarity", "ability", "skills", "soft skills",
})


def _filter_skill_list(skills: list[Any]) -> list[str]:
    """Remove generic/soft-skill terms from AI-returned skill lists."""
    result = []
    for s in skills:
        if not isinstance(s, str):
            continue
        lower = s.lower().strip()
        if lower and lower not in _GENERIC_SKILL_WORDS and len(lower) >= 2:
            result.append(s.strip())
    return result


def _extract_project_snippet(resume_text: str) -> str:
    """
    Pull the first meaningful project/role description from the resume
    to personalise project-based interview questions.
    """
    import re

    # Look for a sentence after a bullet point or dash that sounds like a project
    matches = re.findall(
        r"[-•▪]\s+(.{30,120})",
        resume_text,
        re.MULTILINE,
    )
    if matches:
        # Return the first substantive bullet
        return matches[0].strip().rstrip(".")
    # Fallback: grab any non-trivial sentence
    sentences = re.split(r"[.\n]", resume_text)
    for s in sentences:
        s = s.strip()
        if 30 <= len(s) <= 150:
            return s
    return "your most recent project"

