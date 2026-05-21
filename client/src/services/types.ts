export interface User {
  id: number;
  email: string;
  full_name: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface ATSBreakdownItem {
  category: string;
  score: number;
  max_score: number;
  feedback: string;
}

export interface Resume {
  id: number;
  user_id: number;
  filename: string;
  uploaded_at: string;
  ats_score: number | null;
  word_count: number | null;
}

export interface ResumeDetail extends Resume {
  extracted_text: string | null;
  ats_breakdown: ATSBreakdownItem[] | null;
}

export interface ResumeListResponse {
  items: Resume[];
  total: number;
}

export interface ResumeUploadResponse {
  message: string;
  resume: ResumeDetail;
}

export interface InterviewQuestions {
  hr: string[];
  technical: string[];
  project_based: string[];
  missing_skills: string[];
}

export interface JobMatchResult {
  id: number;
  resume_id: number;
  job_title: string | null;
  match_score: number;
  ats_score: number | null;
  matched_keywords: string[];
  missing_keywords: string[];
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
  improved_bullets: string[];
  summary: string | null;
  analysis_source?: "openai" | "rule_based";
  interview_questions?: InterviewQuestions;
  created_at: string;
}

export interface DashboardStats {
  total_resumes: number;
  average_ats_score: number | null;
  total_job_analyses: number;
  recent_resumes: {
    id: number;
    filename: string;
    ats_score: number | null;
    created_at: string;
  }[];
  recent_analyses: {
    id: number;
    resume_id: number;
    job_title: string | null;
    match_score: number;
    created_at: string;
  }[];
}

export interface ApiErrorBody {
  detail?: string | { msg?: string }[];
}

// ── Resume Heatmap ──────────────────────────────────────────────────────────

export type SectionStrength = "strong" | "moderate" | "weak" | "missing";

export interface HeatmapSection {
  name: string;
  present: boolean;
  strength: SectionStrength;
  score: number;
  feedback: string;
}

export interface HeatmapBullet {
  text: string;
  impact: "strong" | "moderate" | "weak";
  has_action_verb: boolean;
  has_metric: boolean;
  word_count: number;
}

export interface HeatmapRepeatedWord {
  word: string;
  count: number;
}

export interface HeatmapSummary {
  strong: number;
  moderate: number;
  weak: number;
  missing: number;
}

export interface ResumeHeatmap {
  sections: HeatmapSection[];
  bullets: HeatmapBullet[];
  repeated_words: HeatmapRepeatedWord[];
  missing_keywords: string[];
  summary: HeatmapSummary;
}

