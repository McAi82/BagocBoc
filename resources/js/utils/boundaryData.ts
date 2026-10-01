// utils/boundaryData.ts

export const bagocbocBoundary: [number, number][] = [
  [8.4165, 124.4955],
  [8.4165, 124.5055],
  [8.4235, 124.5055],
  [8.4235, 124.4955],
  [8.4165, 124.4955],
];

// ============================================
// CONFIG
// ============================================
const BOUNDARY_MIN_LAT = 8.41;
const BOUNDARY_MAX_LAT = 8.43;
const BOUNDARY_MIN_LNG = 124.49;
const BOUNDARY_MAX_LNG = 124.515;

const TOTAL_HEIGHT = BOUNDARY_MAX_LAT - BOUNDARY_MIN_LAT; // 0.0200
const TOTAL_WIDTH = BOUNDARY_MAX_LNG - BOUNDARY_MIN_LNG;  // 0.0250

// ============================================
// GRID LAYOUT — 3 columns × 3 rows = 9 zones
// ============================================
const GRID_WIDTH_RATIO = 0.2;
const GRID_HEIGHT_RATIO = 0.3; // ✅ bumped from 0.2 → 0.3 to fit 3 rows

const GRID_WIDTH = TOTAL_WIDTH * GRID_WIDTH_RATIO;
const GRID_HEIGHT = TOTAL_HEIGHT * GRID_HEIGHT_RATIO;

const COLS = 3;
const ROWS = 3; // ✅ was 2, now 3
const ZONE_WIDTH = GRID_WIDTH / COLS;
const ZONE_HEIGHT = GRID_HEIGHT / ROWS;

// Center of the boundary
const GRID_CENTER_LAT = (BOUNDARY_MIN_LAT + BOUNDARY_MAX_LAT) / 2;
const GRID_CENTER_LNG = (BOUNDARY_MIN_LNG + BOUNDARY_MAX_LNG) / 2;

// Offset the grid to the left by some fraction of the total width.
const LEFTWARD_OFFSET = 0.1;
const SHIFTED_CENTER_LNG = GRID_CENTER_LNG - TOTAL_WIDTH * LEFTWARD_OFFSET;

const GRID_MIN_LAT = GRID_CENTER_LAT - GRID_HEIGHT / 2;
const GRID_MIN_LNG = SHIFTED_CENTER_LNG - GRID_WIDTH / 2;

// ============================================
// BUILD ZONE RECTANGLES
// ============================================
const makeZoneAt = (row: number, col: number): [number, number][] => {
  const latMin = GRID_MIN_LAT + row * ZONE_HEIGHT;
  const latMax = latMin + ZONE_HEIGHT;
  const lngMin = GRID_MIN_LNG + col * ZONE_WIDTH;
  const lngMax = lngMin + ZONE_WIDTH;

  return [
    [latMin, lngMin],
    [latMin, lngMax],
    [latMax, lngMax],
    [latMax, lngMin],
    [latMin, lngMin],
  ];
};

const ZONE_COORDINATES: Record<string, [number, number][]> = {
  "Zone 1": makeZoneAt(0, 0),
  "Zone 2": makeZoneAt(0, 1),
  "Zone 3": makeZoneAt(0, 2),
  "Zone 4": makeZoneAt(1, 0),
  "Zone 5": makeZoneAt(1, 1),
  "Zone 6": makeZoneAt(1, 2),
  "Zone 7": makeZoneAt(2, 0), // ✅ new
  "Zone 8": makeZoneAt(2, 1), // ✅ new
  "Zone 9": makeZoneAt(2, 2), // ✅ new
};

// ============================================
// ZONE METADATA
// ============================================
export const zoneBoundaries: Record<string, any> = {
  "Zone 1": {
    label: "Zone 1 - Bagocboc Proper",
    color: "#EF4444",
    fillColor: "rgba(239, 68, 68, 0.35)",
    coordinates: ZONE_COORDINATES["Zone 1"],
  },
  "Zone 2": {
    label: "Zone 2 - Bagocboc Heights",
    color: "#3B82F6",
    fillColor: "rgba(59, 130, 246, 0.35)",
    coordinates: ZONE_COORDINATES["Zone 2"],
  },
  "Zone 3": {
    label: "Zone 3 - Bagocboc Riverside",
    color: "#10B981",
    fillColor: "rgba(16, 185, 129, 0.35)",
    coordinates: ZONE_COORDINATES["Zone 3"],
  },
  "Zone 4": {
    label: "Zone 4 - Bagocboc Upland",
    color: "#8B5CF6",
    fillColor: "rgba(139, 92, 246, 0.35)",
    coordinates: ZONE_COORDINATES["Zone 4"],
  },
  "Zone 5": {
    label: "Zone 5 - Bagocboc East",
    color: "#F59E0B",
    fillColor: "rgba(245, 158, 11, 0.35)",
    coordinates: ZONE_COORDINATES["Zone 5"],
  },
  "Zone 6": {
    label: "Zone 6 - Bagocboc West",
    color: "#EC4899",
    fillColor: "rgba(236, 72, 153, 0.35)",
    coordinates: ZONE_COORDINATES["Zone 6"],
  },
  // ✅ New zones 7-9
  "Zone 7": {
    label: "Zone 7 - Bagocboc South",
    color: "#06B6D4",
    fillColor: "rgba(6, 182, 212, 0.35)",
    coordinates: ZONE_COORDINATES["Zone 7"],
  },
  "Zone 8": {
    label: "Zone 8 - Bagocboc Central",
    color: "#84CC16",
    fillColor: "rgba(132, 204, 22, 0.35)",
    coordinates: ZONE_COORDINATES["Zone 8"],
  },
  "Zone 9": {
    label: "Zone 9 - Bagocboc North",
    color: "#F97316",
    fillColor: "rgba(249, 115, 22, 0.35)",
    coordinates: ZONE_COORDINATES["Zone 9"],
  },
};

// ============================================
// PUBLIC HELPERS
// ============================================
export const getZoneBoundary = (zoneName: string) => {
  return zoneBoundaries[zoneName] || null;
};

export const getZoneNames = (): string[] => {
  return Object.keys(zoneBoundaries);
};

export const getZoneColor = (zoneName: string): string => {
  const zone = zoneBoundaries[zoneName];
  return zone?.color || "#6B7280";
};

export const getZoneByNumber = (zoneNumber: number) => {
  const zoneName = `Zone ${zoneNumber}`;
  return getZoneBoundary(zoneName);
};

export const getZoneNumber = (zoneName: string): number => {
  const match = zoneName.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

export const isWithinBarangayBoundary = (lat: number, lng: number): boolean => {
  return (
    lat >= BOUNDARY_MIN_LAT &&
    lat <= BOUNDARY_MAX_LAT &&
    lng >= BOUNDARY_MIN_LNG &&
    lng <= BOUNDARY_MAX_LNG
  );
};

export const getZoneForCoordinate = (
  lat: number,
  lng: number,
): string | null => {
  const zoneNames = getZoneNames();
  for (const zoneName of zoneNames) {
    const zone = getZoneBoundary(zoneName);
    if (!zone) continue;
    if (isPointInPolygon(lat, lng, zone.coordinates)) {
      return zoneName;
    }
  }
  return null;
};

function isPointInPolygon(
  lat: number,
  lng: number,
  polygon: [number, number][],
): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}