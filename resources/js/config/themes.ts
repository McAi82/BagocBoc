// config/themes.ts

import { Theme } from "../types/theme";

export const THEMES: Record<string, Theme> = {
  light: {
    id: "light",
    name: "Light",
    icon: "☀️",
    colors: {
      background: "#f1f5f9",
      surface: "#ffffff",
      primary: "#2563eb",
      secondary: "#3b82f6",
      accent: "#8b5cf6",
      text: "#0f172a",
      textSecondary: "#64748b",
      border: "#e2e8f0",
      hover: "#f1f5f9",
      shadow: "rgba(0,0,0,0.1)",
      sidebar: "#ffffff",
      header: "#ffffff",
    },
  },
  dark: {
    id: "dark",
    name: "Dark",
    icon: "🌙",
    colors: {
      background: "#0f172a",
      surface: "#1e293b",
      primary: "#3b82f6",
      secondary: "#60a5fa",
      accent: "#a78bfa",
      text: "#f1f5f9",
      textSecondary: "#94a3b8",
      border: "#334155",
      hover: "#1e293b",
      shadow: "rgba(0,0,0,0.3)",
      sidebar: "#1e293b",
      header: "#1e293b",
    },
  },
  custom: {
    id: "custom",
    name: "Custom",
    icon: "🎨",
    colors: {
      background: "#f1f5f9",
      surface: "#ffffff",
      primary: "#2563eb",
      secondary: "#3b82f6",
      accent: "#8b5cf6",
      text: "#0f172a",
      textSecondary: "#64748b",
      border: "#e2e8f0",
      hover: "#f1f5f9",
      shadow: "rgba(0,0,0,0.1)",
      sidebar: "#ffffff",
      header: "#ffffff",
    },
  },
};

export const DEFAULT_THEME = "light";

export const getTheme = (id: string): Theme =>
  THEMES[id] || THEMES[DEFAULT_THEME];

export const getThemeColors = (id: string): Theme["colors"] =>
  getTheme(id).colors;