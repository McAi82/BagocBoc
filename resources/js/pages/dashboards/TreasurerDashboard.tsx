// pages/dashboards/TreasurerDashboard.tsx

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Eye,
  DollarSign,
  Calendar,
  CreditCard,
  Receipt,
  Download,
  Printer,
  Search,
  RefreshCw,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  BarChart3,
  PieChart as PieChartIcon,
  AlertCircle,
  Activity,
  Inbox,
  Filter,
  Send,
  Loader2,
  Edit,
  Save,
  X,
  User,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  Smartphone,
  Landmark,
  ChevronDown,
  MoreVertical,
} from "lucide-react";
import { Pie, Column } from "@ant-design/plots";
import { api } from "../../api/apiClient";
import { useThemeStore } from "../../stores/themeStore";
import { useAuthStore } from "../../stores/authStore";
import { formatDate, formatCurrency, getStatusColor } from "../../utils/format";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";

// ============================================
// TYPES
// ============================================

interface PaymentRecord {
  id: number;
  or_number: string;
  amount: number;
  payment_type: string;
  payment_method: string;
  status: string;
  description?: string;
  paid_at?: string;
  created_at: string;
  resident?: {
    first_name: string;
    last_name: string;
  };
  processed_by?: {
    email: string;
  };
}

interface FinancialReport {
  id: number;
  title: string;
  report_type: string;
  period: string;
  total_amount: number;
  status: "draft" | "pending" | "approved" | "rejected";
  notes?: string;
  rejection_reason?: string;
  created_at: string;
  submitted_at?: string;
  approved_at?: string;
  created_by?: {
    email: string;
    resident?: {
      first_name: string;
      last_name: string;
    };
  };
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TreasurerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { mode } = useThemeStore();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(
    null,
  );
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditReportModal, setShowEditReportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<FinancialReport | null>(
    null,
  );
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  // Report form
  const [reportForm, setReportForm] = useState({
    title: "",
    report_type: "collection",
    period: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ============================================
  // DATA FETCHING
  // ============================================

  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.data?.data && Array.isArray(data.data.data))
      return data.data.data;
    if (data?.payments && Array.isArray(data.payments)) return data.payments;
    if (data?.taxPayments && Array.isArray(data.taxPayments))
      return data.taxPayments;
    if (data?.reports && Array.isArray(data.reports)) return data.reports;

    const findArray = (obj: any, depth = 0): any[] => {
      if (!obj || depth > 4) return [];
      if (Array.isArray(obj)) {
        if (
          obj.length > 0 &&
          (obj[0]?.or_number !== undefined ||
            obj[0]?.amount !== undefined ||
            obj[0]?.receipt_number !== undefined ||
            obj[0]?.title !== undefined)
        ) {
          return obj;
        }
        return [];
      }
      if (typeof obj === "object") {
        for (const key of Object.keys(obj)) {
          if (
            [
              "message",
              "status",
              "success",
              "errors",
              "meta",
              "links",
            ].includes(key)
          )
            continue;
          const result = findArray(obj[key], depth + 1);
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
      const params: any = {};
      if (filterMonth) params.month = filterMonth;
      if (filterYear) params.year = filterYear;
      if (dateRange.start) params.date_from = dateRange.start;
      if (dateRange.end) params.date_to = dateRange.end;

      const [paymentsRes, taxesRes, reportsRes] = await Promise.all([
        api.get("/web/payments", { params }),
        api.get("/web/tax-payments", { params }),
        api.get("/web/financial-reports", { params }),
      ]);

      setPayments(
        extractData(paymentsRes.data).map((p: any) => ({
          ...p,
          amount: parseFloat(p.amount) || 0,
        })),
      );
      setTaxes(
        extractData(taxesRes.data).map((t: any) => ({
          ...t,
          amount: parseFloat(t.amount) || 0,
        })),
      );
      setReports(extractData(reportsRes.data));
    } catch (error) {
      console.error("Error fetching treasurer data:", error);
      setIsError(true);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange.start, dateRange.end, filterMonth, filterYear]);

  // ============================================
  // COMPUTED DATA
  // ============================================

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const date = p.paid_at || p.created_at;
      if (dateRange.start && date && date < dateRange.start) return false;
      if (dateRange.end && date && date > dateRange.end) return false;
      if (paymentTypeFilter !== "all" && p.payment_type !== paymentTypeFilter)
        return false;
      return true;
    });
  }, [payments, dateRange, paymentTypeFilter]);

  const filteredTaxes = useMemo(() => {
    return taxes.filter((t) => {
      const date = t.paid_at || t.created_at;
      if (dateRange.start && date && date < dateRange.start) return false;
      if (dateRange.end && date && date > dateRange.end) return false;
      return true;
    });
  }, [taxes, dateRange]);

  const stats = useMemo(() => {
    const totalPayments = filteredPayments.reduce(
      (sum, p) => sum + p.amount,
      0,
    );
    const totalTaxes = filteredTaxes.reduce((sum, t) => sum + t.amount, 0);
    const totalRevenue = totalPayments + totalTaxes;

    // Calculate trend (compare with previous period)
    const halfPeriod = Math.floor(filteredPayments.length / 2);
    const recentTotal = filteredPayments
      .slice(0, halfPeriod)
      .reduce((sum, p) => sum + p.amount, 0);
    const olderTotal = filteredPayments
      .slice(halfPeriod)
      .reduce((sum, p) => sum + p.amount, 0);
    const trend =
      olderTotal > 0 ? ((recentTotal - olderTotal) / olderTotal) * 100 : 0;

    return {
      totalRevenue,
      totalPayments: filteredPayments.length,
      totalTaxes: filteredTaxes.length,
      completedPayments: filteredPayments.filter(
        (p) => p.status === "completed",
      ).length,
      pendingPayments: filteredPayments.filter((p) => p.status === "pending")
        .length,
      pendingReports: reports.filter((r) => r.status === "pending").length,
      approvedReports: reports.filter((r) => r.status === "approved").length,
      rejectedReports: reports.filter((r) => r.status === "rejected").length,
      trend,
      totalPaymentsAmount: totalPayments,
      totalTaxesAmount: totalTaxes,
    };
  }, [filteredPayments, filteredTaxes, reports]);

  const paymentTypeBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredPayments.forEach((p) => {
      const type = p.payment_type || "Other";
      breakdown[type] = (breakdown[type] || 0) + p.amount;
    });
    return Object.entries(breakdown).map(([type, amount]) => ({
      type,
      amount,
    }));
  }, [filteredPayments]);

  const paymentMethodBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredPayments.forEach((p) => {
      const method = p.payment_method || "Cash";
      breakdown[method] = (breakdown[method] || 0) + p.amount;
    });
    return Object.entries(breakdown).map(([method, amount]) => ({
      method,
      amount,
    }));
  }, [filteredPayments]);

  const dailyRevenue = useMemo(() => {
    const daily: Record<string, number> = {};
    filteredPayments.forEach((p) => {
      const date = (p.paid_at || p.created_at)?.split("T")[0];
      if (date) daily[date] = (daily[date] || 0) + p.amount;
    });
    return Object.entries(daily)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14) // Last 14 days
      .map(([date, amount]) => ({
        date: new Date(date).toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
        }),
        amount,
      }));
  }, [filteredPayments]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleRefresh = async () => {
    toast.loading("Refreshing dashboard...");
    await fetchData();
    toast.dismiss();
    toast.success("Dashboard refreshed!");
  };

  const handleSendForApproval = async (id: number) => {
    try {
      await api.post(`/web/financial-reports/${id}/submit`);
      toast.success("Report sent for approval!");
      fetchData();
    } catch (error) {
      toast.error("Failed to send report");
    }
  };

  const handleDeleteReport = async () => {
    if (!selectedReport) return;
    if (selectedReport.status !== "draft") {
      toast.error("Only draft reports can be deleted");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.delete(`/web/financial-reports/${selectedReport.id}`);
      toast.success("Report deleted successfully");
      setShowDeleteModal(false);
      setSelectedReport(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateReport = async () => {
    if (!selectedReport) return;
    if (!reportForm.title?.trim() || !reportForm.period?.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.put(`/web/financial-reports/${selectedReport.id}`, {
        title: reportForm.title,
        report_type: reportForm.report_type,
        period: reportForm.period,
        notes: reportForm.notes || "",
      });
      toast.success("Report updated successfully!");
      setShowEditReportModal(false);
      setSelectedReport(null);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateReport = async () => {
    if (!reportForm.title?.trim() || !reportForm.period?.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/web/financial-reports", {
        title: reportForm.title,
        report_type: reportForm.report_type,
        period: reportForm.period,
        notes: reportForm.notes || "",
      });
      toast.success("Report created successfully!");
      setShowReportModal(false);
      setReportForm({
        title: "",
        report_type: "collection",
        period: "",
        notes: "",
      });
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = (payment: PaymentRecord) => {
    const printWindow = window.open("", "_blank", "width=600,height=800");
    if (!printWindow) {
      toast.error("Please allow popups");
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Receipt - ${payment.or_number}</title>
      <style>
        body{font-family:Arial;padding:40px;max-width:400px;margin:0 auto;color:#333}
        .header{text-align:center;border-bottom:2px solid #333;padding-bottom:20px;margin-bottom:20px}
        .header h1{font-size:24px;margin:0;color:#1a56db}
        .details table{width:100%;border-collapse:collapse}
        .details td{padding:8px 0}
        .details .label{color:#666;font-weight:bold}
        .details .value{text-align:right}
        .amount{font-size:24px;font-weight:bold;color:#1a56db;text-align:center;padding:20px;border-top:2px dashed #ddd;border-bottom:2px dashed #ddd;margin:20px 0}
        .footer{text-align:center;font-size:12px;color:#999;margin-top:30px;padding-top:20px;border-top:1px solid #ddd}
        @media print{.no-print{display:none}body{padding:20px}}
      </style></head><body>
      <div class="header"><h1>Barangay Bagocboc</h1><p>Official Receipt</p><p><strong>${payment.or_number || "N/A"}</strong></p></div>
      <div class="details"><table>
        <tr><td class="label">Date</td><td class="value">${payment.paid_at ? formatDate(payment.paid_at) : formatDate(payment.created_at)}</td></tr>
        <tr><td class="label">Resident</td><td class="value">${payment.resident?.first_name || ""} ${payment.resident?.last_name || "N/A"}</td></tr>
        <tr><td class="label">Payment Type</td><td class="value">${payment.payment_type || "N/A"}</td></tr>
        <tr><td class="label">Payment Method</td><td class="value">${payment.payment_method || "N/A"}</td></tr>
        <tr><td class="label">Status</td><td class="value">${payment.status || "pending"}</td></tr>
      </table></div>
      <div class="amount">${formatCurrency(payment.amount || 0)}</div>
      <div class="footer"><p>Thank you for your payment!</p><p>Barangay Bagocboc Management System</p></div>
      <div style="text-align:center;margin-top:20px;" class="no-print">
        <button onclick="window.print()" style="padding:10px 30px;background:#1a56db;color:white;border:none;border-radius:5px;cursor:pointer;">Print</button>
        <button onclick="window.close()" style="padding:10px 30px;background:#6b7280;color:white;border:none;border-radius:5px;cursor:pointer;margin-left:10px;">Close</button>
      </div>
      <script>setTimeout(() => window.print(), 500)</script></body></html>
    `);
    printWindow.document.close();
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const getMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case "cash":
        return <Banknote className="w-3.5 h-3.5" />;
      case "gcash":
        return <Smartphone className="w-3.5 h-3.5" />;
      default:
        return <CreditCard className="w-3.5 h-3.5" />;
    }
  };

  // ============================================
  // LOADING / ERROR STATES
  // ============================================

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-theme-hover rounded-lg animate-pulse" />
            <div className="h-4 w-96 bg-theme-hover rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-theme-hover rounded-lg animate-pulse" />
        </div>

        {/* KPI Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-theme-surface border border-theme rounded-xl p-6"
            >
              <div className="h-4 w-24 bg-theme-hover rounded animate-pulse mb-3" />
              <div className="h-8 w-32 bg-theme-hover rounded animate-pulse mb-2" />
              <div className="h-3 w-20 bg-theme-hover rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-theme-surface border border-theme rounded-xl p-6"
            >
              <div className="h-5 w-40 bg-theme-hover rounded animate-pulse mb-4" />
              <div className="h-64 bg-theme-hover rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-theme-text mb-2">
            Failed to Load Dashboard
          </h3>
          <p className="text-sm text-theme-textSecondary mb-6">
            There was an error loading your financial data. Please try again.
          </p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-all font-medium shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="space-y-6 pb-8">
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-theme-text tracking-tight">
                Financial Dashboard
              </h1>
              <p className="text-sm text-theme-textSecondary">
                Revenue overview and financial reports
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all font-medium text-sm ${
              showFilters
                ? "border-theme-primary bg-theme-primary/10 text-theme-primary"
                : "border-theme text-theme-text hover:bg-theme-hover"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(filterMonth || paymentTypeFilter !== "all") && (
              <span className="w-2 h-2 rounded-full bg-theme-primary" />
            )}
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-all text-theme-text font-medium text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => {
              setReportForm({
                title: "",
                report_type: "collection",
                period: "",
                notes: "",
              });
              setShowReportModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-all font-medium text-sm shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Create Report
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* FILTER BAR (Collapsible) */}
      {/* ============================================ */}
      {showFilters && (
        <div className="bg-theme-surface border border-theme rounded-xl p-4 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-theme-textSecondary mb-1.5">
                Date From
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-textSecondary mb-1.5">
                Date To
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
                className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-textSecondary mb-1.5">
                Month
              </label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
              >
                <option value="">All Months</option>
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-textSecondary mb-1.5">
                Payment Type
              </label>
              <select
                value={paymentTypeFilter}
                onChange={(e) => setPaymentTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
              >
                <option value="all">All Types</option>
                <option value="Barangay Clearance">Barangay Clearance</option>
                <option value="Certificate of Residency">
                  Certificate of Residency
                </option>
                <option value="Business Clearance">Business Clearance</option>
                <option value="Certificate of Indigency">
                  Certificate of Indigency
                </option>
              </select>
            </div>
          </div>
          {(filterMonth ||
            paymentTypeFilter !== "all" ||
            dateRange.start !==
              new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                .toISOString()
                .split("T")[0]) && (
            <div className="mt-3 pt-3 border-t border-theme flex justify-end">
              <button
                onClick={() => {
                  setFilterMonth("");
                  setPaymentTypeFilter("all");
                  setDateRange({
                    start: new Date(
                      new Date().getFullYear(),
                      new Date().getMonth(),
                      1,
                    )
                      .toISOString()
                      .split("T")[0],
                    end: new Date().toISOString().split("T")[0],
                  });
                }}
                className="text-xs text-theme-primary hover:text-theme-secondary font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* KPI CARDS */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="group bg-theme-surface border border-theme rounded-xl p-5 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full -mr-8 -mt-8" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              {stats.trend !== 0 && (
                <div
                  className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                    stats.trend > 0
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                  }`}
                >
                  {stats.trend > 0 ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {Math.abs(stats.trend).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-xs font-medium text-theme-textSecondary uppercase tracking-wide">
              Total Revenue
            </p>
            <p className="text-2xl font-bold text-theme-text mt-1">
              {formatCurrency(stats.totalRevenue)}
            </p>
            <p className="text-xs text-theme-textSecondary mt-1">
              {stats.totalPayments + stats.totalTaxes} transactions
            </p>
          </div>
        </div>

        {/* Total Payments */}
        <div className="group bg-theme-surface border border-theme rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -mr-8 -mt-8" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-medium text-theme-textSecondary">
                {formatCurrency(stats.totalPaymentsAmount)}
              </span>
            </div>
            <p className="text-xs font-medium text-theme-textSecondary uppercase tracking-wide">
              Payments
            </p>
            <p className="text-2xl font-bold text-theme-text mt-1">
              {stats.totalPayments}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {stats.completedPayments} completed
              </span>
            </div>
          </div>
        </div>

        {/* Tax Payments */}
        <div className="group bg-theme-surface border border-theme rounded-xl p-5 shadow-sm hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full -mr-8 -mt-8" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Receipt className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-xs font-medium text-theme-textSecondary">
                {formatCurrency(stats.totalTaxesAmount)}
              </span>
            </div>
            <p className="text-xs font-medium text-theme-textSecondary uppercase tracking-wide">
              Tax Payments
            </p>
            <p className="text-2xl font-bold text-theme-text mt-1">
              {stats.totalTaxes}
            </p>
            <p className="text-xs text-theme-textSecondary mt-1">
              Cedula, RPT, Business Tax
            </p>
          </div>
        </div>

        {/* Pending Reports */}
        <div
          className="group bg-theme-surface border border-theme rounded-xl p-5 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all relative overflow-hidden cursor-pointer"
          onClick={() => navigate("/barangay-bagocboc/financial-reports")}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full -mr-8 -mt-8" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-theme-textSecondary group-hover:text-theme-primary transition-colors" />
            </div>
            <p className="text-xs font-medium text-theme-textSecondary uppercase tracking-wide">
              Pending Reports
            </p>
            <p className="text-2xl font-bold text-theme-text mt-1">
              {stats.pendingReports}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-theme-textSecondary">
                {stats.approvedReports} approved · {stats.rejectedReports}{" "}
                rejected
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* CHARTS SECTION */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Payment Type */}
        <div className="bg-theme-surface border border-theme rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-theme-text flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-theme-primary" />
                Revenue by Payment Type
              </h3>
              <p className="text-xs text-theme-textSecondary mt-0.5">
                Breakdown of collections by category
              </p>
            </div>
          </div>
          <div className="h-[280px]">
            {paymentTypeBreakdown.length > 0 ? (
              <Pie
                data={paymentTypeBreakdown}
                angleField="amount"
                colorField="type"
                radius={0.85}
                innerRadius={0.55}
                label={{
                  text: (datum: any) => {
                    const total = paymentTypeBreakdown.reduce(
                      (sum, d) => sum + d.amount,
                      0,
                    );
                    const pct =
                      total > 0 ? Math.round((datum.amount / total) * 100) : 0;
                    return pct > 8 ? `${pct}%` : "";
                  },
                  style: {
                    fontWeight: "bold",
                    fontSize: 11,
                    fill: "#fff",
                  },
                }}
                legend={{
                  color: {
                    title: false,
                    position: "bottom",
                    rowPadding: 8,
                  },
                }}
                tooltip={{
                  items: [
                    {
                      channel: "y",
                      valueFormatter: (v: number) => formatCurrency(v),
                    },
                  ],
                }}
                theme={mode === "dark" ? "dark" : "light"}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-theme-textSecondary">
                <div className="text-center">
                  <PieChartIcon className="w-12 h-12 mx-auto text-theme-textSecondary/30 mb-2" />
                  <p className="text-sm font-medium">No payment data</p>
                  <p className="text-xs">Try adjusting your filters</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Daily Revenue */}
        <div className="bg-theme-surface border border-theme rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-theme-text flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-theme-primary" />
                Daily Revenue Trend
              </h3>
              <p className="text-xs text-theme-textSecondary mt-0.5">
                Last 14 days of collections
              </p>
            </div>
          </div>
          <div className="h-[280px]">
            {dailyRevenue.length > 0 ? (
              <Column
                data={dailyRevenue}
                xField="date"
                yField="amount"
                label={{
                  text: (datum: any) =>
                    datum.amount > 0 ? formatCurrency(datum.amount) : "",
                  style: { fontSize: 9, fill: "#64748b" },
                }}
                xAxis={{
                  label: {
                    autoRotate: true,
                    style: { fontSize: 10, fill: "#64748b" },
                  },
                }}
                yAxis={{
                  label: {
                    formatter: (v: any) => {
                      if (v >= 1000) return `₱${(v / 1000).toFixed(0)}k`;
                      return `₱${v}`;
                    },
                    style: { fontSize: 10, fill: "#64748b" },
                  },
                }}
                color="#10b981"
                columnStyle={{
                  radiusTopLeft: 4,
                  radiusTopRight: 4,
                }}
                tooltip={{
                  items: [
                    {
                      channel: "y",
                      valueFormatter: (v: number) => formatCurrency(v),
                    },
                  ],
                }}
                theme={mode === "dark" ? "dark" : "light"}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-theme-textSecondary">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto text-theme-textSecondary/30 mb-2" />
                  <p className="text-sm font-medium">No daily data</p>
                  <p className="text-xs">Try adjusting your filters</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* PAYMENT METHODS + RECENT PAYMENTS */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Methods */}
        <div className="bg-theme-surface border border-theme rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-theme-text mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-theme-primary" />
            Payment Methods
          </h3>
          <div className="space-y-3">
            {paymentMethodBreakdown.length > 0 ? (
              paymentMethodBreakdown.map((item, index) => {
                const total = paymentMethodBreakdown.reduce(
                  (sum, m) => sum + m.amount,
                  0,
                );
                const pct = total > 0 ? (item.amount / total) * 100 : 0;
                const colors = [
                  "bg-emerald-500",
                  "bg-blue-500",
                  "bg-purple-500",
                  "bg-amber-500",
                ];
                return (
                  <div key={index} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-theme-text font-medium">
                        {getMethodIcon(item.method)}
                        {item.method}
                      </span>
                      <span className="text-theme-textSecondary font-medium">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-theme-background rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[index % colors.length]} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-theme-textSecondary text-right">
                      {pct.toFixed(1)}%
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-theme-textSecondary">
                <CreditCard className="w-8 h-8 mx-auto text-theme-textSecondary/30 mb-2" />
                <p className="text-sm">No payment data</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="lg:col-span-2 bg-theme-surface border border-theme rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-theme flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-theme-text flex items-center gap-2">
                <Activity className="w-4 h-4 text-theme-primary" />
                Recent Payments
              </h3>
              <p className="text-xs text-theme-textSecondary mt-0.5">
                Latest transactions in the selected period
              </p>
            </div>
            <button
              onClick={() => navigate("/barangay-bagocboc/payments")}
              className="text-xs text-theme-primary hover:text-theme-secondary font-medium flex items-center gap-1"
            >
              View All <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-theme-background flex items-center justify-center">
                  <Inbox className="w-7 h-7 text-theme-textSecondary/50" />
                </div>
                <div>
                  <p className="text-theme-text font-medium">
                    No Payments Found
                  </p>
                  <p className="text-sm text-theme-textSecondary">
                    No payments match your current filters
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-theme-background border-b border-theme">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                      OR Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                      Resident
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {filteredPayments
                    .slice(0, 8)
                    .map((payment: PaymentRecord) => (
                      <tr
                        key={payment.id}
                        className="hover:bg-theme-hover transition-colors group"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-theme-text">
                          {payment.or_number || "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-theme-primary/10 flex items-center justify-center flex-shrink-0">
                              <User className="w-3.5 h-3.5 text-theme-primary" />
                            </div>
                            <span className="text-sm text-theme-text truncate max-w-[140px]">
                              {payment.resident?.first_name || "Unknown"}{" "}
                              {payment.resident?.last_name || ""}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-theme-textSecondary truncate block max-w-[140px]">
                            {payment.payment_type || "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-bold text-theme-text">
                            {formatCurrency(payment.amount || 0)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-theme-background rounded-full text-xs font-medium text-theme-textSecondary">
                            {getMethodIcon(payment.payment_method)}
                            {payment.payment_method || "Cash"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(payment.status || "pending")}`}
                          >
                            {payment.status === "completed" ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {payment.status || "pending"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-theme-textSecondary">
                            {payment.paid_at
                              ? formatDate(payment.paid_at)
                              : payment.created_at
                                ? formatDate(payment.created_at)
                                : "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handlePrintReceipt(payment)}
                              className="p-1.5 text-theme-textSecondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                              title="Print Receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPayment(payment);
                                setShowPaymentModal(true);
                              }}
                              className="p-1.5 text-theme-textSecondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* RECENT REPORTS */}
      {/* ============================================ */}
      <div className="bg-theme-surface border border-theme rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-theme flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-theme-text flex items-center gap-2">
              <FileText className="w-4 h-4 text-theme-primary" />
              Recent Financial Reports
            </h3>
            <p className="text-xs text-theme-textSecondary mt-0.5">
              Your submitted reports and their status
            </p>
          </div>
          <button
            onClick={() => navigate("/barangay-bagocboc/financial-reports")}
            className="text-xs text-theme-primary hover:text-theme-secondary font-medium flex items-center gap-1"
          >
            View All <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-theme-background flex items-center justify-center">
                <FileText className="w-7 h-7 text-theme-textSecondary/50" />
              </div>
              <div>
                <p className="text-theme-text font-medium">No Reports Yet</p>
                <p className="text-sm text-theme-textSecondary mb-4">
                  Create your first financial report to get started
                </p>
                <button
                  onClick={() => {
                    setReportForm({
                      title: "",
                      report_type: "collection",
                      period: "",
                      notes: "",
                    });
                    setShowReportModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-all text-sm font-medium"
                >
                  <FileText className="w-4 h-4" />
                  Create Report
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-theme-background border-b border-theme">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {reports.slice(0, 5).map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-theme-hover transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-theme-text truncate max-w-[200px]">
                        {report.title}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-theme-textSecondary capitalize">
                        {report.report_type?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-theme-textSecondary">
                        {report.period}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-bold text-theme-text">
                        {formatCurrency(report.total_amount || 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full font-medium ${
                          report.status === "approved"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : report.status === "pending"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : report.status === "rejected"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {report.status === "approved" && (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        {report.status === "pending" && (
                          <Clock className="w-3 h-3" />
                        )}
                        {report.status === "rejected" && (
                          <XCircle className="w-3 h-3" />
                        )}
                        {report.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-theme-textSecondary">
                        {report.created_at
                          ? formatDate(report.created_at)
                          : "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {report.status === "draft" && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedReport(report);
                                setReportForm({
                                  title: report.title || "",
                                  report_type:
                                    report.report_type || "collection",
                                  period: report.period || "",
                                  notes: report.notes || "",
                                });
                                setShowEditReportModal(true);
                              }}
                              className="p-1.5 text-theme-textSecondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSendForApproval(report.id)}
                              className="px-2.5 py-1 bg-theme-primary text-white rounded-md text-xs font-medium hover:opacity-90 transition-all flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" />
                              Send
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* MODALS */}
      {/* ============================================ */}

      {/* Payment Details Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedPayment(null);
        }}
        title="Payment Details"
        size="lg"
      >
        {selectedPayment && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 bg-theme-background rounded-xl">
              <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-theme-textSecondary">Amount Paid</p>
                <p className="text-2xl font-bold text-theme-text">
                  {formatCurrency(selectedPayment.amount || 0)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DetailItem
                label="OR Number"
                value={selectedPayment.or_number || "N/A"}
                mono
              />
              <DetailItem
                label="Status"
                value={selectedPayment.status || "pending"}
                badge={selectedPayment.status}
              />
              <DetailItem
                label="Resident"
                value={`${selectedPayment.resident?.first_name || "Unknown"} ${selectedPayment.resident?.last_name || ""}`}
              />
              <DetailItem
                label="Payment Type"
                value={selectedPayment.payment_type || "N/A"}
              />
              <DetailItem
                label="Payment Method"
                value={selectedPayment.payment_method || "N/A"}
              />
              <DetailItem
                label="Date Paid"
                value={
                  selectedPayment.paid_at
                    ? formatDate(selectedPayment.paid_at)
                    : "Not paid yet"
                }
              />
              <div className="col-span-2">
                <DetailItem
                  label="Description"
                  value={selectedPayment.description || "No description"}
                />
              </div>
              <div className="col-span-2">
                <DetailItem
                  label="Processed By"
                  value={selectedPayment.processed_by?.email || "N/A"}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-theme">
              <button
                onClick={() => handlePrintReceipt(selectedPayment)}
                className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-all text-sm font-medium"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPayment(null);
                }}
                className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Report Modal */}
      <Modal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setReportForm({
            title: "",
            report_type: "collection",
            period: "",
            notes: "",
          });
        }}
        title="Create Financial Report"
        size="lg"
      >
        <ReportForm
          formData={reportForm}
          setFormData={setReportForm}
          onSubmit={handleCreateReport}
          onCancel={() => {
            setShowReportModal(false);
            setReportForm({
              title: "",
              report_type: "collection",
              period: "",
              notes: "",
            });
          }}
          isSubmitting={isSubmitting}
          submitLabel="Create Report"
        />
      </Modal>

      {/* Edit Report Modal */}
      <Modal
        isOpen={showEditReportModal}
        onClose={() => {
          setShowEditReportModal(false);
          setSelectedReport(null);
        }}
        title="Edit Financial Report"
        size="lg"
      >
        <ReportForm
          formData={reportForm}
          setFormData={setReportForm}
          onSubmit={handleUpdateReport}
          onCancel={() => {
            setShowEditReportModal(false);
            setSelectedReport(null);
          }}
          isSubmitting={isSubmitting}
          submitLabel="Save Changes"
        />
      </Modal>

      {/* Delete Report Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedReport(null);
        }}
        title="Delete Report"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900 dark:text-red-300">
                Are you sure you want to delete this report?
              </p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                This action cannot be undone.
              </p>
            </div>
          </div>
          {selectedReport && (
            <div className="p-4 bg-theme-background rounded-lg">
              <p className="font-medium text-theme-text">
                {selectedReport.title}
              </p>
              <p className="text-sm text-theme-textSecondary">
                {selectedReport.period}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedReport(null);
              }}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteReport}
              disabled={isSubmitting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function DetailItem({
  label,
  value,
  mono,
  badge,
}: {
  label: string;
  value: string;
  mono?: boolean;
  badge?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-theme-textSecondary uppercase tracking-wide mb-1">
        {label}
      </p>
      {badge ? (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(badge)}`}
        >
          {badge}
        </span>
      ) : (
        <p
          className={`text-sm font-medium text-theme-text ${mono ? "font-mono" : ""}`}
        >
          {value}
        </p>
      )}
    </div>
  );
}

function ReportForm({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
}: any) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-text mb-1.5">
          Report Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-all"
          placeholder="e.g., Monthly Collection Report - July 2026"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-text mb-1.5">
          Report Type <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.report_type}
          onChange={(e) =>
            setFormData({ ...formData, report_type: e.target.value })
          }
          className="w-full px-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-all"
        >
          <option value="collection">Collection Report</option>
          <option value="annual">Annual Summary</option>
          <option value="certificate">Certificate Report</option>
          <option value="tax">Tax Collection Report</option>
          <option value="payment">Payment Summary</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-text mb-1.5">
          Period <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.period}
          onChange={(e) => setFormData({ ...formData, period: e.target.value })}
          className="w-full px-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-all"
          placeholder="e.g., July 2026, Q2 2026, 2025"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-text mb-1.5">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full px-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-all resize-none"
          placeholder="Additional notes..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-theme">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text font-medium"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 font-medium"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> {submitLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
