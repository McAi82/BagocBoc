// pages/households/Households.tsx

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Home,
  MapPin,
  Users,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  LayoutGrid,
  List,
  User,
  Eye,
  X,
  Save,
  Loader2,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { api } from "../../api/apiClient";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";

type ViewMode = "grid" | "list";

const ITEMS_PER_PAGE_OPTIONS = [9, 12, 24, 48, 96];

export default function Households() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [households, setHouseholds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // ✅ Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    zone: "",
    street: "",
    household_number: "",
    household_tracking_number: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ✅ Check user roles
  const userRoles = user?.roles?.map((r) => r.name) || [];
  const isCaptain = userRoles.includes("Barangay Captain");
  const isSecretary = userRoles.includes("Barangay Secretary");
  const isSuperAdmin = userRoles.includes("Super Admin");

  const canAddHousehold = isSecretary || isSuperAdmin;

  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.households && Array.isArray(data.households))
      return data.households;
    if (data?.data?.data && Array.isArray(data.data.data))
      return data.data.data;
    if (data?.data?.households && Array.isArray(data.data.households))
      return data.data.households;
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

  const fetchHouseholds = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      console.log("🔍 [Households] Fetching households...");
      const response = await api.get("/web/households-info");
      console.log("📦 [Households] Response:", response.data);
      const data = extractData(response.data);
      console.log(`✅ [Households] Loaded ${data.length} households`);

      setHouseholds(data);
    } catch (error) {
      console.error("❌ [Households] Error:", error);
      setIsError(true);
      toast.error("Failed to load households");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchZones = async () => {
    try {
      const response = await api.get("/web/barangay-zones");
      const data = extractData(response.data);
      setZones(data);
    } catch (error) {
      console.error("Error fetching zones:", error);
    }
  };

  useEffect(() => {
    fetchHouseholds();
    fetchZones();
  }, []);

  const getHeadName = (household: any) => {
    const residents = household?.residents || [];
    if (!residents || residents.length === 0) return "Unknown";

    const head = residents.find((r: any) => {
      if (r.pivot?.relationship_to_household === "Head") return true;
      if (r.relationship_to_head === "Head") return true;
      if (r.is_primary === true) return true;
      if (r.pivot?.is_primary === true) return true;
      if (r.relationship === "Head") return true;
      return false;
    });

    if (head) {
      const firstName = head.first_name || "";
      const lastName = head.last_name || "";
      return `${firstName} ${lastName}`.trim() || "Unknown";
    }

    if (residents.length > 0) {
      const first = residents[0];
      const firstName = first.first_name || "";
      const lastName = first.last_name || "";
      return `${firstName} ${lastName}`.trim() || "Unknown";
    }

    return "Unknown";
  };

  const getMemberCount = (household: any) => {
    return household?.residents?.length || 0;
  };

  const getAddress = (household: any) => {
    const addr = household?.address || {};
    const parts = [];
    if (addr.street) parts.push(addr.street);
    if (addr.subdivision) parts.push(addr.subdivision);
    if (addr.zone_name) parts.push(`Zone ${addr.zone_name}`);
    else if (addr.zone) parts.push(`Zone ${addr.zone}`);
    return parts.join(", ") || "No address";
  };

  const getZone = (household: any) => {
    const addr = household?.address || {};
    if (addr.zone_name) return addr.zone_name;
    if (addr.zone) return addr.zone;
    return "N/A";
  };

  const handleRefresh = () => {
    toast.loading("Refreshing households...");
    fetchHouseholds();
    setTimeout(() => {
      toast.dismiss();
      toast.success("Households refreshed!");
    }, 500);
  };

  const resetForm = () => {
    setFormData({
      zone: "",
      street: "",
      household_number: "",
      household_tracking_number: "",
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.zone) errors.zone = "Please select a zone";
    if (!formData.street?.trim()) errors.street = "Street is required";
    if (!formData.household_number?.trim())
      errors.household_number = "Household number is required";
    if (!formData.household_tracking_number?.trim())
      errors.household_tracking_number = "Tracking number is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateHousehold = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors below");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/web/households", {
        zone: parseInt(formData.zone),
        street: formData.street,
        household_number: formData.household_number,
        household_tracking_number: formData.household_tracking_number,
      });
      toast.success("Household created successfully!");
      setShowCreateModal(false);
      resetForm();
      fetchHouseholds();
    } catch (error: any) {
      console.error("Create household error:", error);
      if (error?.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
        toast.error("Please fix the errors below");
      } else {
        toast.error(
          error?.response?.data?.message || "Failed to create household",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Filtered households
  const filteredHouseholds = useMemo(() => {
    if (!Array.isArray(households) || households.length === 0) return [];
    if (!searchQuery) return households;
    const query = searchQuery.toLowerCase();
    return households.filter((h: any) => {
      const number = h.household_number?.toLowerCase() || "";
      const tracking = h.household_tracking_number?.toLowerCase() || "";
      const street = h.address?.street?.toLowerCase() || "";
      return (
        number.includes(query) ||
        tracking.includes(query) ||
        street.includes(query)
      );
    });
  }, [households, searchQuery]);

  // ✅ Pagination calculations
  const totalPages = Math.max(
    1,
    Math.ceil(filteredHouseholds.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(
    startIndex + itemsPerPage,
    filteredHouseholds.length,
  );

  const paginatedHouseholds = useMemo(() => {
    return filteredHouseholds.slice(startIndex, endIndex);
  }, [filteredHouseholds, startIndex, endIndex]);

  // ✅ Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage, viewMode]);

  // ✅ Clamp current page
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading households...
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
            Failed to Load Households
          </h3>
          <p className="text-sm text-theme-textSecondary mt-2">
            There was an error loading the household data.
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

  if (!households || households.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-theme-text">Households</h1>
            <p className="text-sm text-theme-textSecondary mt-1">
              No households found
            </p>
          </div>
          {canAddHousehold && (
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Household
            </button>
          )}
        </div>

        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Home className="w-16 h-16 text-theme-textSecondary/30" />
            <h3 className="text-lg font-semibold text-theme-text">
              No Households Found
            </h3>
            <p className="text-sm text-theme-textSecondary max-w-md">
              No households have been registered yet.
            </p>
            {canAddHousehold && (
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="mt-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-2" /> Add Your First
                Household
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">Households</h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            {households.length} total households
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-theme-surface border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
          </button>
          {canAddHousehold && (
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Household
            </button>
          )}
        </div>
      </div>

      <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
            <input
              type="text"
              placeholder="Search by number or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
            />
          </div>

          {/* Items per page */}
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

          <div className="flex gap-2">
            <div className="flex rounded-lg border border-theme overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-2 transition-colors ${
                  viewMode === "grid"
                    ? "bg-theme-primary text-white"
                    : "bg-theme-surface text-theme-textSecondary hover:bg-theme-hover"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-2 transition-colors ${
                  viewMode === "list"
                    ? "bg-theme-primary text-white"
                    : "bg-theme-surface text-theme-textSecondary hover:bg-theme-hover"
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results info */}
        {filteredHouseholds.length > 0 && (
          <div className="mt-3 pt-3 border-t border-theme flex items-center justify-between text-sm text-theme-textSecondary flex-wrap gap-2">
            <span>
              Showing{" "}
              <span className="font-semibold text-theme-text">
                {startIndex + 1}–{endIndex}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-theme-text">
                {filteredHouseholds.length}
              </span>{" "}
              households
            </span>
            <span className="text-xs">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
      </div>

      {filteredHouseholds.length === 0 ? (
        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-12 text-center">
          <Home className="w-12 h-12 mx-auto text-theme-textSecondary/30 mb-3" />
          <p className="text-theme-text font-medium">No households found</p>
          <p className="text-sm text-theme-textSecondary">
            Try adjusting your search
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedHouseholds.map((household: any) => {
            const memberCount = getMemberCount(household);
            const headName = getHeadName(household);
            const address = getAddress(household);
            const zone = getZone(household);

            return (
              <div
                key={household.id}
                className="bg-theme-surface rounded-xl border border-theme shadow-sm hover:shadow-md transition-all p-6 cursor-pointer group"
                onClick={() =>
                  navigate(`/barangay-bagocboc/households/${household.id}`)
                }
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-theme-text group-hover:text-theme-primary transition-colors">
                      {household.household_number}
                    </h3>
                    <p className="text-sm text-theme-textSecondary">
                      {household.household_tracking_number}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-theme-primary/10 text-theme-primary">
                    <Home className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-theme-textSecondary">
                    <User className="w-4 h-4 flex-shrink-0 text-theme-textSecondary" />
                    <span className="font-medium">Head:</span>
                    <span className="text-theme-text">{headName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-theme-textSecondary">
                    <MapPin className="w-4 h-4 flex-shrink-0 text-theme-textSecondary" />
                    <span className="truncate">{address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-theme-textSecondary">
                    <Users className="w-4 h-4 flex-shrink-0 text-theme-textSecondary" />
                    <span>{memberCount} members</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between pt-4 border-t border-theme">
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-theme-background text-theme-textSecondary">
                    <MapPin className="w-3 h-3" /> {zone}
                  </span>
                  <span className="text-xs text-theme-primary font-medium group-hover:underline flex items-center gap-1">
                    View Details <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-theme-background border-b border-theme">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                    Household #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                    Head of Family
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                    Zone
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                    Members
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {paginatedHouseholds.map((household: any) => {
                  const headName = getHeadName(household);
                  const address = getAddress(household);
                  const zone = getZone(household);
                  const memberCount = getMemberCount(household);

                  return (
                    <tr
                      key={household.id}
                      className="hover:bg-theme-hover transition-colors cursor-pointer"
                      onClick={() =>
                        navigate(
                          `/barangay-bagocboc/households/${household.id}`,
                        )
                      }
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-theme-text">
                          {household.household_number}
                        </p>
                        <p className="text-xs text-theme-textSecondary">
                          {household.household_tracking_number}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-theme-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-theme-primary" />
                          </div>
                          <span className="text-sm text-theme-text">
                            {headName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-textSecondary max-w-[200px] truncate">
                        {address}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-theme-background text-theme-textSecondary">
                          <MapPin className="w-3 h-3" /> {zone}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-theme-primary/10 text-theme-primary text-sm font-medium">
                          <Users className="w-3 h-3" /> {memberCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              `/barangay-bagocboc/households/${household.id}`,
                            );
                          }}
                          className="px-3 py-1 text-sm text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors font-medium flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-theme-textSecondary order-2 sm:order-1">
            Showing{" "}
            <span className="font-semibold text-theme-text">
              {startIndex + 1}–{endIndex}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-theme-text">
              {filteredHouseholds.length}
            </span>{" "}
            households
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

      {/* ✅ Create Household Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Add Household"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Zone <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.zone}
              onChange={(e) =>
                setFormData({ ...formData, zone: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${
                formErrors.zone ? "border-red-500" : "border-theme"
              }`}
            >
              <option value="">Select Zone</option>
              {zones.map((zone: any) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
            {formErrors.zone && (
              <p className="text-sm text-red-500 mt-1">{formErrors.zone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Street <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.street}
              onChange={(e) =>
                setFormData({ ...formData, street: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${
                formErrors.street ? "border-red-500" : "border-theme"
              }`}
              placeholder="Street name or purok"
            />
            {formErrors.street && (
              <p className="text-sm text-red-500 mt-1">{formErrors.street}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Household Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.household_number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    household_number: e.target.value,
                  })
                }
                className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${
                  formErrors.household_number
                    ? "border-red-500"
                    : "border-theme"
                }`}
                placeholder="e.g., BB-001"
              />
              {formErrors.household_number && (
                <p className="text-sm text-red-500 mt-1">
                  {formErrors.household_number}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Tracking Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.household_tracking_number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    household_tracking_number: e.target.value,
                  })
                }
                className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${
                  formErrors.household_tracking_number
                    ? "border-red-500"
                    : "border-theme"
                }`}
                placeholder="e.g., TRK-001"
              />
              {formErrors.household_tracking_number && (
                <p className="text-sm text-red-500 mt-1">
                  {formErrors.household_tracking_number}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-theme">
            <button
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateHousehold}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Create Household
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}