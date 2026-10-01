// pages/secretary/ClearanceLog.tsx

import React, { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "../../stores/authStore";
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Send,
  User,
  Loader2,
  AlertCircle,
  Inbox,
  FileText,
  Printer,
  User as UserIcon,
  Hash,
  Calendar as CalendarIcon,
  Target,
  DollarSign,
  Tag,
  Info,
  CheckCircle as CheckIcon,
  UserCheck,
  Clock as ClockIcon,
} from "lucide-react";
import ReportDetailModal from "../../components/features/ReportDetailModal";
import { printReport, statusBadge, esc } from "../../utils/printReport";
import { api } from "../../api/apiClient";
import { formatDate, formatCurrency, getStatusColor } from "../../utils/format";
import Spinner from "../../components/ui/Spinner";
import Pagination from "../../components/ui/Pagination";
import ReportFilters, {
  ReportFilterValue,
  getPresetRange,
  isWithinRange,
} from "../../components/features/ReportFilters";
import toast from "react-hot-toast";

export default function ClearanceLog() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedClearance, setSelectedClearance] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [clearances, setClearances] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const [range, setRange] = useState<ReportFilterValue>({
    preset: "month",
    ...getPresetRange("month"),
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, range.from, range.to, itemsPerPage]);

  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.clearances && Array.isArray(data.clearances))
      return data.clearances;
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

  const fetchClearances = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await api.get("/web/clearance");
      setClearances(extractData(response.data));
    } catch (error) {
      console.error("Error fetching clearances:", error);
      setIsError(true);
      toast.error("Failed to load clearance log");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClearances();
  }, []);

  const filteredClearances = useMemo(() => {
    let filtered = [...clearances];

    filtered = filtered.filter((c: any) =>
      isWithinRange(c.created_at, range.from, range.to),
    );

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((c: any) => {
        const ref = c.reference_number?.toLowerCase() || "";
        const firstName = c.resident?.first_name?.toLowerCase() || "";
        const lastName = c.resident?.last_name?.toLowerCase() || "";
        return (
          ref.includes(query) ||
          firstName.includes(query) ||
          lastName.includes(query)
        );
      });
    }

    if (statusFilter !== "all")
      filtered = filtered.filter((c: any) => c.status === statusFilter);

    return filtered;
  }, [clearances, searchQuery, statusFilter, range.from, range.to]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredClearances.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(
    startIndex + itemsPerPage,
    filteredClearances.length,
  );
  const paginatedClearances = useMemo(
    () => filteredClearances.slice(startIndex, endIndex),
    [filteredClearances, startIndex, endIndex],
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const stats = useMemo(() => {
    const total = filteredClearances.length;
    const pending = filteredClearances.filter(
      (c: any) => c.status === "pending",
    ).length;
    const approved = filteredClearances.filter(
      (c: any) => c.status === "approved",
    ).length;
    const released = filteredClearances.filter(
      (c: any) => c.status === "released",
    ).length;
    const rejected = filteredClearances.filter(
      (c: any) => c.status === "rejected",
    ).length;
    const totalAmount = filteredClearances.reduce(
      (sum: number, c: any) => sum + (parseFloat(c.amount) || 0),
      0,
    );
    return { total, pending, approved, released, rejected, totalAmount };
  }, [filteredClearances]);

  const handleView = (clearance: any) => {
    setSelectedClearance(clearance);
    setShowViewModal(true);
  };

  const handleSendToCaptain = async () => {
    if (filteredClearances.length === 0) {
      toast.error("No clearance records to send");
      return;
    }

    const periodLabel =
      range.preset === "all" ? "All Time" : `${range.from} to ${range.to}`;

    const statusCounts = {
      pending: stats.pending,
      approved: stats.approved,
      released: stats.released,
      rejected: stats.rejected,
    };

    const content = `
═══════════════════════════════════════════════
        CLEARANCE LOG REPORT
        Barangay Bagocboc, Opol, Misamis Oriental
═══════════════════════════════════════════════

REPORT DETAILS
──────────────
Report Type      : Clearance Log
Period Covered   : ${periodLabel}
Date Generated   : ${new Date().toLocaleString("en-PH", {
      dateStyle: "long",
      timeStyle: "short",
    })}
Generated By     : ${user?.resident
        ? `${user.resident.first_name} ${user.resident.last_name}`
        : user?.email || "Barangay Secretary"}

SUMMARY
───────
Total Clearances ............. ${stats.total}
Total Amount Collected ....... ₱${stats.totalAmount.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}

STATUS BREAKDOWN
────────────────
Pending ...................... ${stats.pending}
Approved ..................... ${stats.approved}
Released ..................... ${stats.released}
Rejected ..................... ${stats.rejected}

───────────────────────────────────────────────
This is a system-generated report submitted to the
Office of the Punong Barangay for review and approval.

Total Records: ${stats.total}
═══════════════════════════════════════════════
`.trim();
    setIsSending(true);
    try {
      await api.post("/web/captain/reports/send", {
        report_type: "clearance",
        title: `Clearance Log Report — ${periodLabel}`,
        content,
        period: periodLabel,
        metadata: {
          total_clearances: stats.total,
          total_amount: stats.totalAmount,
          status_breakdown: statusCounts,
          filter_preset: range.preset,
        },
      });
      toast.success("Clearance log sent to Captain successfully!");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send report");
    } finally {
      setIsSending(false);
    }
  };

  const handleRefresh = () => {
    toast.loading("Refreshing...");
    fetchClearances();
    setTimeout(() => {
      toast.dismiss();
      toast.success("Refreshed!");
    }, 500);
  };

  const handlePrint = () => {
    const periodLabel =
      range.preset === "all" ? "All Time" : `${range.from} to ${range.to}`;

    const ok = printReport({
      title: "Clearance Log Report",
      subtitle: "Official Record of Barangay Clearance Issuances",
      periodLabel,
      columns: [
        {
          key: "idx",
          label: "#",
          width: "36px",
          render: (_r, i) => `<span class="row-num">${i + 1}</span>`,
        },
        {
          key: "reference_number",
          label: "Reference #",
          render: (r) => esc(r.reference_number),
        },
        {
          key: "resident",
          label: "Resident",
          render: (r) =>
            esc(
              `${r.resident?.first_name || ""} ${r.resident?.last_name || ""}`.trim(),
            ),
        },
        { key: "purpose", label: "Purpose", render: (r) => esc(r.purpose) },
        {
          key: "amount",
          label: "Amount",
          align: "right",
          render: (r) =>
            `₱${(parseFloat(r.amount) || 0).toLocaleString("en-PH", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
        },
        {
          key: "status",
          label: "Status",
          align: "center",
          render: (r) => statusBadge(r.status || "pending"),
        },
        {
          key: "date",
          label: "Date Filed",
          render: (r) =>
            esc(
              r.created_at
                ? new Date(r.created_at).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
                : "—",
            ),
        },
        {
          key: "issued",
          label: "Date Issued",
          render: (r) =>
            esc(
              r.issued_at
                ? new Date(r.issued_at).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
                : "—",
            ),
        },
      ],
      rows: filteredClearances,
      summary: [
        { label: "Total", value: stats.total },
        { label: "Pending", value: stats.pending, color: "#d97706" },
        { label: "Approved", value: stats.approved, color: "#059669" },
        { label: "Released", value: stats.released, color: "#2563eb" },
        { label: "Rejected", value: stats.rejected, color: "#dc2626" },
        {
          label: "Total ₱",
          value: `₱${stats.totalAmount.toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
        },
      ],
      signatories: {
        left: {
          name: "Juan D. Dela Cruz",
          title: "Barangay Treasurer",
        },
        right: {
          name: "Marcos P. Gonzales",
          title: "Punong Barangay",
        },
      },
    });

    if (!ok) toast.error("Please allow popups to print the report");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "released":
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-theme-textSecondary" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading clearance log...
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
            Failed to Load Clearance Log
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
          <h1 className="text-2xl font-bold text-theme-text">
            Clearance Log
          </h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            Official log of all barangay clearances
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-theme-surface border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-theme-surface border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <Printer className="w-4 h-4 text-theme-textSecondary" /> Print
          </button>
          <button
            onClick={handleSendToCaptain}
            disabled={isSending}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Send to Captain
              </>
            )}
          </button>
        </div>
      </div>

      {/* ✅ Filter bar */}
      <ReportFilters
        value={range}
        onChange={setRange}
        extraFilters={
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
              <input
                type="text"
                placeholder="Search reference or resident..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 border border-theme rounded-lg bg-theme-surface text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none w-56"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-theme rounded-lg bg-theme-surface text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="released">Released</option>
              <option value="rejected">Rejected</option>
            </select>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-theme-surface border border-theme rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-theme-textSecondary font-semibold">
            Total
          </p>
          <p className="text-2xl font-bold text-theme-text mt-1">
            {stats.total}
          </p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-theme-textSecondary font-semibold">
            Pending
          </p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {stats.pending}
          </p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-theme-textSecondary font-semibold">
            Approved
          </p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {stats.approved}
          </p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-theme-textSecondary font-semibold">
            Released
          </p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {stats.released}
          </p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-theme-textSecondary font-semibold">
            Rejected
          </p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {stats.rejected}
          </p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-theme-textSecondary font-semibold">
            Total ₱
          </p>
          <p className="text-lg font-bold text-theme-primary mt-1">
            {formatCurrency(stats.totalAmount)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-theme bg-theme-background/50 flex items-center gap-3">
          <FileText className="w-5 h-5 text-theme-primary" />
          <div>
            <h2 className="font-semibold text-theme-text">
              Clearance Records
            </h2>
            <p className="text-xs text-theme-textSecondary">
              {stats.total} record{stats.total !== 1 ? "s" : ""} shown
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-theme-background border-b border-theme">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                  Resident
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                  Purpose
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
              {paginatedClearances.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-theme-textSecondary"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Inbox className="w-10 h-10 text-theme-textSecondary/30" />
                      <p className="text-sm font-medium">
                        No clearances match the current filters
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedClearances.map((c: any, idx: number) => (
                  <tr
                    key={c.id}
                    className="hover:bg-theme-hover transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-theme-textSecondary font-mono">
                      {startIndex + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-theme-text">
                      {c.reference_number || "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-theme-textSecondary" />
                        {c.resident?.first_name} {c.resident?.last_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-theme-textSecondary max-w-[200px] truncate">
                      {c.purpose || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-theme-text">
                      {formatCurrency(parseFloat(c.amount) || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full ${getStatusColor(
                          c.status,
                        )}`}
                      >
                        {getStatusIcon(c.status)}
                        {c.status || "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-theme-textSecondary">
                      {c.created_at ? formatDate(c.created_at) : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleView(c)}
                        className="p-1.5 text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredClearances.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredClearances.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        )}
      </div>

      <ReportDetailModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedClearance(null);
        }}
        title="Clearance Details"
        badge={
          selectedClearance
            ? {
              label: selectedClearance.status || "pending",
              className: getStatusColor(selectedClearance.status),
            }
            : undefined
        }
        headerIcon={FileText}
        subtitle={
          selectedClearance && (
            <div>
              <p className="font-semibold text-theme-text text-base">
                {selectedClearance.reference_number}
              </p>
              <p className="text-xs">
                {selectedClearance.resident?.first_name}{" "}
                {selectedClearance.resident?.last_name}
              </p>
            </div>
          )
        }
        sections={
          selectedClearance
            ? [
              {
                title: "Clearance Information",
                icon: FileText,
                rows: [
                  {
                    label: "Reference Number",
                    value: selectedClearance.reference_number,
                    icon: Hash,
                    span: 2,
                  },
                  {
                    label: "Amount Paid",
                    value: formatCurrency(
                      parseFloat(selectedClearance.amount) || 0,
                    ),
                    icon: DollarSign,
                  },
                  {
                    label: "Purpose",
                    value: selectedClearance.purpose || "—",
                    icon: Target,
                    span: 2,
                  },
                ],
              },
              {
                title: "Applicant",
                icon: UserIcon,
                rows: [
                  {
                    label: "Resident",
                    value: `${selectedClearance.resident?.first_name || ""} ${selectedClearance.resident?.last_name || ""
                      }`.trim(),
                    icon: UserIcon,
                    span: 2,
                  },
                ],
              },
              {
                title: "Processing Timeline",
                icon: ClockIcon,
                rows: [
                  {
                    label: "Date Filed",
                    value: selectedClearance.created_at
                      ? formatDate(selectedClearance.created_at)
                      : "—",
                    icon: CalendarIcon,
                  },
                  {
                    label: "Approved",
                    value: selectedClearance.approved_at
                      ? formatDate(selectedClearance.approved_at)
                      : "Not yet approved",
                    icon: CheckIcon,
                  },
                  {
                    label: "Released",
                    value: selectedClearance.released_at
                      ? formatDate(selectedClearance.released_at)
                      : "Not yet released",
                    icon: Printer,
                  },
                  {
                    label: "Valid Until",
                    value: selectedClearance.valid_until
                      ? formatDate(selectedClearance.valid_until)
                      : "—",
                    icon: ClockIcon,
                  },
                ],
              },
              {
                title: "Officer & Remarks",
                icon: UserCheck,
                rows: [
                  {
                    label: "Processed By",
                    value: selectedClearance.processed_by?.email || "—",
                    icon: UserCheck,
                    span: 2,
                  },
                  {
                    label: "Remarks",
                    value: selectedClearance.remarks || "No remarks",
                    icon: Info,
                    span: 2,
                  },
                ],
              },
            ]
            : []
        }
        footerActions={
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print Log
          </button>
        }
      />
    </div>
  );
}