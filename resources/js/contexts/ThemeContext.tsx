// contexts/ThemeContext.tsx
import React, { createContext, useContext, ReactNode } from "react";
import { useThemeStore } from "../stores/themeStore";
import { Theme } from "../types/theme";
import { getTheme } from "../config/themes"; // ✅ ESM import, not require()

interface ThemeContextType {
  currentTheme: string;
  mode: "light" | "dark" | "custom";
  colors: Theme["colors"];
  setTheme: (themeId: string) => void;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { currentTheme, mode, customColors, setTheme, toggleDarkMode } =
    useThemeStore();

  const theme = getTheme(currentTheme);
  const colors = { ...theme.colors, ...customColors };

  return (
    <ThemeContext.Provider
      value={{ currentTheme, mode, colors, setTheme, toggleDarkMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}