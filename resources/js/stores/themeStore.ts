// stores/themeStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Theme, ThemeMode } from "../types/theme";

interface ThemeStore {
  mode: ThemeMode;
  currentTheme: string;
  customColors: Partial<Theme["colors"]>;
  setTheme: (themeId: string) => void;
  setMode: (mode: ThemeMode) => void;
  toggleDarkMode: () => void;
  setCustomColor: (key: keyof Theme["colors"], value: string) => void;
  resetCustomColors: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: "light",
      currentTheme: "light",
      customColors: {},

      setTheme: (themeId) => set({ currentTheme: themeId }),

      setMode: (mode) => {
        set({ mode });
        if (mode === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      },

      toggleDarkMode: () => {
        const newMode = get().mode === "dark" ? "light" : "dark";
        get().setMode(newMode);
      },

      setCustomColor: (key, value) => {
        set((state) => ({
          customColors: { ...state.customColors, [key]: value },
        }));
      },

      resetCustomColors: () => set({ customColors: {} }),
    }),
    {
      name: "theme-storage",
      partialize: (state) => ({
        mode: state.mode,
        currentTheme: state.currentTheme,
        customColors: state.customColors,
      }),
    },
  ),
);