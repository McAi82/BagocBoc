// pages/residents/Residents.tsx

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Eye,
  Trash2,
  User,
  Phone,
  RefreshCw,
  AlertCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDate, getStatusColor } from "../../utils/format";
import { api } from "../../api/apiClient";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function Residents() {
  const navigate = useNavigate();
  const [residents, setResidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [residentToDelete, setResidentToDelete] = useState<number | null>(null);

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.residents && Array.isArray(data.residents)) return data.residents;
    if (data?.data?.data && Array.isArray(data.data.data))
      return data.data.data;
    if (data?.data?.residents && Array.isArray(data.data.residents))
      return data.data.residents;

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

  const fetchResidents = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      console.log("🔍 [Residents] Fetching residents...");
      const response = await api.get("/web/residents");
      console.log("📦 [Residents] Response:", response.data);
      const data = extractData(response.data);
      console.log(`✅ [Residents] Loaded ${data.length} residents`);
      setResidents(data);
    } catch (error) {
      console.error("❌ [Residents] Error:", error);
      setIsError(true);
      toast.error("Failed to load residents");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();
  }, []);

  // ✅ Filtered residents
  const filteredResidents = useMemo(() => {
    if (!Array.isArray(residents) || residents.length === 0) return [];
    if (!searchQuery) return residents;
    const query = searchQuery.toLowerCase();
    return residents.filter((r: any) => {
      const firstName = r.first_name?.toLowerCase() || "";
      const lastName = r.last_name?.toLowerCase() || "";
      const phone = r.phone_number?.toLowerCase() || "";
      return (
        firstName.includes(query) ||
        lastName.includes(query) ||
        phone.includes(query)
      );
    });
  }, [residents, searchQuery]);

  // ✅ Pagination calculations
  const totalPages = Math.max(
    1,
    Math.ceil(filteredResidents.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(
    startIndex + itemsPerPage,
    filteredResidents.length,
  );

  const paginatedResidents = useMemo(() => {
    return filteredResidents.slice(startIndex, endIndex);
  }, [filteredResidents, startIndex, endIndex]);

  // ✅ Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  // ✅ Clamp current page if it exceeds total pages
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

  const handleRefresh = () => {
    toast.loading("Refreshing residents...");
    fetchResidents();
    setTimeout(() => {
      toast.dismiss();
      toast.success("Residents refreshed!");
    }, 500);
  };

  const handleDelete = async () => {
    if (residentToDelete) {
      try {
        await api.delete(`/web/residents/${residentToDelete}`);
        toast.success("Resident deleted successfully");
        setShowDeleteModal(false);
        setResidentToDelete(null);
        fetchResidents();
      } catch (error) {
        toast.error("Failed to delete resident");
      }
    }
  };

  const handleView = (resident: any) => {
    navigate(`/barangay-bagocboc/residents/${resident.id}`);
  };

  const handleAddResident = () => {
    navigate("/barangay-bagocboc/residents/new");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading residents...
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
            Failed to Load Residents
          </h3>
          <p className="text-sm text-theme-textSecondary mt-2">
            There was an error loading the resident data.
          </p>
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

  if (!residents || residents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="w-12 h-12 text-theme-textSecondary/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-theme-text">
            No Residents Found
          </h3>
          <p className="text-sm text-theme-textSecondary mt-2">
            No residents have been registered yet.
          </p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">Residents</h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            {residents.length} total residents
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-theme-surface border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
          </button>
          <button
            onClick={handleAddResident}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Resident
          </button>
        </div>
      </div>

      {/* Search + Items per page */}
      <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
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
      </div>

      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
        {filteredResidents.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <Users className="w-12 h-12 text-theme-textSecondary/30" />
              <p className="text-theme-text font-medium">No Residents Found</p>
              <p className="text-sm text-theme-textSecondary">
                Try adjusting your search.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Table info bar */}
            <div className="px-4 py-3 border-b border-theme flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-theme-textSecondary">
                Showing{" "}
                <span className="font-semibold text-theme-text">
                  {startIndex + 1}–{endIndex}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-theme-text">
                  {filteredResidents.length}
                </span>{" "}
                residents
              </p>
              <p className="text-xs text-theme-textSecondary">
                Page {currentPage} of {totalPages}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-theme-background border-b border-theme">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Gender
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Birth Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {paginatedResidents.map((resident: any) => (
                    <tr
                      key={resident.id}
                      className="hover:bg-theme-hover transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-theme-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-theme-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-theme-text">
                              {resident.first_name || "Unknown"}{" "}
                              {resident.last_name || ""}
                            </p>
                            <p className="text-xs text-theme-textSecondary">
                              {resident.civil_status || "N/A"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {resident.phone_number && (
                          <p className="text-sm text-theme-textSecondary flex items-center gap-1">
                            <Phone className="w-3 h-3" />{" "}
                            {resident.phone_number}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-textSecondary">
                        {resident.gender || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-textSecondary">
                        {resident.birth_date
                          ? formatDate(resident.birth_date)
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(resident.status || "active")}`}
                        >
                          {resident.status || "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleView(resident)}
                            className="px-3 py-1 text-sm text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors font-medium"
                          >
                            View
                          </button>
                          <button
                            onClick={() => {
                              setResidentToDelete(resident.id);
                              setShowDeleteModal(true);
                            }}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-4 py-4 border-t border-theme flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-theme-textSecondary order-2 sm:order-1">
                  Showing{" "}
                  <span className="font-semibold text-theme-text">
                    {startIndex + 1}–{endIndex}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-theme-text">
                    {filteredResidents.length}
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
                          className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                            isActive
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
                    <ChevronRight className="w-4 h-4" />
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
          </>
        )}
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Resident"
      >
        <div className="space-y-4">
          <p className="text-theme-textSecondary">
            Are you sure you want to delete this resident? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}