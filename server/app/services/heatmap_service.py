"""
Resume Heatmap Service
======================
Pure-Python analysis that identifies:
  - Strong and weak sections
  - Low-impact bullets (no action verb, no metric)
  - Repeated / overused words
  - Missing common resume keywords for tech roles
"""

from __future__ import annotations

import re
from collections import Counter
from typing import Any

from app.utils.text_analysis import (
    ACTION_VERBS,
    SECTION_KEYWORDS,
    normalize_text,
    extract_tech_skills,
)


# ── Constants ──────────────────────────────────────────────────────────────────

# Common tech-role keywords frequently expected by ATS — used to flag missing signal
_COMMON_TECH_KEYWORDS: frozenset[str] = frozenset({
    "python", "javascript", "typescript", "java", "golang", "rust", "c++",
    "react", "node", "fastapi", "django", "flask", "spring",
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
    "docker", "kubernetes", "aws", "azure", "gcp", "terraform",
    "git", "github", "ci/cd", "github actions",
    "rest", "graphql", "grpc", "microservices",
    "agile", "scrum",
    "machine learning", "deep learning", "data science",
    "sql", "nosql", "api", "linux",
})

# Filler words that signal low-impact bullets
_WEAK_STARTERS: frozenset[str] = frozenset({
    "responsible", "worked", "helped", "assisted", "was", "were",
    "did", "made", "used", "utilized", "involved", "participated",
    "support", "supported", "handled",
})

# Words whose repetition is a red flag
_NOISE_WORDS: frozenset[str] = frozenset({
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for",
    "of", "with", "by", "as", "is", "was", "i", "my", "we",
    "experience", "work", "team", "company",
})

_BULLET_RE = re.compile(r"^[ \t]*[-•▪▸►‣*]\s+(.+)$", re.MULTILINE)
_METRIC_RE = re.compile(
    r"\b(\d+[\.,]?\d*\s*%|\$[\d,.]+|\d+[xX]\b|\d+\s*(?:million|billion|k\b|ms\b|sec\b|hr\b))",
    re.IGNORECASE,
)


# ── Section rating helpers ────────────────────────────────────────────────────

def _rate_section(section_name: str, text: str, present: bool) -> dict[str, Any]:
    """Score an individual section and explain its rating."""
    if not present:
        return {
            "name": section_name,
            "present": False,
            "strength": "missing",    # missing | weak | moderate | strong
            "score": 0,
            "feedback": f"No {section_name.lower()} section detected. Add one — it's critical for ATS.",
        }

    lower = normalize_text(text)
    bullets = _BULLET_RE.findall(text)
    metrics = len(_METRIC_RE.findall(text))
    tech = extract_tech_skills(text)

    # Section-specific scoring
    if section_name == "Experience":
        if len(bullets) >= 6 and metrics >= 2:
            strength, score, fb = "strong", 90, f"{len(bullets)} bullets, {metrics} quantified results — excellent."
        elif len(bullets) >= 3:
            strength, score, fb = "moderate", 60, f"{len(bullets)} bullets but only {metrics} metric(s). Add %, $, or time-saved figures."
        else:
            strength, score, fb = "weak", 30, "Very few bullet points. Expand each role with 4–6 achievement bullets."

    elif section_name == "Skills":
        n = len(tech)
        if n >= 15:
            strength, score, fb = "strong", 90, f"{n} distinct technical skills listed."
        elif n >= 7:
            strength, score, fb = "moderate", 60, f"{n} skills listed. Add more specific tools, languages, and frameworks."
        else:
            strength, score, fb = "weak", 30, f"Only {n} technical skills found. Add a dedicated Skills section with all relevant tools."

    elif section_name == "Education":
        has_degree = any(w in lower for w in ["bachelor", "master", "phd", "b.tech", "b.e.", "b.s.", "m.s.", "mba"])
        has_year   = bool(re.search(r"\b(19|20)\d{2}\b", text))
        if has_degree and has_year:
            strength, score, fb = "strong", 90, "Degree and graduation year present."
        elif has_degree:
            strength, score, fb = "moderate", 65, "Degree present but graduation year is missing — add it."
        else:
            strength, score, fb = "weak", 35, "Education details are sparse. Include degree, institution, and year."

    elif section_name == "Summary":
        words = len(normalize_text(text).split())
        if words >= 40:
            strength, score, fb = "strong", 85, f"Well-developed summary ({words} words)."
        elif words >= 15:
            strength, score, fb = "moderate", 55, f"Short summary ({words} words). Expand to 40–80 words targeting the role."
        else:
            strength, score, fb = "weak", 25, "Summary/objective is missing or too short. Add a 2–3 sentence professional summary."

    elif section_name == "Contact":
        has_email    = bool(re.search(r"[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}", lower))
        has_phone    = bool(re.search(r"[\+]?[\d\s\-().]{7,}", text))
        has_linkedin = "linkedin" in lower
        score_val = (has_email * 33) + (has_phone * 34) + (has_linkedin * 33)
        if score_val >= 90:
            strength, score, fb = "strong", 95, "Email, phone, and LinkedIn all present."
        elif score_val >= 55:
            missing = [x for x, v in [("email", has_email), ("phone", has_phone), ("LinkedIn", has_linkedin)] if not v]
            strength, score, fb = "moderate", score_val, f"Missing: {', '.join(missing)}."
        else:
            strength, score, fb = "weak", score_val, "Critical contact info is missing. Add email, phone, and LinkedIn URL."
    else:
        strength, score, fb = "moderate", 50, "Section present."

    return {
        "name": section_name,
        "present": True,
        "strength": strength,
        "score": score,
        "feedback": fb,
    }


# ── Bullet analysis ───────────────────────────────────────────────────────────

def _analyse_bullets(text: str) -> list[dict[str, Any]]:
    """Classify each detected bullet as strong, moderate, or weak."""
    raw_bullets = _BULLET_RE.findall(text)
    results = []
    for bullet in raw_bullets[:30]:   # cap at 30 for performance
        stripped = bullet.strip()
        if len(stripped) < 10:
            continue
        first_word = stripped.split()[0].lower().rstrip(".,;:")
        has_verb    = first_word in ACTION_VERBS
        has_metric  = bool(_METRIC_RE.search(stripped))
        weak_start  = first_word in _WEAK_STARTERS or first_word in {"the", "a", "an"}
        word_count  = len(stripped.split())

        if has_verb and has_metric:
            impact = "strong"
        elif has_verb and not has_metric:
            impact = "moderate"
        elif weak_start or not has_verb:
            impact = "weak"
        else:
            impact = "moderate"

        results.append({
            "text": stripped[:200],
            "impact": impact,
            "has_action_verb": has_verb,
            "has_metric": has_metric,
            "word_count": word_count,
        })
    return results


# ── Word frequency ────────────────────────────────────────────────────────────

def _find_repeated_words(text: str, top_n: int = 10, min_count: int = 2) -> list[dict[str, Any]]:
    """Find overused words (excluding noise/stop-words)."""
    normed = normalize_text(text)
    tokens = re.findall(r"[a-z]{4,}", normed)   # only words ≥4 chars
    filtered = [t for t in tokens if t not in _NOISE_WORDS]
    counts = Counter(filtered)
    repeated = [
        {"word": word, "count": count}
        for word, count in counts.most_common(top_n * 2)
        if count >= min_count
    ]
    return repeated[:top_n]


# ── Missing keyword detection ─────────────────────────────────────────────────

def _find_missing_common_keywords(text: str) -> list[str]:
    """
    Compare the resume's tech skills against a curated list of high-signal
    tech keywords expected in most modern engineering roles.
    Returns up to 10 keywords that are absent from the resume.
    """
    resume_skills = extract_tech_skills(text)
    resume_lower = normalize_text(text)
    # also check raw text membership for multi-word phrases
    missing = [
        kw for kw in sorted(_COMMON_TECH_KEYWORDS)
        if kw not in resume_skills and kw not in resume_lower
    ]
    return missing[:10]


# ── Main analyser ─────────────────────────────────────────────────────────────

class HeatmapService:
    """Produces a structured heatmap analysis of a resume."""

    def analyse(self, text: str) -> dict[str, Any]:
        if not text or len(text.strip()) < 30:
            return {
                "sections": [],
                "bullets": [],
                "repeated_words": [],
                "missing_keywords": [],
                "summary": {"strong": 0, "moderate": 0, "weak": 0, "missing": 0},
            }

        lower = normalize_text(text)

        # ── 1. Split text into rough section blocs ──────────────────────────
        # Detect where each section starts so we can analyse text within it
        section_map = _split_into_sections(text)

        # ── 2. Rate sections ────────────────────────────────────────────────
        section_order = ["Experience", "Skills", "Education", "Summary", "Contact"]
        keyword_map   = {
            "Experience": SECTION_KEYWORDS["experience"],
            "Skills":     SECTION_KEYWORDS["skills"],
            "Education":  SECTION_KEYWORDS["education"],
            "Summary":    SECTION_KEYWORDS["summary"],
            "Contact":    SECTION_KEYWORDS["contact"],
        }

        sections: list[dict[str, Any]] = []
        for name in section_order:
            present = any(kw in lower for kw in keyword_map[name])
            blob = section_map.get(name.lower(), text)   # fall back to full text if section not isolated
            sections.append(_rate_section(name, blob, present))

        # ── 3. Bullet analysis ──────────────────────────────────────────────
        bullets = _analyse_bullets(text)

        # ── 4. Repeated words ───────────────────────────────────────────────
        repeated = _find_repeated_words(text)

        # ── 5. Missing common keywords ──────────────────────────────────────
        missing_kw = _find_missing_common_keywords(text)

        # ── 6. Summary counters ─────────────────────────────────────────────
        strength_counts: dict[str, int] = {"strong": 0, "moderate": 0, "weak": 0, "missing": 0}
        for sec in sections:
            strength_counts[sec["strength"]] = strength_counts.get(sec["strength"], 0) + 1

        return {
            "sections":         sections,
            "bullets":          bullets,
            "repeated_words":   repeated,
            "missing_keywords": missing_kw,
            "summary":          strength_counts,
        }


# ── Section text splitter ─────────────────────────────────────────────────────

_SECTION_HEADER_RE = re.compile(
    r"^[ \t]*(experience|employment|work history|education|skills|technical skills|"
    r"summary|objective|profile|contact|projects?|certifications?|achievements?)[ \t]*:?[ \t]*$",
    re.IGNORECASE | re.MULTILINE,
)


def _split_into_sections(text: str) -> dict[str, str]:
    """
    Roughly split resume text into named section blobs.
    Returns a dict of {canonical_name: blob_text}.
    """
    _CANONICAL = {
        "experience": "experience", "employment": "experience", "work history": "experience",
        "education": "education",
        "skills": "skills", "technical skills": "skills",
        "summary": "summary", "objective": "summary", "profile": "summary",
        "contact": "contact",
        "projects": "projects", "project": "projects",
        "certifications": "certifications", "certification": "certifications",
        "achievements": "achievements",
    }

    matches = list(_SECTION_HEADER_RE.finditer(text))
    if not matches:
        return {}

    sections: dict[str, str] = {}
    for i, m in enumerate(matches):
        header = m.group(1).lower()
        canonical = _CANONICAL.get(header, header)
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        blob = text[start:end].strip()
        if canonical not in sections:   # first occurrence wins
            sections[canonical] = blob

    return sections
