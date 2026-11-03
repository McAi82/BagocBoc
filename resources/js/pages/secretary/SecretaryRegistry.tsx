// pages/secretary/SecretaryRegistry.tsx

import React, { useState, useEffect, useMemo } from "react";
import {
  User as UserIcon,
  Users,
  MapPin,
  Phone,
  Briefcase,
  GraduationCap,
  Home,
  Heart,
  Shield,
  Calendar as CalendarIcon,
  FileText,
  Printer,
  Eye,
  RefreshCw,
  Loader2,
  Send,
  Inbox,
  AlertCircle,
  Search,
  User,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import ReportDetailModal from "../../components/features/ReportDetailModal";
import { printReport, statusBadge, esc } from "../../utils/printReport";
import { api } from "../../api/apiClient";
import { formatDate, getStatusColor } from "../../utils/format";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import ReportFilters, {
  ReportFilterValue,
  getPresetRange,
  isWithinRange,
} from "../../components/features/ReportFilters";
import toast from "react-hot-toast";

export default function SecretaryRegistry() {
  const { user } = useAuthStore();
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

  const [range, setRange] = useState<ReportFilterValue>({
    preset: "month",
    ...getPresetRange("month"),
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    statusFilter,
    genderFilter,
    zoneFilter,
    range.from,
    range.to,
    itemsPerPage,
  ]);

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

    // ✅ Date range filter (uses created_at)
    filtered = filtered.filter((r: any) =>
      isWithinRange(r.created_at, range.from, range.to),
    );

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
  }, [
    residents,
    searchQuery,
    statusFilter,
    genderFilter,
    zoneFilter,
    range.from,
    range.to,
  ]);

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

  /* ============================================================
     STATS (based on filtered set)
     ============================================================ */
  const stats = useMemo(() => {
    const total = filteredResidents.length;
    const male = filteredResidents.filter(
      (r: any) => r.gender === "Male",
    ).length;
    const female = filteredResidents.filter(
      (r: any) => r.gender === "Female",
    ).length;
    const active = filteredResidents.filter(
      (r: any) => r.status === "active",
    ).length;
    const inactive = filteredResidents.filter(
      (r: any) => r.status === "inactive",
    ).length;
    const married = filteredResidents.filter(
      (r: any) => r.civil_status === "Married",
    ).length;
    const seniors = filteredResidents.filter(
      (r: any) => (r.age || 0) >= 60,
    ).length;
    const minors = filteredResidents.filter(
      (r: any) => (r.age || 0) < 18,
    ).length;

    return {
      total,
      male,
      female,
      active,
      inactive,
      married,
      seniors,
      minors,
      malePct: total ? Math.round((male / total) * 100) : 0,
      femalePct: total ? Math.round((female / total) * 100) : 0,
    };
  }, [filteredResidents]);

  const handleView = (resident: any) => {
    setSelectedResident(resident);
    setShowViewModal(true);
  };

  const handleSendToCaptain = async () => {
    if (filteredResidents.length === 0) {
      toast.error("No resident records to send");
      return;
    }

    const genderCounts = {
      male: stats.male,
      female: stats.female,
    };
    const statusCounts = {
      active: stats.active,
      inactive: stats.inactive,
    };
    const zoneDistribution = filteredResidents.reduce((acc: any, r: any) => {
      const zone = getResidentZone(r);
      if (zone !== "N/A") acc[zone] = (acc[zone] || 0) + 1;
      return acc;
    }, {});

    const periodLabel =
      range.preset === "all"
        ? "All Time"
        : `${range.from} to ${range.to}`;

    const content = `
═══════════════════════════════════════════════
        RESIDENT REGISTRY REPORT
        Barangay Bagocboc, Opol, Misamis Oriental
═══════════════════════════════════════════════

REPORT DETAILS
──────────────
Report Type      : Resident Registry
Period Covered   : ${periodLabel}
Date Generated   : ${new Date().toLocaleString("en-PH", {
      dateStyle: "long",
      timeStyle: "short",
    })}
Generated By     : ${user?.resident
        ? `${user.resident.first_name} ${user.resident.last_name}`
        : user?.email || "Barangay Secretary"}

POPULATION SUMMARY
──────────────────
Total Registered Residents ......... ${stats.total}

GENDER DISTRIBUTION
───────────────────
Male ......................... ${stats.male} (${stats.malePct}%)
Female ....................... ${stats.female} (${stats.femalePct}%)

STATUS DISTRIBUTION
───────────────────
Active ....................... ${stats.active}
Inactive ..................... ${stats.inactive}

OTHER DEMOGRAPHICS
──────────────────
Married ...................... ${stats.married}
Senior Citizens (60+) ........ ${stats.seniors}
Minors (below 18) ............ ${stats.minors}

DISTRIBUTION BY ZONE
────────────────────
${Object.entries(zoneDistribution)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(
          ([zone, count]) =>
            `Zone ${zone.padEnd(3)} .................... ${String(count).padStart(4)}`,
        )
        .join("\n")}

───────────────────────────────────────────────
This is a system-generated report submitted to the
Office of the Punong Barangay for review and approval.

Total Records: ${stats.total}
═══════════════════════════════════════════════
`.trim();

    setIsSending(true);
    try {
      await api.post("/web/captain/reports/send", {
        report_type: "resident_registry",
        title: `Resident Registry Report — ${periodLabel}`,
        content,
        period: periodLabel,
        metadata: {
          total_residents: filteredResidents.length,
          gender_counts: genderCounts,
          status_counts: statusCounts,
          zone_distribution: zoneDistribution,
          filter_preset: range.preset,
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

  const handlePrint = () => {
    const periodLabel =
      range.preset === "all" ? "All Time" : `${range.from} to ${range.to}`;

    const ok = printReport({
      title: "Resident Registry Report",
      subtitle: "Official Registry of Barangay Residents",
      periodLabel,
      columns: [
        {
          key: "idx",
          label: "#",
          width: "36px",
          render: (_row, i) => `<span class="row-num">${i + 1}</span>`,
        },
        {
          key: "name",
          label: "Full Name",
          render: (r) =>
            esc(
              `${r.first_name || ""} ${r.middle_name || ""} ${r.last_name || ""}${r.suffix ? " " + r.suffix : ""
                }`.trim(),
            ),
        },
        { key: "gender", label: "Gender", render: (r) => esc(r.gender) },
        {
          key: "age",
          label: "Age",
          align: "right",
          render: (r) => esc(r.age ?? "—"),
        },
        {
          key: "civil_status",
          label: "Civil Status",
          render: (r) => esc(r.civil_status),
        },
        {
          key: "phone_number",
          label: "Contact",
          render: (r) => esc(r.phone_number),
        },
        {
          key: "zone",
          label: "Zone",
          render: (r) => esc(getResidentZone(r)),
        },
        {
          key: "status",
          label: "Status",
          render: (r) => statusBadge(r.status || "active"),
        },
      ],
      rows: filteredResidents,
      summary: [
        { label: "Total", value: stats.total },
        { label: "Male", value: stats.male, color: "#2563eb" },
        { label: "Female", value: stats.female, color: "#db2777" },
        { label: "Active", value: stats.active, color: "#059669" },
        { label: "Seniors", value: stats.seniors, color: "#d97706" },
        { label: "Minors", value: stats.minors, color: "#7c3aed" },
      ],
      signatories: {
        left: {
          name: "Concordio A. Esber",
          title: "Barangay Secretary",
        },
        right: {
          name: "Marcos P. Gonzales",
          title: "Punong Barangay",
        },
      },
    });

    if (!ok) toast.error("Please allow popups to print the report");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">
            Resident Registry
          </h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            Official registry of all registered residents
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
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-theme-surface border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <Printer className="w-4 h-4 text-theme-textSecondary" /> Print
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

      {/* ✅ Filter bar */}
      <ReportFilters
        value={range}
        onChange={setRange}
        extraFilters={
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
              <input
                type="text"
                placeholder="Search name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 border border-theme rounded-lg bg-theme-surface text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none w-56"
              />
            </div>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="px-3 py-1.5 border border-theme rounded-lg bg-theme-surface text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
            >
              <option value="all">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-theme rounded-lg bg-theme-surface text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="px-3 py-1.5 border border-theme rounded-lg bg-theme-surface text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
            >
              <option value="all">All Zones</option>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </>
        }
      />

      {/* ✅ Executive stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-theme-surface border border-theme rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-theme-textSecondary font-semibold">
            Total
          </p>
          <p className="text-2xl font-bold text-theme-text mt-1">
            {stats.total}
          </p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-theme-textSecondary font-semibold">
            Male
          </p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {stats.male}
          </p>
          <p className="text-[11px] text-theme-textSecondary mt-0.5">
            {stats.malePct}%
          </p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-theme-textSecondary font-semibold">
            Female
          </p>
          <p className="text-2xl font-bold text-pink-600 mt-1">
            {stats.female}
          </p>
          <p className="text-[11px] text-theme-textSecondary mt-0.5">
            {stats.femalePct}%
          </p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-theme-textSecondary font-semibold">
            Active
          </p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {stats.active}
          </p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-theme-textSecondary font-semibold">
            Seniors
          </p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {stats.seniors}
          </p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-theme-textSecondary font-semibold">
            Minors
          </p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {stats.minors}
          </p>
        </div>
      </div>

      {/* ✅ Professional report table */}
      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
        {/* Report header band */}
        <div className="px-6 py-4 border-b border-theme bg-theme-background/50 flex items-center gap-3">
          <FileText className="w-5 h-5 text-theme-primary" />
          <div>
            <h2 className="font-semibold text-theme-text">
              Registry Listing
            </h2>
            <p className="text-xs text-theme-textSecondary">
              {stats.total} record{stats.total !== 1 ? "s" : ""} shown
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-theme-background border-b border-theme">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                  Gender
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                  Age
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                  Civil Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                  Zone
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {paginatedResidents.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-theme-textSecondary"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Inbox className="w-10 h-10 text-theme-textSecondary/30" />
                      <p className="text-sm font-medium">
                        No residents match the current filters
                      </p>
                      <p className="text-xs">
                        Try changing the date range or clearing filters
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedResidents.map((resident: any, idx: number) => (
                  <tr
                    key={resident.id}
                    className="hover:bg-theme-hover transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-theme-textSecondary font-mono">
                      {startIndex + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-theme-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-theme-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-theme-text truncate">
                            {resident.first_name} {resident.middle_name || ""}{" "}
                            {resident.last_name}
                            {resident.suffix ? ` ${resident.suffix}` : ""}
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
                      {resident.gender || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-theme-text">
                      {resident.age ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-theme-textSecondary">
                      {resident.civil_status || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-theme-textSecondary">
                      {resident.phone_number || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-theme-primary/10 text-theme-primary">
                        <MapPin className="w-3 h-3" />
                        {getResidentZone(resident)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(
                          resident.status || "active",
                        )}`}
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

        {filteredResidents.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredResidents.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        )}
      </div>

      <ReportDetailModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedResident(null);
        }}
        title="Resident Details"
        badge={
          selectedResident
            ? {
              label: selectedResident.status || "Active",
              className: getStatusColor(selectedResident.status || "active"),
            }
            : undefined
        }
        headerIcon={UserIcon}
        subtitle={
          selectedResident && (
            <div>
              <p className="font-semibold text-theme-text text-base">
                {selectedResident.first_name} {selectedResident.middle_name || ""}{" "}
                {selectedResident.last_name}
                {selectedResident.suffix ? ` ${selectedResident.suffix}` : ""}
              </p>
              <p className="text-xs">
                {selectedResident.gender} • {selectedResident.age ?? "—"} yrs •{" "}
                {selectedResident.civil_status}
              </p>
            </div>
          )
        }
        sections={
          selectedResident
            ? [
              {
                title: "Personal Information",
                icon: UserIcon,
                rows: [
                  {
                    label: "Full Name",
                    value: `${selectedResident.first_name} ${selectedResident.middle_name || ""
                      } ${selectedResident.last_name}`.trim(),
                    icon: UserIcon,
                    span: 2,
                  },
                  { label: "Gender", value: selectedResident.gender || "—" },
                  { label: "Age", value: selectedResident.age ?? "—" },
                  {
                    label: "Birth Date",
                    value: selectedResident.birth_date
                      ? formatDate(selectedResident.birth_date)
                      : "—",
                    icon: CalendarIcon,
                  },
                  {
                    label: "Place of Birth",
                    value: selectedResident.place_of_birth || "—",
                    icon: MapPin,
                  },
                  {
                    label: "Civil Status",
                    value: selectedResident.civil_status || "—",
                    icon: Heart,
                  },
                  {
                    label: "Citizenship",
                    value: selectedResident.citizenship || "Filipino",
                  },
                  {
                    label: "Voter Status",
                    value: selectedResident.voter_status || "Not Registered",
                    icon: Shield,
                  },
                ],
              },
              {
                title: "Contact & Address",
                icon: Phone,
                rows: [
                  {
                    label: "Phone Number",
                    value: selectedResident.phone_number || "—",
                    icon: Phone,
                  },
                  {
                    label: "Zone",
                    value: getResidentZone(selectedResident),
                    icon: MapPin,
                  },
                  {
                    label: "Household #",
                    value:
                      selectedResident.households?.[0]?.household_number || "—",
                    icon: Home,
                  },
                  {
                    label: "Street",
                    value: selectedResident.households?.[0]?.address?.street || "—",
                    icon: MapPin,
                  },
                ],
              },
              {
                title: "Background",
                icon: Briefcase,
                rows: [
                  {
                    label: "Education",
                    value: selectedResident.education_attainment || "—",
                    icon: GraduationCap,
                  },
                  {
                    label: "Occupation",
                    value: selectedResident.occupation || "—",
                    icon: Briefcase,
                  },
                ],
              },
            ]
            : []
        }
        footerActions={
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print Registry
          </button>
        }
      />
    </div>
  );
}