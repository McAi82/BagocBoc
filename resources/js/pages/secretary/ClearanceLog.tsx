// pages/secretary/ClearanceLog.tsx

import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { api } from "../../api/apiClient";
import { formatDate, formatCurrency, getStatusColor } from "../../utils/format";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import toast from "react-hot-toast";

export default function ClearanceLog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedClearance, setSelectedClearance] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [clearances, setClearances] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // ✅ Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFrom, dateTo, itemsPerPage]);

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
    if (dateFrom && filtered.length > 0)
      filtered = filtered.filter(
        (c: any) => c.created_at?.split("T")[0] >= dateFrom,
      );
    if (dateTo && filtered.length > 0)
      filtered = filtered.filter(
        (c: any) => c.created_at?.split("T")[0] <= dateTo,
      );
    return filtered;
  }, [clearances, searchQuery, statusFilter, dateFrom, dateTo]);

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

  const stats = {
    total: clearances.length,
    pending: clearances.filter((c: any) => c.status === "pending").length,
    approved: clearances.filter((c: any) => c.status === "approved").length,
    released: clearances.filter((c: any) => c.status === "released").length,
    rejected: clearances.filter((c: any) => c.status === "rejected").length,
    totalAmount: clearances.reduce(
      (sum: number, c: any) => sum + (parseFloat(c.amount) || 0),
      0,
    ),
  };

  const handleView = (clearance: any) => {
    setSelectedClearance(clearance);
    setShowViewModal(true);
  };

  const handleSendToCaptain = async () => {
    const clearancesData = filteredClearances || [];
    if (clearancesData.length === 0) {
      toast.error("No clearance records to send");
      return;
    }

    const totalAmount = clearancesData.reduce(
      (sum: number, c: any) => sum + (parseFloat(c.amount) || 0),
      0,
    );

    const statusCounts = {
      pending: clearancesData.filter((c: any) => c.status === "pending").length,
      approved: clearancesData.filter((c: any) => c.status === "approved")
        .length,
      released: clearancesData.filter((c: any) => c.status === "released")
        .length,
      rejected: clearancesData.filter((c: any) => c.status === "rejected")
        .length,
    };

    const content = `Clearance Log Report\n====================\nTotal Clearances: ${clearancesData.length}\nTotal Amount: ₱${totalAmount.toFixed(2)}`;

    setIsSending(true);
    try {
      await api.post("/web/captain/reports/send", {
        report_type: "clearance",
        title: `Clearance Log Report - ${new Date().toLocaleDateString()}`,
        content: content,
        period: `${dateFrom || "Start"} to ${dateTo || "Today"}`,
        metadata: {
          total_clearances: clearancesData.length,
          total_amount: totalAmount,
          status_breakdown: statusCounts,
        },
      });
      toast.success("Clearance log sent to Captain successfully!");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send report");
    } finally {
      setIsSending(false);
    }
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
            onClick={fetchClearances}
            className="mt-4 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (clearances.length === 0 && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-theme-text">
              Clearance Log
            </h1>
            <p className="text-sm text-theme-textSecondary mt-1">
              Complete log of all barangay clearances issued
            </p>
          </div>
          <button
            onClick={fetchClearances}
            className="flex items-center gap-2 px-4 py-2 bg-theme-surface border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
          </button>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <Inbox className="w-16 h-16 text-theme-textSecondary/30" />
            <h3 className="text-lg font-semibold text-theme-text">
              No Clearance Records
            </h3>
            <p className="text-sm text-theme-textSecondary max-w-md">
              No clearance records have been found.
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
          <h1 className="text-2xl font-bold text-theme-text">Clearance Log</h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            Complete log of all barangay clearances issued
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={fetchClearances}
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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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
            Total Amount
          </p>
          <p className="text-2xl font-bold text-theme-primary">
            {formatCurrency(stats.totalAmount)}
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
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="released">Released</option>
            <option value="rejected">Rejected</option>
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

        {filteredClearances.length > 0 && (
          <div className="mt-3 pt-3 border-t border-theme flex items-center justify-between text-sm text-theme-textSecondary flex-wrap gap-2">
            <span>
              Showing{" "}
              <span className="font-semibold text-theme-text">
                {startIndex + 1}–{endIndex}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-theme-text">
                {filteredClearances.length}
              </span>
            </span>
            <span className="text-xs">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
      </div>

      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
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
                  Purpose
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Amount
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
              {paginatedClearances.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-theme-textSecondary"
                  >
                    No clearances found
                  </td>
                </tr>
              ) : (
                paginatedClearances.map((clearance: any) => (
                  <tr
                    key={clearance.id}
                    className="hover:bg-theme-hover transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-theme-text">
                      {clearance.reference_number || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-theme-textSecondary">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-theme-textSecondary" />
                        {clearance.resident?.first_name}{" "}
                        {clearance.resident?.last_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-theme-textSecondary">
                      <span className="truncate block max-w-[150px]">
                        {clearance.purpose || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-theme-text">
                      {formatCurrency(parseFloat(clearance.amount) || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full ${getStatusColor(clearance.status)}`}
                      >
                        {getStatusIcon(clearance.status)}
                        {clearance.status || "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-theme-textSecondary">
                      {clearance.created_at
                        ? formatDate(clearance.created_at)
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleView(clearance)}
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

        {/* ✅ Pagination */}
        {filteredClearances.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredClearances.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            showItemsPerPage={false}
          />
        )}
      </div>

      {/* View Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedClearance(null);
        }}
        title="Clearance Details"
        size="lg"
      >
        {selectedClearance && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Reference
                </p>
                <p className="font-medium text-theme-text">
                  {selectedClearance.reference_number}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Status
                </p>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(selectedClearance.status)}`}
                >
                  {selectedClearance.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Resident
                </p>
                <p className="font-medium text-theme-text">
                  {selectedClearance.resident?.first_name}{" "}
                  {selectedClearance.resident?.last_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Amount
                </p>
                <p className="font-medium text-theme-text">
                  {formatCurrency(parseFloat(selectedClearance.amount) || 0)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-theme-textSecondary font-medium">
                  Purpose
                </p>
                <p className="font-medium text-theme-text">
                  {selectedClearance.purpose || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Issued At
                </p>
                <p className="font-medium text-theme-text">
                  {selectedClearance.issued_at
                    ? formatDate(selectedClearance.issued_at)
                    : "Not issued yet"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Valid Until
                </p>
                <p className="font-medium text-theme-text">
                  {selectedClearance.valid_until
                    ? formatDate(selectedClearance.valid_until)
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Processed By
                </p>
                <p className="font-medium text-theme-text">
                  {selectedClearance.processed_by?.email || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Remarks
                </p>
                <p className="font-medium text-theme-text">
                  {selectedClearance.remarks || "N/A"}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedClearance(null);
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