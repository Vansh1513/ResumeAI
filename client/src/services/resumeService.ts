import { api } from "./axios";
import type { ResumeDetail, ResumeHeatmap, ResumeListResponse, ResumeUploadResponse } from "./types";

export const resumeService = {
  /** GET /resumes/my-resumes — list current user's resumes */
  listMyResumes: () =>
    api.get<ResumeListResponse>("/resumes/my-resumes").then((res) => res.data),

  get: (id: number) => api.get<ResumeDetail>(`/resumes/${id}`).then((res) => res.data),

  /** POST /resumes/upload — multipart PDF (JWT attached by Axios interceptor) */
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<ResumeUploadResponse>("/resumes/upload", form)
      .then((res) => res.data);
  },

  delete: (id: number) => api.delete(`/resumes/${id}`),

  heatmap: (id: number) =>
    api.get<ResumeHeatmap>(`/resumes/${id}/heatmap`).then((res) => res.data),
};

