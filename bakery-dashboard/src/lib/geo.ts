// Minimal point-in-polygon Bezirk lookup, no external geo dependency.
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { BezirkName } from "./types";

export type BezirkPolygon = {
  name: BezirkName;
  // array of rings; ring = array of [lon, lat]
  rings: [number, number][][];
};

// OSM administrative-boundary relations for Austrian Bezirke are named after
// their seat town, not the traditional Gau name shown in this app's UI.
// Salzburg-Umgebung is the official Bezirk name for what's colloquially
// called Flachgau.
export const OSM_BEZIRK_NAME_TO_GAU: Record<string, BezirkName> = {
  "Zell am See": "Pinzgau",
  "St. Johann im Pongau": "Pongau",
  "Sankt Johann im Pongau": "Pongau",
  Hallein: "Tennengau",
  "Salzburg-Umgebung": "Flachgau",
  Tamsweg: "Lungau",
  Salzburg: "Salzburg-Stadt",
};

type LatLon = { lat: number; lon: number };

const RING_MATCH_EPSILON = 1e-7;

function samePoint(a: LatLon, b: LatLon): boolean {
  return Math.abs(a.lat - b.lat) < RING_MATCH_EPSILON && Math.abs(a.lon - b.lon) < RING_MATCH_EPSILON;
}

// Stitches a soup of way-segment geometries (as returned by Overpass `out
// geom` on a boundary relation's members) into closed rings by chaining
// matching endpoints. Unclosable leftover segments are dropped rather than
// guessed shut.
export function assembleRingsFromWays(ways: LatLon[][]): [number, number][][] {
  const remaining = ways.map((w) => w.slice());
  const rings: [number, number][][] = [];

  while (remaining.length > 0) {
    let current = remaining.shift()!;
    let extended = true;
    while (!samePoint(current[0], current[current.length - 1]) && extended) {
      extended = false;
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const tail = current[current.length - 1];
        if (samePoint(candidate[0], tail)) {
          current = current.concat(candidate.slice(1));
        } else if (samePoint(candidate[candidate.length - 1], tail)) {
          current = current.concat(candidate.slice(0, -1).reverse());
        } else if (samePoint(candidate[0], current[0])) {
          current = candidate.slice(0, -1).reverse().concat(current);
        } else if (samePoint(candidate[candidate.length - 1], current[0])) {
          current = candidate.slice(1).reverse().concat(current);
        } else {
          continue;
        }
        remaining.splice(i, 1);
        extended = true;
        break;
      }
    }
    if (samePoint(current[0], current[current.length - 1]) && current.length >= 4) {
      rings.push(current.map((p) => [p.lon, p.lat] as [number, number]));
    }
  }
  return rings;
}

type GeoJsonFeatureCollection = {
  features: {
    properties: { name: string };
    geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
  }[];
};

let cachedPolygons: BezirkPolygon[] | null = null;

export async function loadBezirkPolygons(): Promise<BezirkPolygon[]> {
  if (cachedPolygons) return cachedPolygons;
  const filePath = path.join(process.cwd(), "data", "bezirke.geojson");
  const raw = await readFile(filePath, "utf-8");
  const geojson = JSON.parse(raw) as GeoJsonFeatureCollection;
  cachedPolygons = geojson.features.map((f) => {
    const name = f.properties.name as BezirkName;
    const rings: [number, number][][] =
      f.geometry.type === "Polygon"
        ? (f.geometry.coordinates as number[][][]).map((ring) => ring.map(([lon, lat]) => [lon, lat]))
        : (f.geometry.coordinates as number[][][][]).flat().map((ring) => ring.map(([lon, lat]) => [lon, lat]));
    return { name, rings };
  });
  return cachedPolygons;
}

// Ray-casting point-in-polygon for a single ring.
function pointInRing(lon: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lon: number, lat: number, polygon: BezirkPolygon): boolean {
  return polygon.rings.some((ring) => pointInRing(lon, lat, ring));
}

export function findBezirkForPoint(
  lon: number,
  lat: number,
  polygons: BezirkPolygon[],
): BezirkName | null {
  for (const polygon of polygons) {
    if (pointInPolygon(lon, lat, polygon)) return polygon.name;
  }
  return null;
}
