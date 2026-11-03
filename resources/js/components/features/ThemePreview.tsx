// components/features/ThemePreview.tsx

import React from "react";
import { Theme } from "../../types/theme";

interface ThemePreviewProps {
  theme: Theme;
  isActive: boolean;
  onClick: () => void;
}

export default function ThemePreview({
  theme,
  isActive,
  onClick,
}: ThemePreviewProps) {
  const { colors, name, icon } = theme;

  return (
    <button
      onClick={onClick}
      className={`relative p-4 rounded-xl border-2 transition-all w-full text-left ${
        isActive
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon || "🎨"}</span>
          <div>
            <p
              className={`font-medium ${
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              {name}
            </p>
            <div className="flex gap-1 mt-2">
              <span
                className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-600"
                style={{ backgroundColor: colors.primary }}
              />
              <span
                className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-600"
                style={{ backgroundColor: colors.background }}
              />
              <span
                className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-600"
                style={{ backgroundColor: colors.text }}
              />
              <span
                className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-600"
                style={{ backgroundColor: colors.accent }}
              />
            </div>
          </div>
        </div>
        {isActive && <Check className="w-5 h-5 text-blue-500" />}
      </div>

      {/* Mini preview */}
      <div
        className="mt-3 p-3 rounded-lg"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: "1px",
        }}
      >
        <div
          className="h-2 w-1/3 rounded-full mb-2"
          style={{ backgroundColor: colors.primary }}
        />
        <div
          className="h-1.5 w-1/2 rounded-full"
          style={{ backgroundColor: colors.textSecondary }}
        />
        <div className="flex gap-1 mt-2">
          <div
            className="h-4 w-4 rounded"
            style={{ backgroundColor: colors.primary }}
          />
          <div
            className="h-4 w-4 rounded"
            style={{ backgroundColor: colors.secondary }}
          />
          <div
            className="h-4 w-4 rounded"
            style={{ backgroundColor: colors.accent }}
          />
        </div>
      </div>
    </button>
  );
}
