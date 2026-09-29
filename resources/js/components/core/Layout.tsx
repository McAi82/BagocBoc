// components/core/Layout.tsx

import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";
import { api } from "../../api/apiClient";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, isAuthenticated, logout, user, login } = useAuthStore();
  const { currentTheme, mode } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Apply theme class to body
  useEffect(() => {
    // Apply dark class for dark mode
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Apply theme data attribute
    document.documentElement.setAttribute("data-theme", currentTheme);

    // Cleanup
    return () => {
      document.documentElement.classList.remove("dark");
      document.documentElement.removeAttribute("data-theme");
    };
  }, [currentTheme, mode]);

  // ✅ Fetch user directly
  useEffect(() => {
    const fetchUser = async () => {
      if (!token || !isAuthenticated) {
        console.log("Layout: No token, redirecting to login");
        navigate("/login", { replace: true });
        return;
      }

      // If we already have user data, skip fetch
      if (user) {
        console.log("Layout: User already loaded", user.email);
        setIsLoading(false);
        return;
      }

      try {
        console.log("Layout: Fetching user data...");
        const response = await api.get("/web/user");
        const userData =
          response.data?.data || response.data?.user || response.data;

        if (userData) {
          console.log("Layout: User fetched successfully", userData.email);
          // Update store with user data
          login(userData, token);
        } else {
          console.log("Layout: No user data, logging out");
          logout();
          navigate("/login", { replace: true });
        }
      } catch (error) {
        console.error("Layout: Error fetching user:", error);
        logout();
        navigate("/login", { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [token, isAuthenticated, user, navigate, logout, login]);

  // Handle sidebar open/close for mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close sidebar on route change for mobile
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-theme-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // If no token or no user, don't render
  if (!token || !isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-theme-background overflow-hidden transition-colors duration-300">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-6 bg-theme-background transition-colors duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
