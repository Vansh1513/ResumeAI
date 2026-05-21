import { api } from "./axios";
import type { JobMatchResult } from "./types";

export const analysisService = {
  matchJob: (
    resumeId: number,
    body: { job_title?: string; job_description: string }
  ) =>
    api.post<JobMatchResult>(`/analysis/${resumeId}/match`, body).then((res) => res.data),

  history: (resumeId?: number) => {
    const params = resumeId != null ? { resume_id: resumeId } : undefined;
    return api.get<JobMatchResult[]>("/analysis/history", { params }).then((res) => res.data);
  },

  get: (analysisId: number) =>
    api.get<JobMatchResult>(`/analysis/history/${analysisId}`).then((res) => res.data),
};
