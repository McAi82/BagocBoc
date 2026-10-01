// pages/secretary/CertificateReports.tsx

import React, { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "../../stores/authStore";
import {
  FileText,
  Search,
  Eye,
  RefreshCw,
  Send,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Inbox,
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
  FileSignature,
} from "lucide-react";
import ReportDetailModal from "../../components/features/ReportDetailModal";
import { printReport, statusBadge, esc } from "../../utils/printReport";
import { api } from "../../api/apiClient";
import { formatDate, formatCurrency, getStatusColor } from "../../utils/format";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import ReportFilters, {
  ReportFilterValue,
  getPresetRange,
  isWithinRange,
} from "../../components/features/ReportFilters";
import toast from "react-hot-toast";

export default function CertificateReports() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [certifications, setCertifications] = useState<any[]>([]);
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
  }, [
    searchQuery,
    statusFilter,
    typeFilter,
    range.from,
    range.to,
    itemsPerPage,
  ]);

  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) {
      if (
        data.length > 0 &&
        (data[0]?.reference_number !== undefined ||
          data[0]?.certification_type_id !== undefined)
      ) {
        return data;
      }
      return [];
    }
    if (data?.data && Array.isArray(data.data)) {
      if (
        data.data.length > 0 &&
        (data.data[0]?.reference_number !== undefined ||
          data.data[0]?.certification_type_id !== undefined)
      ) {
        return data.data;
      }
      return [];
    }
    if (data?.certifications && Array.isArray(data.certifications)) {
      return data.certifications;
    }
    const findArray = (obj: any, depth = 0): any[] => {
      if (!obj || depth > 3) return [];
      if (Array.isArray(obj)) {
        if (
          obj.length > 0 &&
          (obj[0]?.reference_number !== undefined ||
            obj[0]?.certification_type_id !== undefined)
        ) {
          return obj;
        }
        return [];
      }
      if (typeof obj === "object") {
        for (const key of Object.keys(obj)) {
          if (
            ["message", "status", "success", "errors", "meta", "links"].includes(
              key,
            )
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

  const fetchCertifications = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await api.get("/web/certifications");
      setCertifications(extractData(response.data));
    } catch (error) {
      console.error("❌ Error fetching certifications:", error);
      setIsError(true);
      toast.error("Failed to load certificate reports");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCertifications();
  }, []);

  const types = useMemo(() => {
    const set = new Set<string>();
    certifications.forEach((c: any) => {
      const type = c.certification_type?.name || c.type || "Other";
      set.add(type);
    });
    return Array.from(set).sort();
  }, [certifications]);

  const filteredCerts = useMemo(() => {
    let filtered = [...certifications];

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
    if (typeFilter !== "all") {
      filtered = filtered.filter((c: any) => {
        const type = c.certification_type?.name || c.type || "Other";
        return type === typeFilter;
      });
    }
    return filtered;
  }, [
    certifications,
    searchQuery,
    statusFilter,
    typeFilter,
    range.from,
    range.to,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCerts.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredCerts.length);
  const paginatedCerts = useMemo(
    () => filteredCerts.slice(startIndex, endIndex),
    [filteredCerts, startIndex, endIndex],
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const stats = useMemo(() => {
    const total = filteredCerts.length;
    const pending = filteredCerts.filter(
      (c: any) => c.status === "Pending" || c.status === "In Review",
    ).length;
    const approved = filteredCerts.filter(
      (c: any) =>
        c.status === "Approved" || c.status === "Ready for Release",
    ).length;
    const released = filteredCerts.filter(
      (c: any) => c.status === "Released",
    ).length;
    const rejected = filteredCerts.filter(
      (c: any) => c.status === "Rejected",
    ).length;
    const cancelled = filteredCerts.filter(
      (c: any) => c.status === "Cancelled",
    ).length;
    const totalFee = filteredCerts.reduce(
      (sum: number, c: any) =>
        sum + parseFloat(c.certification_type?.fee || c.fee || 0),
      0,
    );
    return { total, pending, approved, released, rejected, cancelled, totalFee };
  }, [filteredCerts]);

  const handleView = (cert: any) => {
    setSelectedCert(cert);
    setShowViewModal(true);
  };

  const handleSendToCaptain = async () => {
    if (filteredCerts.length === 0) {
      toast.error("No certificate records to send");
      return;
    }

    const periodLabel =
      range.preset === "all" ? "All Time" : `${range.from} to ${range.to}`;

    const statusCounts = {
      pending: stats.pending,
      approved: stats.approved,
      released: stats.released,
      rejected: stats.rejected,
      cancelled: stats.cancelled,
    };

    const content = `
═══════════════════════════════════════════════
        CERTIFICATE REPORT
        Barangay Bagocboc, Opol, Misamis Oriental
═══════════════════════════════════════════════

REPORT DETAILS
──────────────
Report Type      : Certificate Report
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
Total Certificates ........... ${stats.total}
Total Fees Collected ......... ₱${stats.totalFee.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}

STATUS BREAKDOWN
────────────────
Pending ...................... ${stats.pending}
Approved ..................... ${stats.approved}
Released ..................... ${stats.released}
Rejected ..................... ${stats.rejected}
Cancelled .................... ${stats.cancelled}

───────────────────────────────────────────────
This is a system-generated report submitted to the
Office of the Punong Barangay for review and approval.

Total Records: ${stats.total}
═══════════════════════════════════════════════
`.trim();

    setIsSending(true);
    try {
      await api.post("/web/captain/reports/send", {
        report_type: "certificate",
        title: `Certificate Report — ${periodLabel}`,
        content,
        period: periodLabel,
        metadata: {
          total_certificates: stats.total,
          total_fee: stats.totalFee,
          status_breakdown: statusCounts,
          filter_preset: range.preset,
        },
      });
      toast.success("Certificate report sent to Captain successfully!");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send report");
    } finally {
      setIsSending(false);
    }
  };

  const handleRefresh = () => {
    toast.loading("Refreshing...");
    fetchCertifications();
    setTimeout(() => {
      toast.dismiss();
      toast.success("Refreshed!");
    }, 500);
  };

  const handlePrint = () => {
    const periodLabel =
      range.preset === "all" ? "All Time" : `${range.from} to ${range.to}`;

    const ok = printReport({
      title: "Certificate Report",
      subtitle: "Official Record of Certificate Requests & Issuances",
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
        {
          key: "type",
          label: "Certificate Type",
          render: (r) => esc(r.certification_type?.name || r.type),
        },
        { key: "purpose", label: "Purpose", render: (r) => esc(r.purpose) },
        {
          key: "fee",
          label: "Fee",
          align: "right",
          render: (r) => {
            const fee = parseFloat(r.certification_type?.fee) || 0;
            return fee > 0
              ? `₱${fee.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
              : "Free";
          },
        },
        {
          key: "status",
          label: "Status",
          align: "center",
          render: (r) => statusBadge(r.status || "Pending"),
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
      ],
      rows: filteredCerts,
      summary: [
        { label: "Total", value: stats.total },
        { label: "Pending", value: stats.pending, color: "#d97706" },
        { label: "Approved", value: stats.approved, color: "#059669" },
        { label: "Released", value: stats.released, color: "#2563eb" },
        { label: "Rejected", value: stats.rejected, color: "#dc2626" },
        { label: "Cancelled", value: stats.cancelled, color: "#4b5563" },
        {
          label: "Total ₱",
          value: `₱${stats.totalFee.toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
        },
      ],
      signatories: {
        left: {
          name: "Concordio A. Esber",
          title: "Barangay Secretary",
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
    const s = status?.toLowerCase() || "";
    if (s === "pending" || s === "in review")
      return <Clock className="w-4 h-4 text-yellow-500" />;
    if (s === "approved" || s === "ready for release")
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (s === "released")
      return <CheckCircle className="w-4 h-4 text-blue-500" />;
    if (s === "rejected") return <XCircle className="w-4 h-4 text-red-500" />;
    if (s === "cancelled")
      return <XCircle className="w-4 h-4 text-gray-500" />;
    return <Clock className="w-4 h-4 text-theme-textSecondary" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading certificate reports...
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
            onClick={fetchCertifications}
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
            Certificate Reports
          </h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            Official report of all certificate requests and issuances
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
              <option value="Pending">Pending</option>
              <option value="In Review">In Review</option>
              <option value="Approved">Approved</option>
              <option value="Ready for Release">Ready for Release</option>
              <option value="Released">Released</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 border border-theme rounded-lg bg-theme-surface text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
            >
              <option value="all">All Types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
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
            Cancelled
          </p>
          <p className="text-2xl font-bold text-gray-600 mt-1">
            {stats.cancelled}
          </p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-theme-textSecondary font-semibold">
            Total ₱
          </p>
          <p className="text-lg font-bold text-purple-600 mt-1">
            {formatCurrency(stats.totalFee)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-theme bg-theme-background/50 flex items-center gap-3">
          <FileText className="w-5 h-5 text-theme-primary" />
          <div>
            <h2 className="font-semibold text-theme-text">
              Certificate Records
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
                  Type
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                  Fee
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
              {paginatedCerts.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-theme-textSecondary"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Inbox className="w-10 h-10 text-theme-textSecondary/30" />
                      <p className="text-sm font-medium">
                        No certificates match the current filters
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCerts.map((cert: any, idx: number) => (
                  <tr
                    key={cert.id || `cert-${idx}`}
                    className="hover:bg-theme-hover transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-theme-textSecondary font-mono">
                      {startIndex + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-theme-text">
                      {cert.reference_number || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-theme-textSecondary">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-theme-textSecondary" />
                        {cert.resident?.first_name} {cert.resident?.last_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-theme-textSecondary">
                      {cert.certification_type?.name || cert.type || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-theme-text">
                      {cert.certification_type?.fee
                        ? formatCurrency(cert.certification_type.fee)
                        : "Free"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full ${getStatusColor(
                          cert.status,
                        )}`}
                      >
                        {getStatusIcon(cert.status)}
                        {cert.status || "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-theme-textSecondary">
                      {cert.created_at ? formatDate(cert.created_at) : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleView(cert)}
                        className="p-1.5 text-theme-textSecondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
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

        {filteredCerts.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredCerts.length}
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
          setSelectedCert(null);
        }}
        title="Certificate Details"
        badge={
          selectedCert
            ? {
              label: selectedCert.status || "Pending",
              className: getStatusColor(selectedCert.status),
            }
            : undefined
        }
        headerIcon={FileSignature}
        subtitle={
          selectedCert && (
            <div>
              <p className="font-semibold text-theme-text text-base">
                {selectedCert.reference_number}
              </p>
              <p className="text-xs">
                {selectedCert.resident?.first_name}{" "}
                {selectedCert.resident?.last_name}
              </p>
            </div>
          )
        }
        sections={
          selectedCert
            ? [
              {
                title: "Certificate Information",
                icon: FileText,
                rows: [
                  {
                    label: "Reference Number",
                    value: selectedCert.reference_number,
                    icon: Hash,
                    span: 2,
                  },
                  {
                    label: "Certificate Type",
                    value: selectedCert.certification_type?.name || "—",
                    icon: FileSignature,
                    span: 2,
                  },
                  {
                    label: "Fee",
                    value: selectedCert.certification_type?.fee
                      ? formatCurrency(selectedCert.certification_type.fee)
                      : "Free",
                    icon: DollarSign,
                  },
                  {
                    label: "Purpose",
                    value: selectedCert.purpose || "—",
                    icon: Target,
                    span: 2,
                  },
                  {
                    label: "Details",
                    value: selectedCert.details || "No additional details",
                    icon: Info,
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
                    value: `${selectedCert.resident?.first_name || ""} ${selectedCert.resident?.last_name || ""
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
                    label: "Requested",
                    value: selectedCert.created_at
                      ? formatDate(selectedCert.created_at)
                      : "—",
                    icon: CalendarIcon,
                  },
                  {
                    label: "Approved",
                    value: selectedCert.approved_at
                      ? formatDate(selectedCert.approved_at)
                      : "Not yet approved",
                    icon: CheckIcon,
                  },
                  {
                    label: "Issued",
                    value: selectedCert.issued_at
                      ? formatDate(selectedCert.issued_at)
                      : "Not yet issued",
                    icon: FileText,
                  },
                  {
                    label: "Released",
                    value: selectedCert.released_at
                      ? formatDate(selectedCert.released_at)
                      : "Not yet released",
                    icon: Printer,
                  },
                  {
                    label: "Expiry",
                    value: selectedCert.expiry_date
                      ? formatDate(selectedCert.expiry_date)
                      : "—",
                    icon: ClockIcon,
                  },
                  {
                    label: "Received",
                    value: selectedCert.received_at
                      ? formatDate(selectedCert.received_at)
                      : "Not yet received",
                    icon: CheckIcon,
                  },
                ],
              },
              {
                title: "Officer & Remarks",
                icon: UserCheck,
                rows: [
                  {
                    label: "Processed By",
                    value: selectedCert.processed_by?.email || "—",
                    icon: UserCheck,
                    span: 2,
                  },
                  {
                    label: "Remarks",
                    value: selectedCert.remarks || "No remarks",
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
            <Printer className="w-4 h-4" /> Print Report
          </button>
        }
      />
    </div>
  );
}