// src/pages/bns/BNSDashboard.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Map,
  TrendingUp,
  Users,
  Home,
  PieChart,
  BarChart3,
  ArrowRight,
  ClipboardList,
  Printer,
  MapPin,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { bnsApi } from "../../api/endpoints";
import toast from "react-hot-toast";

interface DashboardStats {
  total_records: number;
  total_households: number;
  total_zones: number;
  total_demographics: number;
  pending_records: number;
  approved_records: number;
}

export default function BNSDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await bnsApi.getDashboardStats();
      setStats(response.data?.data || null);
    } catch (error) {
      console.error("Error fetching BNS stats:", error);
      setIsError(true);
      toast.error("Failed to load dashboard statistics");
    } finally {
      setIsLoading(false);
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

  const modules = [
    {
      id: "reports",
      title: "BHW Collected Records",
      description:
        "View BHW collected records and generate demographic reports",
      icon: ClipboardList,
      color: "blue",
      path: "/barangay-bagocboc/bns/reports",
      stats: stats?.total_records || 0,
      statLabel: "Total Records",
    },
    {
      id: "consolidate",
      title: "Demographic Consolidation",
      description: "Consolidate demographic data by type",
      icon: PieChart,
      color: "purple",
      path: "/barangay-bagocboc/bns/reports",
      stats: stats?.total_demographics || 6,
      statLabel: "Demographic Types",
    },
    {
      id: "gis",
      title: "GIS Zone Statistics",
      description: "Access GIS map and view zone-based statistics",
      icon: Map,
      color: "green",
      path: "/barangay-bagocboc/bns/gis",
      stats: stats?.total_zones || 0,
      statLabel: "Zones",
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">BNS Dashboard</h1>
          <p className="text-sm text-theme-textSecondary">
            Welcome back, {user?.resident?.first_name || "BNS"}! Manage
            demographic reports and zone statistics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
          </button>
          <button
            onClick={() => navigate("/barangay-bagocboc/bns/reports")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:opacity-90 transition-colors"
          >
            <FileText className="w-4 h-4" />
            View Records
          </button>
          <button
            onClick={() => navigate("/barangay-bagocboc/bns/gis")}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:opacity-90 transition-colors"
          >
            <Map className="w-4 h-4" />
            Open Map
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-theme-surface border border-theme rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-theme-text">
                {stats?.total_records || 0}
              </p>
              <p className="text-sm text-theme-textSecondary">Total Records</p>
            </div>
          </div>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">
                {stats?.pending_records || 0}
              </p>
              <p className="text-sm text-theme-textSecondary">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {stats?.approved_records || 0}
              </p>
              <p className="text-sm text-theme-textSecondary">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <PieChart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-theme-text">
                {stats?.total_demographics || 6}
              </p>
              <p className="text-sm text-theme-textSecondary">Demographics</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modules.map((module) => {
          const colors = getColorClasses(module.color);
          const Icon = module.icon;

          return (
            <button
              key={module.id}
              onClick={() => navigate(module.path)}
              className="bg-theme-surface border border-theme rounded-xl p-6 hover:shadow-lg transition-all text-left group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${colors.light}`}>
                    <Icon className={`w-8 h-8 ${colors.text}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-theme-text">
                      {module.title}
                    </h3>
                    <p className="text-sm text-theme-textSecondary">
                      {module.description}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-theme-textSecondary group-hover:text-theme-primary transition-colors" />
              </div>
              <div className="mt-4 pt-4 border-t border-theme flex items-center justify-between">
                <span className="text-sm font-medium text-theme-primary">
                  {module.stats} {module.statLabel}
                </span>
                <span className="text-sm text-theme-textSecondary">View →</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-theme-surface border border-theme rounded-xl p-6">
          <h3 className="font-semibold text-theme-text mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-theme-primary" />
            Quick Consolidation
          </h3>
          <p className="text-sm text-theme-textSecondary mb-4">
            Select a demographic type to consolidate data
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              "household",
              "family",
              "gender",
              "age",
              "pregnant",
              "breastfeeding",
            ].map((type) => (
              <button
                key={type}
                onClick={() =>
                  navigate(`/barangay-bagocboc/bns/reports/consolidate/${type}`)
                }
                className="px-3 py-2 text-xs bg-theme-background border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text capitalize"
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-theme-surface border border-theme rounded-xl p-6">
          <h3 className="font-semibold text-theme-text mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-500" />
            Generate All Reports
          </h3>
          <p className="text-sm text-theme-textSecondary mb-4">
            Generate all demographic reports at once
          </p>
          <button
            onClick={() => {
              navigate("/barangay-bagocboc/bns/reports");
              // Trigger generate all
              setTimeout(() => {
                const generateBtn = document.querySelector(
                  "[data-generate-all]",
                );
                if (generateBtn) (generateBtn as HTMLButtonElement).click();
              }, 500);
            }}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Generate All Reports
          </button>
          <p className="text-xs text-theme-textSecondary mt-2 text-center">
            Creates reports for all 6 demographic types
          </p>
        </div>
      </div>
    </div>
  );
}
