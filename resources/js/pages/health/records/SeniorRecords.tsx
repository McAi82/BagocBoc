// src/pages/health/records/SeniorRecords.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User as UserIcon,
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

export default function SeniorRecords() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  useEffect(() => {
    const timer = setTimeout(() => fetchRecords(), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, currentPage, itemsPerPage]);

  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.data?.data && Array.isArray(data.data.data)) return data.data.data;
    const findArray = (obj: any, depth = 0): any[] => {
      if (!obj || depth > 4) return [];
      if (Array.isArray(obj)) {
        if (obj.length > 0 && obj[0]?.patient_type !== undefined) return obj;
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

  const fetchRecords = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const params: any = { page: currentPage, per_page: itemsPerPage };
      if (searchQuery) params.search = searchQuery;

      const response = await api.get("/web/health/records/senior", { params });
      const meta = response.data?.data;

      setRecords(extractData(response.data));
      setTotalRecords(meta?.total ?? extractData(response.data).length);
    } catch (error) {
      console.error("Error fetching senior records:", error);
      setIsError(true);
      toast.error("Failed to load records");
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));

  const getFallRiskColor = (score: number) => {
    if (!score)
      return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
    if (score <= 3)
      return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
    if (score <= 6)
      return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
    return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">
            Senior Citizens
          </h1>
          <p className="text-sm text-theme-textSecondary">
            {totalRecords} active senior record(s)
          </p>
        </div>
        <button
          onClick={() => navigate("/barangay-bagocboc/health/patients/new")}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:opacity-90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Senior Record
        </button>
      </div>

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
                  Gender
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Fall Risk
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Cognitive
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
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Inbox className="w-12 h-12 mx-auto text-theme-textSecondary/30 mb-3" />
                    <p className="text-theme-text font-medium">
                      No senior records
                    </p>
                    <p className="text-sm text-theme-textSecondary">
                      {searchQuery
                        ? "Try adjusting your search"
                        : "Register a new senior record"}
                    </p>
                  </td>
                </tr>
              ) : (
                records.map((record: any) => {
                  const resident = record.resident || {};
                  const senior = record.senior_record || {};
                  const fallRiskColor = getFallRiskColor(
                    senior.falls_risk_score,
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
                          <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-4 h-4 text-amber-500" />
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
                      <td className="px-4 py-3 text-sm text-theme-textSecondary">
                        {resident.gender || "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs rounded-full ${fallRiskColor}`}
                        >
                          {senior.falls_risk_score || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-textSecondary truncate max-w-[150px]">
                        {senior.cognitive_assessment || "N/A"}
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
                          className="p-1.5 text-theme-textSecondary hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
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