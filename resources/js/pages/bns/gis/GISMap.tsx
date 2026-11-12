// src/pages/bns/gis/GISMap.tsx

import React, { useState, useEffect, useMemo, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Home,
  Users,
  Activity,
  TrendingUp,
  BarChart3,
  PieChart,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  getZoneBoundary,
  getZoneLines,
  getZoneNames,
} from "../../../utils/boundaryData";
import { bnsApi } from "../../../api/endpoints";
import toast from "react-hot-toast";

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// ✅ Build a marker icon that shows the actual zone label
const createZoneLabelIcon = (
  zoneName: string,
  color: string,
  isSelected: boolean,
) => {
  // Extract short label from the zone name, e.g. "Zone 1 - Poblacion" -> "Zone 1"
  const shortLabel = zoneName.split(" - ")[0] || zoneName;

  return new L.DivIcon({
    html: `
      <div style="
        background: ${color};
        color: #ffffff;
        font-weight: 700;
        font-size: 11px;
        letter-spacing: 0.5px;
        padding: 4px 10px;
        border-radius: 9999px;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        white-space: nowrap;
        text-align: center;
        transform: translate(-50%, -50%);
        width: 90px;
        ${isSelected ? "outline: 3px solid #3b82f6; outline-offset: 1px;" : ""}
      ">
        ${shortLabel}
      </div>
    `,
    className: "",
    // Anchor the pill at its center so it sits on the zone centroid
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -10],
  });
};

// ✅ 15-bucket age distribution
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
  births: number; // ✅ new
  deaths: number; // ✅ new
  last_updated: string;
}

// Fits the map to the given bounds (all roads, or the selected zone's road).
// Leaves room on the right when the statistics sidebar is open.
function FitTo({
  bounds,
  rightPadding,
}: {
  bounds: L.LatLngBounds;
  rightPadding: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(bounds, {
      paddingTopLeft: [40, 80],
      paddingBottomRight: [40 + rightPadding, 40],
      maxZoom: 17,
    });
  }, [bounds, rightPadding, map]);

  return null;
}

// Middle point of a zone's main road (used for the label badge)
const getZoneCenter = (zoneName: string): [number, number] => {
  const zone = getZoneBoundary(zoneName);
  if (!zone) return [8.4198476, 124.5022159];
  return zone.path[Math.floor(zone.path.length / 2)];
};

export default function GISMap() {
  const navigate = useNavigate();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zoneStats, setZoneStats] = useState<ZoneStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hoverZone, setHoverZone] = useState<string | null>(null);

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

  useEffect(() => {
    if (selectedZone) {
      fetchZoneStatistics(selectedZone);
    }
  }, [selectedZone]);

  const fetchZoneStatistics = async (zoneName: string) => {
    setIsLoading(true);
    try {
      const zoneId = parseInt(zoneName.split(" ")[1]);
      const response = await bnsApi.getZoneStatistics(zoneId);
      setZoneStats(response.data?.data || null);
    } catch (error) {
      console.error("Error fetching zone statistics:", error);
      toast.error("Failed to load zone statistics");
      setZoneStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleZoneClick = (zoneName: string) => {
    setSelectedZone(zoneName);
  };

  const handleViewAnotherZone = () => {
    setSelectedZone(null);
    setZoneStats(null);
  };

  return (
    <div className="h-[calc(100vh-8rem)] w-full relative">
      {/* Header */}
      <div className="absolute top-4 left-4 z-[1000] flex items-center gap-3">
        <button
          onClick={() => navigate("/barangay-bagocboc/bns")}
          className="p-2 bg-theme-surface rounded-lg shadow-lg hover:bg-theme-hover transition-colors border border-theme"
        >
          <ArrowLeft className="w-5 h-5 text-theme-text" />
        </button>
        <div className="bg-theme-surface px-4 py-2 rounded-lg shadow-lg border border-theme">
          <h1 className="text-lg font-bold text-theme-text">
            GIS Zone Statistics
          </h1>
          <p className="text-xs text-theme-textSecondary">
            Click a zone to view statistics
          </p>
        </div>
      </div>

      {/* Map */}
      <div className="h-full w-full rounded-xl overflow-hidden border border-theme">
        <MapContainer
          bounds={allBounds}
          boundsOptions={{ padding: [40, 40] }}
          zoomControl={false}
          attributionControl={true}
          minZoom={13}
          maxZoom={18}
          className="h-full w-full"
        >
          <FitTo bounds={fitBounds} rightPadding={selectedZone ? 400 : 0} />

          {/* Satellite imagery (Esri World Imagery) */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/en-us/home">Esri</a>'
            maxZoom={18}
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

                {/* Zone label badge */}
                <Marker
                  position={getZoneCenter(zoneName)}
                  icon={createZoneLabelIcon(zoneName, zone.color, isActive)}
                  eventHandlers={{ click: () => handleZoneClick(zoneName) }}
                />
              </Fragment>
            );
          })}
        </MapContainer>
      </div>

      {/* Statistics Sidebar */}
      {selectedZone && (
        <div className="absolute right-4 top-4 bottom-4 w-96 bg-theme-surface rounded-xl shadow-2xl overflow-hidden z-[1000] flex flex-col border border-theme">
          {/* Header */}
          <div className="p-4 border-b border-theme flex items-center justify-between bg-theme-surface">
            <div>
              <h3 className="font-bold text-theme-text">{selectedZone}</h3>
              <p className="text-xs text-theme-textSecondary">
                Zone Statistics
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedZone(null);
                setZoneStats(null);
              }}
              className="p-1.5 rounded-lg hover:bg-theme-hover transition-colors"
            >
              <span className="text-theme-textSecondary text-lg">✕</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-theme-surface">
            {isLoading ? (
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
                {/* --- Basic counts --- */}
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

                {/* --- Geotagging coverage --- */}
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
                      style={{ width: `${zoneStats.geotagging_coverage}%` }}
                    />
                  </div>
                </div>

                {/* --- Health concerns --- */}
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-600 dark:text-red-400">
                      Residents with Health Concerns
                    </span>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">
                      {zoneStats.health_concerns_percentage}%
                    </span>
                  </div>
                </div>

                {/* --- Population by Sex --- */}
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
                          {zoneStats.female_population}
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

                {/* ✅ Births & Deaths */}
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

                {/* ✅ Detailed Age Distribution (15 buckets) */}
                <div className="bg-theme-background rounded-lg p-3">
                  <h4 className="text-sm font-medium text-theme-text mb-2 flex items-center justify-between">
                    <span>Age Distribution</span>
                    <span className="text-xs text-theme-textSecondary font-normal">
                      {zoneStats.total_population} total
                    </span>
                  </h4>

                  {/* Sanity check — bucketed sum vs total population */}
                  {(() => {
                    const sum = Object.values(zoneStats.age_groups).reduce(
                      (a, b) => a + b,
                      0,
                    );
                    return sum !== zoneStats.total_population ? (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-2">
                        ⚠ Bucketed total ({sum}) ≠ population (
                        {zoneStats.total_population})
                      </p>
                    ) : null;
                  })()}

                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {Object.entries(zoneStats.age_groups).map(
                      ([group, count]) => {
                        const total = zoneStats.total_population || 1;
                        const pct = Math.round((count / total) * 100);
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
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

                {/* --- Last updated --- */}
                <div className="text-xs text-theme-textSecondary text-center border-t border-theme pt-3">
                  Last updated:{" "}
                  {new Date(zoneStats.last_updated).toLocaleString()}
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
          <div className="p-4 border-t border-theme bg-theme-surface">
            <button
              onClick={handleViewAnotherZone}
              className="w-full px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
            >
              View Another Zone
            </button>
          </div>
        </div>
      )}
    </div>
  );
}