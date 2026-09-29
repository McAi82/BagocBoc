// pages/captain/CaptainDashboard.tsx

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Bell,
  Search,
  User,
  Calendar,
  ChevronRight,
  Eye,
  RefreshCw,
  AlertCircle,
  Loader2,
  Inbox,
} from "lucide-react";
import { api } from "../../api/apiClient";
import { useAuthStore } from "../../stores/authStore";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import toast from "react-hot-toast";

interface PendingReport {
  id: number;
  title: string;
  content: string;
  report_type: string;
  sub_report_type: string | null;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  metadata: any;
  source_table: string;
  source_id: number;
  submitted_by: {
    id: number;
    email: string;
    resident: {
      first_name: string;
      last_name: string;
    } | null;
    roles: { name: string }[];
  };
}

interface DashboardStats {
  total_reports: number;
  pending_reports: number;
  approved_reports: number;
  rejected_reports: number;
  pending_financial: number;
  pending_certificates: number;
  pending_clearances: number;
  total_residents: number;
  total_households: number;
  zones: number;
}

export default function CaptainDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<PendingReport | null>(
    null,
  );
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalReports, setTotalReports] = useState(0);

  // ✅ Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, itemsPerPage]);

  const extractData = (data: any): any => {
    if (!data) return null;
    if (data?.data) return data.data;
    if (data?.data?.data) return data.data.data;
    return data;
  };

  const fetchDashboard = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const reportsRes = await api.get("/web/captain/reports", {
        params: {
          status: "pending",
          page: currentPage,
          per_page: itemsPerPage,
        },
      });
      const statsRes = await api.get("/web/captain/reports/stats");

      const [residentsRes, householdsRes, zonesRes] = await Promise.all([
        api.get("/web/residents"),
        api.get("/web/households-info"),
        api.get("/web/barangay-zones"),
      ]);

      const reportsData = extractData(reportsRes.data);
      const statsData = extractData(statsRes.data);

      setPendingReports(reportsData?.data || reportsData || []);
      setTotalReports(
        reportsData?.total ||
          reportsData?.data?.length ||
          reportsData?.length ||
          0,
      );

      setStats({
        total_reports: statsData?.total || 0,
        pending_reports: statsData?.pending || 0,
        approved_reports: statsData?.approved || 0,
        rejected_reports: statsData?.rejected || 0,
        pending_financial:
          statsData?.by_type?.find((t: any) => t.report_type === "financial")
            ?.total || 0,
        pending_certificates:
          statsData?.by_type?.find((t: any) => t.report_type === "certificate")
            ?.total || 0,
        pending_clearances:
          statsData?.by_type?.find((t: any) => t.report_type === "clearance")
            ?.total || 0,
        total_residents: extractData(residentsRes.data)?.length || 0,
        total_households: extractData(householdsRes.data)?.length || 0,
        zones: extractData(zonesRes.data)?.length || 0,
      });
    } catch (error) {
      console.error("❌ Error fetching dashboard:", error);
      setIsError(true);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [currentPage, itemsPerPage, typeFilter]);

  const handleApprove = async (id: number) => {
    setIsSubmitting(true);
    try {
      await api.post(`/web/captain/reports/${id}/approve`);
      toast.success("Report approved successfully!");
      fetchDashboard();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to approve report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReport || !rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post(`/web/captain/reports/${selectedReport.id}/reject`, {
        rejection_reason: rejectReason,
      });
      toast.success("Report rejected successfully");
      setShowRejectModal(false);
      setSelectedReport(null);
      setRejectReason("");
      fetchDashboard();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to reject report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendNotification = async () => {
    try {
      navigate("/barangay-bagocboc/announcements");
      toast.info("Navigate to Announcements to send notifications");
    } catch (error) {
      toast.error("Failed to open notifications");
    }
  };

  const formatDate = (date: string) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSubmitterName = (report: PendingReport) => {
    if (report.submitted_by?.resident) {
      return `${report.submitted_by.resident.first_name} ${report.submitted_by.resident.last_name}`;
    }
    return report.submitted_by?.email || "Unknown";
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      financial: "Financial Report",
      certificate: "Certificate Report",
      clearance: "Clearance Report",
      field: "Field Report",
      zone: "Zone Report",
      demographic: "Demographic Report",
      health: "Health Report",
      compliance: "Compliance Report",
      resident_registry: "Resident Registry",
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      approved:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[status] || colors.pending;
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

  const filteredReports = useMemo(() => {
    let filtered = [...pendingReports];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => {
        const title = r.title?.toLowerCase() || "";
        const submitter = getSubmitterName(r).toLowerCase();
        return title.includes(query) || submitter.includes(query);
      });
    }
    if (typeFilter !== "all" && typeFilter) {
      filtered = filtered.filter((r) => r.report_type === typeFilter);
    }
    return filtered;
  }, [pendingReports, searchQuery, typeFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalReports / itemsPerPage),
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
          <p className="text-sm text-theme-textSecondary">
            Loading Captain Dashboard...
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
            onClick={fetchDashboard}
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
          <h1 className="text-2xl font-bold text-theme-text">
            Captain Dashboard
          </h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            Welcome back, {user?.resident?.first_name || "Captain"}! Review
            reports and manage barangay operations.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
          </button>
          <button
            onClick={() => navigate("/barangay-bagocboc/map")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <MapPin className="w-4 h-4" /> View Map
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-sm text-theme-textSecondary">Total Reports</p>
          <p className="text-2xl font-bold text-theme-text">
            {stats?.total_reports || 0}
          </p>
        </div>
        <div
          className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm cursor-pointer hover:shadow-md transition-all"
          onClick={() => setTypeFilter("all")}
        >
          <p className="text-sm text-theme-textSecondary">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">
            {stats?.pending_reports || 0}
          </p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-sm text-theme-textSecondary">Approved</p>
          <p className="text-2xl font-bold text-green-600">
            {stats?.approved_reports || 0}
          </p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-sm text-theme-textSecondary">Rejected</p>
          <p className="text-2xl font-bold text-red-600">
            {stats?.rejected_reports || 0}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-theme-surface rounded-xl border border-theme p-3 text-center">
          <p className="text-xs text-theme-textSecondary">Residents</p>
          <p className="text-xl font-bold text-theme-text">
            {stats?.total_residents || 0}
          </p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-3 text-center">
          <p className="text-xs text-theme-textSecondary">Households</p>
          <p className="text-xl font-bold text-theme-text">
            {stats?.total_households || 0}
          </p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-3 text-center">
          <p className="text-xs text-theme-textSecondary">Zones</p>
          <p className="text-xl font-bold text-theme-text">
            {stats?.zones || 0}
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-3 text-center">
          <p className="text-xs text-blue-600 dark:text-blue-400">Financial</p>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
            {stats?.pending_financial || 0}
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-3 text-center">
          <p className="text-xs text-purple-600 dark:text-purple-400">
            Certificates
          </p>
          <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
            {stats?.pending_certificates || 0}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-3 text-center">
          <p className="text-xs text-green-600 dark:text-green-400">
            Clearances
          </p>
          <p className="text-xl font-bold text-green-700 dark:text-green-300">
            {stats?.pending_clearances || 0}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => navigate("/barangay-bagocboc/financial-reports")}
          className="flex items-center gap-4 p-4 bg-theme-surface border border-theme rounded-xl hover:shadow-md transition-all text-left group"
        >
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/30">
            <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-theme-text">Financial Reports</p>
            <p className="text-sm text-theme-textSecondary">
              {stats?.pending_financial || 0} pending approval
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-theme-textSecondary group-hover:text-theme-primary transition-colors" />
        </button>

        <button
          onClick={() => navigate("/barangay-bagocboc/map")}
          className="flex items-center gap-4 p-4 bg-theme-surface border border-theme rounded-xl hover:shadow-md transition-all text-left group"
        >
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30">
            <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-theme-text">GIS Map</p>
            <p className="text-sm text-theme-textSecondary">
              View zone statistics
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-theme-textSecondary group-hover:text-theme-primary transition-colors" />
        </button>

        <button
          onClick={handleSendNotification}
          className="flex items-center gap-4 p-4 bg-theme-surface border border-theme rounded-xl hover:shadow-md transition-all text-left group"
        >
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/30">
            <Bell className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-theme-text">Send Notification</p>
            <p className="text-sm text-theme-textSecondary">
              Announce to barangay
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-theme-textSecondary group-hover:text-theme-primary transition-colors" />
        </button>
      </div>

      {/* Pending Reports List */}
      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-theme flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-theme-text">Pending Reports</h3>
            <p className="text-sm text-theme-textSecondary">
              {filteredReports.length} report
              {filteredReports.length !== 1 ? "s" : ""} awaiting review
            </p>
          </div>
          <div className="flex gap-3 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
            >
              <option value="all">All Types</option>
              <option value="financial">Financial</option>
              <option value="certificate">Certificate</option>
              <option value="clearance">Clearance</option>
              <option value="field">Field</option>
              <option value="zone">Zone</option>
              <option value="demographic">Demographic</option>
              <option value="health">Health</option>
              <option value="compliance">Compliance</option>
              <option value="resident_registry">Resident Registry</option>
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
        </div>

        {filteredReports.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Inbox className="w-12 h-12 mx-auto text-theme-textSecondary/30" />
            <p className="text-theme-text font-medium mt-2">
              No Pending Reports
            </p>
            <p className="text-sm text-theme-textSecondary">
              All reports have been reviewed. Great job!
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-theme">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="px-6 py-4 hover:bg-theme-hover transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full ${getStatusColor(report.status)}`}
                        >
                          {getStatusIcon(report.status)}
                          {report.status}
                        </span>
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-theme-background text-theme-textSecondary">
                          {getTypeLabel(report.report_type)}
                        </span>
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-theme-background text-theme-textSecondary">
                          {report.submitted_by?.resident?.first_name ||
                            "Unknown"}{" "}
                          {report.submitted_by?.resident?.last_name || ""}
                        </span>
                      </div>
                      <h4 className="font-medium text-theme-text mt-1 truncate">
                        {report.title}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-theme-textSecondary mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(report.submitted_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {getSubmitterName(report)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setShowViewModal(true);
                        }}
                        className="p-1.5 text-theme-textSecondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleApprove(report.id)}
                        disabled={isSubmitting}
                        className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setRejectReason("");
                          setShowRejectModal(true);
                        }}
                        disabled={isSubmitting}
                        className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                  {report.content && (
                    <p className="mt-2 text-sm text-theme-textSecondary line-clamp-2">
                      {report.content}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* ✅ Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalReports}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              showItemsPerPage={false}
            />
          </>
        )}
      </div>

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
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full ${getStatusColor(selectedReport.status)}`}
              >
                {getStatusIcon(selectedReport.status)}
                {selectedReport.status}
              </span>
              <span className="inline-block px-2 py-1 text-xs rounded-full bg-theme-background text-theme-textSecondary">
                {getTypeLabel(selectedReport.report_type)}
              </span>
              <span className="inline-block px-2 py-1 text-xs rounded-full bg-theme-background text-theme-textSecondary">
                {selectedReport.source_table}
              </span>
            </div>

            <h3 className="text-xl font-bold text-theme-text">
              {selectedReport.title}
            </h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-theme-textSecondary">Submitted By</p>
                <p className="font-medium text-theme-text">
                  {getSubmitterName(selectedReport)}
                </p>
              </div>
              <div>
                <p className="text-theme-textSecondary">Submitted At</p>
                <p className="font-medium text-theme-text">
                  {formatDate(selectedReport.submitted_at)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-theme-textSecondary text-sm">Content</p>
              <div className="mt-1 p-4 bg-theme-background rounded-lg whitespace-pre-wrap text-theme-text">
                {selectedReport.content}
              </div>
            </div>

            {selectedReport.metadata && (
              <div>
                <p className="text-theme-textSecondary text-sm">
                  Additional Data
                </p>
                <div className="mt-1 p-4 bg-theme-background rounded-lg">
                  <pre className="text-sm text-theme-text whitespace-pre-wrap">
                    {JSON.stringify(selectedReport.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-theme">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedReport(null);
                }}
                className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
              >
                Close
              </button>
              <button
                onClick={() => handleApprove(selectedReport.id)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedReport(selectedReport);
                  setRejectReason("");
                  setShowRejectModal(true);
                }}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        )}
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
          {selectedReport && (
            <div className="p-4 bg-theme-background rounded-lg">
              <p className="font-medium text-theme-text">
                {selectedReport.title}
              </p>
              <p className="text-sm text-theme-textSecondary">
                Submitted by: {getSubmitterName(selectedReport)}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Reason for Rejection <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
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
              disabled={isSubmitting || !rejectReason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Rejecting..." : "Reject"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}