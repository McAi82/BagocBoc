// pages/frontdesk/FrontDeskAppointmentsPage.tsx

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Calendar,
  Search,
  Plus,
  Eye,
  AlertCircle,
  Loader2,
  X,
  Save,
  Inbox,
  User,
  Phone,
  ChevronDown,
  UserCheck,
  Users,
} from "lucide-react";
import { getStatusColor, formatDate } from "../../utils/format";
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
  "Consultation",
  "Other",
];

export default function FrontDeskAppointmentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [residentSearch, setResidentSearch] = useState("");
  const [showResidentDropdown, setShowResidentDropdown] = useState(false);
  const [selectedResident, setSelectedResident] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    resident_id: "",
    service_type: "",
    appointment_date: "",
    appointment_time: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const filteredResidents = useMemo(() => {
    if (!residentSearch.trim()) return residents;
    const query = residentSearch.toLowerCase();
    return residents.filter((r: any) => {
      const firstName = r.first_name?.toLowerCase() || "";
      const lastName = r.last_name?.toLowerCase() || "";
      const fullName = `${firstName} ${lastName}`.toLowerCase();
      const phone = r.phone_number?.toLowerCase() || "";
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
      if (
        data.length > 0 &&
        (data[0]?.appointment_date !== undefined ||
          data[0]?.service_type !== undefined)
      ) {
        return data;
      }
      return [];
    }
    if (data?.data && Array.isArray(data.data)) {
      if (
        data.data.length > 0 &&
        (data.data[0]?.appointment_date !== undefined ||
          data.data[0]?.service_type !== undefined)
      ) {
        return data.data;
      }
      return [];
    }
    if (data?.appointments && Array.isArray(data.appointments))
      return data.appointments;
    if (data?.residents && Array.isArray(data.residents)) return data.residents;

    const findArray = (obj: any, depth = 0): any[] => {
      if (!obj || depth > 3) return [];
      if (Array.isArray(obj)) {
        if (
          obj.length > 0 &&
          (obj[0]?.appointment_date !== undefined ||
            obj[0]?.service_type !== undefined ||
            obj[0]?.first_name !== undefined)
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
      const [appointmentsRes, residentsRes] = await Promise.all([
        api.get("/web/frontdesk/appointments"),
        api.get("/web/frontdesk/residents"),
      ]);

      setAppointments(extractData(appointmentsRes.data));
      setResidents(extractData(residentsRes.data));
    } catch (error) {
      console.error("❌ Error fetching appointments:", error);
      setIsError(true);
      toast.error("Failed to load appointments");
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
    setFormData({ ...formData, resident_id: resident.id.toString() });
    setResidentSearch(`${resident.first_name} ${resident.last_name}`);
    setShowResidentDropdown(false);
  };

  const handleClearResident = () => {
    setSelectedResident(null);
    setFormData({ ...formData, resident_id: "" });
    setResidentSearch("");
  };

  const filteredAppointments = useMemo(() => {
    if (!searchQuery) return appointments;
    const query = searchQuery.toLowerCase();
    return appointments.filter((a: any) => {
      const firstName = a.resident?.first_name?.toLowerCase() || "";
      const lastName = a.resident?.last_name?.toLowerCase() || "";
      return firstName.includes(query) || lastName.includes(query);
    });
  }, [appointments, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAppointments.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(
    startIndex + itemsPerPage,
    filteredAppointments.length,
  );
  const paginatedAppointments = useMemo(
    () => filteredAppointments.slice(startIndex, endIndex),
    [filteredAppointments, startIndex, endIndex],
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const resetForm = () => {
    setFormData({
      resident_id: "",
      service_type: "",
      appointment_date: "",
      appointment_time: "",
      notes: "",
    });
    setSelectedResident(null);
    setResidentSearch("");
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!selectedResident) errors.resident_id = "Please select a resident";
    if (!formData.service_type)
      errors.service_type = "Please select a service type";
    if (!formData.appointment_date)
      errors.appointment_date = "Please select a date";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors below");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/web/frontdesk/appointments", {
        resident_id: selectedResident.id,
        service_type: formData.service_type,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time || null,
        notes: formData.notes || null,
      });
      toast.success("Appointment created successfully!");
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to create appointment",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await api.post(`/web/frontdesk/appointments/${id}/cancel`);
      toast.success("Appointment cancelled");
      fetchData();
    } catch (error) {
      toast.error("Failed to cancel appointment");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading appointments...
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
            Failed to Load Appointments
          </h3>
          <button
            onClick={fetchData}
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
          <h1 className="text-2xl font-bold text-theme-text">Appointments</h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            Manage resident appointments
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Appointment
        </button>
      </div>

      <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
            <input
              type="text"
              placeholder="Search appointments..."
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

        {filteredAppointments.length > 0 && (
          <div className="mt-3 pt-3 border-t border-theme flex items-center justify-between text-sm text-theme-textSecondary flex-wrap gap-2">
            <span>
              Showing{" "}
              <span className="font-semibold text-theme-text">
                {startIndex + 1}–{endIndex}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-theme-text">
                {filteredAppointments.length}
              </span>
            </span>
            <span className="text-xs">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
      </div>

      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
        {paginatedAppointments.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <Calendar className="w-12 h-12 text-theme-textSecondary/30" />
              <p className="text-theme-text font-medium">
                No Appointments Found
              </p>
              <p className="text-sm text-theme-textSecondary">
                Try adjusting your search.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-theme-background border-b border-theme">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Resident
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Time
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
                  {paginatedAppointments.map((appointment: any) => (
                    <tr
                      key={appointment.id || `appointment-${Math.random()}`}
                      className="hover:bg-theme-hover transition-colors"
                    >
                      <td className="px-4 py-3 text-theme-textSecondary">
                        {appointment.resident?.first_name}{" "}
                        {appointment.resident?.last_name}
                      </td>
                      <td className="px-4 py-3 text-theme-textSecondary">
                        {appointment.service_type}
                      </td>
                      <td className="px-4 py-3 text-theme-textSecondary">
                        {appointment.appointment_date
                          ? formatDate(appointment.appointment_date)
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-theme-textSecondary">
                        {appointment.appointment_time || "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(appointment.status)}`}
                        >
                          {appointment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setShowViewModal(true);
                            }}
                            className="p-1.5 text-theme-textSecondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {appointment.status !== "cancelled" &&
                            appointment.status !== "completed" && (
                              <button
                                onClick={() => handleCancel(appointment.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ✅ Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAppointments.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              showItemsPerPage={false}
            />
          </>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create Appointment"
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
                      setFormData({ ...formData, resident_id: "" });
                    }
                  }}
                  onFocus={() => {
                    if (!selectedResident) setShowResidentDropdown(true);
                  }}
                  className={`w-full pl-10 pr-10 py-2.5 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${
                    formErrors.resident_id ? "border-red-500" : "border-theme"
                  }`}
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
                    className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary transition-transform ${
                      showResidentDropdown ? "rotate-180" : ""
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
                      {selectedResident.phone_number && (
                        <p className="text-sm text-theme-textSecondary flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {selectedResident.phone_number}
                        </p>
                      )}
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
            {formErrors.resident_id && (
              <p className="text-sm text-red-500 mt-1">
                {formErrors.resident_id}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Service Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.service_type}
              onChange={(e) =>
                setFormData({ ...formData, service_type: e.target.value })
              }
              className={`w-full px-4 py-2.5 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${
                formErrors.service_type ? "border-red-500" : "border-theme"
              }`}
            >
              <option value="">Select Service</option>
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {formErrors.service_type && (
              <p className="text-sm text-red-500 mt-1">
                {formErrors.service_type}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.appointment_date}
                onChange={(e) =>
                  setFormData({ ...formData, appointment_date: e.target.value })
                }
                className={`w-full px-4 py-2.5 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${
                  formErrors.appointment_date
                    ? "border-red-500"
                    : "border-theme"
                }`}
              />
              {formErrors.appointment_date && (
                <p className="text-sm text-red-500 mt-1">
                  {formErrors.appointment_date}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Time
              </label>
              <input
                type="time"
                value={formData.appointment_time}
                onChange={(e) =>
                  setFormData({ ...formData, appointment_time: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={2}
              className="w-full px-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-theme">
            <button
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              className="px-4 py-2.5 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Create Appointment
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
          setSelectedAppointment(null);
        }}
        title="Appointment Details"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Resident
                </p>
                <p className="font-medium text-theme-text">
                  {selectedAppointment.resident?.first_name}{" "}
                  {selectedAppointment.resident?.last_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Service
                </p>
                <p className="font-medium text-theme-text">
                  {selectedAppointment.service_type}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Date
                </p>
                <p className="font-medium text-theme-text">
                  {selectedAppointment.appointment_date
                    ? formatDate(selectedAppointment.appointment_date)
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Time
                </p>
                <p className="font-medium text-theme-text">
                  {selectedAppointment.appointment_time || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Status
                </p>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(selectedAppointment.status)}`}
                >
                  {selectedAppointment.status}
                </span>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-theme-textSecondary font-medium">
                  Notes
                </p>
                <p className="font-medium text-theme-text">
                  {selectedAppointment.notes || "No notes"}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedAppointment(null);
                }}
                className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}