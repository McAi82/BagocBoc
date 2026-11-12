// utils/boundaryData.ts
//
// Zones are now ROADS (GPS polylines), not rectangles.
// Each path is a list of [latitude, longitude] points in order along the road.
// To fix a road, edit its `path` (or `branch`) below.

export type LatLngTuple = [number, number];

export interface ZoneRoad {
    id: number;
    label: string;
    color: string;
    path: LatLngTuple[];
    branch?: LatLngTuple[]; // optional side road drawn in the same zone
    from: string;
    to: string;
    note: string;
    /** Kept for backward compatibility with older code that read `.coordinates` */
    coordinates: LatLngTuple[];
}

// Kept so existing imports don't break. Not drawn on the map anymore.
export const bagocbocBoundary: LatLngTuple[] = [
    [8.4165, 124.4955],
    [8.4165, 124.5055],
    [8.4235, 124.5055],
    [8.4235, 124.4955],
    [8.4165, 124.4955],
];

const make = (
    id: number,
    color: string,
    from: string,
    to: string,
    note: string,
    path: LatLngTuple[],
    branch?: LatLngTuple[],
): ZoneRoad => ({
    id,
    label: `Zone ${id}`,
    color,
    from,
    to,
    note,
    path,
    branch,
    coordinates: path,
});

export const zoneBoundaries: Record<string, ZoneRoad> = {
    "Zone 1": make(
        1,
        "#a23fb0",
        "Bagocboc National High School",
        "Opol Sanitary Landfill road",
        "Southern stretch connecting the school area to the landfill road.",
        [
            [8.418168, 124.50175],
            [8.418844, 124.505467],
            [8.414503, 124.509951],
            [8.413781, 124.52051],
            [8.41938, 124.525636],
        ],
    ),
    "Zone 2": make(
        2,
        "#8b0a1e",
        "Ruperto Domingo Heights area",
        "Bagocboc National High School",
        "Winding road running south from the heights toward the school.",
        [
            [8.436445, 124.496217],
            [8.436466, 124.496938],
            [8.429712, 124.49977],
            [8.425466, 124.497965],
            [8.418168, 124.50175],
        ],
        [
            [8.429712, 124.49977],
            [8.427298, 124.504363],
            [8.422592, 124.505085],
            [8.418916, 124.505468],
        ],
    ),
    "Zone 3": make(
        3,
        "#e8262b",
        "Opol Agri Industrial area (north)",
        "Bayugbayogan junction",
        "Eastern road coming down from the north to the Bayugbayogan junction.",
        [
            [8.460675, 124.508586],
            [8.459462, 124.511321],
            [8.457061, 124.51143],
            [8.454629, 124.512713],
            [8.453987, 124.516103],
            [8.443244, 124.519373],
            [8.441538, 124.518197],
            [8.43874, 124.516753],
            [8.439103, 124.514825],
            [8.4353, 124.513537],
            [8.433636, 124.508069],
            [8.427307, 124.504456],
        ],
    ),
    "Zone 4": make(
        4,
        "#f2d21b",
        "Zone 8 / Zone 9 junction",
        "Zone 2 start",
        "Short link passing Ruperto Domingo Heights.",
        [
            [8.444239, 124.495645],
            [8.441326, 124.496073],
            [8.440019, 124.494294],
            [8.438279, 124.494236],
            [8.436445, 124.496217],
        ],
    ),
    "Zone 5": make(
        5,
        "#f7a8c4",
        "Hanan God's Oracle area",
        "Zone 3 start",
        "Northern climb between the Oracle area and the Opol Agri Industrial area.",
        [
            [8.460675, 124.508586],
            [8.459862, 124.507964],
            [8.457969, 124.50624],
            [8.456067, 124.505782],
            [8.454124, 124.503755],
        ],
    ),
    "Zone 6": make(
        6,
        "#3b3fcf",
        "Bayugbayogan junction",
        "East boundary",
        "Eastern road heading out past the church and AGTBZ farm.",
        [
            [8.443244, 124.519373],
            [8.444875, 124.521947],
            [8.443197, 124.525943],
            [8.44025, 124.529978],
        ],
    ),
    "Zone 7": make(
        7,
        "#6f8fc0",
        "Zone 1 end",
        "Opol Sanitary Landfill",
        "South-east road reaching the Opol Sanitary Landfill.",
        [
            [8.41938, 124.525636],
            [8.417712, 124.52803],
            [8.417243, 124.530627],
            [8.416514, 124.531827],
            [8.417064, 124.532472],
            [8.417262, 124.535087],
            [8.419964, 124.538417],
        ],
    ),
    "Zone 8": make(
        8,
        "#1fa84a",
        "Zone 9 / Zone 4 junction",
        "Hanan God's Oracle area",
        "North-east diagonal road toward the Oracle area.",
        [
            [8.454124, 124.503755],
            [8.451594, 124.50218],
            [8.448368, 124.498701],
            [8.445899, 124.496347],
            [8.444239, 124.495645],
        ],
    ),
    "Zone 9": make(
        9,
        "#10a5ec",
        "Gregory's Peak side",
        "Zone 8 / Zone 4 junction",
        "Western road coming in from the Gregory's Peak side.",
        [
            [8.444239, 124.495645],
            [8.441937, 124.493052],
            [8.440332, 124.490695],
            [8.442851, 124.489925],
            [8.440554, 124.486509],
        ],
    ),
};

// ============================================
// PUBLIC HELPERS
// ============================================
export const getZoneBoundary = (zoneName: string): ZoneRoad | null =>
    zoneBoundaries[zoneName] || null;

export const getZoneNames = (): string[] => Object.keys(zoneBoundaries);

export const getZoneColor = (zoneName: string): string =>
    zoneBoundaries[zoneName]?.color || "#6B7280";

export const getZoneByNumber = (zoneNumber: number) =>
    getZoneBoundary(`Zone ${zoneNumber}`);

export const getZoneNumber = (zoneName: string): number => {
    const match = zoneName.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
};

/** All polylines (main path + optional branch) of a zone. */
export const getZoneLines = (zoneName: string): LatLngTuple[][] => {
    const z = getZoneBoundary(zoneName);
    if (!z) return [];
    return z.branch ? [z.path, z.branch] : [z.path];
};

/** Rough bounding box around every road (with a small margin). */
const allPoints = (): LatLngTuple[] =>
    getZoneNames().flatMap((n) => getZoneLines(n).flat());

const BOX_MARGIN = 0.003;

export const isWithinBarangayBoundary = (lat: number, lng: number): boolean => {
    const pts = allPoints();
    const lats = pts.map((p) => p[0]);
    const lngs = pts.map((p) => p[1]);
    return (
        lat >= Math.min(...lats) - BOX_MARGIN &&
        lat <= Math.max(...lats) + BOX_MARGIN &&
        lng >= Math.min(...lngs) - BOX_MARGIN &&
        lng <= Math.max(...lngs) + BOX_MARGIN
    );
};

// Distance from a point to a segment (in degrees – fine for this small area)
const distToSegment = (
    p: LatLngTuple,
    a: LatLngTuple,
    b: LatLngTuple,
): number => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
};

/**
 * Zones are roads now, so a point can't be "inside" one.
 * Instead return the zone whose road is NEAREST to the point
 * (within ~300 m by default), or null if none is close enough.
 */
export const getZoneForCoordinate = (
    lat: number,
    lng: number,
    maxDistanceDeg = 0.0027,
): string | null => {
    let best: string | null = null;
    let bestDist = Infinity;
    for (const name of getZoneNames()) {
        for (const line of getZoneLines(name)) {
            for (let i = 0; i < line.length - 1; i++) {
                const d = distToSegment([lat, lng], line[i], line[i + 1]);
                if (d < bestDist) {
                    bestDist = d;
                    best = name;
                }
            }
        }
    }
    return bestDist <= maxDistanceDeg ? best : null;
};
