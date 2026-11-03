// src/pages/health/patients/PatientSearch.tsx

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  User,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Phone,
  FileText,
  MapPin,
  Users,
  Home,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { api } from "../../../api/apiClient";
import { useAuthStore } from "../../../stores/authStore";
import toast from "react-hot-toast";

interface SearchResult {
  resident: {
    id: number;
    first_name: string;
    middle_name: string;
    last_name: string;
    suffix: string;
    phone_number: string;
    gender: string;
    birth_date: string;
    age: number;
    place_of_birth: string;
    civil_status: string;
    households?: any[];
  };
  has_record: boolean;
  patient_record_id?: number;
  patient_type?: string;
}

export default function PatientSearch() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // ✅ Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, []);

  // ✅ Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      setError(null);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  const handleSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      console.log(`🔍 Searching for: "${query}"`);

      // ✅ Use the health search endpoint
      const response = await api.post("/web/health/patients/search", {
        search: query,
      });

      console.log("📦 Search response:", response.data);

      // ✅ Extract data properly
      let results = [];
      if (response.data?.data?.results) {
        results = response.data.data.results;
      } else if (response.data?.results) {
        results = response.data.results;
      } else if (Array.isArray(response.data)) {
        results = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        results = response.data.data;
      }

      // ✅ Filter out null/undefined results
      results = results.filter((r: any) => r && r.resident);

      console.log(`✅ Found ${results.length} results`);
      setSearchResults(results);
      setShowResults(results.length > 0);

      if (results.length === 0) {
        setError("No residents found matching your search.");
      }
    } catch (error: any) {
      console.error("❌ Search error:", error);
      setError(
        error?.response?.data?.message || "Search failed. Please try again.",
      );
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResident = (result: SearchResult) => {
    setSelectedResult(result);
    setShowResults(false);
    setSearchQuery("");

    console.log("✅ Selected resident:", result.resident);
    console.log("✅ Has record:", result.has_record);
    console.log("✅ Patient record ID:", result.patient_record_id);

    if (result.has_record && result.patient_record_id) {
      // ✅ Navigate to existing patient record
      navigate(`/barangay-bagocboc/health/records/${result.patient_record_id}`);
    } else {
      // ✅ Navigate to create new patient record
      navigate("/barangay-bagocboc/health/patients/new-form", {
        state: { resident: result.resident },
      });
    }
  };

  const getAge = (birthDate: string) => {
    if (!birthDate) return "N/A";
    try {
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    } catch {
      return "N/A";
    }
  };

  const getFullName = (resident: any) => {
    if (!resident) return "Unknown";
    let name =
      `${resident.first_name || ""} ${resident.last_name || ""}`.trim();
    if (resident.middle_name) {
      name =
        `${resident.first_name || ""} ${resident.middle_name || ""} ${resident.last_name || ""}`.trim();
    }
    if (resident.suffix) {
      name += ` ${resident.suffix}`;
    }
    return name || "Unknown";
  };

  const getZone = (resident: any) => {
    if (resident?.households && resident.households.length > 0) {
      const household = resident.households[0];
      if (household?.address) {
        if (household.address.zone_name) return household.address.zone_name;
        if (household.address.zone) return `Zone ${household.address.zone}`;
      }
    }
    return "N/A";
  };

  const getHouseholdNumber = (resident: any) => {
    if (resident?.households && resident.households.length > 0) {
      return resident.households[0].household_number || "N/A";
    }
    return "N/A";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/barangay-bagocboc/health")}
          className="p-2 rounded-lg hover:bg-theme-hover transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-theme-textSecondary" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-theme-text">Patient Search</h1>
          <p className="text-sm text-theme-textSecondary">
            Search for residents and their health records
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-theme-surface border border-theme rounded-xl p-6 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-textSecondary" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by name, phone number, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-theme-background border border-theme rounded-xl text-theme-text text-lg focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none placeholder:text-theme-textSecondary"
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="w-5 h-5 animate-spin text-theme-textSecondary" />
            </div>
          )}
          {searchQuery && !isSearching && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
                setShowResults(false);
                setError(null);
                searchInputRef.current?.focus();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-textSecondary hover:text-theme-text transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search Tips */}
        {!searchQuery && !isSearching && (
          <div className="mt-4 p-4 text-center text-theme-textSecondary">
            <Search className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Enter a name, phone number, or ID to search</p>
            <p className="text-xs mt-1">Type at least 2 characters</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              <button
                onClick={() => navigate("/barangay-bagocboc/residents/new")}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Register a new resident instead
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {showResults && searchResults.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm text-theme-textSecondary">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {searchResults.length} resident
                {searchResults.length !== 1 ? "s" : ""} found
              </span>
              <span className="text-xs">
                {searchResults.filter((r) => r.has_record).length} with records
              </span>
            </div>

            {searchResults.map((result, index) => {
              const resident = result.resident;
              const fullName = getFullName(resident);
              const age = getAge(resident.birth_date);
              const zone = getZone(resident);
              const household = getHouseholdNumber(resident);

              return (
                <button
                  key={resident.id || index}
                  onClick={() => handleSelectResident(result)}
                  className="w-full p-4 bg-theme-background border border-theme rounded-xl hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-theme-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-theme-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-theme-text">
                            {fullName}
                          </p>
                          {result.has_record ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              Has Record
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                              <User className="w-3 h-3" />
                              New Patient
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-theme-textSecondary mt-1">
                          {resident.phone_number && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {resident.phone_number}
                            </span>
                          )}
                          {resident.gender && <span>{resident.gender}</span>}
                          {age !== "N/A" && <span>{age} yrs</span>}
                          {zone !== "N/A" && (
                            <span className="flex items-center gap-1">
                              <Home className="w-3 h-3" />
                              {zone}
                            </span>
                          )}
                          {household !== "N/A" && (
                            <span className="text-xs bg-theme-background px-2 py-0.5 rounded-full">
                              HH: {household}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {result.patient_type && (
                        <span className="text-xs px-2 py-1 bg-theme-primary/10 text-theme-primary rounded-full">
                          {result.patient_type}
                        </span>
                      )}
                      <ArrowRight className="w-5 h-5 text-theme-textSecondary group-hover:text-theme-primary transition-colors" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* No Results with action buttons */}
        {searchQuery.length >= 2 &&
          !isSearching &&
          searchResults.length === 0 &&
          !error && (
            <div className="mt-4 p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
              <p className="text-amber-700 dark:text-amber-400 font-medium">
                No residents found matching "{searchQuery}"
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
                <button
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="px-4 py-2 text-sm border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-800/50 transition-colors text-amber-700 dark:text-amber-400"
                >
                  Try another search
                </button>
                <button
                  onClick={() => navigate("/barangay-bagocboc/residents/new")}
                  className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Register New Resident
                </button>
              </div>
            </div>
          )}

        {/* Quick Actions */}
        {!searchQuery && !isSearching && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => navigate("/barangay-bagocboc/health/patients/new")}
              className="flex items-center gap-3 p-4 bg-theme-primary/10 border border-theme-primary/20 rounded-xl hover:bg-theme-primary/20 transition-colors text-left"
            >
              <div className="p-2 bg-theme-primary rounded-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-theme-text">
                  New Patient Registration
                </p>
                <p className="text-sm text-theme-textSecondary">
                  Register a new patient
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-theme-textSecondary ml-auto" />
            </button>
            <button
              onClick={() => navigate("/barangay-bagocboc/health/records")}
              className="flex items-center gap-3 p-4 bg-theme-surface border border-theme rounded-xl hover:bg-theme-hover transition-colors text-left"
            >
              <div className="p-2 bg-theme-accent rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-theme-text">View All Records</p>
                <p className="text-sm text-theme-textSecondary">
                  Browse all patient records
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-theme-textSecondary ml-auto" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
