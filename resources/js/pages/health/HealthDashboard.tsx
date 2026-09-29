// src/pages/health/HealthDashboard.tsx

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  UserPlus,
  Search,
  Users,
  Baby,
  Droplet,
  User as UserIcon,
  Activity,
  Calendar,
  Clock,
  ArrowRight,
  Plus,
  FileText,
  Loader2,
  User,
  Stethoscope,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { api } from "../../api/apiClient";
import toast from "react-hot-toast";

interface HealthStats {
  totalPatients: number;
  pregnant: number;
  children: number;
  lactating: number;
  senior: number;
  ncd: number;
  todayCheckups: number;
  pendingFollowups: number;
  male: number;
  female: number;
}

export default function HealthDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<HealthStats>({
    totalPatients: 0,
    pregnant: 0,
    children: 0,
    lactating: 0,
    senior: 0,
    ncd: 0,
    todayCheckups: 0,
    pendingFollowups: 0,
    male: 0,
    female: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const searchRef = useRef<HTMLDivElement>(null);

  // ✅ Debounce search
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(() => handleSearch(searchQuery), 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchStats();
  }, []);

  // ✅ Click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const extractData = (data: any): any => {
    if (!data) return {};

    console.log("🔍 Extracting stats data:", data);

    // If data has a data property
    if (data?.data) {
      return data.data;
    }

    // If data is wrapped in success
    if (data?.success && data?.data) {
      return data.data;
    }

    // If data itself is the stats
    if (data?.totalPatients !== undefined) {
      return data;
    }

    // Try to find stats in nested structure
    const findStats = (obj: any): any => {
      if (!obj) return null;
      if (obj.totalPatients !== undefined || obj.total_patients !== undefined) {
        return obj;
      }
      if (typeof obj === "object") {
        for (const key of Object.keys(obj)) {
          const result = findStats(obj[key]);
          if (result) return result;
        }
      }
      return null;
    };

    const found = findStats(data);
    if (found) return found;

    return {};
  };

  const fetchStats = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      console.log("📊 Fetching health dashboard stats...");
      const response = await api.get("/web/health/stats");
      console.log("📦 Stats response:", response.data);

      const data = extractData(response.data);
      console.log("✅ Extracted stats:", data);

      setStats({
        totalPatients:
          data.totalPatients || data.total_patients || data.total || 0,
        pregnant: data.pregnant || 0,
        children: data.children || data.child || 0,
        lactating: data.lactating || 0,
        senior: data.senior || 0,
        ncd: data.ncd || 0,
        todayCheckups: data.todayCheckups || data.today_checkups || 0,
        pendingFollowups: data.pendingFollowups || data.pending_followups || 0,
        male: data.male || 0,
        female: data.female || 0,
      });

      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      console.error("❌ Error fetching stats:", error);
      setIsError(true);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.post("/web/health/patients/search", {
        search: query,
      });

      let results = [];
      if (response.data?.data?.results) {
        results = response.data.data.results;
      } else if (response.data?.results) {
        results = response.data.results;
      } else if (Array.isArray(response.data)) {
        results = response.data;
      }

      setSearchResults(results || []);
      setShowSearchResults((results || []).length > 0);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResident = (result: any) => {
    setShowSearchResults(false);
    setSearchQuery("");
    if (result.has_record && result.patient_record_id) {
      navigate(`/barangay-bagocboc/health/records/${result.patient_record_id}`);
    } else {
      navigate("/barangay-bagocboc/health/patients/new", {
        state: { resident: result.resident },
      });
    }
  };

  const handleRefresh = () => {
    toast.loading("Refreshing dashboard...");
    fetchStats();
    setTimeout(() => {
      toast.dismiss();
      toast.success("Dashboard refreshed!");
    }, 500);
  };

  const statCards = [
    {
      id: "total",
      label: "Total Patients",
      value: stats.totalPatients,
      icon: Users,
      color: "blue",
      path: "/barangay-bagocboc/health/records",
    },
    {
      id: "pregnant",
      label: "Pregnant",
      value: stats.pregnant,
      icon: Heart,
      color: "pink",
      path: "/barangay-bagocboc/health/records/pregnant",
    },
    {
      id: "children",
      label: "Children",
      value: stats.children,
      icon: Baby,
      color: "green",
      path: "/barangay-bagocboc/health/records/children",
    },
    {
      id: "lactating",
      label: "Lactating",
      value: stats.lactating,
      icon: Droplet,
      color: "purple",
      path: "/barangay-bagocboc/health/records/lactating",
    },
    {
      id: "senior",
      label: "Senior Citizens",
      value: stats.senior,
      icon: UserIcon,
      color: "amber",
      path: "/barangay-bagocboc/health/records/senior",
    },
    {
      id: "ncd",
      label: "NCD / Chronic",
      value: stats.ncd,
      icon: Activity,
      color: "red",
      path: "/barangay-bagocboc/health/records/other",
    },
  ];

  const quickActions = [
    {
      label: "New Patient Record",
      icon: UserPlus,
      color: "blue",
      path: "/barangay-bagocboc/health/patients/new",
      description: "Register a new patient",
    },
    {
      label: "Search Patients",
      icon: Search,
      color: "green",
      path: "/barangay-bagocboc/health/patients/search",
      description: "Find existing patients",
    },
    {
      label: "Checkup History",
      icon: Stethoscope,
      color: "purple",
      path: "/barangay-bagocboc/health/checkups",
      description: "View all checkup records",
    },
    {
      label: "View All Records",
      icon: FileText,
      color: "gray",
      path: "/barangay-bagocboc/health/records",
      description: "Browse all patient records",
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<
      string,
      { bg: string; light: string; text: string; hover: string }
    > = {
      blue: {
        bg: "bg-blue-500",
        light: "bg-blue-50 dark:bg-blue-900/20",
        text: "text-blue-600 dark:text-blue-400",
        hover: "hover:bg-blue-50 dark:hover:bg-blue-900/20",
      },
      pink: {
        bg: "bg-pink-500",
        light: "bg-pink-50 dark:bg-pink-900/20",
        text: "text-pink-600 dark:text-pink-400",
        hover: "hover:bg-pink-50 dark:hover:bg-pink-900/20",
      },
      green: {
        bg: "bg-green-500",
        light: "bg-green-50 dark:bg-green-900/20",
        text: "text-green-600 dark:text-green-400",
        hover: "hover:bg-green-50 dark:hover:bg-green-900/20",
      },
      purple: {
        bg: "bg-purple-500",
        light: "bg-purple-50 dark:bg-purple-900/20",
        text: "text-purple-600 dark:text-purple-400",
        hover: "hover:bg-purple-50 dark:hover:bg-purple-900/20",
      },
      amber: {
        bg: "bg-amber-500",
        light: "bg-amber-50 dark:bg-amber-900/20",
        text: "text-amber-600 dark:text-amber-400",
        hover: "hover:bg-amber-50 dark:hover:bg-amber-900/20",
      },
      red: {
        bg: "bg-red-500",
        light: "bg-red-50 dark:bg-red-900/20",
        text: "text-red-600 dark:text-red-400",
        hover: "hover:bg-red-50 dark:hover:bg-red-900/20",
      },
      gray: {
        bg: "bg-gray-500",
        light: "bg-gray-50 dark:bg-gray-900/20",
        text: "text-gray-600 dark:text-gray-400",
        hover: "hover:bg-gray-50 dark:hover:bg-gray-900/20",
      },
    };
    return colors[color] || colors.blue;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
          <p className="text-sm text-theme-textSecondary">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-theme-text">
            Failed to Load Dashboard
          </h3>
          <p className="text-sm text-theme-textSecondary mt-2">
            There was an error loading the dashboard data.
          </p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const getDisplayRole = () => {
    const roles = user?.roles?.map((r) => r.name) || [];
    if (roles.includes("Midwife")) return "Midwife";
    if (roles.includes("Nurse Deployment Program")) return "NDP";
    if (roles.includes("Super Admin")) return "Admin";
    return "User";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">
            Health Dashboard
          </h1>
          <p className="text-sm text-theme-textSecondary">
            Welcome back, {user?.resident?.first_name || getDisplayRole()}! Manage
            patient records and health services.
          </p>
          {lastUpdated && (
            <p className="text-xs text-theme-textSecondary mt-1">
              Last updated: {lastUpdated}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
          </button>
          <button
            onClick={() => navigate("/barangay-bagocboc/health/patients/new")}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Patient
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative" ref={searchRef}>
        <div className="flex items-center gap-3 bg-theme-surface border border-theme rounded-xl px-4 py-2 shadow-sm">
          <Search className="w-5 h-5 text-theme-textSecondary" />
          <input
            type="text"
            placeholder="Search residents by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-theme-text placeholder:text-theme-textSecondary"
          />
          {isSearching && (
            <div className="w-5 h-5 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-theme-surface border border-theme rounded-xl shadow-lg overflow-hidden z-50 max-h-96 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.resident.id}
                onClick={() => handleSelectResident(result)}
                className="w-full px-4 py-3 text-left hover:bg-theme-hover transition-colors flex items-center justify-between border-b border-theme last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-theme-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-theme-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-theme-text">
                      {result.resident.first_name} {result.resident.last_name}
                    </p>
                    <p className="text-sm text-theme-textSecondary">
                      {result.resident.phone_number || "No phone"} •{" "}
                      {result.resident.gender} • {result.resident.age || "N/A"}{" "}
                      yrs
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {result.has_record ? (
                    <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                      Has Record
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                      New
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 text-theme-textSecondary" />
                </div>
              </button>
            ))}
          </div>
        )}

        {showSearchResults &&
          searchResults.length === 0 &&
          searchQuery.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-theme-surface border border-theme rounded-xl shadow-lg overflow-hidden z-50 p-6 text-center">
              <p className="text-theme-textSecondary">
                No residents found matching "{searchQuery}"
              </p>
              <button
                onClick={() =>
                  navigate("/barangay-bagocboc/health/patients/new")
                }
                className="mt-2 text-theme-primary hover:underline"
              >
                Register new resident instead
              </button>
            </div>
          )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => {
          const colors = getColorClasses(stat.color);
          return (
            <button
              key={stat.id}
              onClick={() => navigate(stat.path)}
              className={`bg-theme-surface border border-theme rounded-xl p-4 text-left transition-all ${colors.hover}`}
            >
              <div className={`p-2 rounded-lg ${colors.light} w-fit mb-2`}>
                <stat.icon className={`w-5 h-5 ${colors.text}`} />
              </div>
              <p className="text-2xl font-bold text-theme-text">{stat.value}</p>
              <p className="text-sm text-theme-textSecondary">{stat.label}</p>
            </button>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const colors = getColorClasses(action.color);
          return (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="flex items-center gap-4 p-4 bg-theme-surface border border-theme rounded-xl hover:shadow-md transition-all text-left group"
            >
              <div className={`p-3 rounded-lg ${colors.light}`}>
                <action.icon className={`w-6 h-6 ${colors.text}`} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-theme-text">{action.label}</p>
                <p className="text-sm text-theme-textSecondary">
                  {action.description}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-theme-textSecondary group-hover:text-theme-primary transition-colors" />
            </button>
          );
        })}
      </div>

      {/* Today's Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-theme-surface border border-theme rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-theme-text">Today's Checkups</h3>
            <Calendar className="w-5 h-5 text-theme-textSecondary" />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-theme-text">
              {stats.todayCheckups}
            </div>
            <div className="text-sm text-theme-textSecondary">
              {stats.todayCheckups === 0
                ? "No checkups today"
                : `${stats.todayCheckups} checkup${stats.todayCheckups !== 1 ? "s" : ""} recorded`}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
              Pregnant: {stats.pregnant || 0}
            </span>
            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
              Children: {stats.children || 0}
            </span>
            <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
              Lactating: {stats.lactating || 0}
            </span>
            <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
              Senior: {stats.senior || 0}
            </span>
            <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
              NCD: {stats.ncd || 0}
            </span>
          </div>
        </div>

        <div className="bg-theme-surface border border-theme rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-theme-text">
              Pending Follow-ups
            </h3>
            <Clock className="w-5 h-5 text-theme-textSecondary" />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-amber-500">
              {stats.pendingFollowups}
            </div>
            <div className="text-sm text-theme-textSecondary">
              {stats.pendingFollowups === 0
                ? "All caught up! 🎉"
                : `${stats.pendingFollowups} follow-up${stats.pendingFollowups !== 1 ? "s" : ""} need attention`}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-theme-textSecondary">
            <span
              className={`px-2 py-1 rounded-full ${stats.pendingFollowups === 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}
            >
              {stats.pendingFollowups === 0
                ? "✅ Up to date"
                : "⚠️ Needs attention"}
            </span>
          </div>
        </div>
      </div>

      {/* Demographics Summary */}
      <div className="bg-theme-surface border border-theme rounded-xl p-6">
        <h3 className="font-semibold text-theme-text mb-4">
          Demographics Summary
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-theme-background rounded-lg p-4 text-center">
            <p className="text-sm text-theme-textSecondary">Total Patients</p>
            <p className="text-2xl font-bold text-theme-text">
              {stats.totalPatients}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-600 dark:text-blue-400">Male</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {stats.male || 0}
            </p>
          </div>
          <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-4 text-center">
            <p className="text-sm text-pink-600 dark:text-pink-400">Female</p>
            <p className="text-2xl font-bold text-pink-700 dark:text-pink-300">
              {stats.female || 0}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
            <p className="text-sm text-green-600 dark:text-green-400">
              Active Patients
            </p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {stats.totalPatients - (stats.pendingFollowups || 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
