// stores/authStore.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isHydrated: false,

      login: (user, token) => {
        console.log("AuthStore: Login called", { user, token });
        localStorage.setItem("auth_token", token);
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        console.log("AuthStore: Logout called");
        localStorage.removeItem("auth_token");
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),

      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      onRehydrateStorage: () => (state) => {
        console.log("AuthStore: Rehydrating...", state);
        if (state) {
          state.setHydrated();
          if (!state.token) {
            const token = localStorage.getItem("auth_token");
            if (token) {
              state.token = token;
              state.isAuthenticated = true;
            }
          }
        }
      },
    },
  ),
);
