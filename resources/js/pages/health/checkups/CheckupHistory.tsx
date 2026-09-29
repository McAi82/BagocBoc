// src/pages/health/checkups/CheckupHistory.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Stethoscope,
  Search,
  Eye,
  Calendar,
  Clock,
  Filter,
  X,
  AlertCircle,
  Heart,
  Baby,
  Droplet,
  User as UserIcon,
  Activity,
  RefreshCw,
} from "lucide-react";
import { api } from "../../../api/apiClient";
import { useAuthStore } from "../../../stores/authStore";
import Pagination from "../../../components/ui/Pagination";
import toast from "react-hot-toast";

const CHECKUP_TYPE_LABELS: Record<string, string> = {
  pregnancy: "Pregnancy",
  child: "Child",
  lactating: "Lactating",
  senior: "Senior",
  ncd: "NCD",
};

const CHECKUP_TYPE_ICONS: Record<string, any> = {
  pregnancy: Heart,
  child: Baby,
  lactating: Droplet,
  senior: UserIcon,
  ncd: Activity,
};

export default function CheckupHistory() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [checkups, setCheckups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [totalItems, setTotalItems] = useState(0);
  const [filterType, setFilterType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // ✅ Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, dateFrom, dateTo, itemsPerPage]);

  // ✅ Debounced fetch
  useEffect(() => {
    const timer = setTimeout(() => fetchCheckups(), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, currentPage, itemsPerPage, filterType, dateFrom, dateTo]);

  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.data?.data && Array.isArray(data.data.data)) return data.data.data;
    if (data?.checkups && Array.isArray(data.checkups)) return data.checkups;
    const findArray = (obj: any, depth = 0): any[] => {
      if (!obj || depth > 4) return [];
      if (Array.isArray(obj)) {
        if (
          obj.length > 0 &&
          (obj[0]?.checkup_date !== undefined ||
            obj[0]?.checkup_type !== undefined ||
            obj[0]?.id !== undefined)
        )
          return obj;
        return [];
      }
      if (typeof obj === "object") {
        for (const key of Object.keys(obj)) {
          if (["message", "status", "success", "errors", "meta", "links"].includes(key)) continue;
          const result = findArray(obj[key], depth + 1);
          if (result.length > 0) return result;
        }
      }
      return [];
    };
    return findArray(data);
  };

  const extractPagination = (data: any) => {
    const p = data?.data || data;
    return {
      lastPage: p?.last_page || 1,
      total: p?.total || 0,
    };
  };

  const fetchCheckups = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const params: any = { page: currentPage, per_page: itemsPerPage };
      if (searchQuery) params.search = searchQuery;
      if (filterType) params.checkup_type = filterType;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      let allCheckups: any[] = [];
      let total = 0;

      try {
        // ✅ Preferred path: server-side pagination
        const response = await api.get("/web/health/checkups", { params });
        allCheckups = extractData(response.data);
        const p = extractPagination(response.data);
        total = p.total || allCheckups.length;
      } catch (endpointError) {
        // ✅ Fallback: aggregate across category endpoints (client pagination)
        const categories = [
          { key: "pregnant", endpoint: "/web/health/records/pregnant" },
          { key: "child", endpoint: "/web/health/records/children" },
          { key: "lactating", endpoint: "/web/health/records/lactating" },
          { key: "senior", endpoint: "/web/health/records/senior" },
          { key: "ncd", endpoint: "/web/health/records/other" },
        ];

        let aggregated: any[] = [];
        for (const category of categories) {
          try {
            const response = await api.get(category.endpoint, {
              params: { per_page: 500 },
            });
            const records = extractData(response.data);

            for (const record of records) {
              if (record.checkups && Array.isArray(record.checkups)) {
                const withMeta = record.checkups.map((c: any) => ({
                  ...c,
                  resident: record.resident,
                  patient_record_id: record.id,
                  patient_type: record.patient_type,
                  checkup_type: c.checkup_type || category.key,
                }));
                aggregated = [...aggregated, ...withMeta];
              }
            }
          } catch (e) {
            console.warn(`Failed to fetch ${category.key}:`, e);
          }
        }

        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          aggregated = aggregated.filter((c) => {
            const name = c.resident
              ? `${c.resident.first_name} ${c.resident.last_name}`.toLowerCase()
              : "";
            return name.includes(q);
          });
        }
        if (filterType)
          aggregated = aggregated.filter((c) => c.checkup_type === filterType);
        if (dateFrom)
          aggregated = aggregated.filter(
            (c) => new Date(c.checkup_date) >= new Date(dateFrom),
          );
        if (dateTo)
          aggregated = aggregated.filter(
            (c) => new Date(c.checkup_date) <= new Date(dateTo),
          );

        aggregated.sort((a, b) => {
          const da = new Date(a.checkup_date || a.created_at).getTime();
          const db = new Date(b.checkup_date || b.created_at).getTime();
          return db - da;
        });

        total = aggregated.length;
        const start = (currentPage - 1) * itemsPerPage;
        allCheckups = aggregated.slice(start, start + itemsPerPage);
      }

      setCheckups(allCheckups);
      setTotalItems(total);
    } catch (error) {
      console.error("❌ Error fetching checkups:", error);
      setIsError(true);
      toast.error("Failed to load checkup history");
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const clearFilters = () => {
    setFilterType("");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
    setCurrentPage(1);
    setShowFilters(false);
  };

  const handleRefresh = () => {
    toast.loading("Refreshing...");
    fetchCheckups();
    setTimeout(() => {
      toast.dismiss();
      toast.success("Refreshed!");
    }, 500);
  };

  const getCheckupTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      pregnancy:
        "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400",
      child:
        "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
      lactating:
        "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
      senior:
        "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
      ncd: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    };
    return (
      colors[type] ||
      "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
    );
  };

  const getCheckupTypeIcon = (type: string) =>
    CHECKUP_TYPE_ICONS[type] || Stethoscope;
  const getCheckupTypeLabel = (type: string) =>
    CHECKUP_TYPE_LABELS[type] || type || "Unknown";

  const formatDate = (date: string) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: string) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getResidentName = (checkup: any) => {
    const resident = checkup.resident || checkup.patientRecord?.resident;
    if (resident) {
      return (
        `${resident.first_name || ""} ${resident.last_name || ""}`.trim() ||
        "Unknown"
      );
    }
    return "Unknown Patient";
  };

  const getResidentDetails = (checkup: any) => {
    const resident = checkup.resident || checkup.patientRecord?.resident;
    if (!resident) return "N/A";
    const parts = [];
    if (resident.gender) parts.push(resident.gender);
    if (resident.age) parts.push(`${resident.age} yrs`);
    return parts.join(" • ") || "N/A";
  };

  if (isLoading && checkups.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-theme-textSecondary">
            Loading checkups...
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
            Failed to Load Checkups
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
            Checkup History
          </h1>
          <p className="text-sm text-theme-textSecondary">
            {totalItems} checkup(s) found
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <RefreshCw className="w-4 h-4 text-theme-textSecondary" />
            Refresh
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-theme-surface border border-theme rounded-xl p-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-theme-textSecondary mb-1">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-theme-textSecondary mb-1">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none text-sm"
            />
          </div>
          <button
            onClick={() => {
              setCurrentPage(1);
              fetchCheckups();
            }}
            className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            Apply
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        </div>
      )}

      {/* Search + Type filter */}
      <div className="bg-theme-surface border border-theme rounded-xl p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
          <input
            type="text"
            placeholder="Search by patient name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none placeholder:text-theme-textSecondary"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-textSecondary hover:text-theme-text transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
        >
          <option value="">All Types</option>
          <option value="pregnancy">Pregnancy</option>
          <option value="child">Child</option>
          <option value="lactating">Lactating</option>
          <option value="senior">Senior</option>
          <option value="ncd">NCD</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-theme-surface border border-theme rounded-xl shadow-sm overflow-hidden">
        {checkups.length === 0 ? (
          <div className="text-center py-12">
            <Stethoscope className="w-12 h-12 mx-auto text-theme-textSecondary mb-4" />
            <h3 className="text-lg font-semibold text-theme-text">
              No checkups found
            </h3>
            <p className="text-sm text-theme-textSecondary">
              {searchQuery || filterType || dateFrom || dateTo
                ? "Try adjusting your search or filters"
                : "Start by conducting a new checkup"}
            </p>
            {(searchQuery || filterType || dateFrom || dateTo) && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-theme-background border-b border-theme">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Assessment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Performed By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Follow-up
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {checkups.map((checkup: any) => {
                    const color = getCheckupTypeColor(checkup.checkup_type);
                    const typeLabel = getCheckupTypeLabel(
                      checkup.checkup_type,
                    );
                    const TypeIcon = getCheckupTypeIcon(checkup.checkup_type);
                    const checkupDate =
                      checkup.checkup_date || checkup.created_at;

                    return (
                      <tr
                        key={checkup.id}
                        className="hover:bg-theme-hover transition-colors cursor-pointer"
                        onClick={() =>
                          navigate(
                            `/barangay-bagocboc/health/records/${checkup.patient_record_id}`,
                          )
                        }
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-theme-primary/10 flex items-center justify-center flex-shrink-0">
                              <UserIcon className="w-4 h-4 text-theme-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-theme-text truncate">
                                {getResidentName(checkup)}
                              </p>
                              <p className="text-xs text-theme-textSecondary">
                                {getResidentDetails(checkup)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full ${color}`}
                          >
                            <TypeIcon className="w-3 h-3" />
                            {typeLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-theme-text">
                            {formatDate(checkupDate)}
                          </div>
                          <div className="text-xs text-theme-textSecondary flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(checkupDate)}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-sm text-theme-text truncate">
                            {checkup.assessment ||
                              checkup.diagnosis ||
                              "No assessment"}
                          </p>
                          {checkup.treatment && (
                            <p className="text-xs text-theme-textSecondary truncate">
                              {checkup.treatment}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-theme-textSecondary truncate block max-w-[150px]">
                            {checkup.performed_by?.email ||
                              checkup.performedBy?.email ||
                              "Unknown"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {checkup.follow_up_date ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">
                              <Calendar className="w-3 h-3" />
                              {formatDate(checkup.follow_up_date)}
                            </span>
                          ) : (
                            <span className="text-xs text-theme-textSecondary">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/barangay-bagocboc/health/records/${checkup.patient_record_id}`,
                              );
                            }}
                            className="p-1.5 text-theme-textSecondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                            title="View Patient Record"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ✅ Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </>
        )}
      </div>
    </div>
  );
}