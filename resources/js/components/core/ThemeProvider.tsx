// components/core/ThemeProvider.tsx

import React, { useEffect } from "react";
import { useThemeStore } from "../../stores/themeStore";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const { currentTheme, mode, customColors } = useThemeStore();

  useEffect(() => {
    // 1. Dark class
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // 2. Theme data attribute
    document.documentElement.setAttribute("data-theme", currentTheme);

    // 3. Custom colors — inject as inline CSS variables
    const root = document.documentElement;
    const previousKeys: string[] = [];
    Object.entries(customColors || {}).forEach(([key, value]) => {
      if (!value) return;
      const cssVar = `--theme-${key.replace(
        /[A-Z]/g,
        (m) => "-" + m.toLowerCase(),
      )}`;
      root.style.setProperty(cssVar, value);
      previousKeys.push(cssVar);
    });

    return () => {
      previousKeys.forEach((k) => root.style.removeProperty(k));
    };
  }, [currentTheme, mode, customColors]);

  return <>{children}</>;
}