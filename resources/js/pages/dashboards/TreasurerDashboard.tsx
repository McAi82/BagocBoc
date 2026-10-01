// pages/dashboards/TreasurerDashboard.tsx

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
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
  ChevronDown,
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

interface TaxRecord {
  id: number;
  receipt_number: string;
  taxpayer_name: string;
  tax_type: string;
  amount: number;
  payment_method: string;
  status: string;
  paid_at?: string;
  created_at: string;
  remarks?: string;
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

type RangePreset = "today" | "week" | "month" | "custom" | "all";

// ============================================
// DATE HELPERS — no Date parsing in filters
// ============================================

/** Normalize a date string/Date to YYYY-MM-DD (local) */
const toLocalDate = (value: string | Date | null | undefined): string => {
  if (!value) return "";
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
};

const todayISO = (): string => toLocalDate(new Date());

const mondayISO = (): string => {
  const d = new Date();
  const day = d.getDay(); // 0 = Sun
  const diffToMonday = (day + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  return toLocalDate(d);
};

const firstOfMonthISO = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
};

const getPresetRange = (
  preset: RangePreset,
): { start: string; end: string } => {
  switch (preset) {
    case "today":
      return { start: todayISO(), end: todayISO() };
    case "week":
      return { start: mondayISO(), end: todayISO() };
    case "month":
      return { start: firstOfMonthISO(), end: todayISO() };
    case "all":
      return { start: "", end: "" };
    case "custom":
    default:
      return { start: firstOfMonthISO(), end: todayISO() };
  }
};

/** Format a YYYY-MM-DD to a short label like "Oct 1, 2026" */
const prettyDate = (iso: string): string => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
};

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
  const [taxes, setTaxes] = useState<TaxRecord[]>([]);
  const [reports, setReports] = useState<FinancialReport[]>([]);

  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditReportModal, setShowEditReportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<FinancialReport | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  // Filters
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("all");
  const [preset, setPreset] = useState<RangePreset>("month");
  const [range, setRange] = useState(getPresetRange("month"));

  // Report form
  const [reportForm, setReportForm] = useState({
    title: "",
    report_type: "collection",
    period: "",
    notes: "",
  });

  // ============================================
  // DATA FETCHING
  // ============================================

  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.data?.data && Array.isArray(data.data.data)) return data.data.data;
    if (data?.payments && Array.isArray(data.payments)) return data.payments;
    if (data?.taxPayments && Array.isArray(data.taxPayments)) return data.taxPayments;
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
          if (["message", "status", "success", "errors", "meta", "links"].includes(key)) continue;
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
      const [paymentsRes, taxesRes, reportsRes] = await Promise.all([
        api.get("/web/payments"),
        api.get("/web/tax-payments"),
        api.get("/web/financial-reports"),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // PRESET HANDLER
  // ============================================

  const handlePreset = (next: RangePreset) => {
    setPreset(next);
    setRange(getPresetRange(next));
  };

  // ============================================
  // FILTERED DATA
  // ============================================

  const isWithinRange = (
    dateStr: string | undefined,
    from: string,
    to: string,
  ) => {
    if (!from && !to) return true;
    if (!dateStr) return false;
    const d = toLocalDate(dateStr);
    if (!d) return false;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const date = p.paid_at || p.created_at;
      if (!isWithinRange(date, range.start, range.end)) return false;
      if (paymentTypeFilter !== "all" && p.payment_type !== paymentTypeFilter)
        return false;
      return true;
    });
  }, [payments, range, paymentTypeFilter]);

  const filteredTaxes = useMemo(() => {
    return taxes.filter((t) => {
      const date = t.paid_at || t.created_at;
      return isWithinRange(date, range.start, range.end);
    });
  }, [taxes, range]);

  // ============================================
  // AVAILABLE PAYMENT TYPES
  // ============================================

  const availablePaymentTypes = useMemo(() => {
    const set = new Set<string>();
    payments.forEach((p) => {
      if (p.payment_type) set.add(p.payment_type);
    });
    return Array.from(set).sort();
  }, [payments]);

  // ============================================
  // STATS
  // ============================================

  const stats = useMemo(() => {
    const totalPaymentsAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalTaxesAmount = filteredTaxes.reduce((sum, t) => sum + t.amount, 0);
    const totalRevenue = totalPaymentsAmount + totalTaxesAmount;

    // Trend: compare to the previous period of equal length
    let trend = 0;
    if (preset !== "all" && range.start && range.end) {
      const startDate = new Date(range.start);
      const endDate = new Date(range.end);
      const dayMs = 24 * 60 * 60 * 1000;
      const periodDays =
        Math.floor((endDate.getTime() - startDate.getTime()) / dayMs) + 1;
      const prevEnd = new Date(startDate.getTime() - dayMs);
      const prevStart = new Date(startDate.getTime() - periodDays * dayMs);
      const prevStartISO = toLocalDate(prevStart);
      const prevEndISO = toLocalDate(prevEnd);

      const prevPaymentsTotal = payments
        .filter((p) =>
          isWithinRange(p.paid_at || p.created_at, prevStartISO, prevEndISO),
        )
        .reduce((sum, p) => sum + p.amount, 0);

      const prevTaxesTotal = taxes
        .filter((t) =>
          isWithinRange(t.paid_at || t.created_at, prevStartISO, prevEndISO),
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const prevTotal = prevPaymentsTotal + prevTaxesTotal;
      if (prevTotal > 0) {
        trend = ((totalRevenue - prevTotal) / prevTotal) * 100;
      }
    }

    return {
      totalRevenue,
      totalPayments: filteredPayments.length,
      totalTaxes: filteredTaxes.length,
      completedPayments: filteredPayments.filter((p) => p.status === "completed").length,
      pendingPayments: filteredPayments.filter((p) => p.status === "pending").length,
      failedPayments: filteredPayments.filter((p) => p.status === "failed").length,
      pendingReports: reports.filter((r) => r.status === "pending").length,
      approvedReports: reports.filter((r) => r.status === "approved").length,
      rejectedReports: reports.filter((r) => r.status === "rejected").length,
      draftReports: reports.filter((r) => r.status === "draft").length,
      trend,
      totalPaymentsAmount,
      totalTaxesAmount,
      totalTransactions: filteredPayments.length + filteredTaxes.length,
    };
  }, [filteredPayments, filteredTaxes, reports, payments, taxes, range, preset]);

  // ============================================
  // BREAKDOWNS
  // ============================================

  const paymentTypeBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredPayments.forEach((p) => {
      const type = p.payment_type || "Other";
      breakdown[type] = (breakdown[type] || 0) + p.amount;
    });
    return Object.entries(breakdown)
      .map(([type, amount]) => ({ type, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredPayments]);

  const paymentMethodBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredPayments.forEach((p) => {
      const method = p.payment_method || "Cash";
      breakdown[method] = (breakdown[method] || 0) + p.amount;
    });
    filteredTaxes.forEach((t) => {
      const method = t.payment_method || "Cash";
      breakdown[method] = (breakdown[method] || 0) + t.amount;
    });
    return Object.entries(breakdown)
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredPayments, filteredTaxes]);

  const dailyRevenue = useMemo(() => {
    const daily: Record<string, number> = {};

    filteredPayments.forEach((p) => {
      const date = toLocalDate(p.paid_at || p.created_at);
      if (date) daily[date] = (daily[date] || 0) + p.amount;
    });

    filteredTaxes.forEach((t) => {
      const date = toLocalDate(t.paid_at || t.created_at);
      if (date) daily[date] = (daily[date] || 0) + t.amount;
    });

    let start: Date;
    let end: Date;
    if (range.start && range.end) {
      start = new Date(range.start);
      end = new Date(range.end);
    } else {
      const keys = Object.keys(daily).sort();
      if (keys.length === 0) return [];
      start = new Date(keys[0]);
      end = new Date(keys[keys.length - 1]);
    }

    const out: { date: string; amount: number }[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = toLocalDate(cursor);
      out.push({
        date: cursor.toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
        amount: daily[key] || 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return out.slice(-31); // Cap to last 31 days
  }, [filteredPayments, filteredTaxes, range]);

  // ============================================
  // IN-PAGE PRINT HELPER
  // ============================================

  const printHTML = (html: string) => {
    const existing = document.getElementById("print-portal");
    if (existing) existing.remove();

    const portal = document.createElement("div");
    portal.id = "print-portal";
    portal.innerHTML = html;
    document.body.appendChild(portal);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        const cleanup = () => {
          const el = document.getElementById("print-portal");
          if (el) el.remove();
          window.removeEventListener("afterprint", cleanup);
        };
        window.addEventListener("afterprint", cleanup);
      });
    });
  };

  const handlePrintReceipt = (payment: PaymentRecord) => {
    const residentName = payment.resident
      ? `${payment.resident.first_name || ""} ${payment.resident.last_name || ""}`.trim()
      : "N/A";

    const paidDate = payment.paid_at || payment.created_at;
    const formattedDate = paidDate
      ? new Date(paidDate).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      : "N/A";
    const formattedTime = paidDate
      ? new Date(paidDate).toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
      })
      : "";

    const html = `
    <style>
      #print-portal * { box-sizing: border-box; margin: 0; padding: 0; }
      #print-portal { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a1a; background: #ffffff; }
      #print-portal .receipt { max-width: 720px; margin: 0 auto; padding: 40px 50px; }
      #print-portal .header { text-align: center; border-bottom: 3px double #1a1a1a; padding-bottom: 18px; margin-bottom: 26px; }
      #print-portal .header .republic { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #555; margin-bottom: 6px; }
      #print-portal .header .barangay { font-size: 26px; font-weight: bold; letter-spacing: 1px; color: #0f172a; margin-bottom: 4px; }
      #print-portal .header .location { font-size: 12px; color: #666; font-style: italic; }
      #print-portal .title { text-align: center; font-size: 20px; font-weight: bold; letter-spacing: 4px; text-transform: uppercase; margin: 22px 0 8px; color: #0f172a; }
      #print-portal .subtitle { text-align: center; font-size: 12px; color: #666; margin-bottom: 26px; letter-spacing: 2px; }
      #print-portal .or-box { background: #f8f9fb; border: 1px solid #d1d5db; border-left: 4px solid #1e3a8a; padding: 14px 20px; margin-bottom: 26px; display: flex; justify-content: space-between; align-items: center; }
      #print-portal .or-box .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #666; font-weight: bold; }
      #print-portal .or-box .value { font-size: 18px; font-weight: bold; font-family: 'Courier New', monospace; color: #1e3a8a; }
      #print-portal .details { width: 100%; border-collapse: collapse; margin-bottom: 26px; }
      #print-portal .details tr td { padding: 11px 0; border-bottom: 1px solid #eee; font-size: 14px; vertical-align: top; }
      #print-portal .details tr:last-child td { border-bottom: none; }
      #print-portal .details .field { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; width: 40%; }
      #print-portal .details .val { color: #0f172a; font-weight: 600; text-align: right; }
      #print-portal .amount-section { background: #f0f4ff; border: 2px solid #1e3a8a; padding: 20px 24px; margin: 26px 0; text-align: center; }
      #print-portal .amount-section .label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #1e3a8a; margin-bottom: 6px; }
      #print-portal .amount-section .amount { font-size: 30px; font-weight: bold; color: #1e3a8a; font-family: 'Georgia', serif; }
      #print-portal .status-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; background: #d1fae5; color: #065f46; }
      #print-portal .signatures { display: flex; justify-content: space-between; margin-top: 50px; gap: 40px; }
      #print-portal .sig-block { flex: 1; text-align: center; }
      #print-portal .sig-block .line { border-top: 1px solid #333; margin-bottom: 6px; height: 40px; }
      #print-portal .sig-block .name { font-size: 13px; font-weight: bold; color: #0f172a; }
      #print-portal .sig-block .role { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
      #print-portal .footer-note { margin-top: 34px; padding-top: 18px; border-top: 1px dashed #ccc; font-size: 10px; color: #888; text-align: center; line-height: 1.6; }
    </style>

    <div class="receipt">
      <div class="header">
        <div class="republic">Republic of the Philippines</div>
        <div class="barangay">BARANGAY BAGOCBOC</div>
        <div class="location">Opol, Misamis Oriental</div>
      </div>

      <div class="title">Official Receipt</div>
      <div class="subtitle">Payment Acknowledgement</div>

      <div class="or-box">
        <div>
          <div class="label">OR Number</div>
          <div class="value">${payment.or_number || "N/A"}</div>
        </div>
        <div style="text-align:right">
          <div class="label">Date Issued</div>
          <div style="font-size:13px;font-weight:600;color:#0f172a;margin-top:4px">
            ${formattedDate}${formattedTime ? ` • ${formattedTime}` : ""}
          </div>
        </div>
      </div>

      <table class="details">
        <tr><td class="field">Received From</td><td class="val">${residentName}</td></tr>
        <tr><td class="field">Payment Type</td><td class="val">${payment.payment_type || "N/A"}</td></tr>
        <tr><td class="field">Payment Method</td><td class="val">${payment.payment_method || "Cash"}</td></tr>
        <tr><td class="field">Status</td><td class="val"><span class="status-badge">${payment.status || "Completed"}</span></td></tr>
        ${payment.description ? `<tr><td class="field">Description</td><td class="val">${payment.description}</td></tr>` : ""}
      </table>

      <div class="amount-section">
        <div class="label">Total Amount Paid</div>
        <div class="amount">₱ ${payment.amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>

      <div class="signatures">
        <div class="sig-block">
          <div class="line"></div>
          <div class="name">Barangay Treasurer</div>
          <div class="role">Authorized Personnel</div>
        </div>
        <div class="sig-block">
          <div class="line"></div>
          <div class="name">${residentName}</div>
          <div class="role">Payor / Received By</div>
        </div>
      </div>

      <div class="footer-note">
        This is a system-generated official receipt from the Barangay Bagocboc Management System.<br/>
        Thank you for your payment. Please keep this receipt for your records.
      </div>
    </div>
  `;

    printHTML(html);
  };

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

  const hasActiveFilters =
    paymentTypeFilter !== "all" || preset !== "month";

  // ============================================
  // LOADING / ERROR
  // ============================================

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-theme-hover rounded-lg animate-pulse" />
            <div className="h-4 w-96 bg-theme-hover rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-theme-hover rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-theme-surface border border-theme rounded-xl p-6">
              <div className="h-4 w-24 bg-theme-hover rounded animate-pulse mb-3" />
              <div className="h-8 w-32 bg-theme-hover rounded animate-pulse mb-2" />
              <div className="h-3 w-20 bg-theme-hover rounded animate-pulse" />
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
      {/* HEADER */}
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
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all font-medium text-sm ${showFilters
                ? "border-theme-primary bg-theme-primary/10 text-theme-primary"
                : "border-theme text-theme-text hover:bg-theme-hover"
              }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-theme-primary" />}
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

      {/* FILTER BAR — with Today / Week / Month / Custom / All */}
      {showFilters && (
        <div className="bg-theme-surface border border-theme rounded-xl p-4 shadow-sm space-y-3">
          {/* Top row: preset buttons + payment type filter */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-theme-textSecondary uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                Period
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "today", label: "Today" },
                  { id: "week", label: "This Week" },
                  { id: "month", label: "This Month" },
                  { id: "custom", label: "Custom Range" },
                  { id: "all", label: "All Time" },
                ].map((p) => {
                  const active = preset === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handlePreset(p.id as RangePreset)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${active
                          ? "bg-theme-primary text-white shadow-sm"
                          : "bg-theme-background text-theme-textSecondary hover:bg-theme-hover border border-theme"
                        }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <select
                  value={paymentTypeFilter}
                  onChange={(e) => setPaymentTypeFilter(e.target.value)}
                  className="px-3 py-1.5 border border-theme rounded-lg bg-theme-surface text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
                >
                  <option value="all">All Payment Types</option>
                  {availablePaymentTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bottom row: custom range inputs */}
          {preset === "custom" && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-theme">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-theme-textSecondary" />
                <label className="text-xs font-medium text-theme-textSecondary">
                  From
                </label>
                <input
                  type="date"
                  value={range.start}
                  max={range.end || undefined}
                  onChange={(e) =>
                    setRange({ ...range, start: e.target.value })
                  }
                  className="px-3 py-1.5 border border-theme rounded-lg bg-theme-surface text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-theme-textSecondary">
                  To
                </label>
                <input
                  type="date"
                  value={range.end}
                  min={range.start || undefined}
                  onChange={(e) =>
                    setRange({ ...range, end: e.target.value })
                  }
                  className="px-3 py-1.5 border border-theme rounded-lg bg-theme-surface text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
                />
              </div>
              {(range.start || range.end) && (
                <button
                  onClick={() => setRange({ start: "", end: "" })}
                  className="flex items-center gap-1 text-xs text-theme-primary hover:text-theme-secondary font-medium"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          )}

          {/* Summary line */}
          <div className="text-xs text-theme-textSecondary pt-1 flex items-center justify-between gap-3 flex-wrap">
            <span>
              {preset === "all" ? (
                <>Showing all records</>
              ) : preset === "today" ? (
                <>
                  Showing today's records (
                  <span className="font-semibold text-theme-text">
                    {prettyDate(range.start)}
                  </span>
                  )
                </>
              ) : preset === "week" ? (
                <>
                  This week ({prettyDate(range.start)} —{" "}
                  {prettyDate(range.end)})
                </>
              ) : preset === "month" ? (
                <>
                  This month ({prettyDate(range.start)} —{" "}
                  {prettyDate(range.end)})
                </>
              ) : range.start && range.end ? (
                <>
                  Custom range ({prettyDate(range.start)} —{" "}
                  {prettyDate(range.end)})
                </>
              ) : (
                <>Select a date range</>
              )}
            </span>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  handlePreset("month");
                  setPaymentTypeFilter("all");
                }}
                className="text-theme-primary hover:text-theme-secondary font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group bg-theme-surface border border-theme rounded-xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full -mr-8 -mt-8" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              {stats.trend !== 0 && (
                <div
                  className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${stats.trend > 0
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
              {stats.totalTransactions} transactions
            </p>
          </div>
        </div>

        <div className="group bg-theme-surface border border-theme rounded-xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
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

        <div className="group bg-theme-surface border border-theme rounded-xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
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

        <div
          className="group bg-theme-surface border border-theme rounded-xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden cursor-pointer"
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
            <p className="text-xs text-theme-textSecondary mt-1">
              {stats.approvedReports} approved · {stats.rejectedReports} rejected
            </p>
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-theme-surface border border-theme rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-theme-text flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-theme-primary" />
                Revenue by Payment Type
              </h3>
              <p className="text-xs text-theme-textSecondary mt-0.5">
                Payments only (taxes shown separately)
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
                    const total = paymentTypeBreakdown.reduce((sum, d) => sum + d.amount, 0);
                    const pct = total > 0 ? Math.round((datum.amount / total) * 100) : 0;
                    return pct > 8 ? `${pct}%` : "";
                  },
                  style: { fontWeight: "bold", fontSize: 11, fill: "#fff" },
                }}
                legend={{
                  color: { title: false, position: "bottom", rowPadding: 8 },
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

        <div className="bg-theme-surface border border-theme rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-theme-text flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-theme-primary" />
                Daily Revenue Trend
              </h3>
              <p className="text-xs text-theme-textSecondary mt-0.5">
                Payments + tax collections in the selected range
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
                columnStyle={{ radiusTopLeft: 4, radiusTopRight: 4 }}
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

      {/* PAYMENT METHODS + RECENT PAYMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-theme-surface border border-theme rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-theme-text mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-theme-primary" />
            Payment Methods
          </h3>
          <div className="space-y-3">
            {paymentMethodBreakdown.length > 0 ? (
              paymentMethodBreakdown.map((item, index) => {
                const total = paymentMethodBreakdown.reduce((sum, m) => sum + m.amount, 0);
                const pct = total > 0 ? (item.amount / total) * 100 : 0;
                const colors = ["bg-emerald-500", "bg-blue-500", "bg-purple-500", "bg-amber-500"];
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
                  <p className="text-theme-text font-medium">No Payments Found</p>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">OR Number</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">Resident</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {filteredPayments.slice(0, 8).map((payment: PaymentRecord) => (
                    <tr key={payment.id} className="hover:bg-theme-hover transition-colors group">
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
                          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(
                            payment.status || "pending",
                          )}`}
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

      {/* RECENT REPORTS */}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">Period</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {reports.slice(0, 5).map((report) => (
                  <tr key={report.id} className="hover:bg-theme-hover transition-colors group">
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
                        className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full font-medium ${report.status === "approved"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : report.status === "pending"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : report.status === "rejected"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                      >
                        {report.status === "approved" && <CheckCircle className="w-3 h-3" />}
                        {report.status === "pending" && <Clock className="w-3 h-3" />}
                        {report.status === "rejected" && <XCircle className="w-3 h-3" />}
                        {report.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-theme-textSecondary">
                        {report.created_at ? formatDate(report.created_at) : "N/A"}
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
                                  report_type: report.report_type || "collection",
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

      {/* MODALS */}
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
              <DetailItem label="OR Number" value={selectedPayment.or_number || "N/A"} mono />
              <DetailItem label="Status" value={selectedPayment.status || "pending"} badge={selectedPayment.status} />
              <DetailItem
                label="Resident"
                value={`${selectedPayment.resident?.first_name || "Unknown"} ${selectedPayment.resident?.last_name || ""}`}
              />
              <DetailItem label="Payment Type" value={selectedPayment.payment_type || "N/A"} />
              <DetailItem label="Payment Method" value={selectedPayment.payment_method || "N/A"} />
              <DetailItem
                label="Date Paid"
                value={selectedPayment.paid_at ? formatDate(selectedPayment.paid_at) : "Not paid yet"}
              />
              <div className="col-span-2">
                <DetailItem label="Description" value={selectedPayment.description || "No description"} />
              </div>
              <div className="col-span-2">
                <DetailItem label="Processed By" value={selectedPayment.processed_by?.email || "N/A"} />
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
              <p className="font-medium text-theme-text">{selectedReport.title}</p>
              <p className="text-sm text-theme-textSecondary">{selectedReport.period}</p>
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
          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(
            badge,
          )}`}
        >
          {badge}
        </span>
      ) : (
        <p className={`text-sm font-medium text-theme-text ${mono ? "font-mono" : ""}`}>
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
          onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
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