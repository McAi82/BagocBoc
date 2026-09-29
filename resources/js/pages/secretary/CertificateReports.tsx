// pages/secretary/CertificateReports.tsx

import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { api } from "../../api/apiClient";
import { formatDate, formatCurrency, getStatusColor } from "../../utils/format";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import toast from "react-hot-toast";

export default function CertificateReports() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // ✅ Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter, dateFrom, dateTo, itemsPerPage]);

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
    if (dateFrom)
      filtered = filtered.filter(
        (c: any) => c.created_at?.split("T")[0] >= dateFrom,
      );
    if (dateTo)
      filtered = filtered.filter(
        (c: any) => c.created_at?.split("T")[0] <= dateTo,
      );
    return filtered;
  }, [certifications, searchQuery, statusFilter, typeFilter, dateFrom, dateTo]);

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

  const stats = {
    total: certifications.length,
    pending: certifications.filter(
      (c: any) => c.status === "Pending" || c.status === "In Review",
    ).length,
    approved: certifications.filter(
      (c: any) => c.status === "Approved" || c.status === "Ready for Release",
    ).length,
    released: certifications.filter((c: any) => c.status === "Released").length,
    rejected: certifications.filter((c: any) => c.status === "Rejected").length,
    cancelled: certifications.filter((c: any) => c.status === "Cancelled")
      .length,
    totalFee: certifications.reduce(
      (sum: number, c: any) =>
        sum + parseFloat(c.certification_type?.fee || c.fee || 0),
      0,
    ),
  };

  const handleView = (cert: any) => {
    setSelectedCert(cert);
    setShowViewModal(true);
  };

  const handleSendToCaptain = async () => {
    const certificates = filteredCerts || certifications;
    if (certificates.length === 0) {
      toast.error("No certificate records to send");
      return;
    }

    const totalFee = certificates.reduce(
      (sum: number, c: any) =>
        sum + parseFloat(c.certification_type?.fee || c.fee || 0),
      0,
    );

    const statusCounts = {
      pending: certificates.filter(
        (c: any) => c.status === "Pending" || c.status === "In Review",
      ).length,
      approved: certificates.filter((c: any) => c.status === "Approved").length,
      released: certificates.filter((c: any) => c.status === "Released").length,
      rejected: certificates.filter((c: any) => c.status === "Rejected").length,
      cancelled: certificates.filter((c: any) => c.status === "Cancelled")
        .length,
    };

    const content = `Certificate Report Summary\n==========================\nTotal Certificates: ${certificates.length}\nTotal Fees Collected: ₱${totalFee.toFixed(2)}`;

    setIsSending(true);
    try {
      await api.post("/web/captain/reports/send", {
        report_type: "certificate",
        title: `Certificate Report - ${new Date().toLocaleDateString()}`,
        content: content,
        period: `${dateFrom || "Start"} to ${dateTo || "Today"}`,
        metadata: {
          total_certificates: certificates.length,
          total_fee: totalFee,
          status_breakdown: statusCounts,
        },
      });
      toast.success("Certificate report sent to Captain successfully!");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send report");
    } finally {
      setIsSending(false);
    }
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
    if (s === "cancelled") return <XCircle className="w-4 h-4 text-gray-500" />;
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

  if (certifications.length === 0 && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-theme-text">
              Certificate Reports
            </h1>
            <p className="text-sm text-theme-textSecondary mt-1">
              Complete reports of all certificate requests and issuances
            </p>
          </div>
          <button
            onClick={fetchCertifications}
            className="flex items-center gap-2 px-4 py-2 bg-theme-surface border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
          </button>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Inbox className="w-16 h-16 text-theme-textSecondary/30" />
            <h3 className="text-lg font-semibold text-theme-text">
              No Certificate Records Found
            </h3>
            <p className="text-sm text-theme-textSecondary max-w-md">
              No certificate records have been found.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">
            Certificate Reports
          </h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            Complete reports of all certificate requests and issuances
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={fetchCertifications}
            className="flex items-center gap-2 px-4 py-2 bg-theme-surface border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-xs text-theme-textSecondary font-medium">Total</p>
          <p className="text-2xl font-bold text-theme-text">{stats.total}</p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-xs text-theme-textSecondary font-medium">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-xs text-theme-textSecondary font-medium">
            Approved
          </p>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-xs text-theme-textSecondary font-medium">
            Released
          </p>
          <p className="text-2xl font-bold text-blue-600">{stats.released}</p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-xs text-theme-textSecondary font-medium">
            Rejected
          </p>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-xs text-theme-textSecondary font-medium">
            Cancelled
          </p>
          <p className="text-2xl font-bold text-gray-600">{stats.cancelled}</p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-xs text-theme-textSecondary font-medium">
            Total Fees
          </p>
          <p className="text-2xl font-bold text-purple-600">
            {formatCurrency(stats.totalFee)}
          </p>
        </div>
      </div>

      <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
            <input
              type="text"
              placeholder="Search by reference or resident..."
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
            className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          >
            <option value="all">All Types</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          />
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          >
            {[10, 15, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>

        {filteredCerts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-theme flex items-center justify-between text-sm text-theme-textSecondary flex-wrap gap-2">
            <span>
              Showing{" "}
              <span className="font-semibold text-theme-text">
                {startIndex + 1}–{endIndex}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-theme-text">
                {filteredCerts.length}
              </span>
            </span>
            <span className="text-xs">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
      </div>

      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
        {paginatedCerts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <FileText className="w-12 h-12 text-theme-textSecondary/30" />
              <p className="text-theme-text font-medium">
                No Certificate Records Found
              </p>
              <p className="text-sm text-theme-textSecondary">
                Try adjusting your search or filters.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-theme-background border-b border-theme">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Resident
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Fee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {paginatedCerts.map((cert: any) => (
                    <tr
                      key={cert.id || `cert-${Math.random()}`}
                      className="hover:bg-theme-hover transition-colors"
                    >
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
                      <td className="px-4 py-3 font-medium text-theme-text">
                        {cert.certification_type?.fee
                          ? formatCurrency(cert.certification_type.fee)
                          : "Free"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full ${getStatusColor(cert.status)}`}
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
                  ))}
                </tbody>
              </table>
            </div>

            {/* ✅ Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredCerts.length}
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
          setSelectedCert(null);
        }}
        title="Certificate Details"
        size="lg"
      >
        {selectedCert && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Reference
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.reference_number}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Status
                </p>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(selectedCert.status)}`}
                >
                  {selectedCert.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Resident
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.resident?.first_name}{" "}
                  {selectedCert.resident?.last_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Certificate Type
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.certification_type?.name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Fee
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.certification_type?.fee
                    ? formatCurrency(selectedCert.certification_type.fee)
                    : "Free"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Purpose
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.purpose || "N/A"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-theme-textSecondary font-medium">
                  Details
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.details || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Requested
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.created_at
                    ? formatDate(selectedCert.created_at)
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Issued
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.issued_at
                    ? formatDate(selectedCert.issued_at)
                    : "Not issued yet"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Expiry
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.expiry_date
                    ? formatDate(selectedCert.expiry_date)
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Remarks
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.remarks || "N/A"}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedCert(null);
                }}
                className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}