// pages/frontdesk/FrontDeskResidentsPage.tsx

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  User,
  Search,
  UserPlus,
  Send,
  Loader2,
  Eye,
  AlertCircle,
  Phone,
  PhilippinePeso,
  Plus,
  X,
  Save,
  UserCheck,
  Users,
  ChevronDown,
  Home,
  Briefcase,
} from "lucide-react";
import { getStatusColor } from "../../utils/format";
import { api } from "../../api/apiClient";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import toast from "react-hot-toast";

const SERVICE_TYPES = [
  "Barangay Clearance",
  "Certificate of Residency",
  "Business Clearance",
  "Certificate of Indigency",
  "Certificate of Good Moral",
  "Barangay ID",
  "Tax Payment",
  "Other",
];

const CIVIL_STATUS = ["Single", "Married", "Widow", "Legally Separated"];
const GENDER = ["Male", "Female"];
const VOTER_STATUS = [
  "Registered Local",
  "Registered_Outside",
  "Not Registered",
];

export default function FrontDeskResidentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [residents, setResidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState<any>(null);

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [queueForm, setQueueForm] = useState({ service_type: "", notes: "" });
  const [queueErrors, setQueueErrors] = useState<Record<string, string>>({});

  const [residentForm, setResidentForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    phone_number: "",
    gender: "Male",
    citizenship: "Filipino",
    birth_date: "",
    place_of_birth: "",
    civil_status: "Single",
    voter_status: "Not Registered",
    occupation: "",
    monthly_income: "",
    education_attainment: "",
  });
  const [residentErrors, setResidentErrors] = useState<
    Record<string, string>
  >({});

  const [residentSearch, setResidentSearch] = useState("");
  const [showResidentDropdown, setShowResidentDropdown] = useState(false);
  const [selectedQueueResident, setSelectedQueueResident] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const filteredQueueResidents = useMemo(() => {
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
    if (Array.isArray(data)) {
      if (data.length > 0 && data[0]?.first_name !== undefined) return data;
      return [];
    }
    if (data?.data && Array.isArray(data.data)) {
      if (data.data.length > 0 && data.data[0]?.first_name !== undefined)
        return data.data;
      return [];
    }
    if (data?.residents && Array.isArray(data.residents)) return data.residents;

    const findArray = (obj: any, depth = 0): any[] => {
      if (!obj || depth > 3) return [];
      if (Array.isArray(obj)) {
        if (obj.length > 0 && obj[0]?.first_name !== undefined) return obj;
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

  const fetchResidents = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await api.get("/web/frontdesk/residents");
      setResidents(extractData(response.data));
    } catch (error) {
      console.error("Error fetching residents:", error);
      setIsError(true);
      toast.error("Failed to load residents");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();
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

  const handleSelectQueueResident = (resident: any) => {
    setSelectedQueueResident(resident);
    setResidentSearch(`${resident.first_name} ${resident.last_name}`);
    setShowResidentDropdown(false);
  };

  const handleClearQueueResident = () => {
    setSelectedQueueResident(null);
    setResidentSearch("");
  };

  const filteredResidents = useMemo(() => {
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

  const totalPages = Math.max(
    1,
    Math.ceil(filteredResidents.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(
    startIndex + itemsPerPage,
    filteredResidents.length,
  );
  const paginatedResidents = useMemo(
    () => filteredResidents.slice(startIndex, endIndex),
    [filteredResidents, startIndex, endIndex],
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const resetQueueForm = () => {
    setQueueForm({ service_type: "", notes: "" });
    setQueueErrors({});
    setSelectedQueueResident(null);
    setResidentSearch("");
  };

  const validateQueueForm = () => {
    const errors: Record<string, string> = {};
    if (!selectedQueueResident) errors.resident = "Please select a resident";
    if (!queueForm.service_type)
      errors.service_type = "Please select a service type";
    setQueueErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddToQueue = async () => {
    if (!validateQueueForm()) {
      toast.error("Please fix the errors below");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/web/frontdesk/queue", {
        resident_id: selectedQueueResident.id,
        service_type: queueForm.service_type,
      });
      toast.success(`${selectedQueueResident.first_name} added to queue!`);
      setShowQueueModal(false);
      resetQueueForm();
      fetchResidents();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to add to queue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetResidentForm = () => {
    setResidentForm({
      first_name: "",
      middle_name: "",
      last_name: "",
      suffix: "",
      phone_number: "",
      gender: "Male",
      citizenship: "Filipino",
      birth_date: "",
      place_of_birth: "",
      civil_status: "Single",
      voter_status: "Not Registered",
      occupation: "",
      monthly_income: "",
      education_attainment: "",
    });
    setResidentErrors({});
  };

  const validateResidentForm = () => {
    const errors: Record<string, string> = {};
    if (!residentForm.first_name.trim())
      errors.first_name = "First name is required";
    if (!residentForm.last_name.trim())
      errors.last_name = "Last name is required";
    if (!residentForm.birth_date) errors.birth_date = "Birth date is required";
    if (!residentForm.place_of_birth.trim())
      errors.place_of_birth = "Place of birth is required";
    if (!residentForm.gender) errors.gender = "Gender is required";
    if (!residentForm.civil_status)
      errors.civil_status = "Civil status is required";
    if (!residentForm.education_attainment.trim())
      errors.education_attainment = "Education is required";
    setResidentErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateResident = async () => {
    if (!validateResidentForm()) {
      toast.error("Please fix the errors below");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        ...residentForm,
        monthly_income: residentForm.monthly_income
          ? parseFloat(residentForm.monthly_income)
          : null,
      };
      await api.post("/web/residents", payload);
      toast.success("Resident registered successfully!");
      setShowCreateModal(false);
      resetResidentForm();
      fetchResidents();
    } catch (error: any) {
      if (error?.response?.data?.errors) {
        setResidentErrors(error.response.data.errors);
        toast.error("Please fix the errors below");
      } else {
        toast.error(
          error?.response?.data?.message || "Failed to register resident",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateResident = async () => {
    if (!selectedResident) return;
    if (!validateResidentForm()) {
      toast.error("Please fix the errors below");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        ...residentForm,
        monthly_income: residentForm.monthly_income
          ? parseFloat(residentForm.monthly_income)
          : null,
      };
      await api.put(`/web/residents/${selectedResident.id}`, payload);
      toast.success("Resident updated successfully!");
      setShowEditModal(false);
      setSelectedResident(null);
      resetResidentForm();
      fetchResidents();
    } catch (error: any) {
      if (error?.response?.data?.errors) {
        setResidentErrors(error.response.data.errors);
        toast.error("Please fix the errors below");
      } else {
        toast.error(
          error?.response?.data?.message || "Failed to update resident",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendToZoneLeader = async (residentId: number) => {
    try {
      await api.post("/web/resident-confirmations", {
        resident_id: residentId,
      });
      toast.success("Resident sent to Zone Leader for confirmation");
      fetchResidents();
    } catch (error) {
      toast.error("Failed to send to Zone Leader");
    }
  };

  const handleOpenQueueModal = (resident: any) => {
    setSelectedQueueResident(resident);
    setResidentSearch(`${resident.first_name} ${resident.last_name}`);
    setQueueForm({ service_type: "", notes: "" });
    setQueueErrors({});
    setShowQueueModal(true);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string | Date): string => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const handleOpenEditModal = (resident: any) => {
    setSelectedResident(resident);
    setResidentForm({
      first_name: resident.first_name || "",
      middle_name: resident.middle_name || "",
      last_name: resident.last_name || "",
      suffix: resident.suffix || "",
      phone_number: resident.phone_number || "",
      gender: resident.gender || "Male",
      citizenship: resident.citizenship || "Filipino",
      birth_date: resident.birth_date || "",
      place_of_birth: resident.place_of_birth || "",
      civil_status: resident.civil_status || "Single",
      voter_status: resident.voter_status || "Not Registered",
      occupation: resident.occupation || "",
      monthly_income: resident.monthly_income || "",
      education_attainment: resident.education_attainment || "",
    });
    setResidentErrors({});
    setShowEditModal(true);
  };

  const handleOpenCreateModal = () => {
    resetResidentForm();
    setShowCreateModal(true);
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
          <button
            onClick={fetchResidents}
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
          <h1 className="text-2xl font-bold text-theme-text">Residents</h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            Manage resident records and queue
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Register Resident
          </button>
        </div>
      </div>

      <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
            <input
              type="text"
              placeholder="Search residents..."
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
            {[10, 15, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>

        {filteredResidents.length > 0 && (
          <div className="mt-3 pt-3 border-t border-theme flex items-center justify-between text-sm text-theme-textSecondary flex-wrap gap-2">
            <span>
              Showing{" "}
              <span className="font-semibold text-theme-text">
                {startIndex + 1}–{endIndex}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-theme-text">
                {filteredResidents.length}
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
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Address
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
              {paginatedResidents.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-theme-textSecondary"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <User className="w-12 h-12 text-theme-textSecondary/30" />
                      <p>No residents found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedResidents.map((resident: any) => (
                  <tr
                    key={resident.id}
                    className="hover:bg-theme-hover transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-theme-text">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-theme-textSecondary" />
                        {resident.first_name} {resident.last_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-theme-textSecondary">
                      {resident.phone_number || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-theme-textSecondary">
                      {resident.place_of_birth || "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor("active")}`}
                      >
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setSelectedResident(resident);
                            setShowViewModal(true);
                          }}
                          className="p-1.5 text-theme-textSecondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(resident)}
                          className="p-1.5 text-theme-textSecondary hover:text-theme-text hover:bg-theme-hover rounded-lg transition-colors"
                          title="Edit"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenQueueModal(resident)}
                          className="px-3 py-1 bg-theme-primary text-white rounded-lg text-xs font-medium hover:opacity-90 transition-colors"
                        >
                          <Plus className="w-3 h-3 inline mr-1" />
                          Add to Queue
                        </button>
                        <button
                          onClick={() => handleSendToZoneLeader(resident.id)}
                          className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ Pagination */}
        {filteredResidents.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredResidents.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            showItemsPerPage={false}
          />
        )}
      </div>

      {/* Queue Modal */}
      <Modal
        isOpen={showQueueModal}
        onClose={() => {
          setShowQueueModal(false);
          resetQueueForm();
        }}
        title="Add to Queue"
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
                    selectedQueueResident
                      ? `${selectedQueueResident.first_name} ${selectedQueueResident.last_name}`
                      : "Search resident by name or phone..."
                  }
                  value={residentSearch}
                  onChange={(e) => {
                    setResidentSearch(e.target.value);
                    setShowResidentDropdown(true);
                    if (e.target.value === "") {
                      setSelectedQueueResident(null);
                    }
                  }}
                  onFocus={() => {
                    if (!selectedQueueResident) setShowResidentDropdown(true);
                  }}
                  className={`w-full pl-10 pr-10 py-2.5 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${queueErrors.resident ? "border-red-500" : "border-theme"
                    }`}
                />
                {selectedQueueResident && (
                  <button
                    onClick={handleClearQueueResident}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-textSecondary hover:text-theme-text transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {!selectedQueueResident && (
                  <ChevronDown
                    className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary transition-transform ${showResidentDropdown ? "rotate-180" : ""
                      }`}
                  />
                )}
              </div>

              {selectedQueueResident && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-theme-text">
                        {selectedQueueResident.first_name}{" "}
                        {selectedQueueResident.last_name}
                      </p>
                      {selectedQueueResident.phone_number && (
                        <p className="text-sm text-theme-textSecondary flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {selectedQueueResident.phone_number}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleClearQueueResident}
                    className="text-sm text-red-500 hover:text-red-600 font-medium"
                  >
                    Change
                  </button>
                </div>
              )}

              {showResidentDropdown && !selectedQueueResident && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-theme-surface border border-theme rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {residents.length === 0 ? (
                    <div className="px-4 py-6 text-center text-theme-textSecondary">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No residents found</p>
                    </div>
                  ) : filteredQueueResidents.length === 0 ? (
                    <div className="px-4 py-6 text-center text-theme-textSecondary">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No matching residents</p>
                    </div>
                  ) : (
                    filteredQueueResidents.map((resident: any) => (
                      <button
                        key={resident.id}
                        onClick={() => handleSelectQueueResident(resident)}
                        className="w-full px-4 py-3 text-left hover:bg-theme-hover transition-colors border-b border-theme last:border-0 flex items-center gap-3 group"
                      >
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
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {queueErrors.resident && (
              <p className="text-sm text-red-500 mt-1">
                {queueErrors.resident}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Service Type <span className="text-red-500">*</span>
            </label>
            <select
              value={queueForm.service_type}
              onChange={(e) =>
                setQueueForm({ ...queueForm, service_type: e.target.value })
              }
              className={`w-full px-4 py-2.5 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${queueErrors.service_type ? "border-red-500" : "border-theme"
                }`}
            >
              <option value="">Select Service Type</option>
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {queueErrors.service_type && (
              <p className="text-sm text-red-500 mt-1">
                {queueErrors.service_type}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={queueForm.notes}
              onChange={(e) =>
                setQueueForm({ ...queueForm, notes: e.target.value })
              }
              rows={2}
              className="w-full px-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-theme">
            <button
              onClick={() => {
                setShowQueueModal(false);
                resetQueueForm();
              }}
              className="px-4 py-2.5 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleAddToQueue}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Add to Queue
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedResident(null);
        }}
        title="Resident Details"
        size="lg"
      >
        {selectedResident && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-theme-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-theme-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-theme-text">
                  {selectedResident.first_name}{" "}
                  {selectedResident.middle_name || ""}{" "}
                  {selectedResident.last_name}
                  {selectedResident.suffix && ` ${selectedResident.suffix}`}
                </h3>
                <p className="text-sm text-theme-textSecondary">
                  {selectedResident.gender} • {selectedResident.civil_status}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Birth Date
                </p>
                <p className="font-medium text-theme-text">
                  {selectedResident.birth_date
                    ? formatDate(selectedResident.birth_date)
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Place of Birth
                </p>
                <p className="font-medium text-theme-text">
                  {selectedResident.place_of_birth || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Citizenship
                </p>
                <p className="font-medium text-theme-text">
                  {selectedResident.citizenship || "Filipino"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Voter Status
                </p>
                <p className="font-medium text-theme-text">
                  {selectedResident.voter_status || "Not Registered"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Phone
                </p>
                <p className="font-medium text-theme-text">
                  {selectedResident.phone_number || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Education
                </p>
                <p className="font-medium text-theme-text">
                  {selectedResident.education_attainment || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Occupation
                </p>
                <p className="font-medium text-theme-text">
                  {selectedResident.occupation || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Monthly Income
                </p>
                <p className="font-medium text-theme-text">
                  {selectedResident.monthly_income
                    ? formatCurrency(selectedResident.monthly_income)
                    : "N/A"}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-theme">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedResident(null);
                }}
                className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Resident Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetResidentForm();
        }}
        title="Register Resident"
        size="xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <ResidentForm
            formData={residentForm}
            setFormData={setResidentForm}
            errors={residentErrors}
            isSubmitting={isSubmitting}
            onSubmit={handleCreateResident}
            onCancel={() => {
              setShowCreateModal(false);
              resetResidentForm();
            }}
            submitLabel="Register Resident"
          />
        </div>
      </Modal>

      {/* Edit Resident Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedResident(null);
          resetResidentForm();
        }}
        title="Edit Resident"
        size="xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <ResidentForm
            formData={residentForm}
            setFormData={setResidentForm}
            errors={residentErrors}
            isSubmitting={isSubmitting}
            onSubmit={handleUpdateResident}
            onCancel={() => {
              setShowEditModal(false);
              setSelectedResident(null);
              resetResidentForm();
            }}
            submitLabel="Update Resident"
          />
        </div>
      </Modal>
    </div>
  );
}

function ResidentForm({
  formData,
  setFormData,
  errors,
  isSubmitting,
  onSubmit,
  onCancel,
  submitLabel,
}: any) {
  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-theme-text mb-3 border-b border-theme pb-2">
          <User className="w-4 h-4 inline mr-2" /> Personal Information
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${errors.first_name ? "border-red-500" : "border-theme"
                }`}
            />
            {errors.first_name && (
              <p className="text-sm text-red-500 mt-1">{errors.first_name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${errors.last_name ? "border-red-500" : "border-theme"
                }`}
            />
            {errors.last_name && (
              <p className="text-sm text-red-500 mt-1">{errors.last_name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Middle Name
            </label>
            <input
              type="text"
              name="middle_name"
              value={formData.middle_name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Suffix
            </label>
            <input
              type="text"
              name="suffix"
              value={formData.suffix}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              placeholder="Jr., Sr., III"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Birth Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="birth_date"
              value={formData.birth_date}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${errors.birth_date ? "border-red-500" : "border-theme"
                }`}
            />
            {errors.birth_date && (
              <p className="text-sm text-red-500 mt-1">{errors.birth_date}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
            >
              {GENDER.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Civil Status <span className="text-red-500">*</span>
            </label>
            <select
              name="civil_status"
              value={formData.civil_status}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
            >
              {CIVIL_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-theme-text mb-3 border-b border-theme pb-2">
          <Home className="w-4 h-4 inline mr-2" /> Address & Contact
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Place of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="place_of_birth"
              value={formData.place_of_birth}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${errors.place_of_birth ? "border-red-500" : "border-theme"
                }`}
            />
            {errors.place_of_birth && (
              <p className="text-sm text-red-500 mt-1">
                {errors.place_of_birth}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Phone Number
            </label>
            <input
              type="text"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              placeholder="09XXXXXXXXX"
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-theme-text mb-3 border-b border-theme pb-2">
          <Briefcase className="w-4 h-4 inline mr-2" /> Additional Information
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Citizenship
            </label>
            <input
              type="text"
              name="citizenship"
              value={formData.citizenship}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Voter Status
            </label>
            <select
              name="voter_status"
              value={formData.voter_status}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
            >
              {VOTER_STATUS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Education Attainment <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="education_attainment"
              value={formData.education_attainment}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${errors.education_attainment ? "border-red-500" : "border-theme"
                }`}
            />
            {errors.education_attainment && (
              <p className="text-sm text-red-500 mt-1">
                {errors.education_attainment}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Occupation
            </label>
            <input
              type="text"
              name="occupation"
              value={formData.occupation}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Monthly Income
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="monthly_income"
              value={formData.monthly_income}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-theme">
        <button
          onClick={onCancel}
          className="px-4 py-2.5 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text font-medium"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2.5 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 font-medium"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> {submitLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
}