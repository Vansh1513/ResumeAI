import re
from typing import Any

from app.utils.text_analysis import (
    count_action_verbs,
    detect_sections,
    extract_tech_skills,
    normalize_text,
    tokenize_keywords,
)


class ATSService:
    """
    ATS (Applicant Tracking System) scoring without external APIs.

    Scoring breakdown (100 pts total):
      - Section completeness : 25 pts
      - Length & density     : 15 pts
      - Action verbs         : 15 pts
      - Tech keyword richness: 25 pts  ← new, higher weight
      - Formatting quality   : 10 pts
      - Contact completeness :  5 pts  ← new sub-check
      - Quantified impact    :  5 pts  ← new sub-check
    """

    # Penalty/scaling constants
    _IDEAL_WORD_MIN = 350
    _IDEAL_WORD_MAX = 850

    def analyze(self, text: str) -> tuple[float, list[dict[str, Any]], str]:
        if not text or len(text.strip()) < 50:
            return 0.0, [], "Resume text is too short or could not be extracted from the PDF."

        breakdown: list[dict[str, Any]] = []
        total = 0.0

        # ── 1. Section completeness (25 pts) ───────────────────────────────
        sections = detect_sections(text)
        section_score = (
            (10 if sections["experience"] else 0)
            + (7  if sections["education"]  else 0)
            + (5  if sections["skills"]     else 0)
            + (3  if sections["contact"]    else 0)
        )
        section_score = min(section_score, 25)
        breakdown.append({
            "category":  "Sections",
            "score":     section_score,
            "max_score": 25,
            "feedback":  self._section_feedback(sections),
        })
        total += section_score

        # ── 2. Length & density (15 pts) ───────────────────────────────────
        word_count = len(normalize_text(text).split())
        if self._IDEAL_WORD_MIN <= word_count <= self._IDEAL_WORD_MAX:
            length_score = 15
            length_feedback = f"Ideal length ({word_count} words)."
        elif word_count < self._IDEAL_WORD_MIN:
            length_score = max(3, int(word_count / self._IDEAL_WORD_MIN * 15))
            length_feedback = (
                f"Resume may be too short ({word_count} words). "
                f"Aim for {self._IDEAL_WORD_MIN}–{self._IDEAL_WORD_MAX} words."
            )
        else:
            # Long resume: partial credit — more than 1 page is still okay for experienced candidates
            over_ratio = min((word_count - self._IDEAL_WORD_MAX) / 500, 1.0)
            length_score = max(8, int(15 - over_ratio * 5))
            length_feedback = (
                f"Resume is long ({word_count} words). "
                "Consider condensing to 1–2 targeted pages."
            )
        breakdown.append({
            "category":  "Length",
            "score":     length_score,
            "max_score": 15,
            "feedback":  length_feedback,
        })
        total += length_score

        # ── 3. Action verbs (15 pts) ───────────────────────────────────────
        verb_count = count_action_verbs(text)
        verb_score = min(15, verb_count * 3)
        verb_feedback = (
            f"Found {verb_count} strong action verbs."
            if verb_count >= 5
            else f"Only {verb_count} action verbs detected. Add more (achieved, built, led, delivered…)."
        )
        breakdown.append({
            "category":  "Action Verbs",
            "score":     verb_score,
            "max_score": 15,
            "feedback":  verb_feedback,
        })
        total += verb_score

        # ── 4. Tech keyword richness (25 pts) ─────────────────────────────
        tech_skills = extract_tech_skills(text)
        num_skills = len(tech_skills)
        # 25 pts at ~20 distinct tech skills; diminishing returns beyond that
        if num_skills >= 20:
            tech_score = 25
        elif num_skills >= 10:
            tech_score = 15 + int((num_skills - 10) / 10 * 10)
        elif num_skills >= 5:
            tech_score = 8 + int((num_skills - 5) / 5 * 7)
        else:
            tech_score = num_skills * 2
        tech_score = min(tech_score, 25)
        tech_feedback = (
            f"Detected {num_skills} distinct technical skills/technologies."
            if num_skills >= 5
            else (
                f"Only {num_skills} technical skills detected. "
                "List specific languages, frameworks, tools, and cloud platforms."
            )
        )
        breakdown.append({
            "category":  "Technical Skills",
            "score":     tech_score,
            "max_score": 25,
            "feedback":  tech_feedback,
        })
        total += tech_score

        # ── 5. Formatting (10 pts) ─────────────────────────────────────────
        has_bullets = "•" in text or _has_list_markers(text)
        # Check for tables / graphics noise (lines that are pure symbols/pipes)
        has_table_noise = bool(re.search(r"\|.*\|.*\|", text))
        format_score = (8 if has_bullets else 4) + (0 if has_table_noise else 2)
        format_feedback_parts: list[str] = []
        if not has_bullets:
            format_feedback_parts.append("Use bullet points for achievements and responsibilities.")
        if has_table_noise:
            format_feedback_parts.append(
                "Tables detected — many ATS parsers struggle with them; switch to plain lists."
            )
        if not format_feedback_parts:
            format_feedback_parts.append(
                "Clean formatting with bullet points detected — good ATS compatibility."
            )
        breakdown.append({
            "category":  "Formatting",
            "score":     format_score,
            "max_score": 10,
            "feedback":  " ".join(format_feedback_parts),
        })
        total += format_score

        # ── 6. Contact completeness (5 pts) ───────────────────────────────
        lower = normalize_text(text)
        has_email    = bool(re.search(r"[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}", lower))
        has_phone    = bool(re.search(r"[\+]?[\d\s\-().]{7,15}", text))
        has_linkedin = "linkedin" in lower
        contact_score = (
            (2 if has_email    else 0)
            + (1 if has_phone    else 0)
            + (2 if has_linkedin else 0)
        )
        missing_contact = []
        if not has_email:    missing_contact.append("email")
        if not has_phone:    missing_contact.append("phone")
        if not has_linkedin: missing_contact.append("LinkedIn URL")
        contact_feedback = (
            "Email, phone, and LinkedIn present."
            if not missing_contact
            else f"Missing contact info: {', '.join(missing_contact)}."
        )
        breakdown.append({
            "category":  "Contact Info",
            "score":     contact_score,
            "max_score": 5,
            "feedback":  contact_feedback,
        })
        total += contact_score

        # ── 7. Quantified impact (5 pts) ──────────────────────────────────
        quant_hits = len(re.findall(
            r"\b(?:\d+[\.,]?\d*\s*%|\$[\d,.]+|\d+x\b|\d+\s*(?:million|billion|k\b))",
            text,
            re.IGNORECASE,
        ))
        quant_score = min(5, quant_hits)
        quant_feedback = (
            f"{quant_hits} quantified result(s) found (%, $, multipliers)."
            if quant_hits
            else "No quantified results found. Add metrics (e.g., 'reduced costs by 30%')."
        )
        breakdown.append({
            "category":  "Quantified Impact",
            "score":     quant_score,
            "max_score": 5,
            "feedback":  quant_feedback,
        })
        total += quant_score

        final_score = round(min(total, 100.0), 1)
        summary = self._build_summary(final_score, sections, tech_skills)
        return final_score, breakdown, summary

    # ─── Private helpers ───────────────────────────────────────────────────

    def _section_feedback(self, sections: dict[str, bool]) -> str:
        missing = [name for name, found in sections.items() if not found and name != "summary"]
        if not missing:
            return "All core sections detected (Experience, Education, Skills, Contact)."
        return f"Consider adding these sections: {', '.join(missing)}."

    def _build_summary(
        self,
        score: float,
        sections: dict[str, bool],
        tech_skills: set[str],
    ) -> str:
        if score >= 85:
            return (
                "Excellent ATS compatibility. Fine-tune keywords for each specific job posting "
                "and ensure your top achievements include measurable metrics."
            )
        if score >= 70:
            return (
                "Good ATS foundation. Add more job-specific technical keywords and quantify "
                "your impact with numbers (%, $, time saved) to push past screening filters."
            )
        if score >= 50:
            tips: list[str] = []
            if not sections.get("experience"):
                tips.append("add a clear Work Experience section")
            if len(tech_skills) < 8:
                tips.append("list more specific technologies and tools")
            if not tips:
                tips.append("improve keyword density and formatting")
            return (
                f"Average ATS score — {'; '.join(tips)}. "
                "Make sure bullets start with action verbs and include measurable outcomes."
            )
        return (
            "Low ATS compatibility. Restructure the resume with clear sections "
            "(Experience, Education, Skills), use bullet points with action verbs, "
            "and list all relevant technical skills explicitly."
        )


def _has_list_markers(text: str) -> bool:
    return bool(re.search(r"^[\s]*[-*•▪▸►‣][\s]", text, re.MULTILINE))
