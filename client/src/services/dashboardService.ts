import { api } from "./axios";
import type { DashboardStats } from "./types";

export const dashboardService = {
  getStats: () => api.get<DashboardStats>("/dashboard/stats").then((res) => res.data),
};
