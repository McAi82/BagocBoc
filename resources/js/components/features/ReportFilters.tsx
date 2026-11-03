// components/features/ReportFilters.tsx

import React from "react";
import { Calendar, Filter, X } from "lucide-react";

export type ReportRangePreset =
    | "today"
    | "week"
    | "month"
    | "custom"
    | "all";

export interface ReportFilterValue {
    preset: ReportRangePreset;
    from: string; // YYYY-MM-DD
    to: string;   // YYYY-MM-DD
}

interface ReportFiltersProps {
    value: ReportFilterValue;
    onChange: (next: ReportFilterValue) => void;
    extraFilters?: React.ReactNode;
    hideAllOption?: boolean;
    /** Show raw ISO dates next to the inputs — useful during development */
    debug?: boolean;
}

/* ============================================================
   LOCAL DATE HELPERS — no Date object parsing
   ============================================================ */

/** Return YYYY-MM-DD for "today" in the user's local timezone */
export const todayISO = (): string => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

/** Return YYYY-MM-DD for the Monday of this week */
const mondayISO = (): string => {
    const d = new Date();
    const day = d.getDay(); // 0 = Sun ... 6 = Sat
    const diffToMonday = (day + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - diffToMonday);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dayStr = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dayStr}`;
};

/** Return YYYY-MM-DD for the 1st of this month */
const firstOfMonthISO = (): string => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
};

export const getPresetRange = (
    preset: ReportRangePreset,
): { from: string; to: string } => {
    switch (preset) {
        case "today":
            return { from: todayISO(), to: todayISO() };
        case "week":
            return { from: mondayISO(), to: todayISO() };
        case "month":
            return { from: firstOfMonthISO(), to: todayISO() };
        case "all":
            return { from: "", to: "" };
        case "custom":
        default:
            return { from: todayISO(), to: todayISO() };
    }
};

/**
 * ✅ Robust date range check.
 * Compares YYYY-MM-DD strings, so timezones never shift the day.
 * Handles:
 *   - "2026-10-01"
 *   - "2026-10-01 00:00:00"
 *   - "2026-10-01T00:00:00.000000Z"
 *   - "2026-10-01T00:00:00+08:00"
 *   - null / undefined / ""
 */
export const isWithinRange = (
    dateStr: string | undefined | null,
    from: string,
    to: string,
): boolean => {
    // No filter → keep everything
    if (!from && !to) return true;

    // No date on the record → exclude it (except for "all", already handled above)
    if (!dateStr) return false;

    // Normalise to the first 10 chars (YYYY-MM-DD)
    const d = String(dateStr).slice(0, 10);

    // Extra guard: must look like a date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        // Unparseable — keep only if we're not filtering
        return false;
    }

    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
};

/* ============================================================
   COMPONENT
   ============================================================ */

export default function ReportFilters({
    value,
    onChange,
    extraFilters,
    hideAllOption = false,
    debug = false,
}: ReportFiltersProps) {
    const setPreset = (preset: ReportRangePreset) => {
        const range = getPresetRange(preset);
        onChange({ preset, ...range });
    };

    const presets: { id: ReportRangePreset; label: string }[] = [
        { id: "today", label: "Today" },
        { id: "week", label: "This Week" },
        { id: "month", label: "This Month" },
        { id: "custom", label: "Custom Range" },
        ...(hideAllOption ? [] : [{ id: "all" as const, label: "All Time" }]),
    ];

    return (
        <div className="bg-theme-surface border border-theme rounded-xl p-4 shadow-sm space-y-3">
            {/* Top row: presets + extra filters */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-theme-textSecondary uppercase tracking-wider flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5" />
                        Period
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {presets.map((p) => {
                            const active = value.preset === p.id;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => setPreset(p.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${active
                                        ? "bg-theme-primary text-white shadow-sm"
                                        : "bg-theme-background text-theme-textSecondary hover:bg-theme-hover border border-theme"
                                        }`}
                                >
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {extraFilters && (
                    <div className="flex flex-wrap gap-2 items-center">
                        {extraFilters}
                    </div>
                )}
            </div>

            {/* Bottom row: custom range date inputs */}
            {value.preset === "custom" && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-theme">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-theme-textSecondary" />
                        <label className="text-xs font-medium text-theme-textSecondary">
                            From
                        </label>
                        <input
                            type="date"
                            value={value.from}
                            max={value.to || undefined}
                            onChange={(e) =>
                                onChange({ ...value, from: e.target.value })
                            }
                            className="px-3 py-1.5 border border-theme rounded-lg bg-theme-surface text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-theme-textSecondary">
                            To
                        </label>
                        <input
                            type="date"
                            value={value.to}
                            min={value.from || undefined}
                            onChange={(e) =>
                                onChange({ ...value, to: e.target.value })
                            }
                            className="px-3 py-1.5 border border-theme rounded-lg bg-theme-surface text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
                        />
                    </div>
                    {(value.from || value.to) && (
                        <button
                            onClick={() => onChange({ preset: "custom", from: "", to: "" })}
                            className="flex items-center gap-1 text-xs text-theme-primary hover:text-theme-secondary font-medium"
                        >
                            <X className="w-3 h-3" /> Clear
                        </button>
                    )}
                </div>
            )}

            {/* Summary line */}
            <div className="text-xs text-theme-textSecondary pt-1 flex items-center justify-between gap-3 flex-wrap">
                <span>
                    {value.preset === "all" ? (
                        <>Showing all records</>
                    ) : value.from && value.to ? (
                        <>
                            Showing records from{" "}
                            <span className="font-semibold text-theme-text">
                                {value.from}
                            </span>{" "}
                            to{" "}
                            <span className="font-semibold text-theme-text">
                                {value.to}
                            </span>
                        </>
                    ) : (
                        <>Select a date range</>
                    )}
                </span>

                {debug && (
                    <span className="text-[10px] font-mono text-theme-textSecondary">
                        preset={value.preset} from={value.from || "∅"} to={value.to || "∅"}
                    </span>
                )}
            </div>
        </div>
    );
}