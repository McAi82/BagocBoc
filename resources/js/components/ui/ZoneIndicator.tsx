// components/ui/ZoneIndicator.tsx
//
// Small colored dot (+ optional label) showing which barangay zone a
// resident lives in. The color comes from utils/boundaryData.ts so it always
// matches the zone color used on the map.

import React from "react";
import { getZoneColor, getZoneNumber } from "../../utils/boundaryData";

const NO_ZONE_COLOR = "#9CA3AF";

/**
 * Finds the zone name ("Zone 3") for a resident.
 * Works with a resident object from /web/residents, or the `resident`
 * object nested inside a user from /web/users.
 * Laravel serializes the relation `barangayZone` as `barangay_zone`.
 */
export const getResidentZoneName = (resident: any): string | null => {
    if (!resident) return null;

    const households: any[] = Array.isArray(resident.households)
        ? resident.households
        : [];

    for (const h of households) {
        const zone = h?.address?.barangay_zone ?? h?.address?.barangayZone;
        const name: string | undefined = zone?.name;
        if (name) {
            // Normalise to the "Zone N" keys used in boundaryData.ts
            const n = getZoneNumber(name);
            return n > 0 ? `Zone ${n}` : name;
        }
    }
    return null;
};

interface ZoneIndicatorProps {
    /** A resident object (or user.resident). */
    resident?: any;
    /** Show the zone name next to the dot. Default true. */
    showLabel?: boolean;
    className?: string;
}

export default function ZoneIndicator({
    resident,
    showLabel = true,
    className = "",
}: ZoneIndicatorProps) {
    const zoneName = getResidentZoneName(resident);
    const color = zoneName ? getZoneColor(zoneName) : NO_ZONE_COLOR;
    const label = zoneName ?? "No zone";

    return (
        <span
            className={`inline-flex items-center gap-2 ${className}`}
            title={label}
        >
            <span
                className="inline-block w-3 h-3 rounded-full shrink-0 ring-1 ring-black/10"
                style={{ backgroundColor: color }}
            />
            {showLabel && (
                <span
                    className={`text-sm ${zoneName ? "text-theme-text" : "text-theme-textSecondary"}`}
                >
                    {label}
                </span>
            )}
        </span>
    );
}
