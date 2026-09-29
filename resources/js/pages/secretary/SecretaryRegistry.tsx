// pages/secretary/SecretaryRegistry.tsx

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Send,
  Eye,
  User,
  Phone,
  MapPin,
  RefreshCw,
  AlertCircle,
  Loader2,
  Inbox,
} from "lucide-react";
import { api } from "../../api/apiClient";
import { formatDate, getStatusColor } from "../../utils/format";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import toast from "react-hot-toast";

export default function SecretaryRegistry() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [selectedResident, setSelectedResident] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [residents, setResidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, genderFilter, zoneFilter, itemsPerPage]);

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
      const response = await api.get("/web/residents");
      setResidents(extractData(response.data));
    } catch (error) {
      console.error("❌ [SecretaryRegistry] Error:", error);
      setIsError(true);
      toast.error("Failed to load residents");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();
  }, []);

  const getResidentZone = (resident: any): string => {
    if (resident.households && resident.households.length > 0) {
      const household = resident.households[0];
      if (household.address) {
        if (
          household.address.zone &&
          typeof household.address.zone === "object"
        ) {
          return (
            household.address.zone.name ||
            household.address.zone.zone_number ||
            "N/A"
          );
        }
        if (household.address.zone) return String(household.address.zone);
      }
    }
    if (resident.address?.zone) {
      if (typeof resident.address.zone === "object")
        return (
          resident.address.zone.name ||
          resident.address.zone.zone_number ||
          "N/A"
        );
      return String(resident.address.zone);
    }
    if (resident.zone) return String(resident.zone);
    return "N/A";
  };

  const zones = useMemo(() => {
    const zoneSet = new Set<string>();
    residents.forEach((r: any) => {
      const zone = getResidentZone(r);
      if (zone !== "N/A") zoneSet.add(zone);
    });
    return Array.from(zoneSet).sort();
  }, [residents]);

  const filteredResidents = useMemo(() => {
    if (!Array.isArray(residents) || residents.length === 0) return [];
    let filtered = [...residents];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((r: any) => {
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
    }
    if (statusFilter !== "all")
      filtered = filtered.filter((r: any) => r.status === statusFilter);
    if (genderFilter !== "all")
      filtered = filtered.filter((r: any) => r.gender === genderFilter);
    if (zoneFilter !== "all")
      filtered = filtered.filter((r: any) => getResidentZone(r) === zoneFilter);
    return filtered;
  }, [residents, searchQuery, statusFilter, genderFilter, zoneFilter]);

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

  const total = residents.length;

  const handleView = (resident: any) => {
    setSelectedResident(resident);
    setShowViewModal(true);
  };

  const handleSendToCaptain = async () => {
    const residentsData = filteredResidents || [];
    if (residentsData.length === 0) {
      toast.error("No resident records to send");
      return;
    }

    const genderCounts = {
      male: residentsData.filter((r: any) => r.gender === "Male").length,
      female: residentsData.filter((r: any) => r.gender === "Female").length,
    };

    const statusCounts = {
      active: residentsData.filter((r: any) => r.status === "active").length,
      inactive: residentsData.filter((r: any) => r.status === "inactive").length,
      pending: residentsData.filter((r: any) => r.status === "pending").length,
    };

    const zoneDistribution = residentsData.reduce((acc: any, r: any) => {
      const zone = getResidentZone(r);
      if (zone !== "N/A") acc[zone] = (acc[zone] || 0) + 1;
      return acc;
    }, {});

    const civilStatusCounts = residentsData.reduce((acc: any, r: any) => {
      const status = r.civil_status || "Unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const content = `
Resident Registry Report
========================
Total Residents: ${residentsData.length}

Gender Distribution:
- Male: ${genderCounts.male}
- Female: ${genderCounts.female}

Status Distribution:
- Active: ${statusCounts.active}
- Inactive: ${statusCounts.inactive}
- Pending: ${statusCounts.pending}

Civil Status Distribution:
${Object.entries(civilStatusCounts)
  .map(([status, count]) => `- ${status}: ${count}`)
  .join("\n")}

Zone Distribution:
${Object.entries(zoneDistribution)
  .map(([zone, count]) => `- ${zone}: ${count}`)
  .join("\n")}
    `;

    setIsSending(true);
    try {
      await api.post("/web/captain/reports/send", {
        report_type: "resident_registry",
        title: `Resident Registry Report - ${new Date().toLocaleDateString()}`,
        content: content,
        period: new Date().toLocaleDateString(),
        metadata: {
          total_residents: residentsData.length,
          gender_counts: genderCounts,
          status_counts: statusCounts,
          zone_distribution: zoneDistribution,
          civil_status_counts: civilStatusCounts,
        },
      });

      toast.success("Resident registry sent to Captain successfully!");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send report");
    } finally {
      setIsSending(false);
    }
  };

  const handleRefresh = () => {
    toast.loading("Refreshing...");
    fetchResidents();
    setTimeout(() => {
      toast.dismiss();
      toast.success("Refreshed!");
    }, 500);
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
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (residents.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-theme-text">
              Resident Registry
            </h1>
            <p className="text-sm text-theme-textSecondary mt-1">
              Complete list of all registered residents
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-theme-surface border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
          </button>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <Inbox className="w-16 h-16 text-theme-textSecondary/30" />
            <h3 className="text-lg font-semibold text-theme-text">
              No Residents Found
            </h3>
            <p className="text-sm text-theme-textSecondary max-w-md">
              No residents have been registered yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">
            Resident Registry
          </h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            {total} total residents
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-theme-surface border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
          </button>
          <button
            onClick={handleSendToCaptain}
            disabled={isSending}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Send to Captain
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-xs text-theme-textSecondary font-medium">Total</p>
          <p className="text-2xl font-bold text-theme-text">{total}</p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-xs text-theme-textSecondary font-medium">Active</p>
          <p className="text-2xl font-bold text-green-600">
            {residents.filter((r: any) => r.status === "active").length}
          </p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-xs text-theme-textSecondary font-medium">
            Inactive
          </p>
          <p className="text-2xl font-bold text-red-600">
            {residents.filter((r: any) => r.status === "inactive").length}
          </p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-xs text-theme-textSecondary font-medium">Male</p>
          <p className="text-2xl font-bold text-blue-600">
            {residents.filter((r: any) => r.gender === "Male").length}
          </p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-xs text-theme-textSecondary font-medium">Female</p>
          <p className="text-2xl font-bold text-pink-600">
            {residents.filter((r: any) => r.gender === "Female").length}
          </p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-xs text-theme-textSecondary font-medium">
            Married
          </p>
          <p className="text-2xl font-bold text-purple-600">
            {residents.filter((r: any) => r.civil_status === "Married").length}
          </p>
        </div>
      </div>

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
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          >
            <option value="all">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          >
            <option value="all">All Zones</option>
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                Zone {zone}
              </option>
            ))}
          </select>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          >
            {[10, 20, 50, 100].map((n) => (
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
                  Gender
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Birth Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Civil Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Zone
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
                    colSpan={7}
                    className="px-4 py-8 text-center text-theme-textSecondary"
                  >
                    No residents found
                  </td>
                </tr>
              ) : (
                paginatedResidents.map((resident: any) => (
                  <tr
                    key={resident.id}
                    className="hover:bg-theme-hover transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-theme-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-theme-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-theme-text">
                            {resident.first_name} {resident.middle_name || ""}{" "}
                            {resident.last_name}
                            {resident.suffix && ` ${resident.suffix}`}
                          </p>
                          {resident.phone_number && (
                            <p className="text-xs text-theme-textSecondary flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {resident.phone_number}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-theme-textSecondary">
                      {resident.gender}
                    </td>
                    <td className="px-4 py-3 text-sm text-theme-textSecondary">
                      {resident.birth_date
                        ? formatDate(resident.birth_date)
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-theme-textSecondary">
                      {resident.civil_status}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-theme-primary/10 text-theme-primary">
                        <MapPin className="w-3 h-3" />
                        {getResidentZone(resident)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(resident.status || "active")}`}
                      >
                        {resident.status || "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleView(resident)}
                        className="p-1.5 text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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
          <div className="space-y-4">
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
                  Zone
                </p>
                <p className="font-medium text-theme-text">
                  {getResidentZone(selectedResident)}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Household
                </p>
                <p className="font-medium text-theme-text">
                  {selectedResident.households?.[0]?.household_number || "N/A"}
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
                  Phone
                </p>
                <p className="font-medium text-theme-text">
                  {selectedResident.phone_number || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Status
                </p>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(selectedResident.status || "active")}`}
                >
                  {selectedResident.status || "Active"}
                </span>
              </div>
            </div>
            <div className="pt-4 border-t border-theme flex justify-end">
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
    </div>
  );
}