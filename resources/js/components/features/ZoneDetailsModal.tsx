// src/components/features/ZoneDetailsModal.tsx

import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Users,
    Home,
    X,
    MapPin,
    User,
    ArrowRight,
    Eye,
    MapPinned,
    KeyRound,
    Building2,
    TrendingUp,
} from "lucide-react";

interface ZoneDetailsModalProps {
    isOpen: boolean;
    zoneName: string | null;
    households: any[];
    onClose: () => void;
}

export default function ZoneDetailsModal({
    isOpen,
    zoneName,
    households,
    onClose,
}: ZoneDetailsModalProps) {
    const navigate = useNavigate();

    // ============================================
    // ANALYTICS
    // ============================================
    const analytics = useMemo(() => {
        const empty = {
            totalHouseholds: 0,
            totalResidents: 0,
            maleCount: 0,
            femaleCount: 0,
            headCount: 0,
            seniorCount: 0,
            minorCount: 0,
            // visit coverage
            visitedCount: 0,
            notVisitedCount: 0,
            visitCoveragePct: 0,
            // tenure breakdown
            ownedCount: 0,
            rentCount: 0,
            rentFreeCount: 0,
            informalCount: 0,
            unknownTenureCount: 0,
            ownedPct: 0,
            rentPct: 0,
            rentFreePct: 0,
            informalPct: 0,
            unknownTenurePct: 0,
        };

        if (!households || households.length === 0) return empty;

        let male = 0;
        let female = 0;
        let head = 0;
        let senior = 0;
        let minor = 0;
        let visited = 0;

        // tenure counters
        let owned = 0;
        let rent = 0;
        let rentFree = 0;
        let informal = 0;
        let unknownTenure = 0;

        households.forEach((h: any) => {
            // -------- Visit signal: household has a geotag --------
            const hasGeotag =
                !!h.geotag ||
                !!h.geotag_id ||
                (Array.isArray(h.geotags) && h.geotags.length > 0) ||
                // Fallback: legacy field shape
                (h.latitude !== undefined && h.longitude !== undefined);
            if (hasGeotag) visited++;

            // -------- Tenure: from latest census record --------
            const census = Array.isArray(h.census_records)
                ? h.census_records[0] || h.censusRecords?.[0]
                : h.censusRecords?.[0] || h.censusRecord;

            const tenure =
                census?.household_environment?.tenure_status ||
                census?.householdEnvironment?.tenure_status ||
                census?.tenure_status ||
                null;

            if (!tenure) unknownTenure++;
            else {
                const t = String(tenure).toLowerCase();
                if (t.includes("owned")) owned++;
                else if (t.includes("rent free") || t.includes("free"))
                    rentFree++;
                else if (t.includes("informal")) informal++;
                else if (t.includes("rent")) rent++;
                else unknownTenure++;
            }

            // -------- Residents stats --------
            const residents = h.residents || [];
            residents.forEach((r: any) => {
                if (r.gender === "Male") male++;
                else if (r.gender === "Female") female++;

                const isHead =
                    r.pivot?.is_primary === true ||
                    r.pivot?.relationship_to_household === "Head" ||
                    r.is_primary === true;
                if (isHead) head++;

                if (r.age !== undefined && r.age !== null) {
                    if (r.age >= 60) senior++;
                    if (r.age < 18) minor++;
                }
            });
        });

        const total = households.length;
        const totalResidents = male + female;

        // tenure percentages (of households)
        const ownedPct = total > 0 ? Math.round((owned / total) * 100) : 0;
        const rentPct = total > 0 ? Math.round((rent / total) * 100) : 0;
        const rentFreePct = total > 0 ? Math.round((rentFree / total) * 100) : 0;
        const informalPct = total > 0 ? Math.round((informal / total) * 100) : 0;
        const unknownTenurePct =
            total > 0 ? Math.max(0, 100 - ownedPct - rentPct - rentFreePct - informalPct) : 0;

        const visitCoveragePct =
            total > 0 ? Math.round((visited / total) * 100) : 0;

        return {
            totalHouseholds: total,
            totalResidents,
            maleCount: male,
            femaleCount: female,
            headCount: head,
            seniorCount: senior,
            minorCount: minor,
            visitedCount: visited,
            notVisitedCount: total - visited,
            visitCoveragePct,
            ownedCount: owned,
            rentCount: rent,
            rentFreeCount: rentFree,
            informalCount: informal,
            unknownTenureCount: unknownTenure,
            ownedPct,
            rentPct,
            rentFreePct,
            informalPct,
            unknownTenurePct,
        };
    }, [households]);

    if (!isOpen) return null;

    const getFamilyName = (h: any) => {
        const residents = h.residents || [];
        const hoh = residents.find(
            (r: any) =>
                r.pivot?.is_primary === true ||
                r.pivot?.relationship_to_household === "Head" ||
                r.is_primary === true,
        );
        const target = hoh || residents[0];
        if (!target) return "Unknown";
        return `${target.last_name || "Unknown"}`;
    };

    const getHeadName = (h: any) => {
        const residents = h.residents || [];
        const hoh = residents.find(
            (r: any) =>
                r.pivot?.is_primary === true ||
                r.pivot?.relationship_to_household === "Head" ||
                r.is_primary === true,
        );
        const target = hoh || residents[0];
        if (!target) return "Unknown";
        return `${target.first_name || ""} ${target.last_name || ""}`.trim();
    };

    const getAddress = (h: any) => {
        const addr = h.address || {};
        const parts = [];
        if (addr.street) parts.push(addr.street);
        if (addr.subdivision) parts.push(addr.subdivision);
        return parts.join(", ") || "No address";
    };

    const getTenure = (h: any) => {
        const census = Array.isArray(h.census_records)
            ? h.census_records[0] || h.censusRecords?.[0]
            : h.censusRecords?.[0] || h.censusRecord;
        return (
            census?.household_environment?.tenure_status ||
            census?.householdEnvironment?.tenure_status ||
            census?.tenure_status ||
            "Unknown"
        );
    };

    const isVisited = (h: any) =>
        !!h.geotag ||
        !!h.geotag_id ||
        (Array.isArray(h.geotags) && h.geotags.length > 0) ||
        (h.latitude !== undefined && h.longitude !== undefined);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-theme-surface border border-theme rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-theme-surface shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-theme-primary/10">
                            <MapPin className="w-6 h-6 text-theme-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-theme-text">
                                {zoneName || "Zone"}
                            </h2>
                            <p className="text-xs text-theme-textSecondary">
                                {analytics.totalHouseholds} household
                                {analytics.totalHouseholds !== 1 ? "s" : ""} •{" "}
                                {analytics.totalResidents} resident
                                {analytics.totalResidents !== 1 ? "s" : ""}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-theme-hover transition-colors text-theme-textSecondary hover:text-theme-text"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {/* Analytics */}
                    <div className="p-6 border-b border-theme bg-theme-background space-y-6">
                        {/* --- Basic counts --- */}
                        <div>
                            <h3 className="text-xs font-semibold text-theme-textSecondary uppercase tracking-wider mb-3">
                                Zone Snapshot
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-theme-surface rounded-xl border border-theme p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Home className="w-4 h-4 text-blue-500" />
                                        <p className="text-xs text-theme-textSecondary font-medium">
                                            Households
                                        </p>
                                    </div>
                                    <p className="text-2xl font-bold text-theme-text">
                                        {analytics.totalHouseholds}
                                    </p>
                                </div>
                                <div className="bg-theme-surface rounded-xl border border-theme p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Users className="w-4 h-4 text-green-500" />
                                        <p className="text-xs text-theme-textSecondary font-medium">
                                            Residents
                                        </p>
                                    </div>
                                    <p className="text-2xl font-bold text-theme-text">
                                        {analytics.totalResidents}
                                    </p>
                                </div>
                                <div className="bg-theme-surface rounded-xl border border-theme p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <User className="w-4 h-4 text-blue-500" />
                                        <p className="text-xs text-theme-textSecondary font-medium">
                                            Male
                                        </p>
                                    </div>
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        {analytics.maleCount}
                                    </p>
                                </div>
                                <div className="bg-theme-surface rounded-xl border border-theme p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <User className="w-4 h-4 text-pink-500" />
                                        <p className="text-xs text-theme-textSecondary font-medium">
                                            Female
                                        </p>
                                    </div>
                                    <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                                        {analytics.femaleCount}
                                    </p>
                                </div>
                                <div className="bg-theme-surface rounded-xl border border-theme p-3">
                                    <p className="text-xs text-theme-textSecondary font-medium mb-1">
                                        Heads of Family
                                    </p>
                                    <p className="text-2xl font-bold text-theme-text">
                                        {analytics.headCount}
                                    </p>
                                </div>
                                <div className="bg-theme-surface rounded-xl border border-theme p-3">
                                    <p className="text-xs text-theme-textSecondary font-medium mb-1">
                                        Senior Citizens
                                    </p>
                                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                        {analytics.seniorCount}
                                    </p>
                                </div>
                                <div className="bg-theme-surface rounded-xl border border-theme p-3">
                                    <p className="text-xs text-theme-textSecondary font-medium mb-1">
                                        Minors
                                    </p>
                                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                        {analytics.minorCount}
                                    </p>
                                </div>
                                <div className="bg-theme-surface rounded-xl border border-theme p-3">
                                    <p className="text-xs text-theme-textSecondary font-medium mb-1">
                                        Avg Household Size
                                    </p>
                                    <p className="text-2xl font-bold text-theme-text">
                                        {analytics.totalHouseholds > 0
                                            ? (
                                                analytics.totalResidents / analytics.totalHouseholds
                                            ).toFixed(1)
                                            : "0.0"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* --- Visit coverage --- */}
                        <div>
                            <h3 className="text-xs font-semibold text-theme-textSecondary uppercase tracking-wider mb-3 flex items-center gap-2">
                                <MapPinned className="w-3.5 h-3.5" />
                                Visit Coverage
                            </h3>
                            <div className="bg-theme-surface rounded-xl border border-theme p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <p className="text-sm font-medium text-theme-text">
                                            Households Visited / Geotagged
                                        </p>
                                        <p className="text-xs text-theme-textSecondary">
                                            {analytics.visitedCount} of {analytics.totalHouseholds}{" "}
                                            households have been visited
                                        </p>
                                    </div>
                                    <p className="text-2xl font-bold text-theme-primary">
                                        {analytics.visitCoveragePct}%
                                    </p>
                                </div>
                                <div className="w-full h-3 bg-theme-background rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${analytics.visitCoveragePct >= 80
                                                ? "bg-green-500"
                                                : analytics.visitCoveragePct >= 50
                                                    ? "bg-yellow-500"
                                                    : "bg-red-500"
                                            }`}
                                        style={{ width: `${analytics.visitCoveragePct}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-2 text-xs text-theme-textSecondary">
                                    <span>
                                        ✅ Visited:{" "}
                                        <span className="font-semibold text-theme-text">
                                            {analytics.visitedCount}
                                        </span>
                                    </span>
                                    <span>
                                        ⏳ Not Yet Visited:{" "}
                                        <span className="font-semibold text-theme-text">
                                            {analytics.notVisitedCount}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* --- Tenure breakdown --- */}
                        <div>
                            <h3 className="text-xs font-semibold text-theme-textSecondary uppercase tracking-wider mb-3 flex items-center gap-2">
                                <KeyRound className="w-3.5 h-3.5" />
                                Tenure Status
                            </h3>
                            <div className="bg-theme-surface rounded-xl border border-theme p-4 space-y-4">
                                {/* Owned */}
                                <TenureRow
                                    label="Owned"
                                    count={analytics.ownedCount}
                                    pct={analytics.ownedPct}
                                    color="bg-emerald-500"
                                    icon={Home}
                                />
                                {/* Rent */}
                                <TenureRow
                                    label="Rent"
                                    count={analytics.rentCount}
                                    pct={analytics.rentPct}
                                    color="bg-blue-500"
                                    icon={Building2}
                                />
                                {/* Rent Free */}
                                <TenureRow
                                    label="Rent Free"
                                    count={analytics.rentFreeCount}
                                    pct={analytics.rentFreePct}
                                    color="bg-amber-500"
                                    icon={KeyRound}
                                />
                                {/* Informal Settler */}
                                <TenureRow
                                    label="Informal Settler"
                                    count={analytics.informalCount}
                                    pct={analytics.informalPct}
                                    color="bg-red-500"
                                    icon={Building2}
                                />
                                {/* Unknown */}
                                {analytics.unknownTenureCount > 0 && (
                                    <TenureRow
                                        label="Unknown / Not Recorded"
                                        count={analytics.unknownTenureCount}
                                        pct={analytics.unknownTenurePct}
                                        color="bg-gray-400"
                                        icon={AlertDot}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Households list */}
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-theme-text">
                                Households in {zoneName}
                            </h3>
                            <button
                                onClick={() =>
                                    navigate("/barangay-bagocboc/populations/households")
                                }
                                className="text-xs text-theme-primary hover:text-theme-secondary font-medium flex items-center gap-1"
                            >
                                View All Households <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>

                        {households.length === 0 ? (
                            <div className="text-center py-12">
                                <Home className="w-12 h-12 mx-auto text-theme-textSecondary/30 mb-3" />
                                <p className="text-theme-text font-medium">
                                    No households in this zone
                                </p>
                                <p className="text-sm text-theme-textSecondary">
                                    There are no registered households in {zoneName}.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {households.map((h: any) => {
                                    const memberCount = (h.residents || []).length;
                                    const visited = isVisited(h);
                                    const tenure = getTenure(h);
                                    return (
                                        <div
                                            key={h.id}
                                            className="flex items-center justify-between p-4 border border-theme rounded-xl hover:bg-theme-hover transition-colors group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="w-11 h-11 rounded-full bg-theme-primary/10 flex items-center justify-center flex-shrink-0 relative">
                                                    <Home className="w-5 h-5 text-theme-primary" />
                                                    {visited && (
                                                        <span
                                                            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-theme-surface"
                                                            title="Visited / Geotagged"
                                                        />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-theme-text truncate">
                                                        {getFamilyName(h)} Family
                                                    </p>
                                                    <p className="text-sm text-theme-textSecondary truncate">
                                                        {h.household_number || "N/A"} • {getAddress(h)}
                                                    </p>
                                                    <div className="flex items-center gap-3 text-xs text-theme-textSecondary mt-0.5 flex-wrap">
                                                        <span className="flex items-center gap-1">
                                                            <User className="w-3 h-3" />
                                                            {getHeadName(h)}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Users className="w-3 h-3" />
                                                            {memberCount} member
                                                            {memberCount !== 1 ? "s" : ""}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <KeyRound className="w-3 h-3" />
                                                            {tenure}
                                                        </span>
                                                        <span
                                                            className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${visited
                                                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                                                }`}
                                                        >
                                                            {visited ? "Visited" : "Not Visited"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                                <button
                                                    onClick={() =>
                                                        navigate(`/barangay-bagocboc/households/${h.id}`)
                                                    }
                                                    className="px-3 py-1.5 bg-theme-primary text-white rounded-lg text-xs font-medium hover:opacity-90 transition-colors inline-flex items-center gap-1"
                                                >
                                                    <Eye className="w-3 h-3" /> View Details
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-theme bg-theme-surface flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// Sub-component: single tenure row
// ============================================
function TenureRow({
    label,
    count,
    pct,
    color,
    icon: Icon,
}: {
    label: string;
    count: number;
    pct: number;
    color: string;
    icon: React.ElementType;
}) {
    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-theme-textSecondary" />
                    <span className="text-sm font-medium text-theme-text">{label}</span>
                    <span className="text-xs text-theme-textSecondary">
                        ({count} household{count !== 1 ? "s" : ""})
                    </span>
                </div>
                <span className="text-sm font-bold text-theme-text">{pct}%</span>
            </div>
            <div className="w-full h-2 bg-theme-background rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

// Tiny neutral dot icon (fallback)
function AlertDot({ className }: { className?: string }) {
    return (
        <span
            className={`inline-block w-3.5 h-3.5 rounded-full border-2 border-current ${className || ""}`}
        />
    );
}