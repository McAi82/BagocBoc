// components/features/ThemeSwitcher.tsx

import React, { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  Palette,
  Check,
  X,
  Save,
  RotateCcw,
  Edit2,
} from "lucide-react";
import { useThemeStore } from "../../stores/themeStore";
import { THEMES, DEFAULT_THEME } from "../../config/themes";
import { Theme } from "../../types/theme";
import Modal from "../ui/Modal";
import toast from "react-hot-toast";

interface ThemeSwitcherProps {
  className?: string;
  onClose?: () => void;
}

export default function ThemeSwitcher({
  className = "",
  onClose,
}: ThemeSwitcherProps) {
  const {
    currentTheme,
    mode,
    customColors,
    setTheme,
    setMode,
    setCustomColor,
    resetCustomColors,
  } = useThemeStore();

  const [showCustomizer, setShowCustomizer] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customColorValues, setCustomColorValues] = useState<
    Record<string, string>
  >({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const themeList = Object.values(THEMES);
  const currentThemeData = THEMES[currentTheme];

  // Initialize custom color values from store
  useEffect(() => {
    if (Object.keys(customColors).length > 0) {
      setCustomColorValues(customColors);
    } else {
      setCustomColorValues(THEMES.custom.colors);
    }
  }, [customColors]);

  const handleSelectTheme = (themeId: string) => {
    if (themeId === "custom") {
      setSelectedPreset("custom");
      setShowCustomizer(true);
      return;
    }

    setTheme(themeId);
    toast.success(`Theme switched to ${THEMES[themeId].name}`);
    if (onClose) onClose();
  };

  const handleToggleDarkMode = () => {
    const newMode = mode === "dark" ? "light" : "dark";
    setMode(newMode);
    toast.success(`Switched to ${newMode} mode`);
  };

  const handleColorChange = (key: string, value: string) => {
    setCustomColorValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveCustomTheme = () => {
    Object.entries(customColorValues).forEach(([key, value]) => {
      setCustomColor(key as keyof Theme["colors"], value);
    });
    setShowCustomizer(false);
    toast.success("Custom theme saved!");
    if (onClose) onClose();
  };

  const handleResetCustomTheme = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    resetCustomColors();
    setCustomColorValues(THEMES.custom.colors);
    setShowResetConfirm(false);
    toast.success("Custom theme reset to default");
  };

  const colorKeys = [
    { key: "background", label: "Background" },
    { key: "surface", label: "Surface" },
    { key: "primary", label: "Primary" },
    { key: "secondary", label: "Secondary" },
    { key: "accent", label: "Accent" },
    { key: "text", label: "Text" },
    { key: "textSecondary", label: "Secondary Text" },
    { key: "border", label: "Border" },
    { key: "sidebar", label: "Sidebar" },
    { key: "header", label: "Header" },
  ];

  const getModeIcon = () => {
    return mode === "dark" ? (
      <Moon className="w-5 h-5" />
    ) : (
      <Sun className="w-5 h-5" />
    );
  };

  return (
    <div className={`${className}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Theme Settings
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Customize your interface appearance
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Dark/Light Toggle */}
            <button
              onClick={handleToggleDarkMode}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
            >
              {getModeIcon()}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Current Theme Indicator */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{currentThemeData?.icon || "🎨"}</span>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {currentThemeData?.name || "Default"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {mode === "dark" ? "Dark Mode" : "Light Mode"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <span
                className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-600"
                style={{
                  backgroundColor:
                    currentThemeData?.colors.primary || "#2563eb",
                }}
              />
              <span
                className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-600"
                style={{
                  backgroundColor:
                    currentThemeData?.colors.background || "#f1f5f9",
                }}
              />
              <span
                className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-600"
                style={{
                  backgroundColor: currentThemeData?.colors.text || "#0f172a",
                }}
              />
            </div>
          </div>
        </div>

        {/* Theme Presets */}
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Preset Themes
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {themeList.map((theme) => {
              const isActive = currentTheme === theme.id;
              const isCustom = theme.id === "custom";

              return (
                <button
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    isActive
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{theme.icon || "🎨"}</span>
                    {isActive && <Check className="w-4 h-4 text-blue-500" />}
                  </div>
                  <p
                    className={`font-medium text-sm ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {theme.name}
                  </p>
                  <div className="flex gap-1 mt-2">
                    <span
                      className="w-4 h-4 rounded-full border border-slate-200 dark:border-slate-600"
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-slate-200 dark:border-slate-600"
                      style={{ backgroundColor: theme.colors.background }}
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-slate-200 dark:border-slate-600"
                      style={{ backgroundColor: theme.colors.text }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Custom Theme Modal */}
      <Modal
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
        title="Custom Theme"
        size="lg"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Customize each color to create your perfect theme. Changes are saved
            automatically when you click "Save".
          </p>

          {/* Color Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {colorKeys.map(({ key, label }) => {
              const value =
                customColorValues[key as keyof Theme["colors"]] || "#000000";
              return (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {label}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="w-12 h-12 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 p-1"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Preview */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Preview
            </h4>
            <div
              className="p-4 rounded-lg"
              style={{
                backgroundColor: customColorValues.background || "#f1f5f9",
                color: customColorValues.text || "#0f172a",
              }}
            >
              <div
                className="p-4 rounded-lg mb-3"
                style={{
                  backgroundColor: customColorValues.surface || "#ffffff",
                  borderColor: customColorValues.border || "#e2e8f0",
                  borderWidth: "1px",
                }}
              >
                <p
                  className="font-bold"
                  style={{ color: customColorValues.primary || "#2563eb" }}
                >
                  Preview Title
                </p>
                <p
                  style={{
                    color: customColorValues.textSecondary || "#64748b",
                  }}
                >
                  This is how your custom theme will look.
                </p>
                <button
                  className="mt-2 px-4 py-2 rounded-lg text-white"
                  style={{
                    backgroundColor: customColorValues.primary || "#2563eb",
                  }}
                >
                  Sample Button
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleResetCustomTheme}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCustomizer(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomTheme}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Theme
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Reset Custom Theme?"
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            This will reset all custom colors to their default values. This
            action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmReset}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
