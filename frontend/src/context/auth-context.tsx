"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, setUnauthorizedHandler } from "@/lib/api";
import type { LoginRequest, LoginResponse, User } from "@/types/auth";

export type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

interface AuthContextValue {
  state: AuthState;
  login: (credentials: LoginRequest) => Promise<User>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const reload = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const user = await api<User>("/auth/me");
      setState({ status: "authenticated", user });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setState({ status: "unauthenticated" });
      } else {
        const message = error instanceof Error ? error.message : "Unknown error";
        setState({ status: "error", message });
      }
    }
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    const { user } = await api<LoginResponse>("/auth/login", {
      method: "POST",
      json: credentials,
    });
    setState({ status: "authenticated", user });
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api<void>("/auth/logout", { method: "POST" });
    } finally {
      setState({ status: "unauthenticated" });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Any API call that comes back 401 (e.g. token expired) logs the user out.
  useEffect(() => {
    setUnauthorizedHandler(() => setState({ status: "unauthenticated" }));
    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo(
    () => ({ state, login, logout, reload }),
    [state, login, logout, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

/** Landing page for each role after login. */
export function homePathFor(user: User): string {
  return user.role === "ADMIN" ? "/admin/requests" : "/equipment";
}
