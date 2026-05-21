export const API_BASE = "/api/v1";

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  upload: "/upload",
  history: "/history",
  resume: (id: number | string) => `/resumes/${id}`,
  match: (resumeId: number | string) => `/match/${resumeId}`,
} as const;
