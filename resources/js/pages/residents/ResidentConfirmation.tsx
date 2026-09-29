// pages/residents/ResidentConfirmation.tsx

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Send,
  RefreshCw,
  Search,
  User,
  Phone,
  AlertCircle,
  Loader2,
  Check,
  X,
  ChevronDown,
  UserCheck,
  Users,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { api } from "../../api/apiClient";
import { formatDate } from "../../utils/format";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import toast from "react-hot-toast";

export default function ResidentConfirmation() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmations, setConfirmations] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedConfirmation, setSelectedConfirmation] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestForm, setRequestForm] = useState({
    resident_id: "",
    notes: "",
  });

  // ✅ Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ✅ Searchable resident dropdown state
  const [residentSearch, setResidentSearch] = useState("");
  const [showResidentDropdown, setShowResidentDropdown] = useState(false);
  const [selectedResident, setSelectedResident] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userRoles = user?.roles?.map((r) => r.name) || [];
  const isZoneLeader = userRoles.includes("Zone Leader");
  const isSecretary =
    userRoles.includes("Barangay Secretary") ||
    userRoles.includes("Front Desk Clerk");

  // ✅ Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, itemsPerPage]);

  const filteredResidents = useMemo(() => {
    if (!residentSearch.trim()) return residents;
    const query = residentSearch.toLowerCase();
    return residents.filter((r: any) => {
      const firstName = r.first_name?.toLowerCase() || "";
      const lastName = r.last_name?.toLowerCase() || "";
      const middleName = r.middle_name?.toLowerCase() || "";
      const phone = r.phone_number?.toLowerCase() || "";
      const fullName = `${firstName} ${middleName} ${lastName}`.toLowerCase();
      return (
        firstName.includes(query) ||
        lastName.includes(query) ||
        fullName.includes(query) ||
        phone.includes(query)
      );
    });
  }, [residents, residentSearch]);

  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.confirmations && Array.isArray(data.confirmations))
      return data.confirmations;
    if (data?.residents && Array.isArray(data.residents)) return data.residents;

    const findArray = (obj: any, depth = 0): any[] => {
      if (!obj || depth > 3) return [];
      if (Array.isArray(obj)) {
        if (
          obj.length > 0 &&
          (obj[0]?.id !== undefined ||
            obj[0]?.first_name !== undefined ||
            obj[0]?.status !== undefined)
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

  const fetchData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [confirmationsRes, pendingRes, residentsRes] = await Promise.all([
        api.get("/web/resident-confirmations"),
        api.get("/web/resident-confirmations/my-pending"),
        api.get("/web/residents"),
      ]);

      setConfirmations(extractData(confirmationsRes.data));
      setPending(extractData(pendingRes.data));
      setResidents(extractData(residentsRes.data));
    } catch (error) {
      console.error("❌ Error fetching confirmations:", error);
      setIsError(true);
      toast.error("Failed to load confirmations");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowResidentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectResident = (resident: any) => {
    setSelectedResident(resident);
    setRequestForm({ ...requestForm, resident_id: resident.id.toString() });
    setResidentSearch(`${resident.first_name} ${resident.last_name}`);
    setShowResidentDropdown(false);
  };

  const handleClearResident = () => {
    setSelectedResident(null);
    setRequestForm({ ...requestForm, resident_id: "" });
    setResidentSearch("");
  };

  // ✅ Filtered
  const filteredConfirmations = useMemo(() => {
    let filtered = [...confirmations];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((c: any) => {
        const firstName = c.resident?.first_name?.toLowerCase() || "";
        const lastName = c.resident?.last_name?.toLowerCase() || "";
        return firstName.includes(query) || lastName.includes(query);
      });
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((c: any) => c.status === statusFilter);
    }
    return filtered;
  }, [confirmations, searchQuery, statusFilter]);

  // ✅ Pagination calc
  const totalPages = Math.max(
    1,
    Math.ceil(filteredConfirmations.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(
    startIndex + itemsPerPage,
    filteredConfirmations.length,
  );
  const paginatedConfirmations = useMemo(
    () => filteredConfirmations.slice(startIndex, endIndex),
    [filteredConfirmations, startIndex, endIndex],
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const handleRequestConfirmation = async () => {
    if (!selectedResident) {
      toast.error("Please select a resident");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/web/resident-confirmations", {
        resident_id: selectedResident.id,
        notes: requestForm.notes || null,
      });
      toast.success("Confirmation request sent to Zone Leader");
      setShowRequestModal(false);
      setRequestForm({ resident_id: "", notes: "" });
      setSelectedResident(null);
      setResidentSearch("");
      fetchData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to request confirmation",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedConfirmation) return;
    setIsSubmitting(true);
    try {
      await api.post(
        `/web/resident-confirmations/${selectedConfirmation.id}/confirm`,
      );
      toast.success("Resident confirmed successfully");
      setShowConfirmModal(false);
      setSelectedConfirmation(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to confirm resident");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedConfirmation) return;
    if (!rejectionReason) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post(
        `/web/resident-confirmations/${selectedConfirmation.id}/reject`,
        { rejection_reason: rejectionReason },
      );
      toast.success("Resident rejected");
      setShowRejectModal(false);
      setSelectedConfirmation(null);
      setRejectionReason("");
      fetchData();
    } catch (error) {
      toast.error("Failed to reject resident");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = () => {
    toast.loading("Refreshing...");
    fetchData();
    setTimeout(() => {
      toast.dismiss();
      toast.success("Refreshed!");
    }, 500);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      confirmed:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return (
      colors[status as keyof typeof colors] ||
      "bg-theme-background text-theme-textSecondary"
    );
  };

  const resetRequestForm = () => {
    setRequestForm({ resident_id: "", notes: "" });
    setSelectedResident(null);
    setResidentSearch("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading confirmations...
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
            Failed to Load Confirmations
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
            Resident Confirmation
          </h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            {isZoneLeader
              ? "Review and confirm resident records"
              : "Request confirmation for resident records"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
          </button>
          {isSecretary && (
            <button
              onClick={() => {
                resetRequestForm();
                setShowRequestModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
            >
              <Send className="w-4 h-4" /> Request Confirmation
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-sm text-theme-textSecondary">Total Requests</p>
          <p className="text-2xl font-bold text-theme-text">
            {confirmations.length}
          </p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-sm text-theme-textSecondary">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">
            {confirmations.filter((c: any) => c.status === "pending").length}
          </p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-sm text-theme-textSecondary">Confirmed</p>
          <p className="text-2xl font-bold text-green-600">
            {confirmations.filter((c: any) => c.status === "confirmed").length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
            <input
              type="text"
              placeholder="Search by resident name..."
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
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
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

        {filteredConfirmations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-theme flex items-center justify-between text-sm text-theme-textSecondary flex-wrap gap-2">
            <span>
              Showing{" "}
              <span className="font-semibold text-theme-text">
                {startIndex + 1}–{endIndex}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-theme-text">
                {filteredConfirmations.length}
              </span>
            </span>
            <span className="text-xs">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-theme-background border-b border-theme">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Resident
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Requested By
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Zone Leader
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
              {paginatedConfirmations.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-theme-textSecondary"
                  >
                    No confirmation requests found
                  </td>
                </tr>
              ) : (
                paginatedConfirmations.map((confirmation: any) => (
                  <tr
                    key={confirmation.id}
                    className="hover:bg-theme-hover transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-theme-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-theme-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-theme-text">
                            {confirmation.resident?.first_name}{" "}
                            {confirmation.resident?.last_name}
                          </p>
                          <p className="text-xs text-theme-textSecondary">
                            {confirmation.resident?.phone_number}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-theme-textSecondary">
                      <div className="flex flex-col">
                        <span className="text-theme-text font-medium">
                          {confirmation.requested_by_name || "Unknown"}
                        </span>
                        {confirmation.requested_by?.email && (
                          <span className="text-xs text-theme-textSecondary">
                            {confirmation.requested_by.email}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-theme-textSecondary">
                      <div className="flex flex-col">
                        <span className="text-theme-text font-medium">
                          {confirmation.zone_leader_name || "Not assigned"}
                        </span>
                        {confirmation.zone_leader?.email && (
                          <span className="text-xs text-theme-textSecondary">
                            {confirmation.zone_leader.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full ${getStatusBadge(confirmation.status)}`}
                      >
                        {getStatusIcon(confirmation.status)}
                        {confirmation.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-theme-textSecondary">
                      {confirmation.created_at
                        ? formatDate(confirmation.created_at)
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isZoneLeader && confirmation.status === "pending" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedConfirmation(confirmation);
                              setShowConfirmModal(true);
                            }}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => {
                              setSelectedConfirmation(confirmation);
                              setShowRejectModal(true);
                            }}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        confirmation.status !== "pending" && (
                          <button className="p-1.5 text-theme-textSecondary hover:text-theme-text transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ Pagination */}
        {filteredConfirmations.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredConfirmations.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            showItemsPerPage={false}
          />
        )}
      </div>

      {/* REQUEST CONFIRMATION MODAL */}
      <Modal
        isOpen={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          resetRequestForm();
        }}
        title="Request Resident Confirmation"
        size="lg"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Resident <span className="text-red-500">*</span>
            </label>
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                <input
                  type="text"
                  placeholder={
                    selectedResident
                      ? `${selectedResident.first_name} ${selectedResident.last_name}`
                      : "Search resident by name or phone..."
                  }
                  value={residentSearch}
                  onChange={(e) => {
                    setResidentSearch(e.target.value);
                    setShowResidentDropdown(true);
                    if (e.target.value === "") {
                      setSelectedResident(null);
                      setRequestForm({ ...requestForm, resident_id: "" });
                    }
                  }}
                  onFocus={() => {
                    if (!selectedResident) {
                      setShowResidentDropdown(true);
                    }
                  }}
                  className="w-full pl-10 pr-10 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                />
                {selectedResident && (
                  <button
                    onClick={handleClearResident}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-textSecondary hover:text-theme-text transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {!selectedResident && (
                  <ChevronDown
                    className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary transition-transform ${showResidentDropdown ? "rotate-180" : ""
                      }`}
                  />
                )}
              </div>

              {selectedResident && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-theme-text">
                        {selectedResident.first_name}{" "}
                        {selectedResident.last_name}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-theme-textSecondary">
                        {selectedResident.phone_number && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {selectedResident.phone_number}
                          </span>
                        )}
                        {selectedResident.gender && (
                          <span>{selectedResident.gender}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleClearResident}
                    className="text-sm text-red-500 hover:text-red-600 font-medium"
                  >
                    Change
                  </button>
                </div>
              )}

              {showResidentDropdown && !selectedResident && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-theme-surface border border-theme rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {residents.length === 0 ? (
                    <div className="px-4 py-6 text-center text-theme-textSecondary">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No residents found</p>
                    </div>
                  ) : filteredResidents.length === 0 ? (
                    <div className="px-4 py-6 text-center text-theme-textSecondary">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No matching residents</p>
                    </div>
                  ) : (
                    filteredResidents.map((resident: any) => (
                      <button
                        key={resident.id}
                        onClick={() => handleSelectResident(resident)}
                        className="w-full px-4 py-3 text-left hover:bg-theme-hover transition-colors border-b border-theme last:border-0 flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-theme-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-theme-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-theme-text group-hover:text-theme-primary transition-colors">
                              {resident.first_name} {resident.last_name}
                            </p>
                            {resident.phone_number && (
                              <p className="text-sm text-theme-textSecondary flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {resident.phone_number}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Notes
            </label>
            <textarea
              value={requestForm.notes}
              onChange={(e) =>
                setRequestForm({ ...requestForm, notes: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
              placeholder="Additional notes for Zone Leader..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-theme">
            <button
              onClick={() => {
                setShowRequestModal(false);
                resetRequestForm();
              }}
              className="px-4 py-2.5 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleRequestConfirmation}
              disabled={isSubmitting || !selectedResident}
              className="flex items-center gap-2 px-6 py-2.5 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send Request
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setSelectedConfirmation(null);
        }}
        title="Confirm Resident"
      >
        <div className="space-y-4">
          <p className="text-theme-textSecondary">
            Are you sure you want to confirm this resident?
          </p>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="font-medium text-theme-text">
              {selectedConfirmation?.resident?.first_name}{" "}
              {selectedConfirmation?.resident?.last_name}
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowConfirmModal(false);
                setSelectedConfirmation(null);
              }}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Confirming...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Confirm
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedConfirmation(null);
          setRejectionReason("");
        }}
        title="Reject Resident"
      >
        <div className="space-y-4">
          <p className="text-theme-textSecondary">
            Are you sure you want to reject this resident?
          </p>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Reason for Rejection <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
              placeholder="Enter reason for rejection..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowRejectModal(false);
                setSelectedConfirmation(null);
                setRejectionReason("");
              }}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={isSubmitting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Rejecting...
                </>
              ) : (
                <>
                  <X className="w-4 h-4" /> Reject
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}