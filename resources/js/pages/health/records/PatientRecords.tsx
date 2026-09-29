// src/pages/health/records/PatientRecords.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  User,
  Loader2,
  Heart,
  Baby,
  Droplet,
  User as UserIcon,
  Activity,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { api } from "../../../api/apiClient";
import Pagination from "../../../components/ui/Pagination";
import toast from "react-hot-toast";

const PATIENT_TYPE_LABELS: Record<string, string> = {
  pregnant: "Pregnant",
  child: "Child",
  lactating: "Lactating",
  senior: "Senior Citizen",
  ncd: "NCD / Chronic",
};

const PATIENT_TYPE_ICONS: Record<string, any> = {
  pregnant: Heart,
  child: Baby,
  lactating: Droplet,
  senior: UserIcon,
  ncd: Activity,
};

export default function PatientRecords() {
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

      const response = await api.get("/web/health/patients", { params });
      const meta = response.data?.data;

      setRecords(extractData(response.data));
      setTotalRecords(meta?.total ?? extractData(response.data).length);
    } catch (error) {
      console.error("Error fetching records:", error);
      setIsError(true);
      toast.error("Failed to load records");
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      pink: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400",
      green:
        "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
      purple:
        "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
      amber:
        "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
      red: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
      blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    };
    return colors[color] || colors.blue;
  };

  const getTypeColor = (type: string) => {
    const map: Record<string, string> = {
      pregnant: "pink",
      child: "green",
      lactating: "purple",
      senior: "amber",
      ncd: "red",
    };
    return getColorClasses(map[type] || "blue");
  };

  const getStatusColor = (status: string) => {
    if (status === "active")
      return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
    return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">
            All Patient Records
          </h1>
          <p className="text-sm text-theme-textSecondary">
            {totalRecords} patient(s) found
          </p>
        </div>
        <button
          onClick={() => navigate("/barangay-bagocboc/health/patients/new")}
          className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Patient
        </button>
      </div>

      <div className="bg-theme-surface border border-theme rounded-xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
          <input
            type="text"
            placeholder="Search by name, phone, or ID..."
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
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Age / Gender
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Checkups
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Registered
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
                    <div className="flex flex-col items-center gap-3">
                      <Inbox className="w-12 h-12 text-theme-textSecondary/30" />
                      <p className="text-theme-text font-medium">
                        No records found
                      </p>
                      <p className="text-sm text-theme-textSecondary">
                        {searchQuery
                          ? "Try adjusting your search terms"
                          : "Start by creating a new patient record"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((record: any) => {
                  const resident = record.resident || {};
                  const colorClass = getTypeColor(record.patient_type);
                  const TypeIcon =
                    PATIENT_TYPE_ICONS[record.patient_type] || User;
                  const statusColor = getStatusColor(record.status);

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
                          <div className="w-9 h-9 rounded-full bg-theme-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-theme-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-theme-text truncate">
                              {resident.first_name} {resident.last_name}
                            </p>
                            <p className="text-xs text-theme-textSecondary">
                              ID: #{record.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full ${colorClass}`}
                        >
                          <TypeIcon className="w-3 h-3" />
                          {PATIENT_TYPE_LABELS[record.patient_type] ||
                            record.patient_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-theme-text">
                          {resident.age || "N/A"} yrs
                        </span>
                        <span className="text-xs text-theme-textSecondary block">
                          {resident.gender || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-theme-textSecondary">
                          {resident.phone_number || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-theme-background rounded-full text-xs text-theme-textSecondary">
                          {record.checkups?.length || 0} checkups
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs rounded-full ${statusColor}`}
                        >
                          {record.status || "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-textSecondary">
                        {record.created_at
                          ? formatDate(record.created_at)
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              `/barangay-bagocboc/health/records/${record.id}`,
                            );
                          }}
                          className="p-1.5 text-theme-textSecondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                          title="View Details"
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