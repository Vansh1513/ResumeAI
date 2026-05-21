import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authService } from "../services/authService";
import { setUnauthorizedHandler } from "../services/axios";
import type { User } from "../services/types";
import { clearToken, getToken, setToken } from "../utils/storage";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  /** True while checking stored token on app load */
  isInitializing: boolean;
  loginUser: (email: string, password: string) => Promise<void>;
  registerUser: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  const loadUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setIsInitializing(false);
      return;
    }

    try {
      setUser(await authService.me());
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const loginUser = useCallback(async (email: string, password: string) => {
    const trimmedEmail = email.trim();
    const { access_token } = await authService.login(trimmedEmail, password);
    setToken(access_token);
    setUser(await authService.me());
  }, []);

  const registerUser = useCallback(async (email: string, password: string, fullName: string) => {
    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    await authService.register({
      email: trimmedEmail,
      password,
      full_name: trimmedName,
    });

    const { access_token } = await authService.login(trimmedEmail, password);
    setToken(access_token);
    setUser(await authService.me());
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isInitializing,
        loginUser,
        registerUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
