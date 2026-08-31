import { useCallback, useEffect, useState } from "react";
import { authService, AuthProfile, AuthUser, Role } from "@/src/services/authService";

interface AuthState {
  user: AuthUser | null;
  profile: AuthProfile | null;
  role: Role | null;
  loading: boolean;
  authenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    role: null,
    loading: true,
    authenticated: false,
  });

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) {
      setState({ user: null, profile: null, role: null, loading: false, authenticated: false });
      return;
    }
    try {
      const { user, profile } = await authService.me();
      setState({ user, profile, role: user.role, loading: false, authenticated: true });
    } catch {
      authService.logout();
      setState({ user: null, profile: null, role: null, loading: false, authenticated: false });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    authService.logout();
    setState({ user: null, profile: null, role: null, loading: false, authenticated: false });
    if (typeof window !== "undefined") window.location.href = "/";
  }, []);

  return { ...state, refresh, logout };
}
