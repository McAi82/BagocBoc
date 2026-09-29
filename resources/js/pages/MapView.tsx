// pages/MapView.tsx

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  useMap,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Search,
  Home,
  Users,
  X,
  Loader2,
  MapPin,
  Filter,
  Layers,
  AlertCircle,
} from "lucide-react";
import {
  bagocbocBoundary,
  zoneBoundaries,
  getZoneBoundary,
  getZoneNames,
  getZoneColor,
  isWithinBarangayBoundary,
} from "../utils/boundaryData";
import ZoneDetailsModal from "../components/features/ZoneDetailsModal";
import { useAuthStore } from "../stores/authStore";
import { api } from "../api/apiClient";
import toast from "react-hot-toast";

// ============================================
// ✅ ZONE LABEL ICON
// ============================================
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
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -10],
  });
};

// ============================================
// MAP HELPERS
// ============================================
function MapViewHandler({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [map, center, zoom]);
  return null;
}

function MapBoundsController() {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(
      L.latLng(8.405, 124.485),
      L.latLng(8.435, 124.52),
    );
    map.setMaxBounds(bounds);
    map.on("drag", () => {
      map.panInsideBounds(bounds, { animate: true });
    });
    return () => {
      map.off("drag");
    };
  }, [map]);
  return null;
}

// ============================================
// ZONE CENTROID HELPER
// ============================================
const getZoneCenter = (zoneName: string): [number, number] => {
  const zone = getZoneBoundary(zoneName);
  if (!zone) return [8.4198476, 124.5022159];

  const coords = zone.coordinates as [number, number][];
  const centerLat =
    coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
  const centerLng =
    coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
  return [centerLat, centerLng];
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
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    8.4198476, 124.5022159,
  ]);
  const [mapZoom, setMapZoom] = useState(17);

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

  const handleZoneClick = (zoneName: string) => {
    setSelectedZone(zoneName);
    setShowZoneModal(true);
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
    setSelectedZone(zoneName);
    setShowZoneModal(true);
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
                    style={{ backgroundColor: getZoneColor(zone) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-theme-text">{zone}</p>
                    <p className="text-xs text-theme-textSecondary">
                      {(householdsByZone[zone] || []).length} household
                      {(householdsByZone[zone] || []).length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats badge */}
      <div className="absolute top-6 right-6 z-[1000] bg-theme-surface/95 backdrop-blur-md rounded-xl shadow-lg border border-theme px-4 py-3">
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
        center={mapCenter}
        zoom={mapZoom}
        zoomControl={false}
        className="h-full w-full"
        minZoom={17}
        maxZoom={20}
      >
        <MapBoundsController />
        <MapViewHandler center={mapCenter} zoom={mapZoom} />
        <ZoomControl position="bottomright" />

        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/en-us/home">Esri</a>'
          maxZoom={20}
        />

        {/* Barangay boundary */}
        {bagocbocBoundary && bagocbocBoundary.length > 0 && (
          <Polygon
            positions={bagocbocBoundary}
            pathOptions={{
              color: "#FFFFFF",
              fillColor: "rgba(59, 130, 246, 0.05)",
              weight: 2,
              dashArray: "8, 6",
              opacity: 1,
            }}
          />
        )}

        {/* Zone polygons */}
        {zoneNames.map((zoneName) => {
          const zoneData = getZoneBoundary(zoneName);
          if (!zoneData) return null;
          const count = (householdsByZone[zoneName] || []).length;
          return (
            <Polygon
              key={zoneName}
              positions={zoneData.coordinates}
              pathOptions={{
                color: zoneData.color,
                weight: 2,
                fillColor: zoneData.fillColor,
                fillOpacity: 0.2,
              }}
              eventHandlers={{
                click: () => handleZoneClick(zoneName),
                mouseover: (e) => {
                  const layer = e.target;
                  layer.setStyle({ fillOpacity: 0.35, weight: 4 });
                },
                mouseout: (e) => {
                  const layer = e.target;
                  layer.setStyle({ fillOpacity: 0.2, weight: 2 });
                },
              }}
            >
            </Polygon>
          );
        })}

        {/* ✅ Zone name markers */}
        {zoneNames.map((zoneName) => {
          const center = getZoneCenter(zoneName);
          const isSelected = selectedZone === zoneName;
          const color = getZoneColor(zoneName);
          const icon = createZoneLabelIcon(zoneName, color, isSelected);

          return (
            <Marker
              key={`label-${zoneName}`}
              position={center}
              icon={icon}
              eventHandlers={{
                click: () => handleZoneClick(zoneName),
              }}
            />
          );
        })}
      </MapContainer>

      {/* Zone Details Modal */}
      <ZoneDetailsModal
        isOpen={showZoneModal}
        zoneName={selectedZone}
        households={zoneList}
        onClose={() => {
          setShowZoneModal(false);
          setSelectedZone(null);
        }}
      />
    </div>
  );
}