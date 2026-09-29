// src/pages/health/patients/PatientRegistration.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Plus,
  Search,
  Loader2,
  Users,
  RefreshCw,
  AlertCircle,
  Phone,
  CheckCircle,
} from "lucide-react";
import { healthApi, residentApi } from "../../../api/endpoints";
import { api } from "../../../api/apiClient";
import toast from "react-hot-toast";

export default function PatientRegistration() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResident, setSelectedResident] = useState<any>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // ✅ New state for "browse non-patients"
  const [showNonPatients, setShowNonPatients] = useState(false);
  const [nonPatients, setNonPatients] = useState<any[]>([]);
  const [isLoadingNonPatients, setIsLoadingNonPatients] = useState(false);

  // ============================================
  // SEARCH (existing behavior)
  // ============================================
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await healthApi.searchResident(query);
      const results = response.data?.data?.results || [];
      // Only show residents without an existing patient record
      const available = results.filter((r: any) => !r.has_record);
      setSearchResults(available);
      setShowSearchResults(available.length > 0);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  // ============================================
  // SHOW ALL NON-PATIENTS
  // ============================================
  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.data?.data && Array.isArray(data.data.data)) return data.data.data;
    const findArray = (obj: any, depth = 0): any[] => {
      if (!obj || depth > 4) return [];
      if (Array.isArray(obj)) {
        if (
          obj.length > 0 &&
          (obj[0]?.first_name !== undefined || obj[0]?.id !== undefined)
        )
          return obj;
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

  const fetchNonPatients = async () => {
    setIsLoadingNonPatients(true);
    try {
      // Fetch all residents + all patient records in parallel
      const [residentsRes, patientsRes] = await Promise.all([
        api.get("/web/residents"),
        api.get("/web/health/patients"),
      ]);

      const allResidents = extractData(residentsRes.data);
      const allPatients = extractData(patientsRes.data);

      // Build a Set of resident_ids that already have a patient record
      const patientResidentIds = new Set(
        allPatients.map((p: any) => p.resident_id).filter(Boolean),
      );

      // Filter out residents who already have a patient record
      const nonPatientResidents = allResidents.filter(
        (r: any) => r && r.id && !patientResidentIds.has(r.id),
      );

      setNonPatients(nonPatientResidents);
    } catch (error) {
      console.error("Failed to load non-patients:", error);
      toast.error("Failed to load residents");
    } finally {
      setIsLoadingNonPatients(false);
    }
  };

  useEffect(() => {
    if (showNonPatients && nonPatients.length === 0 && !isLoadingNonPatients) {
      fetchNonPatients();
    }
  }, [showNonPatients]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleSelectResident = (result: any) => {
    // Accept either the search-result wrapper { resident } or a raw resident
    const resident = result?.resident ?? result;
    setSelectedResident(resident);
    setShowSearchResults(false);
    setSearchQuery("");
    setShowNonPatients(false);
  };

  const handleSelectNonPatient = (resident: any) => {
    setSelectedResident(resident);
    setShowNonPatients(false);
    setSearchQuery("");
  };

  const refreshNonPatients = () => {
    toast.loading("Refreshing residents...");
    fetchNonPatients().then(() => {
      toast.dismiss();
      toast.success("Residents refreshed!");
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/barangay-bagocboc/health")}
          className="p-2 rounded-lg hover:bg-theme-hover transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-theme-textSecondary" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-theme-text">
            Patient Registration
          </h1>
          <p className="text-sm text-theme-textSecondary">
            Register a new patient in the health system
          </p>
        </div>
      </div>

      {/* Resident Selection */}
      <div className="bg-theme-surface border border-theme rounded-xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-semibold text-theme-text">
            Step 1: Select Resident
          </h3>

          {/* ✅ Toggle: Show Non-Patients */}
          {!selectedResident && (
            <button
              onClick={() => setShowNonPatients((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showNonPatients
                ? "bg-theme-primary text-white"
                : "bg-theme-background text-theme-textSecondary hover:bg-theme-hover border border-theme"
                }`}
            >
              <Users className="w-4 h-4" />
              {showNonPatients
                ? "Hide Non-Patients"
                : "Show Residents (Not Yet Patients)"}
            </button>
          )}
        </div>

        {selectedResident ? (
          <div className="flex items-center justify-between p-4 bg-theme-background rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-theme-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-theme-primary" />
              </div>
              <div>
                <p className="font-semibold text-theme-text">
                  {selectedResident.first_name} {selectedResident.last_name}
                </p>
                <p className="text-sm text-theme-textSecondary">
                  {selectedResident.gender} • {selectedResident.age || "N/A"}{" "}
                  yrs
                  {selectedResident.phone_number &&
                    ` • ${selectedResident.phone_number}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedResident(null)}
              className="text-sm text-red-500 hover:text-red-600"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Search Input */}
            {!showNonPatients && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search residents by name or phone..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full px-4 py-3 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
                />
                {isSearching && (
                  <div className="absolute right-3 top-3">
                    <Loader2 className="w-5 h-5 animate-spin text-theme-textSecondary" />
                  </div>
                )}
              </div>
            )}

            {/* Search Results */}
            {showSearchResults && (
              <div className="border border-theme rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.resident.id}
                    onClick={() => handleSelectResident(result)}
                    className="w-full px-4 py-3 text-left hover:bg-theme-hover transition-colors border-b border-theme last:border-0 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-theme-text">
                        {result.resident.first_name} {result.resident.last_name}
                      </p>
                      <p className="text-sm text-theme-textSecondary">
                        {result.resident.gender} •{" "}
                        {result.resident.age || "N/A"} yrs
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                      Available
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Search empty state */}
            {searchQuery.length >= 2 &&
              !isSearching &&
              searchResults.length === 0 &&
              !showNonPatients && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-center">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    No matching residents found.
                  </p>
                  <button
                    onClick={() =>
                      navigate("/barangay-bagocboc/residents/new")
                    }
                    className="mt-2 text-sm text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Register a new resident first
                  </button>
                </div>
              )}

            {/* ✅ Non-Patients List */}
            {showNonPatients && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-theme-textSecondary">
                    {isLoadingNonPatients
                      ? "Loading residents..."
                      : `${nonPatients.length} resident${nonPatients.length !== 1 ? "s" : ""
                      } without a patient record`}
                  </p>
                  <button
                    onClick={refreshNonPatients}
                    disabled={isLoadingNonPatients}
                    className="flex items-center gap-1.5 text-xs text-theme-primary hover:text-theme-secondary font-medium disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isLoadingNonPatients ? "animate-spin" : ""
                        }`}
                    />
                    Refresh
                  </button>
                </div>

                {isLoadingNonPatients ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin text-theme-primary" />
                      <p className="text-sm text-theme-textSecondary">
                        Loading residents...
                      </p>
                    </div>
                  </div>
                ) : nonPatients.length === 0 ? (
                  <div className="p-8 bg-theme-background rounded-lg text-center">
                    <CheckCircle className="w-10 h-10 mx-auto text-green-500 mb-2" />
                    <p className="text-sm text-theme-text font-medium">
                      All residents already have patient records
                    </p>
                    <p className="text-xs text-theme-textSecondary mt-1">
                      Use the search box to look up specific residents
                    </p>
                  </div>
                ) : (
                  <div className="border border-theme rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                    {nonPatients.map((resident: any) => (
                      <button
                        key={resident.id}
                        onClick={() => handleSelectNonPatient(resident)}
                        className="w-full px-4 py-3 text-left hover:bg-theme-hover transition-colors border-b border-theme last:border-0 flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-theme-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-theme-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-theme-text group-hover:text-theme-primary transition-colors">
                              {resident.first_name} {resident.last_name}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-theme-textSecondary">
                              {resident.gender && (
                                <span>{resident.gender}</span>
                              )}
                              {resident.age !== null &&
                                resident.age !== undefined && (
                                  <span>{resident.age} yrs</span>
                                )}
                              {resident.phone_number && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {resident.phone_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 bg-theme-primary/10 text-theme-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          Select
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Continue Button */}
      {selectedResident && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() =>
              navigate("/barangay-bagocboc/health/patients/new-form", {
                state: { resident: selectedResident },
              })
            }
            className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Continue to Patient Form
          </button>
        </div>
      )}
    </div>
  );
}