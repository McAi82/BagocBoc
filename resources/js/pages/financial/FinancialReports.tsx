// pages/financial/FinancialReports.tsx

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Eye,
  Download,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Send,
  Loader2,
  RefreshCw,
  Save,
  Edit,
  Trash2,
  AlertCircle,
  Inbox,
  User as UserIcon,
  Calendar as CalendarIcon,
  DollarSign,
  Info,
  BarChart3,
  Tag,
} from "lucide-react";
import { formatDate, formatCurrency, getStatusColor } from "../../utils/format";
import { api } from "../../api/apiClient";
import { useAuthStore } from "../../stores/authStore";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import SendReportModal, {
  SendReportPayload,
} from "../../components/features/SendReportModal";
import ReportDetailModal from "../../components/features/ReportDetailModal";
import { printReport, statusBadge, esc } from "../../utils/printReport";
import toast from "react-hot-toast";
import jsPDF from "jspdf";

export default function FinancialReports() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Send-to-captain state
  const [sendPayload, setSendPayload] = useState<SendReportPayload | null>(
    null,
  );
  const [showSendModal, setShowSendModal] = useState(false);

  // ✅ Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [reportForm, setReportForm] = useState({
    title: "",
    report_type: "collection",
    period: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const userRoles = user?.roles?.map((r) => r.name) || [];
  const isSuperAdmin = userRoles.includes("Super Admin");
  const isCaptain = userRoles.includes("Barangay Captain");
  const isSecretary = userRoles.includes("Barangay Secretary");
  const isTreasurer = userRoles.includes("Barangay Treasurer");

  const canManageReports = isTreasurer || isSecretary || isSuperAdmin;
  const canApproveReports = isCaptain || isSuperAdmin;
  const canPrintDownload = isSecretary || isSuperAdmin || isCaptain;

  const getAvailableReportTypes = () => {
    const baseTypes = [
      { value: "collection", label: "Collection Report" },
      { value: "annual", label: "Annual Summary" },
      { value: "tax", label: "Tax Collection Report" },
      { value: "payment", label: "Payment Summary" },
    ];

    if (isSecretary || isSuperAdmin) {
      baseTypes.push({ value: "certificate", label: "Certificate Report" });
    }

    return baseTypes;
  };

  const availableReportTypes = getAvailableReportTypes();

  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) {
      if (data.length > 0 && data[0]?.title !== undefined) return data;
      return [];
    }
    if (data?.data && Array.isArray(data.data)) {
      if (data.data.length > 0 && data.data[0]?.title !== undefined)
        return data.data;
      return [];
    }
    if (data?.reports && Array.isArray(data.reports)) return data.reports;
    if (data?.data?.data && Array.isArray(data.data.data)) {
      if (data.data.data.length > 0 && data.data.data[0]?.title !== undefined)
        return data.data.data;
      return [];
    }
    const findArray = (obj: any, depth = 0): any[] => {
      if (!obj || depth > 3) return [];
      if (Array.isArray(obj)) {
        if (
          obj.length > 0 &&
          (obj[0]?.title !== undefined ||
            obj[0]?.report_type !== undefined ||
            obj[0]?.period !== undefined)
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
              "config",
              "headers",
              "request",
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
      if (typeFilter !== "all") params.report_type = typeFilter;

      const reportsRes = await api.get("/web/financial-reports", { params });
      const reportsData = extractData(reportsRes.data);
      setReports(reportsData);
    } catch (error) {
      console.error("❌ [FinancialReports] Error fetching reports:", error);
      setIsError(true);
      toast.error("Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [typeFilter]);

  const filteredReports = useMemo(() => {
    if (!Array.isArray(reports) || reports.length === 0) return [];
    let filtered = [...reports];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((r: any) => {
        const title = r.title?.toLowerCase() || "";
        const period = r.period?.toLowerCase() || "";
        const email = r.created_by?.email?.toLowerCase() || "";
        return (
          title.includes(query) ||
          period.includes(query) ||
          email.includes(query)
        );
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((r: any) => r.status === statusFilter);
    }

    return filtered;
  }, [reports, searchQuery, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredReports.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(
    startIndex + itemsPerPage,
    filteredReports.length,
  );

  const paginatedReports = useMemo(() => {
    return filteredReports.slice(startIndex, endIndex);
  }, [filteredReports, startIndex, endIndex]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const stats = {
    total: reports.length,
    pending: reports.filter((r: any) => r.status === "pending").length,
    approved: reports.filter((r: any) => r.status === "approved").length,
    rejected: reports.filter((r: any) => r.status === "rejected").length,
    totalAmount: reports.reduce(
      (sum: number, r: any) => sum + (parseFloat(r.total_amount) || 0),
      0,
    ),
  };

  const resetForm = () => {
    setReportForm({
      title: "",
      report_type: "collection",
      period: "",
      notes: "",
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!reportForm.title?.trim()) errors.title = "Report title is required";
    if (!reportForm.period?.trim()) errors.period = "Period is required";
    if (!reportForm.report_type) errors.report_type = "Report type is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitReport = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors below");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        title: reportForm.title,
        report_type: reportForm.report_type,
        period: reportForm.period,
        notes: reportForm.notes || "",
      };

      if (selectedReport && showEditModal) {
        await api.put(`/web/financial-reports/${selectedReport.id}`, payload);
        toast.success("Report updated successfully!");
        setShowEditModal(false);
      } else {
        await api.post("/web/financial-reports", payload);
        toast.success("Report created successfully!");
        setShowCreateModal(false);
      }
      resetForm();
      setSelectedReport(null);
      fetchData();
    } catch (error: any) {
      console.error("❌ Save error:", error);
      if (error?.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        const newErrors: Record<string, string> = {};
        Object.keys(apiErrors).forEach((key) => {
          newErrors[key] = apiErrors[key][0];
        });
        setFormErrors(newErrors);
        toast.error("Please fix the errors below");
      } else {
        toast.error(error?.response?.data?.message || "Failed to save report");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ============================================================
     ✅ Send to Captain — opens confirmation modal
     ============================================================ */
  const handleSendForApproval = (id: number) => {
    if (!isTreasurer && !isSecretary && !isSuperAdmin) {
      toast.error("Only Treasurer or Secretary can send reports for approval");
      return;
    }

    const report = reports.find((r) => r.id === id);
    if (!report) {
      toast.error("Report not found");
      return;
    }

    const content = [
      `SCD REPORT — ${report.title}`,
      `Type: ${report.report_type}`,
      `Period: ${report.period}`,
      `Amount: ${formatCurrency(parseFloat(report.total_amount) || 0)}`,
      "",
      "Notes:",
      report.notes || "No notes provided.",
      "",
      "This report is submitted for Captain review and approval.",
    ].join("\n");

    setSendPayload({
      report_type: report.report_type,
      title: report.title,
      content,
      period: report.period,
      metadata: {
        report_id: report.id,
        report_type: report.report_type,
        period: report.period,
        total_amount: parseFloat(report.total_amount) || 0,
        status: report.status,
        source: "SCD Reports",
      },
    });
    setShowSendModal(true);
  };

  const handleConfirmSend = async (payload: SendReportPayload) => {
    const reportId = payload.metadata?.report_id;
    if (!reportId) {
      throw new Error("Missing report id");
    }

    await api.post(`/web/financial-reports/${reportId}/submit`, {
      title: payload.title,
      content: payload.content,
      period: payload.period,
    });

    fetchData();
  };

  const handleApprove = async (id: number) => {
    if (!isCaptain && !isSuperAdmin) {
      toast.error("Only Captain or Super Admin can approve reports");
      return;
    }
    try {
      await api.post(`/web/financial-reports/${id}/approve`);
      toast.success("Report approved successfully!");
      fetchData();
    } catch (error) {
      toast.error("Failed to approve report");
    }
  };

  const handleReject = async () => {
    if (!isCaptain && !isSuperAdmin) {
      toast.error("Only Captain or Super Admin can reject reports");
      return;
    }
    if (!selectedReport || !rejectReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    try {
      await api.post(`/web/financial-reports/${selectedReport.id}/reject`, {
        rejection_reason: rejectReason,
      });
      toast.success("Report rejected");
      setShowRejectModal(false);
      setSelectedReport(null);
      setRejectReason("");
      fetchData();
    } catch (error) {
      toast.error("Failed to reject report");
    }
  };

  const handleDelete = async () => {
    if (!isTreasurer && !isSecretary && !isSuperAdmin) {
      toast.error("Only Treasurer or Secretary can delete reports");
      return;
    }
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

  function parseReportBody(
    body: string,
  ): { field: string; value: string }[] {
    const lines = body.split("\n");
    const out: { field: string; value: string }[] = [];

    const isDecoration = (line: string) =>
      /^[═─=_.\s]+$/.test(line.trim()) && line.trim().length > 0;

    const isDotLeader = (line: string) =>
      /\.{2,}/.test(line) && line.includes(" ");

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw.trim();

      if (!line || isDecoration(line)) continue;

      if (
        /^(resident|clearance|certificate|scd|financial|scd report|report)\s+report$/i.test(
          line,
        )
      ) {
        continue;
      }
      if (/^barangay bagocboc, opol/i.test(line)) continue;

      if (isDotLeader(raw)) {
        const match = raw.match(/^(.*?)\s*\.{2,}\s*(.*)$/);
        if (match) {
          const field = match[1].trim();
          const value = match[2].trim();
          if (field) out.push({ field, value });
        }
        continue;
      }

      const colonIndex = raw.indexOf(":");
      if (colonIndex > 0) {
        const field = raw.slice(0, colonIndex).trim();
        const value = raw.slice(colonIndex + 1).trim();
        if (field && field.length < 60) {
          out.push({ field, value: value || "—" });
          continue;
        }
      }

      out.push({ field: "•", value: esc(line) });
    }

    return out;
  }

  /* ============================================================
     ✅ Professional print via shared printReport utility
     ============================================================ */
  const handlePrint = (report: any) => {
    if (!canPrintDownload && !isSuperAdmin) {
      toast.error("You don't have permission to print reports");
      return;
    }

    // ✅ Build rows for the Field/Value table
    const rows: { field: string; value: string }[] = [
      { field: "Report Title", value: esc(report.title) },
      { field: "Report Type", value: esc(report.report_type) },
      { field: "Period", value: esc(report.period) },
      {
        field: "Total Amount",
        value: `₱${(parseFloat(report.total_amount) || 0).toLocaleString(
          "en-PH",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        )}`,
      },
      { field: "Status", value: statusBadge(report.status) },
      {
        field: "Created",
        value: report.created_at
          ? esc(new Date(report.created_at).toLocaleString("en-PH"))
          : "—",
      },
      {
        field: "Submitted",
        value: report.submitted_at
          ? esc(new Date(report.submitted_at).toLocaleString("en-PH"))
          : "Not yet submitted",
      },
      {
        field: "Approved",
        value: report.approved_at
          ? esc(new Date(report.approved_at).toLocaleString("en-PH"))
          : "Not yet approved",
      },
      { field: "Created By", value: esc(getSenderName(report)) },
    ];

    // ✅ If the notes contain the long-form report body, parse it into rows
    if (report.notes && typeof report.notes === "string") {
      const parsed = parseReportBody(report.notes);
      if (parsed.length > 0) {
        rows.push({ field: "Report Content", value: "" }); // section spacer
        parsed.forEach((p) => rows.push(p));
      } else {
        rows.push({ field: "Notes", value: esc(report.notes) });
      }
    }

    if (report.rejection_reason) {
      rows.push({
        field: "Rejection Reason",
        value: esc(report.rejection_reason),
      });
    }

    const ok = printReport({
      title: "SCD Report",
      subtitle: report.title,
      periodLabel: report.period || "—",
      columns: [
        { key: "field", label: "Field", width: "32%" },
        { key: "value", label: "Value" },
      ],
      rows,
      summary: [
        {
          label: "Amount",
          value: `₱${(parseFloat(report.total_amount) || 0).toLocaleString(
            "en-PH",
            { minimumFractionDigits: 2, maximumFractionDigits: 2 },
          )}`,
        },
        { label: "Status", value: report.status },
        { label: "Period", value: report.period },
      ],
      signatories: {
        left: { name: "Concordio A. Esber", title: "Barangay Secretary" },
        right: { name: "Marcos P. Gonzales", title: "Punong Barangay" },
      },
    });

    if (!ok) toast.error("Please allow popups to print the report");
  };

  const handleDownloadPDF = (report: any) => {
    if (!canPrintDownload && !isSuperAdmin) {
      toast.error("You don't have permission to download reports");
      return;
    }
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(18);
      doc.setTextColor(26, 86, 219);
      doc.text("Barangay Bagocboc", pageWidth / 2, 20, { align: "center" });
      doc.setFontSize(14);
      doc.setTextColor(51, 51, 51);
      doc.text("Financial Report", pageWidth / 2, 30, { align: "center" });
      doc.setFontSize(10);
      doc.setTextColor(102, 102, 102);
      doc.text(
        `Generated on: ${new Date().toLocaleString()}`,
        pageWidth / 2,
        38,
        { align: "center" },
      );
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 45, pageWidth - 20, 45);
      doc.setFontSize(12);
      doc.setTextColor(51, 51, 51);
      const details = [
        ["Title", report.title || "N/A"],
        ["Report Type", report.report_type?.toUpperCase() || "N/A"],
        ["Period", report.period || "N/A"],
        ["Status", report.status?.toUpperCase() || "DRAFT"],
        ["Total Amount", formatCurrency(parseFloat(report.total_amount) || 0)],
        ["Submitted By", report.created_by?.email || "N/A"],
      ];
      let y = 55;
      details.forEach(([label, value]) => {
        doc.setFontSize(11);
        doc.setTextColor(102, 102, 102);
        doc.text(label + ":", 20, y);
        doc.setTextColor(51, 51, 51);
        doc.text(String(value || "N/A"), 80, y);
        y += 8;
      });
      doc.setFontSize(9);
      doc.setTextColor(153, 153, 153);
      doc.text("This is a system-generated report.", pageWidth / 2, 280, {
        align: "center",
      });
      doc.text("Barangay Bagocboc Management System", pageWidth / 2, 286, {
        align: "center",
      });
      doc.save(`${report.title.replace(/\s+/g, "_")}.pdf`);
    } catch (error) {
      toast.error("Failed to download PDF");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-theme-textSecondary" />;
    }
  };

  const getSenderName = (report: any) => {
    if (report.created_by?.resident) {
      return `${report.created_by.resident.first_name} ${report.created_by.resident.last_name}`;
    }
    return report.created_by?.email || "Unknown";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading reports...
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
            Failed to Load Reports
          </h3>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (reports.length === 0 && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-theme-text">SCD Reports</h1>
            <p className="text-sm text-theme-textSecondary mt-1">
              Create and manage SCD reports
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
            </button>
            {canManageReports && (
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
              >
                <Plus className="w-4 h-4" /> Create Report
              </button>
            )}
          </div>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <Inbox className="w-16 h-16 text-theme-textSecondary/30" />
            <h3 className="text-lg font-semibold text-theme-text">
              No Reports Found
            </h3>
            <p className="text-sm text-theme-textSecondary max-w-md">
              No financial reports have been created yet.
            </p>
            {canManageReports && (
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="mt-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-2" /> Create Your First
                Report
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">SCD Reports</h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            Create and manage SCD reports
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
          </button>
          {canManageReports && (
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Report
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-sm text-theme-textSecondary">Total Reports</p>
          <p className="text-2xl font-bold text-theme-text">{stats.total}</p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-sm text-theme-textSecondary">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-sm text-theme-textSecondary">Approved</p>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-sm text-theme-textSecondary">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          >
            <option value="all">All Types</option>
            {availableReportTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>

        {filteredReports.length > 0 && (
          <div className="mt-3 pt-3 border-t border-theme flex items-center justify-between text-sm text-theme-textSecondary flex-wrap gap-2">
            <span>
              Showing{" "}
              <span className="font-semibold text-theme-text">
                {startIndex + 1}–{endIndex}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-theme-text">
                {filteredReports.length}
              </span>{" "}
              reports
            </span>
            <span className="text-xs">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
      </div>

      {/* Reports Grid */}
      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-theme-textSecondary/30 mb-3" />
            <p className="text-theme-text font-medium">No Reports Found</p>
            <p className="text-sm text-theme-textSecondary">
              Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
              {paginatedReports.map((report: any) => (
                <div
                  key={report.id || `report-${Math.random()}`}
                  className="bg-theme-surface rounded-xl border border-theme shadow-sm hover:shadow-md transition-shadow p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full ${getStatusColor(
                            report.status || "draft",
                          )}`}
                        >
                          {getStatusIcon(report.status || "draft")}
                          {report.status || "draft"}
                        </span>
                        <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-theme-background text-theme-textSecondary">
                          {report.report_type}
                        </span>
                      </div>
                      <h3 className="font-semibold text-theme-text text-lg">
                        {report.title}
                      </h3>
                      <p className="text-sm text-theme-textSecondary mt-1">
                        Period: {report.period}
                      </p>
                      <p className="text-sm text-theme-textSecondary">
                        Amount:{" "}
                        {formatCurrency(parseFloat(report.total_amount) || 0)}
                      </p>
                      <p className="text-sm text-theme-textSecondary">
                        By: {getSenderName(report)}
                      </p>
                      {report.notes && (
                        <p className="text-sm text-theme-textSecondary mt-2 line-clamp-2">
                          {report.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-4 flex-wrap">
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setShowViewModal(true);
                        }}
                        className="p-1.5 text-theme-textSecondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {report.status === "draft" && canManageReports && (
                        <button
                          onClick={() => {
                            setSelectedReport(report);
                            setReportForm({
                              title: report.title || "",
                              report_type: report.report_type || "collection",
                              period: report.period || "",
                              notes: report.notes || "",
                            });
                            setShowEditModal(true);
                          }}
                          className="p-1.5 text-theme-textSecondary hover:text-theme-text hover:bg-theme-hover rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {report.status === "draft" && canManageReports && (
                        <button
                          onClick={() => {
                            setSelectedReport(report);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 text-theme-textSecondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {report.status === "pending" && canApproveReports && (
                        <>
                          <button
                            onClick={() => handleApprove(report.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReport(report);
                              setShowRejectModal(true);
                            }}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {report.status === "draft" &&
                        (isTreasurer || isSecretary || isSuperAdmin) && (
                          <button
                            onClick={() => handleSendForApproval(report.id)}
                            className="px-3 py-1 bg-theme-primary text-white rounded-lg text-xs font-medium hover:opacity-90 transition-colors"
                          >
                            <Send className="w-3 h-3 inline mr-1" /> Send
                          </button>
                        )}
                      {(report.status === "approved" ||
                        report.status === "rejected") &&
                        (canPrintDownload || isSuperAdmin) && (
                          <>
                            <button
                              onClick={() => handlePrint(report)}
                              className="p-1.5 text-theme-textSecondary hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                              title="Print"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(report)}
                              className="p-1.5 text-theme-textSecondary hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </>
                        )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-xs text-theme-textSecondary">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {report.created_at
                        ? formatDate(report.created_at)
                        : "N/A"}
                    </span>
                    {report.approved_at && (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Approved: {formatDate(report.approved_at)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredReports.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </>
        )}
      </div>

      {/* CREATE MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create Financial Report"
        size="lg"
      >
        <ReportForm
          formData={reportForm}
          setFormData={setReportForm}
          formErrors={formErrors}
          reportTypeOptions={availableReportTypes}
          onSubmit={handleSubmitReport}
          isPending={isSubmitting}
          submitLabel="Create Report"
          onCancel={() => {
            setShowCreateModal(false);
            resetForm();
          }}
        />
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
          setSelectedReport(null);
        }}
        title="Edit Financial Report"
        size="lg"
      >
        <ReportForm
          formData={reportForm}
          setFormData={setReportForm}
          formErrors={formErrors}
          reportTypeOptions={availableReportTypes}
          onSubmit={handleSubmitReport}
          isPending={isSubmitting}
          submitLabel="Update Report"
          onCancel={() => {
            setShowEditModal(false);
            resetForm();
            setSelectedReport(null);
          }}
        />
      </Modal>

      {/* VIEW DETAILS MODAL */}
      <ReportDetailModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedReport(null);
        }}
        title="SCD Report Details"
        badge={
          selectedReport
            ? {
              label: selectedReport.status || "draft",
              className:
                selectedReport.status === "approved"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : selectedReport.status === "pending"
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    : selectedReport.status === "rejected"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
            }
            : undefined
        }
        headerIcon={BarChart3}
        subtitle={
          selectedReport && (
            <div>
              <p className="font-semibold text-theme-text text-base">
                {selectedReport.title}
              </p>
              <p className="text-xs">
                {selectedReport.report_type} • {selectedReport.period}
              </p>
            </div>
          )
        }
        sections={
          selectedReport
            ? [
              {
                title: "Report Information",
                icon: FileText,
                rows: [
                  {
                    label: "Report Title",
                    value: selectedReport.title,
                    icon: FileText,
                    span: 2,
                  },
                  {
                    label: "Report Type",
                    value: selectedReport.report_type || "—",
                    icon: Tag,
                  },
                  {
                    label: "Period",
                    value: selectedReport.period || "—",
                    icon: CalendarIcon,
                  },
                ],
              },
              {
                title: "Amount & Financials",
                icon: DollarSign,
                rows: [
                  {
                    label: "Total Amount",
                    value: formatCurrency(
                      parseFloat(selectedReport.total_amount) || 0,
                    ),
                    icon: DollarSign,
                  },
                ],
              },
              {
                title: "Processing Timeline",
                icon: Clock,
                rows: [
                  {
                    label: "Created",
                    value: selectedReport.created_at
                      ? formatDate(selectedReport.created_at)
                      : "—",
                    icon: CalendarIcon,
                  },
                  {
                    label: "Submitted",
                    value: selectedReport.submitted_at
                      ? formatDate(selectedReport.submitted_at)
                      : "Not yet submitted",
                    icon: Send,
                  },
                  {
                    label: "Approved",
                    value: selectedReport.approved_at
                      ? formatDate(selectedReport.approved_at)
                      : "Not yet approved",
                    icon: CheckCircle,
                  },
                  {
                    label: "Rejected",
                    value: selectedReport.rejection_reason
                      ? formatDate(
                        selectedReport.rejected_at ||
                        selectedReport.updated_at,
                      )
                      : "—",
                    icon: XCircle,
                  },
                ],
              },
              {
                title: "People Involved",
                icon: UserIcon,
                rows: [
                  {
                    label: "Created By",
                    value: getSenderName(selectedReport),
                    icon: UserIcon,
                  },
                  {
                    label: "Reviewed By",
                    value:
                      selectedReport.approved_by?.email ||
                      "Not reviewed yet",
                    icon: UserIcon,
                  },
                ],
              },
              {
                title: "Notes & Remarks",
                icon: Info,
                rows: [
                  {
                    label: "Notes",
                    value: selectedReport.notes || "No notes provided",
                    span: 2,
                    preformatted: true, // ✅ preserves ═══ / ─── formatting
                  },
                  {
                    label: "Rejection Reason",
                    value: selectedReport.rejection_reason || "—",
                    span: 2,
                  },
                ],
              },
            ]
            : []
        }
        footerActions={
          <button
            onClick={() => {
              if (selectedReport) handlePrint(selectedReport);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
        }
      />

      {/* DELETE MODAL */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedReport(null);
        }}
        title="Delete Report"
      >
        <div className="space-y-4">
          <p className="text-theme-textSecondary">
            Are you sure you want to delete this report? This action cannot be
            undone.
          </p>
          {selectedReport && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
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
              onClick={handleDelete}
              disabled={isSubmitting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>

      {/* REJECT MODAL */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedReport(null);
          setRejectReason("");
        }}
        title="Reject Report"
      >
        <div className="space-y-4">
          <p className="text-theme-textSecondary">
            Are you sure you want to reject this report?
          </p>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Reason for Rejection <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
              placeholder="Enter reason for rejection..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowRejectModal(false);
                setSelectedReport(null);
                setRejectReason("");
              }}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      </Modal>

      {/* SEND-TO-CAPTAIN CONFIRMATION MODAL */}
      <SendReportModal
        isOpen={showSendModal}
        onClose={() => {
          setShowSendModal(false);
          setSendPayload(null);
        }}
        payload={sendPayload}
        onSend={handleConfirmSend}
        reportLabel="SCD Report"
      />
    </div>
  );
}

// ============================================
// ReportForm Component
// ============================================

function ReportForm({
  formData,
  setFormData,
  formErrors,
  reportTypeOptions,
  onSubmit,
  isPending,
  submitLabel,
  onCancel,
}: any) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-text mb-1">
          Report Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary ${formErrors.title ? "border-red-500" : "border-theme"
            }`}
          placeholder="e.g., Monthly Collection Report - July 2026"
        />
        {formErrors.title && (
          <p className="text-sm text-red-500 mt-1">{formErrors.title}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-theme-text mb-1">
          Report Type <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.report_type}
          onChange={(e) =>
            setFormData({ ...formData, report_type: e.target.value })
          }
          className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${formErrors.report_type ? "border-red-500" : "border-theme"
            }`}
        >
          {reportTypeOptions.map((option: any) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {formErrors.report_type && (
          <p className="text-sm text-red-500 mt-1">{formErrors.report_type}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-theme-text mb-1">
          Period <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.period}
          onChange={(e) => setFormData({ ...formData, period: e.target.value })}
          className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary ${formErrors.period ? "border-red-500" : "border-theme"
            }`}
          placeholder="e.g., July 2026, Q2 2026, 2025"
        />
        {formErrors.period && (
          <p className="text-sm text-red-500 mt-1">{formErrors.period}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-theme-text mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
          placeholder="Additional notes..."
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
        >
          {isPending ? (
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