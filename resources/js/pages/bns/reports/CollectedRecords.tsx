// src/pages/bns/reports/CollectedRecords.tsx

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Search,
  Filter,
  Users,
  Home,
  Calendar,
  ChevronRight,
  Loader2,
  Printer,
  Download,
  Eye,
  BarChart3,
  PieChart,
  TrendingUp,
  Plus,
  RefreshCw,
  AlertCircle,
  Inbox,
  CheckCircle,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { api } from "../../../api/apiClient";
import { useAuthStore } from "../../../stores/authStore";
import toast from "react-hot-toast";
import jsPDF from "jspdf";

interface Record {
  id: number;
  type: string;
  household_number: string;
  family_name: string;
  count: number;
  submitted_by: string;
  submitted_at: string;
  status: "pending" | "approved" | "rejected";
  details?: any;
}

const DEMOGRAPHIC_TYPES = [
  { value: "household", label: "Household", icon: Home, color: "blue" },
  { value: "family", label: "Family", icon: Users, color: "green" },
  { value: "gender", label: "Gender", icon: Users, color: "purple" },
  { value: "age", label: "Age Group", icon: BarChart3, color: "amber" },
  { value: "pregnant", label: "Pregnant", icon: TrendingUp, color: "pink" },
  {
    value: "breastfeeding",
    label: "Breastfeeding",
    icon: TrendingUp,
    color: "teal",
  },
];

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function CollectedRecords() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDemographic, setSelectedDemographic] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // ✅ Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  // ✅ Extract data helper
  const extractData = (data: any): any => {
    if (!data) return null;
    if (data?.data) return data.data;
    if (data?.success && data?.data) return data.data;
    if (data?.data?.data) return data.data.data;
    if (Array.isArray(data)) return data;
    if (data?.records) return data.records;
    return null;
  };

  // ✅ Client-side pagination (since we fetch all records)
  const totalPages = Math.max(1, Math.ceil(records.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, records.length);
  const paginatedRecords = useMemo(
    () => records.slice(startIndex, endIndex),
    [records, startIndex, endIndex],
  );

  // ✅ Reset to page 1 when search or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  // ✅ Clamp current page if exceeds total
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // ✅ Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        start = 2;
        end = Math.min(4, totalPages - 1);
      } else if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - 3);
        end = totalPages - 1;
      }

      if (start > 2) pages.push("...");

      for (let i = start; i <= end; i++) pages.push(i);

      if (end < totalPages - 1) pages.push("...");

      pages.push(totalPages);
    }

    return pages;
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchStats();
  }, [searchQuery]);

  const fetchStats = async () => {
    try {
      const response = await api.get("/web/bns/dashboard/stats");
      let statsData = response.data?.data || response.data;
      if (statsData?.data) statsData = statsData.data;

      setStats({
        total: statsData?.total_records || statsData?.total || 0,
        pending: statsData?.pending_records || statsData?.pending || 0,
        approved: statsData?.approved_records || statsData?.approved || 0,
        rejected: statsData?.rejected_records || statsData?.rejected || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchRecords = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      // ✅ Fetch all records (client-side pagination)
      const params: any = { per_page: 1000 };
      if (searchQuery) params.search = searchQuery;

      const response = await api.get("/web/bns/records", { params });

      let data = response.data?.data || response.data;
      if (data?.data) data = data.data;

      const recordsData = Array.isArray(data) ? data : data?.records || [];

      setRecords(recordsData);
      setTotalItems(recordsData.length);
    } catch (error) {
      console.error("Error fetching records:", error);
      setIsError(true);
      toast.error("Failed to load records");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemographic = (type: string) => {
    setSelectedDemographic(type);
    if (type) {
      navigate(`/barangay-bagocboc/bns/reports/consolidate/${type}`);
    }
  };

  // ✅ Generate PDF from consolidation data
  const generateConsolidationPDF = (demographicType: string, data: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const label =
      DEMOGRAPHIC_TYPES.find((t) => t.value === demographicType)?.label ||
      demographicType;

    doc.setFontSize(18);
    doc.setTextColor(26, 86, 219);
    doc.text("Barangay Bagocboc", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(51, 51, 51);
    doc.text(`${label} Consolidation Report`, pageWidth / 2, 30, {
      align: "center",
    });

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

    let y = 55;
    doc.setFontSize(12);
    doc.setTextColor(51, 51, 51);

    if (data) {
      doc.setFontSize(14);
      doc.setTextColor(26, 86, 219);
      doc.text("Summary", 20, y);
      y += 10;

      doc.setFontSize(11);
      doc.setTextColor(51, 51, 51);
      doc.text(`Total Records: ${data.total || 0}`, 20, y);
      y += 8;

      if (data.breakdown && data.breakdown.length > 0) {
        y += 5;
        doc.setFontSize(14);
        doc.setTextColor(26, 86, 219);
        doc.text("Breakdown", 20, y);
        y += 10;

        doc.setFontSize(11);
        doc.setTextColor(51, 51, 51);

        data.breakdown.forEach((item: any) => {
          const text = `${item.category}: ${item.count} (${item.percentage.toFixed(1)}%)`;
          doc.text(text, 20, y);
          y += 8;

          if (y > pageHeight - 30) {
            doc.addPage();
            y = 20;
          }
        });
      }
    }

    doc.setFontSize(9);
    doc.setTextColor(153, 153, 153);
    doc.text(
      "This is a system-generated report.",
      pageWidth / 2,
      pageHeight - 15,
      { align: "center" },
    );
    doc.text(
      "Barangay Bagocboc Management System",
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" },
    );

    return doc;
  };

  const handleGenerateSingle = async (demographicType: string) => {
    if (!demographicType) {
      toast.error("Please select a demographic type");
      return;
    }
    if (records.length === 0) {
      toast.error("No records to generate report from");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await api.post("/web/bns/reports/generate", {
        demographic: demographicType,
        generate_all: false,
      });

      if (response.data?.success) {
        const reportData = response.data?.data?.report || response.data?.data;
        const doc = generateConsolidationPDF(demographicType, reportData?.data);
        const filename = `${demographicType}_consolidation_report_${new Date().toISOString().split("T")[0]}.pdf`;
        doc.save(filename);
        toast.success(`${demographicType} report downloaded successfully!`);
      } else {
        toast.error(response.data?.message || "Failed to generate report");
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to generate report",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAll = async () => {
    if (records.length === 0) {
      toast.error("No records to generate reports from");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await api.post("/web/bns/reports/generate", {
        demographic: "all",
        generate_all: true,
      });

      if (response.data?.success) {
        const reports = response.data?.data?.reports || [];
        const total = reports.length || 0;

        if (total === 0) {
          toast.error("No reports generated");
          return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        reports.forEach((report: any, index: number) => {
          if (index > 0) doc.addPage();

          const label =
            DEMOGRAPHIC_TYPES.find((t) => t.value === report.demographic)
              ?.label || report.demographic;

          doc.setFontSize(18);
          doc.setTextColor(26, 86, 219);
          doc.text("Barangay Bagocboc", pageWidth / 2, 20, {
            align: "center",
          });

          doc.setFontSize(14);
          doc.setTextColor(51, 51, 51);
          doc.text(`${label} Consolidation Report`, pageWidth / 2, 30, {
            align: "center",
          });

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

          let y = 55;
          doc.setFontSize(12);
          doc.setTextColor(51, 51, 51);

          if (report.data) {
            doc.setFontSize(14);
            doc.setTextColor(26, 86, 219);
            doc.text("Summary", 20, y);
            y += 10;

            doc.setFontSize(11);
            doc.setTextColor(51, 51, 51);
            doc.text(`Total Records: ${report.data.total || 0}`, 20, y);
            y += 8;

            if (report.data.breakdown && report.data.breakdown.length > 0) {
              y += 5;
              doc.setFontSize(14);
              doc.setTextColor(26, 86, 219);
              doc.text("Breakdown", 20, y);
              y += 10;

              doc.setFontSize(11);
              doc.setTextColor(51, 51, 51);

              report.data.breakdown.forEach((item: any) => {
                const text = `${item.category}: ${item.count} (${item.percentage.toFixed(1)}%)`;
                doc.text(text, 20, y);
                y += 8;

                if (y > pageHeight - 30) {
                  doc.addPage();
                  y = 20;
                }
              });
            }
          }

          doc.setFontSize(9);
          doc.setTextColor(153, 153, 153);
          doc.text(
            `Report ${index + 1} of ${reports.length}`,
            pageWidth / 2,
            pageHeight - 15,
            { align: "center" },
          );
          doc.text(
            "Barangay Bagocboc Management System",
            pageWidth / 2,
            pageHeight - 8,
            { align: "center" },
          );
        });

        const filename = `All_BNS_Reports_${new Date().toISOString().split("T")[0]}.pdf`;
        doc.save(filename);
        toast.success(`All ${total} reports downloaded successfully!`);
      } else {
        toast.error(response.data?.message || "Failed to generate reports");
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to generate reports",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === "approved")
      return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
    if (status === "pending")
      return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
    return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
  };

  const getStatusIcon = (status: string) => {
    if (status === "approved")
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === "pending")
      return <Clock className="w-4 h-4 text-yellow-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
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

  const handleExport = async () => {
    try {
      const response = await api.get("/web/bns/records/export", {
        params: { search: searchQuery },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `bns_records_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export successful");
    } catch (error) {
      console.error("Error exporting records:", error);
      toast.error("Failed to export records");
    }
  };

  const handleRefresh = () => {
    toast.loading("Refreshing records...");
    fetchRecords();
    fetchStats();
    setTimeout(() => {
      toast.dismiss();
      toast.success("Records refreshed!");
    }, 500);
  };

  const handleViewRecord = (id: number) => {
    navigate(`/barangay-bagocboc/bns/reports/records/${id}`);
  };

  if (isLoading && records.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
          <p className="text-sm text-theme-textSecondary">Loading records...</p>
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
            Failed to Load Records
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
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/barangay-bagocboc/bns")}
            className="p-2 rounded-lg hover:bg-theme-hover transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-theme-textSecondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-theme-text">
              BHW Collected Records
            </h1>
            <p className="text-sm text-theme-textSecondary">
              {records.length} record(s) found
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <RefreshCw className="w-4 h-4 text-theme-textSecondary" />
            Refresh
          </button>
          <button
            onClick={handleGenerateAll}
            disabled={isGenerating || records.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" /> Generate All Reports
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-sm text-theme-textSecondary">Total Records</p>
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

      {/* Search + Items per page */}
      <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
            <input
              type="text"
              placeholder="Search records by family name or household..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-theme-surface border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none placeholder:text-theme-textSecondary"
            />
          </div>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          >
            {ITEMS_PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>

        {/* Results info */}
        {records.length > 0 && (
          <div className="mt-3 pt-3 border-t border-theme flex items-center justify-between text-sm text-theme-textSecondary flex-wrap gap-2">
            <span>
              Showing{" "}
              <span className="font-semibold text-theme-text">
                {startIndex + 1}–{endIndex}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-theme-text">
                {records.length}
              </span>{" "}
              records
            </span>
            <span className="text-xs">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
      </div>

      {/* Demographic Selection Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {DEMOGRAPHIC_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedDemographic === type.value;
          return (
            <button
              key={type.value}
              onClick={() => handleSelectDemographic(type.value)}
              className={`p-4 border-2 rounded-xl text-center transition-all ${isSelected
                ? `border-${type.color}-500 bg-${type.color}-50 dark:bg-${type.color}-900/20`
                : "border-theme hover:border-blue-300 dark:hover:border-blue-700"
                }`}
            >
              <Icon
                className={`w-6 h-6 mx-auto mb-2 ${isSelected
                  ? `text-${type.color}-600 dark:text-${type.color}-400`
                  : "text-theme-textSecondary"
                  }`}
              />
              <p
                className={`text-sm font-medium ${isSelected
                  ? `text-${type.color}-600 dark:text-${type.color}-400`
                  : "text-theme-text"
                  }`}
              >
                {type.label}
              </p>
              {isSelected && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateSingle(type.value);
                  }}
                  disabled={isGenerating}
                  className="mt-2 w-full py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                  ) : (
                    <Download className="w-3 h-3 inline mr-1" />
                  )}
                  Download Report
                </button>
              )}
            </button>
          );
        })}
      </div>

      {/* Records Table */}
      {records.length === 0 ? (
        <div className="text-center py-12 bg-theme-surface border border-theme rounded-xl">
          <Inbox className="w-12 h-12 mx-auto text-theme-textSecondary mb-4" />
          <h3 className="text-lg font-semibold text-theme-text">
            No records found
          </h3>
          <p className="text-sm text-theme-textSecondary">
            {searchQuery
              ? "Try adjusting your search terms"
              : "No BHW collected records available."}
          </p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Refresh Records
          </button>
        </div>
      ) : (
        <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-theme-background border-b border-theme">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                    Household / Family
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                    Submitted By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {paginatedRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-theme-hover transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm capitalize text-theme-text">
                        {record.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-theme-text">
                          {record.family_name}
                        </p>
                        <p className="text-xs text-theme-textSecondary">
                          {record.household_number}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-theme-text">
                        {record.count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-theme-text">
                        {record.submitted_by}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-theme-textSecondary">
                        {formatDate(record.submitted_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${getStatusColor(record.status)}`}
                      >
                        {getStatusIcon(record.status)}
                        {record.status.charAt(0).toUpperCase() +
                          record.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleViewRecord(record.id)}
                        className="p-1.5 rounded-lg hover:bg-theme-hover transition-colors text-theme-textSecondary hover:text-theme-primary"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ✅ Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-4 py-4 border-t border-theme flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-theme-textSecondary order-2 sm:order-1">
                Showing{" "}
                <span className="font-semibold text-theme-text">
                  {startIndex + 1}–{endIndex}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-theme-text">
                  {records.length}
                </span>
              </p>

              <div className="flex items-center gap-1 order-1 sm:order-2">
                <button
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-theme hover:bg-theme-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-theme-textSecondary"
                  title="First page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-theme hover:bg-theme-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-theme-textSecondary"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1 mx-1">
                  {getPageNumbers().map((page, index) => {
                    if (page === "...") {
                      return (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-2 text-theme-textSecondary text-sm"
                        >
                          …
                        </span>
                      );
                    }
                    const pageNum = page as number;
                    const isActive = pageNum === currentPage;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${isActive
                          ? "bg-theme-primary text-white shadow-sm"
                          : "border border-theme text-theme-text hover:bg-theme-hover"
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-theme hover:bg-theme-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-theme-textSecondary"
                  title="Next page"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-theme hover:bg-theme-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-theme-textSecondary"
                  title="Last page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-theme">
        <div className="flex items-center gap-2 text-sm text-theme-textSecondary">
          <CheckCircle className="w-4 h-4 text-green-500" />
          {records.length} records available for consolidation
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleGenerateAll}
            disabled={isGenerating || records.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating All...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" /> Generate All Reports
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}