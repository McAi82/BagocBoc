// src/pages/bns/reports/HouseholdSurveyResults.tsx

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Search,
    Home,
    Users,
    Eye,
    Download,
    RefreshCw,
    Loader2,
    AlertCircle,
    Inbox,
    X,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    PhilippinePeso,
    HeartHandshake,
} from "lucide-react";
import { api } from "../../../api/apiClient";
import toast from "react-hot-toast";

// ============================================
// TYPES (based on HouseholdController::indexCensus / showCensus)
// ============================================

interface FoodProductionType {
    id: number;
    name?: string;
}

interface HouseholdEnvironment {
    toilet_type?: string;
    water_source?: string;
    garbage_disposal?: string;
    tenure_status?: string;
    couple_practices_family_planning?: boolean | number;
    uses_iodized_salt?: string;
    OSY_count?: number;
    ISY_count?: number;
    type_of_dwelling_unit?: string;
}

interface CensusRecord {
    id: number;
    household_id: number;
    census_year: number;
    census_date: string;
    monthly_income?: number | string | null;
    data_status?: string;
    household?: {
        id: number;
        household_number?: string;
        household_tracking_number?: string;
        address?: {
            zone?: number | string;
            street?: string;
            subdivision?: string;
            barangay_zone?: { name?: string };
            barangayZone?: { name?: string };
        };
        residents?: any[];
    };
    household_environment?: HouseholdEnvironment;
    householdEnvironment?: HouseholdEnvironment;
    food_production_types?: FoodProductionType[];
    foodProductionTypes?: FoodProductionType[];
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

// ============================================
// HELPERS
// ============================================

const getEnv = (r: CensusRecord): HouseholdEnvironment =>
    r.household_environment || r.householdEnvironment || {};

const getFood = (r: CensusRecord): FoodProductionType[] =>
    r.food_production_types || r.foodProductionTypes || [];

const getZoneLabel = (r: CensusRecord): string => {
    const a = r.household?.address;
    const name = a?.barangay_zone?.name || a?.barangayZone?.name;
    if (name) return name;
    if (a?.zone !== undefined && a?.zone !== null && a?.zone !== "")
        return `Zone ${a.zone}`;
    return "—";
};

const getAddress = (r: CensusRecord): string => {
    const a = r.household?.address;
    return [a?.street, a?.subdivision].filter(Boolean).join(", ") || "—";
};

const toNumber = (v: any): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const peso = (v: any) =>
    new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        maximumFractionDigits: 0,
    }).format(toNumber(v));

const formatDate = (date?: string) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const yesNo = (v: any) => (v === true || v === 1 || v === "1" ? "Yes" : "No");

const extractList = (payload: any): CensusRecord[] => {
    let data = payload?.data ?? payload;
    if (data?.data) data = data.data;
    return Array.isArray(data) ? data : [];
};

// ============================================
// COMPONENT
// ============================================

export default function HouseholdSurveyResults() {
    const navigate = useNavigate();

    const [records, setRecords] = useState<CensusRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [yearFilter, setYearFilter] = useState<string>("all");
    const [zoneFilter, setZoneFilter] = useState<string>("all");

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Detail modal
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [detail, setDetail] = useState<CensusRecord | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);

    // ---------- Fetch ----------
    const fetchRecords = useCallback(async () => {
        setIsLoading(true);
        setIsError(false);
        try {
            const response = await api.get("/web/census/records");
            setRecords(extractList(response.data));
        } catch (error) {
            console.error("Error fetching survey results:", error);
            setIsError(true);
            toast.error("Failed to load household survey results");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const openDetail = async (id: number) => {
        setSelectedId(id);
        setDetail(null);
        setIsDetailLoading(true);
        try {
            const response = await api.get(`/web/census/records/${id}`);
            let data = response.data?.data ?? response.data;
            if (data?.data) data = data.data;
            setDetail(data);
        } catch (error) {
            console.error("Error fetching survey detail:", error);
            toast.error("Failed to load survey details");
            setSelectedId(null);
        } finally {
            setIsDetailLoading(false);
        }
    };

    const closeDetail = () => {
        setSelectedId(null);
        setDetail(null);
    };

    // ---------- Filter options ----------
    const years = useMemo(
        () =>
            Array.from(new Set(records.map((r) => r.census_year)))
                .filter(Boolean)
                .sort((a, b) => b - a),
        [records],
    );

    const zones = useMemo(
        () =>
            Array.from(new Set(records.map(getZoneLabel)))
                .filter((z) => z !== "—")
                .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
        [records],
    );

    // ---------- Filtering ----------
    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return records.filter((r) => {
            if (yearFilter !== "all" && String(r.census_year) !== yearFilter)
                return false;
            if (zoneFilter !== "all" && getZoneLabel(r) !== zoneFilter)
                return false;
            if (!q) return true;
            const haystack = [
                r.household?.household_number,
                r.household?.household_tracking_number,
                getAddress(r),
                getZoneLabel(r),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [records, searchQuery, yearFilter, zoneFilter]);

    // ---------- Summary stats (based on filtered rows) ----------
    const summary = useMemo(() => {
        const total = filtered.length;
        const withIncome = filtered.filter(
            (r) => r.monthly_income !== null && r.monthly_income !== undefined,
        );
        const avgIncome = withIncome.length
            ? withIncome.reduce((s, r) => s + toNumber(r.monthly_income), 0) /
              withIncome.length
            : 0;
        const familyPlanning = filtered.filter((r) =>
            ["Yes"].includes(yesNo(getEnv(r).couple_practices_family_planning)),
        ).length;
        const uniqueHouseholds = new Set(filtered.map((r) => r.household_id))
            .size;
        return { total, uniqueHouseholds, avgIncome, familyPlanning };
    }, [filtered]);

    // ---------- Pagination ----------
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, yearFilter, zoneFilter, itemsPerPage]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filtered.length);
    const paginated = useMemo(
        () => filtered.slice(startIndex, endIndex),
        [filtered, startIndex, endIndex],
    );

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [totalPages, currentPage]);

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;
        if (totalPages <= maxVisible + 2) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
            return pages;
        }
        pages.push(1);
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);
        if (currentPage <= 3) {
            start = 2;
            end = Math.min(4, totalPages - 1);
        } else if (currentPage >= totalPages - 2) {
            start = Math.max(2, totalPages - 3);
            end = totalPages - 1;
        }
        if (start > 2) pages.push("...");
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < totalPages - 1) pages.push("...");
        pages.push(totalPages);
        return pages;
    };

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    // ---------- CSV export (filtered rows) ----------
    const handleExport = () => {
        if (filtered.length === 0) {
            toast.error("No survey results to export");
            return;
        }
        const header = [
            "Household No.",
            "Tracking No.",
            "Zone",
            "Address",
            "Census Year",
            "Census Date",
            "Monthly Income",
            "Dwelling Type",
            "Tenure",
            "Toilet",
            "Water Source",
            "Garbage Disposal",
            "Family Planning",
            "Iodized Salt",
            "OSY",
            "ISY",
            "Food Production",
        ];
        const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const rows = filtered.map((r) => {
            const env = getEnv(r);
            return [
                r.household?.household_number,
                r.household?.household_tracking_number,
                getZoneLabel(r),
                getAddress(r),
                r.census_year,
                r.census_date,
                r.monthly_income,
                env.type_of_dwelling_unit,
                env.tenure_status,
                env.toilet_type,
                env.water_source,
                env.garbage_disposal,
                yesNo(env.couple_practices_family_planning),
                env.uses_iodized_salt,
                env.OSY_count,
                env.ISY_count,
                getFood(r)
                    .map((f) => f.name)
                    .filter(Boolean)
                    .join("; "),
            ]
                .map(esc)
                .join(",");
        });
        const csv = [header.map(esc).join(","), ...rows].join("\r\n");
        const blob = new Blob(["\uFEFF" + csv], {
            type: "text/csv;charset=utf-8;",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `household_survey_results_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success("Export successful");
    };

    // ============================================
    // STATES
    // ============================================

    if (isLoading && records.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
                    <p className="text-sm text-theme-textSecondary">
                        Loading survey results...
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
                        Failed to Load Survey Results
                    </h3>
                    <button
                        onClick={fetchRecords}
                        className="mt-4 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const detailEnv = detail ? getEnv(detail) : null;

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/barangay-bagocboc/bns")}
                        className="p-2 rounded-lg hover:bg-theme-hover transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-theme-textSecondary" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-theme-text">
                            Household Survey Results
                        </h1>
                        <p className="text-sm text-theme-textSecondary">
                            {filtered.length} survey record(s) found
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                    <button
                        onClick={fetchRecords}
                        className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
                    >
                        <RefreshCw className="w-4 h-4 text-theme-textSecondary" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-theme-textSecondary">
                        <Home className="w-4 h-4" />
                        <p className="text-sm">Surveys</p>
                    </div>
                    <p className="text-2xl font-bold text-theme-text mt-1">
                        {summary.total}
                    </p>
                </div>
                <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-theme-textSecondary">
                        <Users className="w-4 h-4" />
                        <p className="text-sm">Households Covered</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                        {summary.uniqueHouseholds}
                    </p>
                </div>
                <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-theme-textSecondary">
                        <PhilippinePeso className="w-4 h-4" />
                        <p className="text-sm">Avg. Monthly Income</p>
                    </div>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                        {peso(summary.avgIncome)}
                    </p>
                </div>
                <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-theme-textSecondary">
                        <HeartHandshake className="w-4 h-4" />
                        <p className="text-sm">Practicing Family Planning</p>
                    </div>
                    <p className="text-2xl font-bold text-purple-600 mt-1">
                        {summary.familyPlanning}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                        <input
                            type="text"
                            placeholder="Search by household number, street or zone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-theme-surface border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none placeholder:text-theme-textSecondary"
                        />
                    </div>
                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary outline-none"
                    >
                        <option value="all">All years</option>
                        {years.map((y) => (
                            <option key={y} value={String(y)}>
                                {y}
                            </option>
                        ))}
                    </select>
                    <select
                        value={zoneFilter}
                        onChange={(e) => setZoneFilter(e.target.value)}
                        className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary outline-none"
                    >
                        <option value="all">All zones</option>
                        {zones.map((z) => (
                            <option key={z} value={z}>
                                {z}
                            </option>
                        ))}
                    </select>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary outline-none"
                    >
                        {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                                {n} / page
                            </option>
                        ))}
                    </select>
                </div>

                {filtered.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-theme flex items-center justify-between text-sm text-theme-textSecondary flex-wrap gap-2">
                        <span>
                            Showing{" "}
                            <span className="font-semibold text-theme-text">
                                {startIndex + 1}–{endIndex}
                            </span>{" "}
                            of{" "}
                            <span className="font-semibold text-theme-text">
                                {filtered.length}
                            </span>{" "}
                            surveys
                        </span>
                        <span className="text-xs">
                            Page {currentPage} of {totalPages}
                        </span>
                    </div>
                )}
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="text-center py-12 bg-theme-surface border border-theme rounded-xl">
                    <Inbox className="w-12 h-12 mx-auto text-theme-textSecondary mb-4" />
                    <h3 className="text-lg font-semibold text-theme-text">
                        No survey results found
                    </h3>
                    <p className="text-sm text-theme-textSecondary">
                        {searchQuery ||
                        yearFilter !== "all" ||
                        zoneFilter !== "all"
                            ? "Try adjusting your filters"
                            : "No household surveys have been recorded yet."}
                    </p>
                </div>
            ) : (
                <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-theme-background border-b border-theme">
                                <tr>
                                    {[
                                        "Household",
                                        "Zone / Address",
                                        "Year",
                                        "Census Date",
                                        "Monthly Income",
                                        "Dwelling",
                                        "Toilet / Water",
                                        "Action",
                                    ].map((h, i, arr) => (
                                        <th
                                            key={h}
                                            className={`px-4 py-3 text-xs font-medium text-theme-textSecondary uppercase tracking-wider ${
                                                i === arr.length - 1
                                                    ? "text-right"
                                                    : "text-left"
                                            }`}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-theme">
                                {paginated.map((r) => {
                                    const env = getEnv(r);
                                    return (
                                        <tr
                                            key={r.id}
                                            className="hover:bg-theme-hover transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-theme-text">
                                                    {r.household
                                                        ?.household_number ||
                                                        `#${r.household_id}`}
                                                </p>
                                                <p className="text-xs text-theme-textSecondary">
                                                    {r.household
                                                        ?.household_tracking_number ||
                                                        ""}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-theme-text">
                                                    {getZoneLabel(r)}
                                                </p>
                                                <p className="text-xs text-theme-textSecondary">
                                                    {getAddress(r)}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-theme-text">
                                                {r.census_year}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-theme-textSecondary">
                                                {formatDate(r.census_date)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-theme-text">
                                                {r.monthly_income !== null &&
                                                r.monthly_income !== undefined
                                                    ? peso(r.monthly_income)
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-theme-text">
                                                {env.type_of_dwelling_unit ||
                                                    "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-theme-text">
                                                    {env.toilet_type || "—"}
                                                </p>
                                                <p className="text-xs text-theme-textSecondary">
                                                    {env.water_source || "—"}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() =>
                                                        openDetail(r.id)
                                                    }
                                                    className="p-1.5 rounded-lg hover:bg-theme-hover transition-colors text-theme-textSecondary hover:text-theme-primary"
                                                    title="View details"
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

                    {totalPages > 1 && (
                        <div className="px-4 py-4 border-t border-theme flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p className="text-sm text-theme-textSecondary order-2 sm:order-1">
                                Showing{" "}
                                <span className="font-semibold text-theme-text">
                                    {startIndex + 1}–{endIndex}
                                </span>{" "}
                                of{" "}
                                <span className="font-semibold text-theme-text">
                                    {filtered.length}
                                </span>
                            </p>
                            <div className="flex items-center gap-1 order-1 sm:order-2">
                                <button
                                    onClick={() => goToPage(1)}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-theme hover:bg-theme-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-theme-textSecondary"
                                    title="First page"
                                >
                                    <ChevronsLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-theme hover:bg-theme-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-theme-textSecondary"
                                    title="Previous page"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <div className="flex items-center gap-1 mx-1">
                                    {getPageNumbers().map((page, index) => {
                                        if (page === "...") {
                                            return (
                                                <span
                                                    key={`e-${index}`}
                                                    className="px-2 text-theme-textSecondary text-sm"
                                                >
                                                    …
                                                </span>
                                            );
                                        }
                                        const n = page as number;
                                        return (
                                            <button
                                                key={n}
                                                onClick={() => goToPage(n)}
                                                className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                                                    n === currentPage
                                                        ? "bg-theme-primary text-white shadow-sm"
                                                        : "border border-theme text-theme-text hover:bg-theme-hover"
                                                }`}
                                            >
                                                {n}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-theme hover:bg-theme-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-theme-textSecondary"
                                    title="Next page"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => goToPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-theme hover:bg-theme-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-theme-textSecondary"
                                    title="Last page"
                                >
                                    <ChevronsRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Detail modal */}
            {selectedId !== null && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={closeDetail}
                >
                    <div
                        className="bg-theme-surface rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-theme"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between p-5 border-b border-theme">
                            <div>
                                <h3 className="text-lg font-semibold text-theme-text">
                                    Household{" "}
                                    {detail?.household?.household_number || ""}
                                </h3>
                                {detail && (
                                    <p className="text-sm text-theme-textSecondary">
                                        {getZoneLabel(detail)} ·{" "}
                                        {getAddress(detail)} · Census{" "}
                                        {detail.census_year}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={closeDetail}
                                className="p-1.5 rounded-lg hover:bg-theme-hover text-theme-textSecondary"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-6">
                            {isDetailLoading || !detail || !detailEnv ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-6 h-6 animate-spin text-theme-primary" />
                                </div>
                            ) : (
                                <>
                                    <section>
                                        <h4 className="text-sm font-semibold text-theme-text mb-3">
                                            Survey Information
                                        </h4>
                                        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                            {[
                                                [
                                                    "Census date",
                                                    formatDate(
                                                        detail.census_date,
                                                    ),
                                                ],
                                                [
                                                    "Monthly income",
                                                    detail.monthly_income !==
                                                        null &&
                                                    detail.monthly_income !==
                                                        undefined
                                                        ? peso(
                                                              detail.monthly_income,
                                                          )
                                                        : "—",
                                                ],
                                                [
                                                    "Dwelling type",
                                                    detailEnv.type_of_dwelling_unit ||
                                                        "—",
                                                ],
                                                [
                                                    "Tenure status",
                                                    detailEnv.tenure_status ||
                                                        "—",
                                                ],
                                                [
                                                    "Toilet type",
                                                    detailEnv.toilet_type ||
                                                        "—",
                                                ],
                                                [
                                                    "Water source",
                                                    detailEnv.water_source ||
                                                        "—",
                                                ],
                                                [
                                                    "Garbage disposal",
                                                    detailEnv.garbage_disposal ||
                                                        "—",
                                                ],
                                                [
                                                    "Uses iodized salt",
                                                    detailEnv.uses_iodized_salt ||
                                                        "—",
                                                ],
                                                [
                                                    "Practices family planning",
                                                    yesNo(
                                                        detailEnv.couple_practices_family_planning,
                                                    ),
                                                ],
                                                [
                                                    "Out-of-school youth (OSY)",
                                                    detailEnv.OSY_count ?? 0,
                                                ],
                                                [
                                                    "In-school youth (ISY)",
                                                    detailEnv.ISY_count ?? 0,
                                                ],
                                                [
                                                    "Food production",
                                                    getFood(detail)
                                                        .map((f) => f.name)
                                                        .filter(Boolean)
                                                        .join(", ") || "—",
                                                ],
                                            ].map(([label, value]) => (
                                                <div key={String(label)}>
                                                    <dt className="text-xs text-theme-textSecondary">
                                                        {label}
                                                    </dt>
                                                    <dd className="text-theme-text font-medium">
                                                        {value}
                                                    </dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </section>

                                    <section>
                                        <h4 className="text-sm font-semibold text-theme-text mb-3">
                                            Household Members (
                                            {detail.household?.residents
                                                ?.length ?? 0}
                                            )
                                        </h4>
                                        {detail.household?.residents?.length ? (
                                            <ul className="divide-y divide-theme border border-theme rounded-lg">
                                                {detail.household.residents.map(
                                                    (res: any) => (
                                                        <li
                                                            key={res.id}
                                                            className="px-3 py-2 flex items-center justify-between text-sm"
                                                        >
                                                            <span className="text-theme-text">
                                                                {[
                                                                    res.first_name,
                                                                    res.middle_name,
                                                                    res.last_name,
                                                                ]
                                                                    .filter(
                                                                        Boolean,
                                                                    )
                                                                    .join(
                                                                        " ",
                                                                    ) ||
                                                                    `Resident #${res.id}`}
                                                            </span>
                                                            <span className="text-xs text-theme-textSecondary">
                                                                {res.pivot
                                                                    ?.relationship_to_household ||
                                                                    ""}
                                                                {res.pivot
                                                                    ?.is_primary
                                                                    ? " · Head"
                                                                    : ""}
                                                            </span>
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-theme-textSecondary">
                                                No members linked to this
                                                household.
                                            </p>
                                        )}
                                    </section>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}