// src/pages/health/records/PregnantRecords.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  Search,
  Eye,
  Plus,
  Loader2,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { api } from "../../../api/apiClient";
import Pagination from "../../../components/ui/Pagination";
import toast from "react-hot-toast";

export default function PregnantRecords() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [totalRecords, setTotalRecords] = useState(0);

  // ✅ Reset to page 1 when search or per-page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  // ✅ Debounced fetch
  useEffect(() => {
    const timer = setTimeout(() => fetchRecords(), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, currentPage, itemsPerPage]);

  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.data?.data && Array.isArray(data.data.data))
      return data.data.data;
    const findArray = (obj: any, depth = 0): any[] => {
      if (!obj || depth > 4) return [];
      if (Array.isArray(obj)) {
        if (obj.length > 0 && obj[0]?.patient_type !== undefined) return obj;
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

  const fetchRecords = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const params: any = {
        page: currentPage,
        per_page: itemsPerPage,
      };
      if (searchQuery) params.search = searchQuery;

      const response = await api.get("/web/health/records/pregnant", {
        params,
      });
      const meta = response.data?.data;

      setRecords(extractData(response.data));
      setTotalRecords(meta?.total ?? extractData(response.data).length);
    } catch (error) {
      console.error("Error fetching pregnant records:", error);
      setIsError(true);
      toast.error("Failed to load records");
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));

  const getRiskColor = (risk: string) => {
    if (risk === "high")
      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
    if (risk === "medium")
      return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
    return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
  };

  const getTrimester = (lmpDate: string) => {
    if (!lmpDate) return "Unknown";
    const weeks = Math.floor(
      (new Date().getTime() - new Date(lmpDate).getTime()) /
        (7 * 24 * 60 * 60 * 1000),
    );
    if (weeks < 13) return "1st Trimester";
    if (weeks < 27) return "2nd Trimester";
    return "3rd Trimester";
  };

  const formatDate = (date: string) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
            onClick={() => fetchRecords()}
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
            Pregnant Patients
          </h1>
          <p className="text-sm text-theme-textSecondary">
            {totalRecords} active pregnancy record(s)
          </p>
        </div>
        <button
          onClick={() => navigate("/barangay-bagocboc/health/patients/new")}
          className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:opacity-90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Pregnancy Record
        </button>
      </div>

      {/* Search */}
      <div className="bg-theme-surface border border-theme rounded-xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none placeholder:text-theme-textSecondary"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-theme-background border-b border-theme">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Age
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  EDD
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Trimester
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  G/P
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Checkups
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Inbox className="w-12 h-12 mx-auto text-theme-textSecondary/30 mb-3" />
                    <p className="text-theme-text font-medium">
                      No pregnant patients
                    </p>
                    <p className="text-sm text-theme-textSecondary">
                      {searchQuery
                        ? "Try adjusting your search"
                        : "Register a new pregnancy record"}
                    </p>
                  </td>
                </tr>
              ) : (
                records.map((record: any) => {
                  const resident = record.resident || {};
                  const pregnancy = record.pregnancy_record || {};
                  const riskColor = getRiskColor(pregnancy.risk_level);
                  const trimester = getTrimester(
                    pregnancy.last_menstrual_period,
                  );

                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-theme-hover transition-colors cursor-pointer"
                      onClick={() =>
                        navigate(
                          `/barangay-bagocboc/health/records/${record.id}`,
                        )
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center flex-shrink-0">
                            <Heart className="w-4 h-4 text-pink-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-theme-text truncate">
                              {resident.first_name} {resident.last_name}
                            </p>
                            <p className="text-xs text-theme-textSecondary">
                              {resident.phone_number || "No phone"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-text">
                        {resident.age || "N/A"} yrs
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs rounded-full ${riskColor}`}
                        >
                          {pregnancy.risk_level || "Low"} Risk
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-text">
                        {pregnancy.expected_delivery_date
                          ? formatDate(pregnancy.expected_delivery_date)
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-textSecondary">
                        {trimester}
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-text">
                        G{pregnancy.gravida || 0} P{pregnancy.para || 0}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-theme-background rounded-full text-xs text-theme-textSecondary">
                          {record.checkups?.length || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              `/barangay-bagocboc/health/records/${record.id}`,
                            );
                          }}
                          className="p-1.5 text-theme-textSecondary hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ Pagination */}
        {records.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalRecords}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        )}
      </div>
    </div>
  );
}