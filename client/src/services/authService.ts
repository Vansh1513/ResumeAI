import { api } from "./axios";
import type { TokenResponse, User } from "./types";

export const authService = {
  register: (body: { email: string; password: string; full_name: string }) =>
    api.post<User>("/auth/register", body).then((res) => res.data),

  /**
   * FastAPI OAuth2 password flow expects form fields:
   * username = email, password = password
   */
  login: (email: string, password: string) =>
    api
      .post<TokenResponse>(
        "/auth/login",
        new URLSearchParams({ username: email, password }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      )
      .then((res) => res.data),

  me: () => api.get<User>("/auth/me").then((res) => res.data),
};
