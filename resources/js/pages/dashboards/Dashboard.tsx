// pages/dashboards/Dashboard.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Home,
  FileText,
  CreditCard,
  PhilippinePeso,
  Calendar,
  RefreshCw,
  Building,
  Megaphone,
  MapPin,
  FileCheck,
  Activity,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { api } from "../../api/apiClient";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  formatTimeAgo,
} from "../../utils/format";
import Spinner from "../../components/ui/Spinner";
import toast from "react-hot-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [data, setData] = useState({
    residents: [],
    households: [],
    payments: [],
    clearances: [],
    certifications: [],
    announcements: [],
  });

  const roleNames = user?.roles?.map((r) => r.name) || [];

  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.residents && Array.isArray(data.residents)) return data.residents;
    if (data?.households && Array.isArray(data.households))
      return data.households;
    if (data?.payments && Array.isArray(data.payments)) return data.payments;
    if (data?.clearances && Array.isArray(data.clearances))
      return data.clearances;
    if (data?.certifications && Array.isArray(data.certifications))
      return data.certifications;
    if (data?.announcements && Array.isArray(data.announcements))
      return data.announcements;
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

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [
        residentsRes,
        householdsRes,
        paymentsRes,
        clearancesRes,
        certificationsRes,
        announcementsRes,
      ] = await Promise.all([
        api.get("/web/residents"),
        api.get("/web/households-info"),
        api.get("/web/payments"),
        api.get("/web/clearance"),
        api.get("/web/certifications"),
        api.get("/web/announcements"),
      ]);

      setData({
        residents: extractData(residentsRes.data),
        households: extractData(householdsRes.data),
        payments: extractData(paymentsRes.data).map((p: any) => ({
          ...p,
          amount: parseFloat(p.amount) || 0,
        })),
        clearances: extractData(clearancesRes.data),
        certifications: extractData(certificationsRes.data),
        announcements: extractData(announcementsRes.data),
      });
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      setIsError(true);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const stats = {
    totalResidents: data.residents.length,
    totalHouseholds: data.households.length,
    pendingCertifications: data.certifications.filter(
      (c: any) => c.status === "Pending" || c.status === "In Review",
    ).length,
    pendingClearances: data.clearances.filter(
      (c: any) => c.status === "pending",
    ).length,
    totalRevenue: data.payments.reduce(
      (sum: number, p: any) => sum + (p.amount || 0),
      0,
    ),
    recentTransactions:
      Array.isArray(data.payments) && data.payments.length > 0
        ? data.payments.slice(0, 5)
        : [],
  };

  const recentActivities = [
    ...(Array.isArray(data.announcements)
      ? data.announcements.slice(0, 3).map((a: any) => ({
        action: "New Announcement",
        details: a.title || "Announcement",
        created_at: a.created_at,
      }))
      : []),
    ...(Array.isArray(data.certifications)
      ? data.certifications.slice(0, 2).map((c: any) => ({
        action: `Certificate ${c.status || "Request"}`,
        details: `Certificate for ${c.resident?.first_name || "Resident"}`,
        created_at: c.created_at,
      }))
      : []),
  ]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5);

  const handleRefresh = async () => {
    toast.loading("Refreshing dashboard...");
    await fetchDashboardData();
    toast.dismiss();
    toast.success("Dashboard refreshed!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500 font-medium">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load dashboard data</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ✅ StatCard with theme support (no useTheme needed)
  const StatCard = ({
    title,
    value,
    icon: Icon,
    color = "blue",
    onClick,
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
      <div
        className={`bg-theme-surface rounded-xl border border-theme p-6 shadow-sm hover:shadow-md transition-all ${onClick ? "cursor-pointer" : ""}`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-theme-textSecondary">
              {title}
            </p>
            <p className="text-2xl font-bold text-theme-text mt-1">{value}</p>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">Dashboard</h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            Welcome back,{" "}
            {user?.resident?.first_name || user?.first_name || "User"}!
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-theme-surface border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
        >
          <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Residents"
          value={stats.totalResidents}
          icon={Users}
          color="blue"
          onClick={() => navigate("/barangay-bagocboc/populations/residents")}
        />
        <StatCard
          title="Total Households"
          value={stats.totalHouseholds}
          icon={Home}
          color="green"
          onClick={() => navigate("/barangay-bagocboc/populations/households")}
        />
        <StatCard
          title="Pending Certificates"
          value={stats.pendingCertifications}
          icon={FileText}
          color="yellow"
          onClick={() => navigate("/barangay-bagocboc/certifications")}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={PhilippinePeso}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {roleNames.includes("Barangay Secretary") && (
          <>
            <button
              onClick={() => navigate("/barangay-bagocboc/certifications")}
              className="p-4 bg-theme-surface rounded-xl border border-theme hover:border-theme-primary hover:shadow-md transition-all text-center"
            >
              <FileText className="w-6 h-6 mx-auto text-theme-primary mb-2" />
              <span className="text-xs font-medium text-theme-text">
                New Certificate
              </span>
            </button>
            <button
              onClick={() => navigate("/barangay-bagocboc/clearance")}
              className="p-4 bg-theme-surface rounded-xl border border-theme hover:border-theme-primary hover:shadow-md transition-all text-center"
            >
              <FileCheck className="w-6 h-6 mx-auto text-theme-secondary mb-2" />
              <span className="text-xs font-medium text-theme-text">
                Issue Clearance
              </span>
            </button>
          </>
        )}
        {(roleNames.includes("Barangay Secretary") ||
          roleNames.includes("Barangay Treasurer")) && (
            <button
              onClick={() => navigate("/barangay-bagocboc/payments")}
              className="p-4 bg-theme-surface rounded-xl border border-theme hover:border-theme-primary hover:shadow-md transition-all text-center"
            >
              <CreditCard className="w-6 h-6 mx-auto text-theme-accent mb-2" />
              <span className="text-xs font-medium text-theme-text">
                Record Payment
              </span>
            </button>
          )}
        {(roleNames.includes("Barangay Captain") ||
          roleNames.includes("Barangay Secretary")) && (
            <button
              onClick={() => navigate("/barangay-bagocboc/announcements")}
              className="p-4 bg-theme-surface rounded-xl border border-theme hover:border-theme-primary hover:shadow-md transition-all text-center"
            >
              <Megaphone className="w-6 h-6 mx-auto text-rose-600 dark:text-rose-400 mb-2" />
              <span className="text-xs font-medium text-theme-text">
                Post Announcement
              </span>
            </button>
          )}
        {roleNames.includes("Barangay Captain") && (
          <button
            onClick={() => navigate("/barangay-bagocboc/map")}
            className="p-4 bg-theme-surface rounded-xl border border-theme hover:border-theme-primary hover:shadow-md transition-all text-center"
          >
            <MapPin className="w-6 h-6 mx-auto text-emerald-600 dark:text-emerald-400 mb-2" />
            <span className="text-xs font-medium text-theme-text">
              View Map
            </span>
          </button>
        )}
        {(roleNames.includes("Super Admin") ||
          roleNames.includes("Barangay Captain")) && (
            <button
              onClick={() =>
                navigate("/barangay-bagocboc/settings/barangay-info")
              }
              className="p-4 bg-theme-surface rounded-xl border border-theme hover:border-theme-primary hover:shadow-md transition-all text-center"
            >
              <Building className="w-6 h-6 mx-auto text-theme-textSecondary mb-2" />
              <span className="text-xs font-medium text-theme-text">
                Barangay Info
              </span>
            </button>
          )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-theme flex items-center justify-between">
            <h3 className="font-semibold text-theme-text">
              Recent Transactions
            </h3>
            <button
              onClick={() => navigate("/barangay-bagocboc/payments")}
              className="text-sm text-theme-primary hover:text-theme-secondary font-medium"
            >
              View All
            </button>
          </div>
          <div className="divide-y divide-theme">
            {!stats.recentTransactions ||
              stats.recentTransactions.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <CreditCard className="w-12 h-12 text-theme-textSecondary/30" />
                  <p className="text-theme-text font-medium">No Transactions</p>
                  <p className="text-sm text-theme-textSecondary">
                    No recent transactions found.
                  </p>
                </div>
              </div>
            ) : (
              stats.recentTransactions.map((tx: any) => (
                <div
                  key={tx.id || Math.random()}
                  className="px-6 py-4 flex items-center justify-between hover:bg-theme-hover transition-colors"
                >
                  <div>
                    <p className="font-medium text-theme-text">
                      {tx.resident?.first_name || "Unknown"}{" "}
                      {tx.resident?.last_name || ""}
                    </p>
                    <p className="text-sm text-theme-textSecondary">
                      {tx.payment_type || "N/A"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-theme-text">
                      {formatCurrency(tx.amount || 0)}
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 text-xs rounded-full ${getStatusColor(tx.status || "completed")}`}
                    >
                      {tx.status || "completed"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-theme flex items-center justify-between">
            <h3 className="font-semibold text-theme-text">Recent Activities</h3>
            <span className="text-xs text-theme-textSecondary">Live</span>
          </div>
          <div className="divide-y divide-theme max-h-64 overflow-y-auto">
            {recentActivities.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <Activity className="w-12 h-12 text-theme-textSecondary/30" />
                  <p className="text-theme-text font-medium">
                    No Recent Activity
                  </p>
                  <p className="text-sm text-theme-textSecondary">
                    No activity has been recorded yet.
                  </p>
                </div>
              </div>
            ) : (
              recentActivities.map((activity, index) => (
                <div
                  key={index}
                  className="px-6 py-4 flex items-start gap-3 hover:bg-theme-hover transition-colors"
                >
                  <div className="w-2 h-2 mt-2 rounded-full bg-theme-primary flex-shrink-0" />
                  <div>
                    <p className="font-medium text-theme-text">
                      {activity.action}
                    </p>
                    <p className="text-sm text-theme-textSecondary">
                      {activity.details}
                    </p>
                    <p className="text-xs text-theme-textSecondary mt-1">
                      {activity.created_at
                        ? formatTimeAgo(activity.created_at)
                        : "Just now"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
