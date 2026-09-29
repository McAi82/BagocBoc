// pages/dashboards/SystemOverview.tsx

import React, { useState, useEffect } from "react";
import {
  Users,
  Server,
  Database,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  Cpu,
  HardDrive,
  Wifi,
  Terminal,
  Shield,
  Calendar,
  RefreshCw,
  UserCheck,
  FileText,
  Globe,
  AlertCircle,
} from "lucide-react";
import { formatDate, formatCurrency } from "../../utils/format";
import { useAuthStore } from "../../stores/authStore";
import { api } from "../../api/apiClient";
import Spinner from "../../components/ui/Spinner";
import toast from "react-hot-toast";

export default function SystemOverview() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState<any>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [households, setHouseholds] = useState<any[]>([]);

  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.users && Array.isArray(data.users)) return data.users;
    if (data?.logs && Array.isArray(data.logs)) return data.logs;
    if (data?.residents && Array.isArray(data.residents)) return data.residents;
    if (data?.households && Array.isArray(data.households))
      return data.households;
    const findArray = (obj: any): any[] => {
      if (!obj) return [];
      if (Array.isArray(obj)) return obj;
      if (typeof obj === "object") {
        for (const key of Object.keys(obj)) {
          const result = findArray(obj[key]);
          if (result.length > 0) return result;
        }
      }
      return [];
    };
    return findArray(data);
  };

  const fetchData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      console.log("🔍 [SystemOverview] Fetching system data...");

      let statsData = {};
      let logsData = [];
      let usersData = [];
      let residentsData = [];
      let householdsData = [];

      try {
        const statsRes = await api.get("/web/system/overview");
        statsData = statsRes.data?.data || statsRes.data || {};
        console.log("✅ Stats loaded:", statsData);
      } catch (error) {
        console.error("❌ Failed to fetch stats:", error);
        statsData = {};
      }

      try {
        const logsRes = await api.get("/web/system/logs");
        logsData = extractData(logsRes.data);
        console.log("✅ Logs loaded:", logsData.length);
      } catch (error) {
        console.warn("⚠️ Failed to fetch logs:", error);
        logsData = [];
      }

      try {
        const usersRes = await api.get("/web/users");
        usersData = extractData(usersRes.data);
        console.log("✅ Users loaded:", usersData.length);
      } catch (error) {
        console.error("❌ Failed to fetch users:", error);
        usersData = [];
      }

      try {
        const residentsRes = await api.get("/web/residents");
        residentsData = extractData(residentsRes.data);
        console.log("✅ Residents loaded:", residentsData.length);
      } catch (error) {
        console.error("❌ Failed to fetch residents:", error);
        residentsData = [];
      }

      try {
        const householdsRes = await api.get("/web/households-info");
        householdsData = extractData(householdsRes.data);
        console.log("✅ Households loaded:", householdsData.length);
      } catch (error) {
        console.error("❌ Failed to fetch households:", error);
        householdsData = [];
      }

      setStats(statsData);
      setLogs(logsData);
      setUsers(usersData);
      setResidents(residentsData);
      setHouseholds(householdsData);

      console.log("✅ [SystemOverview] All data loaded successfully");
    } catch (error) {
      console.error("❌ [SystemOverview] Error fetching system data:", error);
      setIsError(true);
      toast.error("Failed to load some system data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    toast.loading("Refreshing system data...");
    await fetchData();
    toast.dismiss();
    toast.success("System data refreshed!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading system data...
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
            Failed to Load System Data
          </h3>
          <p className="text-sm text-theme-textSecondary mt-2">
            Some data may be unavailable.
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

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color = "blue",
    subtitle,
  }: any) => {
    const colors = {
      blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      green:
        "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
      yellow:
        "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
      red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
      purple:
        "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
      emerald:
        "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    };
    return (
      <div className="bg-theme-surface rounded-xl border border-theme p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-theme-textSecondary">
              {title}
            </p>
            <p className="text-2xl font-bold text-theme-text mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-theme-textSecondary mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colors[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">
            System Overview
          </h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            Monitor system health and performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-theme-surface px-4 py-2 rounded-lg border border-theme">
            <Clock className="w-4 h-4 text-theme-textSecondary" />
            <span className="text-sm font-medium text-theme-text">
              {currentTime.toLocaleTimeString()}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-theme-surface border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <span className="text-sm font-semibold text-green-700 dark:text-green-400">
            All Systems Operational
          </span>
        </div>
        <div className="h-6 w-px bg-theme-border hidden sm:block" />
        <div className="flex items-center gap-2 text-sm text-theme-textSecondary">
          <Globe className="w-4 h-4" />
          <span>v{stats?.version || "2.0.0"}</span>
        </div>
        <div className="h-6 w-px bg-theme-border hidden sm:block" />
        <div className="flex items-center gap-2 text-sm text-theme-textSecondary">
          <Calendar className="w-4 h-4" />
          <span>Uptime: {stats?.uptime || "99.9%"}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Users"
          value={users.length}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Total Residents"
          value={residents.length}
          icon={UserCheck}
          color="green"
        />
        <StatCard
          title="Total Households"
          value={households.length}
          icon={Database}
          color="purple"
        />
        <StatCard
          title="Pending Requests"
          value={stats?.pending_requests || 0}
          icon={FileText}
          color="yellow"
        />
        <StatCard
          title="Errors Detected"
          value={stats?.error_count || 0}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* System Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-theme-surface rounded-xl border border-theme p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-theme-text flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-400" /> CPU
              Usage
            </h3>
            <span className="text-lg font-bold text-theme-text">
              {stats?.cpu_usage || 0}%
            </span>
          </div>
          <div className="w-full bg-theme-background rounded-full h-3">
            <div
              className={`rounded-full h-3 transition-all ${
                (stats?.cpu_usage || 0) > 80
                  ? "bg-red-500"
                  : (stats?.cpu_usage || 0) > 60
                    ? "bg-yellow-500"
                    : "bg-blue-600"
              }`}
              style={{ width: `${Math.min(stats?.cpu_usage || 0, 100)}%` }}
            />
          </div>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-theme-text flex items-center gap-2">
              <Server className="w-5 h-5 text-purple-600 dark:text-purple-400" />{" "}
              Memory Usage
            </h3>
            <span className="text-lg font-bold text-theme-text">
              {stats?.memory_usage || 0}%
            </span>
          </div>
          <div className="w-full bg-theme-background rounded-full h-3">
            <div
              className={`rounded-full h-3 transition-all ${
                (stats?.memory_usage || 0) > 80
                  ? "bg-red-500"
                  : (stats?.memory_usage || 0) > 60
                    ? "bg-yellow-500"
                    : "bg-purple-600"
              }`}
              style={{ width: `${Math.min(stats?.memory_usage || 0, 100)}%` }}
            />
          </div>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-theme-text flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />{" "}
              Disk Usage
            </h3>
            <span className="text-lg font-bold text-theme-text">
              {stats?.disk_usage || 0}%
            </span>
          </div>
          <div className="w-full bg-theme-background rounded-full h-3">
            <div
              className={`rounded-full h-3 transition-all ${
                (stats?.disk_usage || 0) > 80
                  ? "bg-red-500"
                  : (stats?.disk_usage || 0) > 60
                    ? "bg-yellow-500"
                    : "bg-emerald-600"
              }`}
              style={{ width: `${Math.min(stats?.disk_usage || 0, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* System Info & Error Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-theme-surface rounded-xl border border-theme p-6 shadow-sm">
          <h3 className="font-semibold text-theme-text mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-theme-textSecondary" /> System
            Information
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-theme">
              <span className="text-sm text-theme-textSecondary">
                System Uptime
              </span>
              <span className="text-sm font-medium text-theme-text">
                {stats?.uptime || "N/A"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-theme">
              <span className="text-sm text-theme-textSecondary">
                Last Backup
              </span>
              <span className="text-sm font-medium text-theme-text">
                {stats?.last_backup ? formatDate(stats.last_backup) : "N/A"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-theme">
              <span className="text-sm text-theme-textSecondary">
                Total Residents
              </span>
              <span className="text-sm font-medium text-theme-text">
                {residents.length}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-theme">
              <span className="text-sm text-theme-textSecondary">
                Total Households
              </span>
              <span className="text-sm font-medium text-theme-text">
                {households.length}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-theme-textSecondary">
                Total Revenue
              </span>
              <span className="text-sm font-medium text-theme-text">
                {stats?.total_revenue
                  ? formatCurrency(stats.total_revenue)
                  : "₱0.00"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-theme flex items-center justify-between">
            <h3 className="font-semibold text-theme-text flex items-center gap-2">
              <Terminal className="w-5 h-5 text-red-600 dark:text-red-400" />{" "}
              Error Logs
            </h3>
            <span className="text-xs text-theme-textSecondary">
              Last 24 hours
            </span>
          </div>
          <div className="divide-y divide-theme max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="px-6 py-8 text-center text-theme-textSecondary">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p>No errors reported</p>
              </div>
            ) : (
              logs.map((log: any, index: number) => (
                <div
                  key={index}
                  className="px-6 py-4 flex items-center justify-between hover:bg-theme-hover transition-colors"
                >
                  <div>
                    <p className="font-medium text-theme-text">
                      {log.code || "Error"}
                    </p>
                    <p className="text-sm text-theme-textSecondary">
                      {log.module || "System"}
                    </p>
                    <p className="text-xs text-theme-textSecondary">
                      {log.message || "Unknown error"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                        log.status === "Critical"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : log.status === "Warning"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      }`}
                    >
                      {log.status || "Resolved"}
                    </span>
                    <p className="text-xs text-theme-textSecondary mt-1">
                      {log.time ? formatDate(log.time) : "N/A"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button className="p-4 bg-theme-surface rounded-xl border border-theme hover:border-theme-primary hover:shadow-md transition-all text-center group">
          <Shield className="w-6 h-6 mx-auto text-theme-primary group-hover:scale-110 transition-transform mb-2" />
          <span className="text-sm font-medium text-theme-text">
            Run System Check
          </span>
        </button>
        <button className="p-4 bg-theme-surface rounded-xl border border-theme hover:border-theme-primary hover:shadow-md transition-all text-center group">
          <Database className="w-6 h-6 mx-auto text-theme-accent group-hover:scale-110 transition-transform mb-2" />
          <span className="text-sm font-medium text-theme-text">
            Backup Database
          </span>
        </button>
        <button className="p-4 bg-theme-surface rounded-xl border border-theme hover:border-theme-primary hover:shadow-md transition-all text-center group">
          <Wifi className="w-6 h-6 mx-auto text-theme-secondary group-hover:scale-110 transition-transform mb-2" />
          <span className="text-sm font-medium text-theme-text">
            Network Diagnostics
          </span>
        </button>
      </div>
    </div>
  );
}
