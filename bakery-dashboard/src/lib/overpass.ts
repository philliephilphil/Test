// Overpass API client + query builders.
//
// Disambiguation note: OSM has two relations named "Salzburg" — the
// Bundesland (admin_level=4) and the Stadt/Statutarstadt (admin_level=8/9).
// Rather than hardcoding a numeric relation ID (which would need live
// verification we couldn't perform from this environment's network-restricted
// sandbox), every query below filters by name + admin_level=4 + boundary=
// administrative directly. That is the standard, documented Austrian OSM
// tagging convention for a Bundesland and is unambiguous against the city.
// Run `npm run fetch:bakeries` etc. from an environment with normal internet
// access — Overpass is free and keyless, no further setup needed.
import type { FrequencyPoi } from "./types";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const SALZBURG_BUNDESLAND_FILTER =
  '["name"="Salzburg"]["boundary"="administrative"]["admin_level"="4"]';

export type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
  members?: { type: string; ref: number; role: string }[];
  geometry?: { lat: number; lon: number }[];
};

export type OverpassResponse = {
  elements: OverpassElement[];
};

export async function runOverpassQuery(query: string): Promise<OverpassResponse> {
  let lastError: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: query,
      });
      if (!res.ok) {
        throw new Error(`Overpass request failed: ${res.status} ${res.statusText}`);
      }
      return (await res.json()) as OverpassResponse;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Overpass request failed");
}

export function buildBakeryQuery(): string {
  return `
    [out:json][timeout:60];
    area${SALZBURG_BUNDESLAND_FILTER}->.salzburg;
    nwr["shop"="bakery"](area.salzburg);
    out center tags;
  `;
}

// Politische Bezirke in Austria are admin_level=7 boundary relations; the
// Statutarstadt Salzburg (which exercises Bezirk-level authority but is a
// Gemeinde, not a Bezirk) is admin_level=8/9 and must be fetched separately
// to cover all 6 entries of BezirkName.
export function buildBezirkeQuery(): string {
  return `
    [out:json][timeout:90];
    area${SALZBURG_BUNDESLAND_FILTER}->.salzburg;
    (
      rel["boundary"="administrative"]["admin_level"="7"](area.salzburg);
      rel["boundary"="administrative"]["name"="Salzburg"]["admin_level"~"^(8|9)$"](area.salzburg);
    )->.bezirke;
    .bezirke out tags;
    (.bezirke; >;);
    out geom;
  `;
}

export function buildFrequencyPoiQuery(): string {
  return `
    [out:json][timeout:90];
    area${SALZBURG_BUNDESLAND_FILTER}->.salzburg;
    (
      node["highway"="bus_stop"](area.salzburg);
      node["railway"="station"](area.salzburg);
      node["railway"="halt"](area.salzburg);
      node["amenity"="parking"](area.salzburg);
      node["tourism"="attraction"](area.salzburg);
      node["tourism"="viewpoint"](area.salzburg);
      node["shop"](area.salzburg);
    );
    out center tags;
  `;
}

export function classifyFrequencyCategory(
  tags: Record<string, string>,
): FrequencyPoi["category"] | null {
  if (tags.highway === "bus_stop" || tags.railway === "station" || tags.railway === "halt") {
    return "transit";
  }
  if (tags.amenity === "parking") return "parking";
  if (tags.tourism === "attraction" || tags.tourism === "viewpoint") return "attraction";
  if (tags.shop) return "retail";
  return null;
}

export function elementLatLon(el: OverpassElement): { lat: number; lon: number } | null {
  if (typeof el.lat === "number" && typeof el.lon === "number") return { lat: el.lat, lon: el.lon };
  if (el.center) return { lat: el.center.lat, lon: el.center.lon };
  return null;
}
