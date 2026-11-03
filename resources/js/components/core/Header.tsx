// components/core/Header.tsx

import React, { useState } from "react";
import {
  Menu,
  User,
  LogOut,
  Search,
  X,
  Palette,
  Sun,
  Moon,
  ChevronDown,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";
import { useNavigate } from "react-router-dom";
import ThemeSwitcher from "../features/ThemeSwitcher";
import NotificationBell from "../features/NotificationBell";
import Modal from "../ui/Modal";
import toast from "react-hot-toast";
import { api } from "../../api/apiClient";

interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { mode, toggleDarkMode } = useThemeStore();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(
        `/barangay-bagocboc/search?q=${encodeURIComponent(searchQuery)}`,
      );
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await api.post("/web/logout");
      logout();
      navigate("/login", { replace: true });
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      logout();
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
      setShowProfileDropdown(false);
    }
  };

  const getInitials = () => {
    const firstName = user?.resident?.first_name || user?.first_name || "";
    const lastName = user?.resident?.last_name || user?.last_name || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  };

  const getFullName = () => {
    const firstName = user?.resident?.first_name || user?.first_name || "";
    const lastName = user?.resident?.last_name || user?.last_name || "";
    return `${firstName} ${lastName}`.trim() || "User";
  };

  const getRoleName = () => {
    return user?.roles?.[0]?.name || "User";
  };

  return (
    <header className="sticky top-0 z-30 bg-theme-surface border-b border-theme px-4 py-3 shadow-sm transition-colors duration-300">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg hover:bg-theme-hover transition-colors lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-theme-textSecondary" />
          </button>
          <div className="hidden md:block">
            <h1 className="text-lg font-bold text-theme-text tracking-tight">
              Barangay Bagocboc
            </h1>
            <p className="text-xs text-theme-textSecondary font-medium">
              Management System
            </p>
          </div>
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-xl mx-4 hidden md:block">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
            <input
              type="text"
              placeholder="Search residents, households, transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-theme-background border border-theme rounded-lg text-theme-text text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent transition-all placeholder:text-theme-textSecondary"
            />
          </form>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Mobile Search Toggle */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-2 rounded-lg hover:bg-theme-hover transition-colors md:hidden"
          >
            <Search className="w-5 h-5 text-theme-textSecondary" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-theme-hover transition-colors"
            title={
              mode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
            }
          >
            {mode === "dark" ? (
              <Sun className="w-5 h-5 text-theme-textSecondary hover:text-theme-primary transition-colors" />
            ) : (
              <Moon className="w-5 h-5 text-theme-textSecondary hover:text-theme-primary transition-colors" />
            )}
          </button>

          {/* Theme Settings */}
          <button
            onClick={() => setShowThemeModal(true)}
            className="p-2 rounded-lg hover:bg-theme-hover transition-colors"
            title="Theme Settings"
          >
            <Palette className="w-5 h-5 text-theme-textSecondary hover:text-theme-primary transition-colors" />
          </button>

          {/* ✅ Notification Bell (uses polling context) */}
          <NotificationBell />

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-theme-hover transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-theme-primary flex items-center justify-center text-white font-bold text-sm">
                {getInitials()}
              </div>
              <span className="hidden md:block text-sm font-medium text-theme-text">
                {getFullName()}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-theme-textSecondary transition-transform duration-200 ${showProfileDropdown ? "rotate-180" : ""
                  }`}
              />
            </button>

            {/* Dropdown */}
            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-theme-surface rounded-xl shadow-lg border border-theme py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-3 border-b border-theme">
                  <p className="font-semibold text-theme-text">
                    {getFullName()}
                  </p>
                  <p className="text-sm text-theme-textSecondary">
                    {getRoleName()}
                  </p>
                  <p className="text-xs text-theme-textSecondary mt-1">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    navigate("/barangay-bagocboc/settings/profile");
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-theme-hover transition-colors text-theme-text"
                >
                  <User className="w-4 h-4 inline mr-2" />
                  Profile Settings
                </button>
                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    navigate("/barangay-bagocboc/settings");
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-theme-hover transition-colors text-theme-text"
                >
                  <Palette className="w-4 h-4 inline mr-2" />
                  Settings
                </button>
                <hr className="my-1 border-theme" />
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {isSearchOpen && (
        <div className="mt-3 md:hidden animate-in slide-in-from-top-2 duration-200">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-theme-background border border-theme rounded-lg text-theme-text text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent transition-all"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-textSecondary hover:text-theme-text transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Theme Settings Modal */}
      <Modal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        title="Theme Settings"
        size="lg"
      >
        <ThemeSwitcher onClose={() => setShowThemeModal(false)} />
      </Modal>
    </header>
  );
}