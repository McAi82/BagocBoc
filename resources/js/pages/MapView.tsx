// pages/MapView.tsx

import React, { Fragment, useState, useEffect, useMemo } from "react";
import {
    MapContainer,
    TileLayer,
    LayersControl,
    Polyline,
    Marker,
    Tooltip,
    useMap,
    ZoomControl,
} from "react-leaflet";
import L, { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
    Search,
    Home,
    Users,
    X,
    Loader2,
    MapPin,
    Layers,
    AlertCircle,
    BarChart3,
    Activity,
} from "lucide-react";
import {
    getZoneBoundary,
    getZoneNames,
    getZoneColor,
    getZoneLines,
} from "../utils/boundaryData";
import ZoneDetailsModal from "../components/features/ZoneDetailsModal";
import { useAuthStore } from "../stores/authStore";
import { api } from "../api/apiClient";
import toast from "react-hot-toast";

// ============================================
// ZONE BADGE ICON (numbered circle on each road)
// ============================================
const createZoneBadgeIcon = (
    zoneName: string,
    color: string,
    isSelected: boolean,
) => {
    const id = zoneName.match(/\d+/)?.[0] ?? zoneName;
    const ring = isSelected
        ? "box-shadow:0 0 0 3px #fff, 0 0 0 5px " + color + ";"
        : "box-shadow:0 1px 4px rgba(0,0,0,0.5);";
    return L.divIcon({
        className: "",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        html: `<div style="width:24px;height:24px;border-radius:50%;background:#fff;border:3px solid ${color};${ring}
      display:flex;align-items:center;justify-content:center;font:700 12px system-ui;color:#222">${id}</div>`,
    });
};

// ============================================
// ✅ Zone statistics shape (matches BNS endpoint)
// ============================================
interface AgeGroups {
    "1-2": number;
    "3-4": number;
    "5-9": number;
    "10-14": number;
    "15-19": number;
    "20-24": number;
    "25-29": number;
    "30-34": number;
    "35-39": number;
    "40-44": number;
    "45-49": number;
    "50-54": number;
    "55-59": number;
    "60-64": number;
    "65 above": number;
}

interface ZoneStatistics {
    zone_id: number;
    zone_name: string;
    total_population: number;
    total_households: number;
    geotagging_coverage: number;
    health_concerns_percentage: number;
    male_population: number;
    female_population: number;
    age_groups: AgeGroups;
    births: number;
    deaths: number;
    last_updated: string;
}

// ============================================
// MAP HELPERS
// ============================================
function FitTo({
    bounds,
    rightPadding,
}: {
    bounds: LatLngBoundsExpression;
    rightPadding: number;
}) {
    const map = useMap();
    useEffect(() => {
        map.fitBounds(bounds, {
            paddingTopLeft: [40, 40],
            paddingBottomRight: [40 + rightPadding, 40],
            maxZoom: 17,
        });
    }, [bounds, rightPadding, map]);
    return null;
}

// Middle point of a zone's main road (used for the number badge)
const getZoneCenter = (zoneName: string): [number, number] => {
    const zone = getZoneBoundary(zoneName);
    if (!zone) return [8.4198476, 124.5022159];
    return zone.path[Math.floor(zone.path.length / 2)];
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function MapView() {
    const { user } = useAuthStore();
    const [households, setHouseholds] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchMatches, setSearchMatches] = useState<string[]>([]);
    const [selectedZone, setSelectedZone] = useState<string | null>(null);
    const [showZoneModal, setShowZoneModal] = useState(false);
    const [hoverZone, setHoverZone] = useState<string | null>(null);

    // ✅ Statistics sidebar state
    const [showStatsPanel, setShowStatsPanel] = useState(false);
    const [zoneStats, setZoneStats] = useState<ZoneStatistics | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    const roles = user?.roles?.map((r) => r.name) || [];
    const hasAccess = roles.some((r) =>
        ["Barangay Captain", "Super Admin"].includes(r),
    );

    const extractData = (data: any): any[] => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (data?.data && Array.isArray(data.data)) return data.data;
        if (data?.households && Array.isArray(data.households))
            return data.households;
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

    const fetchData = async () => {
        setIsLoading(true);
        setIsError(false);
        try {
            const response = await api.get("/web/households-info");
            const data = extractData(response.data);
            setHouseholds(data);
        } catch (error) {
            console.error("Failed to load households:", error);
            setIsError(true);
            toast.error("Failed to load map data");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Group households by zone
    const householdsByZone = useMemo(() => {
        const map: Record<string, any[]> = {};
        households.forEach((h: any) => {
            const addr = h.address || {};
            let zoneName = "";
            if (addr.zone_name) zoneName = addr.zone_name;
            else if (addr.zone) zoneName = `Zone ${addr.zone}`;
            if (!zoneName) return;
            if (!map[zoneName]) map[zoneName] = [];
            map[zoneName].push(h);
        });
        return map;
    }, [households]);

    const zoneNames = useMemo(() => getZoneNames().sort(), []);

    const allBounds = useMemo(
        () => L.latLngBounds(zoneNames.flatMap((n) => getZoneLines(n).flat())),
        [zoneNames],
    );
    const fitBounds = useMemo(
        () =>
            selectedZone
                ? L.latLngBounds(getZoneLines(selectedZone).flat())
                : allBounds,
        [selectedZone, allBounds],
    );

    // ✅ Fetch zone statistics from the BNS endpoint
    const fetchZoneStatistics = async (zoneName: string) => {
        setIsLoadingStats(true);
        setZoneStats(null);
        try {
            const zoneNumber = parseInt(zoneName.split(" ")[1], 10);
            const response = await api.get(
                `/web/bns/zone-statistics/${zoneNumber}`,
            );
            setZoneStats(response.data?.data || null);
        } catch (error) {
            console.error("Failed to load zone statistics:", error);
            toast.error("Failed to load zone statistics");
            setZoneStats(null);
        } finally {
            setIsLoadingStats(false);
        }
    };

    // ✅ Clicking a zone opens the stats sidebar (and fly-to)
    const handleZoneClick = (zoneName: string) => {
        setSelectedZone(zoneName);
        setShowStatsPanel(true);
        fetchZoneStatistics(zoneName);
    };

    // ✅ "View Households" button opens the existing modal
    const handleViewHouseholds = () => {
        if (selectedZone) {
            setShowZoneModal(true);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchMatches([]);
            return;
        }
        const q = query.toLowerCase();
        const matches = zoneNames.filter((z) => z.toLowerCase().includes(q));
        setSearchMatches(matches);
    };

    const handleSearchSelect = (zoneName: string) => {
        handleZoneClick(zoneName);
        setSearchQuery("");
        setSearchMatches([]);
    };

    const handleRefresh = () => {
        toast.loading("Refreshing map data...");
        fetchData().then(() => {
            toast.dismiss();
            toast.success("Map data refreshed!");
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-theme-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-theme-primary animate-spin" />
                    <p className="text-sm text-theme-textSecondary font-medium">
                        Loading map data...
                    </p>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center h-full bg-theme-background">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-theme-text">
                        Failed to Load Map Data
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

    if (!hasAccess) {
        return (
            <div className="flex items-center justify-center h-full bg-theme-background">
                <div className="text-center">
                    <MapPin className="w-16 h-16 text-theme-textSecondary/30 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-theme-text">
                        Access Denied
                    </h2>
                    <p className="text-theme-textSecondary mt-2">
                        You don't have permission to view this page.
                    </p>
                </div>
            </div>
        );
    }

    const zoneList = selectedZone ? householdsByZone[selectedZone] || [] : [];

    return (
        <div className="relative h-full w-full bg-theme-background overflow-hidden">
            {/* Search */}
            <div className="absolute top-6 left-6 z-[1000] w-full max-w-sm">
                <div className="relative shadow-lg rounded-2xl">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-theme-textSecondary" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search zone..."
                        className="w-full pl-11 pr-10 py-3 bg-theme-surface/95 backdrop-blur-md border border-theme rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-theme-primary/20 focus:border-theme-primary transition-all text-theme-text font-medium"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => {
                                setSearchQuery("");
                                setSearchMatches([]);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-textSecondary hover:text-theme-text"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}

                    {searchMatches.length > 0 && (
                        <div className="absolute top-full mt-2 w-full bg-theme-surface border border-theme rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                            {searchMatches.map((zone) => (
                                <button
                                    key={zone}
                                    onClick={() => handleSearchSelect(zone)}
                                    className="w-full px-4 py-3 text-left hover:bg-theme-hover transition-colors flex items-center gap-3 border-b border-theme last:border-0"
                                >
                                    <span
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{
                                            backgroundColor: getZoneColor(zone),
                                        }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-theme-text">
                                            {zone}
                                        </p>
                                        <p className="text-xs text-theme-textSecondary">
                                            {
                                                (householdsByZone[zone] || [])
                                                    .length
                                            }{" "}
                                            household
                                            {(householdsByZone[zone] || [])
                                                .length !== 1
                                                ? "s"
                                                : ""}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Stats badge */}
            <div className="absolute top-6 right-20 z-[1000] bg-theme-surface/95 backdrop-blur-md rounded-xl shadow-lg border border-theme px-4 py-3">
                <div className="flex items-center gap-4">
                    <div>
                        <p className="text-xs text-theme-textSecondary font-medium">
                            Zones
                        </p>
                        <p className="text-lg font-bold text-theme-text">
                            {zoneNames.length}
                        </p>
                    </div>
                    <div className="h-8 w-px bg-theme-border" />
                    <div>
                        <p className="text-xs text-theme-textSecondary font-medium">
                            Households
                        </p>
                        <p className="text-lg font-bold text-theme-text">
                            {households.length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-6 left-6 z-[1000] bg-theme-surface/95 backdrop-blur-md rounded-xl shadow-lg border border-theme p-3 max-w-[240px]">
                <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-theme-textSecondary" />
                    <span className="text-xs font-semibold text-theme-text">
                        Zones
                    </span>
                </div>
                <div className="space-y-1 max-h-[180px] overflow-y-auto">
                    {zoneNames.map((zone) => (
                        <button
                            key={zone}
                            onClick={() => handleZoneClick(zone)}
                            className="w-full flex items-center gap-2 text-left px-2 py-1 rounded hover:bg-theme-hover transition-colors"
                        >
                            <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: getZoneColor(zone) }}
                            />
                            <span className="text-xs text-theme-text truncate flex-1">
                                {zone}
                            </span>
                            <span className="text-[10px] text-theme-textSecondary">
                                {(householdsByZone[zone] || []).length}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Map */}
            <MapContainer
                bounds={allBounds}
                boundsOptions={{ padding: [40, 40] }}
                zoomControl={false}
                className="h-full w-full"
                minZoom={13}
                maxZoom={19}
                scrollWheelZoom
            >
                <ZoomControl position="bottomright" />

                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Satellite">
                        <TileLayer
                            attribution="Tiles &copy; Esri"
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            maxZoom={18}
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Streets">
                        <TileLayer
                            attribution="&copy; OpenStreetMap contributors"
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            maxZoom={19}
                        />
                    </LayersControl.BaseLayer>
                </LayersControl>

                <FitTo
                    bounds={fitBounds}
                    rightPadding={showStatsPanel ? 400 : 0}
                />

                {/* Zone roads */}
                {zoneNames.map((zoneName) => {
                    const zone = getZoneBoundary(zoneName);
                    if (!zone) return null;
                    const isActive = selectedZone === zoneName;
                    const isHover = hoverZone === zoneName;
                    const dim = selectedZone !== null && !isActive;
                    const handlers = {
                        click: () => handleZoneClick(zoneName),
                        mouseover: () => setHoverZone(zoneName),
                        mouseout: () => setHoverZone(null),
                    };

                    return (
                        <Fragment key={zoneName}>
                            {getZoneLines(zoneName).map((line, i) => (
                                <Fragment key={i}>
                                    {(isActive || isHover) && (
                                        <Polyline
                                            positions={line}
                                            pathOptions={{
                                                color: "#fff",
                                                weight: 11,
                                                opacity: 0.9,
                                                lineCap: "round",
                                                lineJoin: "round",
                                            }}
                                            interactive={false}
                                        />
                                    )}
                                    <Polyline
                                        positions={line}
                                        pathOptions={{
                                            color: zone.color,
                                            weight: isActive || isHover ? 7 : 5,
                                            opacity: dim ? 0.45 : 1,
                                            lineCap: "round",
                                            lineJoin: "round",
                                        }}
                                        eventHandlers={handlers}
                                    />
                                    {/* wide transparent line = easier to tap on phones */}
                                    <Polyline
                                        positions={line}
                                        pathOptions={{
                                            color: "#000",
                                            weight: 26,
                                            opacity: 0.01,
                                        }}
                                        eventHandlers={handlers}
                                    >
                                        <Tooltip sticky>{zoneName}</Tooltip>
                                    </Polyline>
                                </Fragment>
                            ))}
                            <Marker
                                position={getZoneCenter(zoneName)}
                                icon={createZoneBadgeIcon(
                                    zoneName,
                                    zone.color,
                                    isActive,
                                )}
                                eventHandlers={{
                                    click: () => handleZoneClick(zoneName),
                                }}
                            />
                        </Fragment>
                    );
                })}
            </MapContainer>

            {/* ✅ Statistics Sidebar */}
            {showStatsPanel && selectedZone && (
                <div className="absolute right-4 top-16 bottom-4 w-96 bg-theme-surface rounded-xl shadow-2xl overflow-hidden z-[1000] flex flex-col border border-theme">
                    {/* Header */}
                    <div className="p-4 border-b border-theme flex items-center justify-between bg-theme-surface">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-theme-primary/10">
                                <BarChart3 className="w-5 h-5 text-theme-primary" />
                            </div>
                            <div>
                                <h3 className="font-bold text-theme-text">
                                    {selectedZone}
                                </h3>
                                <p className="text-xs text-theme-textSecondary">
                                    Zone Statistics
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setShowStatsPanel(false);
                                setSelectedZone(null);
                                setZoneStats(null);
                            }}
                            className="p-1.5 rounded-lg hover:bg-theme-hover transition-colors"
                        >
                            <X className="w-5 h-5 text-theme-textSecondary" />
                        </button>
                    </div>

                    {/* Road info (from the zone road data) */}
                    {(() => {
                        const z = getZoneBoundary(selectedZone);
                        if (!z) return null;
                        return (
                            <div className="px-4 py-3 border-b border-theme text-sm text-theme-text">
                                <div className="flex items-center gap-2 mb-1">
                                    <span
                                        className="w-3.5 h-3.5 rounded"
                                        style={{ backgroundColor: z.color }}
                                    />
                                    <span className="font-semibold">
                                        Road details
                                    </span>
                                </div>
                                <p>
                                    <b>From:</b> {z.from}
                                </p>
                                <p>
                                    <b>To:</b> {z.to}
                                </p>
                                <p className="mt-1 text-xs text-theme-textSecondary">
                                    {z.note}
                                </p>
                            </div>
                        );
                    })()}

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-theme-surface">
                        {isLoadingStats ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
                                    <p className="text-sm text-theme-textSecondary">
                                        Loading statistics...
                                    </p>
                                </div>
                            </div>
                        ) : zoneStats ? (
                            <>
                                {/* Basic counts */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                                        <Users className="w-5 h-5 mx-auto text-blue-600 dark:text-blue-400" />
                                        <p className="text-xl font-bold text-theme-text">
                                            {zoneStats.total_population}
                                        </p>
                                        <p className="text-xs text-theme-textSecondary">
                                            Population
                                        </p>
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                                        <Home className="w-5 h-5 mx-auto text-green-600 dark:text-green-400" />
                                        <p className="text-xl font-bold text-theme-text">
                                            {zoneStats.total_households}
                                        </p>
                                        <p className="text-xs text-theme-textSecondary">
                                            Households
                                        </p>
                                    </div>
                                </div>

                                {/* Geotagging coverage */}
                                <div className="bg-theme-background rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-theme-textSecondary">
                                            Geotagging Coverage
                                        </span>
                                        <span className="text-sm font-bold text-theme-text">
                                            {zoneStats.geotagging_coverage}%
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-theme-border rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                            style={{
                                                width: `${zoneStats.geotagging_coverage}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Health concerns */}
                                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-red-600 dark:text-red-400">
                                            Residents with Health Concerns
                                        </span>
                                        <span className="text-sm font-bold text-red-600 dark:text-red-400">
                                            {
                                                zoneStats.health_concerns_percentage
                                            }
                                            %
                                        </span>
                                    </div>
                                </div>

                                {/* Population by Sex */}
                                <div className="bg-theme-background rounded-lg p-3">
                                    <h4 className="text-sm font-medium text-theme-text mb-2">
                                        Population by Sex
                                    </h4>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-blue-600 dark:text-blue-400">
                                                    Male
                                                </span>
                                                <span className="font-medium text-theme-text">
                                                    {zoneStats.male_population}
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-theme-border rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{
                                                        width: `${(zoneStats.male_population / (zoneStats.total_population || 1)) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-pink-600 dark:text-pink-400">
                                                    Female
                                                </span>
                                                <span className="font-medium text-theme-text">
                                                    {
                                                        zoneStats.female_population
                                                    }
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-theme-border rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-pink-500 rounded-full"
                                                    style={{
                                                        width: `${(zoneStats.female_population / (zoneStats.total_population || 1)) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Births & Deaths */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center border border-emerald-200 dark:border-emerald-800">
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                            Births (This Year)
                                        </p>
                                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                                            {zoneStats.births ?? 0}
                                        </p>
                                    </div>
                                    <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-3 text-center border border-rose-200 dark:border-rose-800">
                                        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                                            Deaths
                                        </p>
                                        <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                                            {zoneStats.deaths ?? 0}
                                        </p>
                                    </div>
                                </div>

                                {/* Detailed Age Distribution (15 buckets) */}
                                <div className="bg-theme-background rounded-lg p-3">
                                    <h4 className="text-sm font-medium text-theme-text mb-2 flex items-center justify-between">
                                        <span>Age Distribution</span>
                                        <span className="text-xs text-theme-textSecondary font-normal">
                                            {zoneStats.total_population} total
                                        </span>
                                    </h4>

                                    {(() => {
                                        const sum = Object.values(
                                            zoneStats.age_groups,
                                        ).reduce((a, b) => a + b, 0);
                                        return sum !==
                                            zoneStats.total_population ? (
                                            <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-2">
                                                ⚠ Bucketed total ({sum}) ≠
                                                population (
                                                {zoneStats.total_population})
                                            </p>
                                        ) : null;
                                    })()}

                                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                                        {Object.entries(
                                            zoneStats.age_groups,
                                        ).map(([group, count]) => {
                                            const total =
                                                zoneStats.total_population || 1;
                                            const pct = Math.round(
                                                (count / total) * 100,
                                            );
                                            return (
                                                <div key={group}>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-theme-textSecondary font-medium">
                                                            {group} yrs
                                                        </span>
                                                        <span className="font-semibold text-theme-text">
                                                            {count}
                                                            <span className="text-theme-textSecondary font-normal ml-1">
                                                                ({pct}%)
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-theme-border rounded-full overflow-hidden mt-0.5">
                                                        <div
                                                            className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${pct}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Last updated */}
                                <div className="text-xs text-theme-textSecondary text-center border-t border-theme pt-3">
                                    Last updated:{" "}
                                    {new Date(
                                        zoneStats.last_updated,
                                    ).toLocaleString()}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <AlertCircle className="w-12 h-12 mx-auto text-theme-textSecondary/50 mb-3" />
                                <p className="text-theme-textSecondary">
                                    No statistics available
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-theme bg-theme-surface flex gap-2">
                        <button
                            onClick={handleViewHouseholds}
                            className="flex-1 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text font-medium text-sm"
                        >
                            <Home className="w-4 h-4 inline mr-1" />
                            Households
                        </button>
                        <button
                            onClick={() => {
                                if (selectedZone)
                                    fetchZoneStatistics(selectedZone);
                            }}
                            className="flex-1 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors font-medium text-sm"
                        >
                            Refresh Stats
                        </button>
                    </div>
                </div>
            )}

            {/* Zone Details Modal (existing household drill-down) */}
            <ZoneDetailsModal
                isOpen={showZoneModal}
                zoneName={selectedZone}
                households={zoneList}
                onClose={() => {
                    setShowZoneModal(false);
                }}
            />
        </div>
    );
}
