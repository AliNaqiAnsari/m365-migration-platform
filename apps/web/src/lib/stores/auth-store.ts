import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@m365-migration/types";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  setAuth: (user: AuthUser, tokens: { accessToken: string; refreshToken: string; expiresIn: number }) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      setAuth: (user, tokens) =>
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: Date.now() + tokens.expiresIn * 1000,
        }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
        }),
      isAuthenticated: () => {
        const { accessToken, expiresAt } = get();
        return !!accessToken && !!expiresAt && expiresAt > Date.now();
      },
    }),
    { name: "auth-storage" }
  )
);
