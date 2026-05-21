import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE } from "../utils/constants";
import { clearToken, getToken } from "../utils/storage";
import type { ApiErrorBody } from "./types";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

function setAuthHeader(config: InternalAxiosRequestConfig, token: string) {
  if (typeof config.headers.set === "function") {
    config.headers.set("Authorization", `Bearer ${token}`);
  } else {
    config.headers.Authorization = `Bearer ${token}`;
  }
}

function removeContentType(config: InternalAxiosRequestConfig) {
  if (typeof config.headers.delete === "function") {
    config.headers.delete("Content-Type");
  } else {
    delete config.headers["Content-Type"];
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    setAuthHeader(config, token);
  }

  if (config.data instanceof FormData) {
    removeContentType(config);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401) {
      clearToken();
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return error instanceof Error ? error.message : "Request failed";
  }

  if (error.code === "ECONNABORTED") {
    return "Request timed out. Check that the API server is running.";
  }

  if (!error.response) {
    return "Cannot reach the server. Is the backend running on port 8000?";
  }

  const detail = error.response.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg ?? "Validation error").join(", ");
  }

  if (error.response.status === 401) return "Session expired. Please sign in again.";
  return error.message || "Request failed";
}
