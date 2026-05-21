export const API_BASE =
  import.meta.env.VITE_API_URL || "https://resumeai-qzg7.onrender.com";

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  upload: "/upload",
  history: "/history",
  resume: (id: number | string) => `/resumes/${id}`,
  match: (resumeId: number | string) => `/match/${resumeId}`,
} as const;