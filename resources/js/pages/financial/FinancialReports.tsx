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
} from "lucide-react";
import { formatDate, formatCurrency, getStatusColor } from "../../utils/format";
import { api } from "../../api/apiClient";
import { useAuthStore } from "../../stores/authStore";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import toast from "react-hot-toast";
import jsPDF from "jspdf";

const REPORT_TYPE_OPTIONS = [
  { value: "collection", label: "Collection Report" },
  { value: "annual", label: "Annual Summary" },
  { value: "certificate", label: "Certificate Report" },
  { value: "tax", label: "Tax Collection Report" },
  { value: "payment", label: "Payment Summary" },
];

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

  // ✅ Pagination state
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

  // ✅ Filtered reports
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

  // ✅ Pagination calculations
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

  // ✅ Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter, itemsPerPage]);

  // ✅ Clamp current page
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

  const handleSendForApproval = async (id: number) => {
    if (!isTreasurer && !isSecretary && !isSuperAdmin) {
      toast.error("Only Treasurer or Secretary can send reports for approval");
      return;
    }
    try {
      await api.post(`/web/financial-reports/${id}/submit`);
      toast.success("Report sent for approval!");
      fetchData();
    } catch (error) {
      toast.error("Failed to send report");
    }
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

  const handlePrint = (report: any) => {
    if (!canPrintDownload && !isSuperAdmin) {
      toast.error("You don't have permission to print reports");
      return;
    }
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      toast.error("Please allow popups");
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Financial Report - ${report.title}</title>
      <style>body{font-family:Arial;padding:40px;max-width:800px;margin:0 auto;color:#333}.header{text-align:center;border-bottom:2px solid #333;padding-bottom:20px;margin-bottom:20px}.header h1{font-size:24px;margin:0;color:#1a56db}.details{margin:20px 0}.details table{width:100%;border-collapse:collapse}.details td{padding:8px 0;border-bottom:1px solid #eee}.details .label{color:#666;font-weight:bold}.footer{text-align:center;font-size:12px;color:#999;margin-top:30px;padding-top:20px;border-top:1px solid #ddd}
      @media print{.no-print{display:none}body{padding:20px}}</style>
      </head><body>
      <div class="header"><h1>Barangay Bagocboc</h1><p>Financial Report</p><p><strong>${report.title}</strong></p></div>
      <div class="details"><table>
        <tr><td class="label">Report Type</td><td>${report.report_type?.toUpperCase() || "N/A"}</td></tr>
        <tr><td class="label">Period</td><td>${report.period || "N/A"}</td></tr>
        <tr><td class="label">Status</td><td>${report.status?.toUpperCase() || "DRAFT"}</td></tr>
        <tr><td class="label">Total Amount</td><td>${formatCurrency(parseFloat(report.total_amount) || 0)}</td></tr>
        <tr><td class="label">Submitted By</td><td>${report.created_by?.email || "N/A"}</td></tr>
        <tr><td class="label">Notes</td><td>${report.notes || "No notes"}</td></tr>
      </table></div>
      <div class="footer"><p>This is a system-generated report.</p><p>Barangay Bagocboc Management System</p></div>
      <div style="text-align:center;margin-top:20px;" class="no-print"><button onclick="window.print()" style="padding:10px 30px;background:#1a56db;color:white;border:none;border-radius:5px;cursor:pointer;">Print</button><button onclick="window.close()" style="padding:10px 30px;background:#6b7280;color:white;border:none;border-radius:5px;cursor:pointer;margin-left:10px;">Close</button></div>
      <script>setTimeout(() => window.print(), 500)</script></body></html>
    `);
    printWindow.document.close();
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
        ["Notes", report.notes || "No notes"],
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

  // ✅ Empty state (no reports at all)
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

      {/* Filters + Items per page */}
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

        {/* Results info */}
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
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full ${getStatusColor(report.status || "draft")}`}
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

            {/* ✅ Pagination */}
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

      {/* Create Modal */}
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

      {/* Edit Modal */}
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

      {/* View Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedReport(null);
        }}
        title="Report Details"
        size="lg"
      >
        {selectedReport && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Title
                </p>
                <p className="font-medium text-theme-text">
                  {selectedReport.title}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Status
                </p>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(selectedReport.status)}`}
                >
                  {selectedReport.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Report Type
                </p>
                <p className="font-medium text-theme-text">
                  {selectedReport.report_type}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Period
                </p>
                <p className="font-medium text-theme-text">
                  {selectedReport.period}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Total Amount
                </p>
                <p className="font-medium text-theme-text">
                  {formatCurrency(parseFloat(selectedReport.total_amount) || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Created By
                </p>
                <p className="font-medium text-theme-text">
                  {getSenderName(selectedReport)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-theme-textSecondary font-medium">
                  Notes
                </p>
                <p className="font-medium text-theme-text">
                  {selectedReport.notes || "No notes"}
                </p>
              </div>
              {selectedReport.approved_at && (
                <div>
                  <p className="text-xs text-theme-textSecondary font-medium">
                    Approved At
                  </p>
                  <p className="font-medium text-theme-text">
                    {formatDate(selectedReport.approved_at)}
                  </p>
                </div>
              )}
              {selectedReport.rejection_reason && (
                <div className="col-span-2">
                  <p className="text-xs text-theme-textSecondary font-medium">
                    Rejection Reason
                  </p>
                  <p className="font-medium text-red-600">
                    {selectedReport.rejection_reason}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              {(selectedReport.status === "approved" ||
                selectedReport.status === "rejected") &&
                (canPrintDownload || isSuperAdmin) && (
                  <>
                    <button
                      onClick={() => handlePrint(selectedReport)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Printer className="w-4 h-4" /> Print
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(selectedReport)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Download className="w-4 h-4" /> Download PDF
                    </button>
                  </>
                )}
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedReport(null);
                }}
                className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
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

      {/* Reject Modal */}
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
          className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary ${
            formErrors.title ? "border-red-500" : "border-theme"
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
          className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${
            formErrors.report_type ? "border-red-500" : "border-theme"
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
          className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary ${
            formErrors.period ? "border-red-500" : "border-theme"
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