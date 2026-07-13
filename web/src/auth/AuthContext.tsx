import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../lib/services";
import { clearTokens, getAccessToken } from "../lib/api";
import type { MeResponse, Role } from "../types/api";

type AuthContextValue = {
  user: MeResponse | null | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const ADMIN_ROLES: Role[] = ["MANAGER", "HR_ADMIN", "SUPER_ADMIN"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState(() => Boolean(getAccessToken()));

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
    enabled: hasToken,
    retry: false,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      await authApi.login(email, password);
      setHasToken(true);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      clearTokens();
    }
    setHasToken(false);
    queryClient.clear();
  }, [queryClient]);

  const user = hasToken ? meQuery.data : null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: hasToken && meQuery.isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      hasRole: (...roles: Role[]) =>
        user ? roles.includes(user.role) : false,
    }),
    [user, hasToken, meQuery.isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function canAccessAdmin(role: Role | undefined): boolean {
  return role !== undefined && ADMIN_ROLES.includes(role);
}
