// types/theme.ts

export interface Theme {
  id: string;
  name: string;
  icon?: string;
  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    textSecondary: string;
    border: string;
    hover: string;
    shadow: string;
    sidebar: string;
    header: string;
  };
}

export type ThemeMode = "light" | "dark" | "custom";

export interface ThemeState {
  mode: ThemeMode;
  currentTheme: string;
  customColors: Partial<Theme["colors"]>;
}